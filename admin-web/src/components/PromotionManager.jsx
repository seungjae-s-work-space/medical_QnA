import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { colors } from '../theme';
import {
  dialogPaperSx,
  emptyStateSx,
  pageHeaderSx,
  pageShellSx,
  paginationButtonSx,
  searchFieldSx,
  statCardSx,
} from '../utils/webDesignStyles';
import {
  PROMOTION_ADMIN_PAGE_SIZE,
  PROMOTION_SEARCH_KEYWORD_MIN_LENGTH,
  deletePromotion,
  normalizePromotionSearchQuery,
  savePromotion,
  uploadPromotionBanner,
} from '../services/promotionService';

const ITEMS_PER_PAGE = PROMOTION_ADMIN_PAGE_SIZE;
const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;
const PROMOTION_SEARCH_DEBOUNCE_MS = 350;

const INITIAL_FORM = {
  title: '',
  summary: '',
  bannerImageUrl: '',
  contentHtml: '',
  externalLinkUrl: '',
  externalLinkLabel: '',
  sortOrder: 0,
  isPublished: true,
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote', 'link'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'bullet',
  'align',
  'blockquote',
  'link',
];

function stripHtml(html) {
  if (!html) return '';
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent || container.innerText || '';
}

function mapPromotionsSnapshot(snapshot) {
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
}

function PromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItemCount, setTotalItemCount] = useState(0);

  const buildPromotionsQuery = (cursor = null, normalizedSearchQuery = '') => {
    const constraints = [];

    if (normalizedSearchQuery) {
      constraints.push(where('searchKeywords', 'array-contains', normalizedSearchQuery));
    }

    constraints.push(orderBy('sortOrder'), orderBy('createdAt', 'desc'));

    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(QUERY_PAGE_SIZE));

    return query(collection(db, 'promotions'), ...constraints);
  };

  const buildPromotionsCountQuery = (normalizedSearchQuery = '') => {
    const constraints = [];

    if (normalizedSearchQuery) {
      constraints.push(where('searchKeywords', 'array-contains', normalizedSearchQuery));
    }

    return query(collection(db, 'promotions'), ...constraints);
  };

  const loadTotalCount = async (normalizedSearchQuery = '') => {
    const snapshot = await getCountFromServer(buildPromotionsCountQuery(normalizedSearchQuery));
    setTotalItemCount(snapshot.data().count);
  };

  const updatePaginationCursor = (snapshot) => {
    setLastVisibleDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
    setHasMore(snapshot.docs.length === QUERY_PAGE_SIZE);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const normalizedSearchQuery = normalizePromotionSearchQuery(searchInput);
      const nextSearchQuery =
        normalizedSearchQuery === '' ||
        normalizedSearchQuery.length < PROMOTION_SEARCH_KEYWORD_MIN_LENGTH
          ? ''
          : searchInput;
      setSearchQuery(nextSearchQuery);
      setCurrentPage(0);
    }, PROMOTION_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    let unsubscribe;
    let isMounted = true;

    const loadPromotions = async () => {
      const normalizedSearchQuery = normalizePromotionSearchQuery(searchQuery);

      try {
        setCurrentPage(0);
        await loadTotalCount(normalizedSearchQuery);

        if (!isMounted) return;

        unsubscribe = onSnapshot(
          buildPromotionsQuery(null, normalizedSearchQuery),
          (snapshot) => {
            setPromotions(mapPromotionsSnapshot(snapshot));
            updatePaginationCursor(snapshot);
            setLoading(false);
          },
          (error) => {
            console.error('Promotion load error:', error);
            setSnackbar({ open: true, message: '광고 목록을 불러오지 못했습니다', severity: 'error' });
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Promotion count error:', error);
        setSnackbar({ open: true, message: '광고 개수를 불러오지 못했습니다', severity: 'error' });
        setLoading(false);
      }
    };

    loadPromotions();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const readPromotionsPage = async (cursor, normalizedSearchQuery) => {
    const snapshot = await getDocs(buildPromotionsQuery(cursor, normalizedSearchQuery));
    const promotionList = mapPromotionsSnapshot(snapshot);

    return {
      promotionList,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : cursor,
      nextHasMore: snapshot.docs.length === QUERY_PAGE_SIZE,
    };
  };

  const displayPromotions = promotions;
  const filteredPromotions = displayPromotions;

  const totalPages = Math.ceil(totalItemCount / ITEMS_PER_PAGE);
  const paginatedPromotions = filteredPromotions.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handlePageChange = async (page) => {
    if (page < 0 || loadingMore) return;
    if (page >= totalPages) return;

    const loadedPages = Math.ceil(filteredPromotions.length / ITEMS_PER_PAGE);
    if (page < loadedPages) {
      setCurrentPage(page);
      return;
    }

    if (!hasMore || !lastVisibleDoc) return;

    setLoadingMore(true);
    try {
      const normalizedSearchQuery = normalizePromotionSearchQuery(searchQuery);
      let cursor = lastVisibleDoc;
      let nextHasMore = hasMore;
      let loadedPageCount = loadedPages;
      const appendedPromotions = [];

      while (page >= loadedPageCount && nextHasMore && cursor) {
        const result = await readPromotionsPage(cursor, normalizedSearchQuery);
        if (result.promotionList.length === 0) {
          nextHasMore = false;
          break;
        }

        appendedPromotions.push(...result.promotionList);
        cursor = result.lastDoc;
        nextHasMore = result.nextHasMore;
        loadedPageCount += 1;
      }

      if (appendedPromotions.length > 0) {
        setPromotions((prev) => [...prev, ...appendedPromotions]);
      }
      setLastVisibleDoc(cursor);
      setHasMore(nextHasMore);
      if (page < loadedPageCount) setCurrentPage(page);
    } catch (error) {
      console.error('Promotion page load error:', error);
      setSnackbar({ open: true, message: '다음 페이지를 불러오지 못했습니다', severity: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingPromotion(null);
  };

  const handleOpenDialog = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setForm({
        title: promotion.title || '',
        summary: promotion.summary || '',
        bannerImageUrl: promotion.bannerImageUrl || '',
        contentHtml: promotion.contentHtml || '',
        externalLinkUrl: promotion.externalLinkUrl || '',
        externalLinkLabel: promotion.externalLinkLabel || '',
        sortOrder: promotion.sortOrder ?? 0,
        isPublished: promotion.isPublished === true,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleBannerUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const url = await uploadPromotionBanner(file);
      handleFormChange('bannerImageUrl', url);
      setSnackbar({ open: true, message: '배너 이미지가 업로드되었습니다', severity: 'success' });
    } catch (error) {
      console.error('Promotion banner upload error:', error);
      setSnackbar({
        open: true,
        message: error.message || '배너 업로드에 실패했습니다',
        severity: 'error',
      });
    } finally {
      setUploadingBanner(false);
      input.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.bannerImageUrl.trim()) {
      setSnackbar({ open: true, message: '제목과 배너 이미지를 입력해주세요', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const savedId = await savePromotion(form, editingPromotion);
      const normalizedSortOrder = Number(form.sortOrder);
      const savedPromotion = {
        ...form,
        id: savedId,
        sortOrder: Number.isFinite(normalizedSortOrder) ? normalizedSortOrder : 0,
      };

      if (editingPromotion) {
        setPromotions((prev) => prev.map((promotion) => (
          promotion.id === editingPromotion.id
            ? { ...promotion, ...savedPromotion }
            : promotion
        )));
      }

      await loadTotalCount(normalizePromotionSearchQuery(searchQuery));
      setSnackbar({
        open: true,
        message: editingPromotion ? '광고가 수정되었습니다' : '광고가 등록되었습니다',
        severity: 'success',
      });
      handleCloseDialog();
    } catch (error) {
      console.error('Promotion save error:', error);
      setSnackbar({ open: true, message: '저장 실패: ' + error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (promotion) => {
    try {
      await updateDoc(doc(db, 'promotions', promotion.id), {
        isPublished: !promotion.isPublished,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });
      setPromotions((prev) => prev.map((item) => (
        item.id === promotion.id
          ? { ...item, isPublished: !promotion.isPublished }
          : item
      )));
      setSnackbar({
        open: true,
        message: promotion.isPublished ? '비공개로 전환되었습니다' : '공개되었습니다',
        severity: 'success',
      });
    } catch (error) {
      console.error('Promotion publish error:', error);
      setSnackbar({ open: true, message: '공개 상태를 변경하지 못했습니다', severity: 'error' });
    }
  };

  const handleDelete = async (promotion) => {
    if (!window.confirm(`"${promotion.title}" 광고를 삭제하시겠습니까?`)) return;

    try {
      await deletePromotion(promotion.id);
      setPromotions((prev) => prev.filter((item) => item.id !== promotion.id));
      await loadTotalCount(normalizePromotionSearchQuery(searchQuery));
      setSnackbar({ open: true, message: '광고가 삭제되었습니다', severity: 'success' });
    } catch (error) {
      console.error('Promotion delete error:', error);
      setSnackbar({ open: true, message: '삭제에 실패했습니다', severity: 'error' });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
  };

  const publishedCount = displayPromotions.filter((promotion) => promotion.isPublished).length;
  const draftCount = displayPromotions.filter((promotion) => !promotion.isPublished).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.textSecondary }} />
      </Box>
    );
  }

  return (
    <Box sx={pageShellSx}>
      <Box sx={pageHeaderSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
              광고 관리
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary }}>
              홈 화면 배너와 상세 광고 내용을 작성하고 공개 상태를 관리하세요
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ px: 3, py: 1.5, whiteSpace: 'nowrap' }}
          >
            새 광고 작성
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Box sx={statCardSx(colors)}>
          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
            전체 광고
          </Typography>
          <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
            {totalItemCount}
          </Typography>
        </Box>
        <Box sx={statCardSx(colors)}>
          <Typography variant="body2" sx={{ color: colors.success, mb: 0.5 }}>
            불러온 공개
          </Typography>
          <Typography variant="h4" sx={{ color: colors.success, fontWeight: 700 }}>
            {publishedCount}
          </Typography>
        </Box>
        <Box sx={statCardSx(colors, false, 'warning')}>
          <Typography variant="body2" sx={{ color: colors.warning, mb: 0.5 }}>
            불러온 비공개
          </Typography>
          <Typography variant="h4" sx={{ color: colors.warning, fontWeight: 700 }}>
            {draftCount}
          </Typography>
        </Box>
      </Box>

      <TextField
        fullWidth
        placeholder="제목, 요약, 본문, 링크 검색..."
        value={searchInput}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
            </InputAdornment>
          ),
        }}
        sx={searchFieldSx()}
      />

      {filteredPromotions.length === 0 ? (
        <Box sx={emptyStateSx(colors)}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: colors.backgroundAlt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <LocalOfferRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 광고가 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            ...emptyStateSx(colors),
            alignItems: 'stretch',
            py: 0,
            overflow: 'hidden',
          }}
        >
          <List sx={{ p: 0 }}>
            {paginatedPromotions.map((promotion, index) => (
              <ListItem
                key={promotion.id}
                disablePadding
                sx={{
                  borderBottom:
                    index < paginatedPromotions.length - 1
                      ? `1px solid ${colors.divider}`
                      : 'none',
                }}
              >
                <ListItemButton
                  onClick={() => handleOpenDialog(promotion)}
                  sx={{
                    py: 2.5,
                    px: 3,
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 2,
                    '&:hover': {
                      bgcolor: colors.backgroundAlt,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 128,
                      height: 72,
                      flexShrink: 0,
                      borderRadius: 2,
                      border: `1px solid ${colors.border}`,
                      bgcolor: colors.backgroundAlt,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {promotion.bannerImageUrl ? (
                      <Box
                        component="img"
                        src={promotion.bannerImageUrl}
                        alt={promotion.title}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageRoundedIcon sx={{ color: colors.textTertiary }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={promotion.isPublished ? '공개' : '비공개'}
                        sx={{
                          height: 22,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: promotion.isPublished ? colors.successLight : colors.warningLight,
                          color: promotion.isPublished ? colors.success : colors.warning,
                        }}
                      />
                      <Chip
                        size="small"
                        label={`정렬 ${promotion.sortOrder ?? 0}`}
                        sx={{
                          height: 22,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: colors.primaryLight,
                          color: colors.primaryDark,
                        }}
                      />
                      <Typography
                        sx={{
                          color: colors.textTertiary,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {formatDate(promotion.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: colors.textPrimary,
                        fontSize: 15,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {promotion.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mt: 0.5,
                      }}
                    >
                      {promotion.summary || stripHtml(promotion.contentHtml)}
                    </Typography>
                    {(promotion.externalLinkUrl || promotion.externalLinkLabel) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
                        <LinkRoundedIcon sx={{ fontSize: 16, color: colors.textTertiary }} />
                        <Typography
                          sx={{
                            color: colors.textTertiary,
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {promotion.externalLinkLabel || promotion.externalLinkUrl}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box
                    onClick={(event) => event.stopPropagation()}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: { xs: 0, md: 1 } }}
                  >
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(promotion)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.primary, bgcolor: colors.primaryLight },
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={promotion.isPublished ? '비공개 전환' : '공개 전환'}>
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePublish(promotion)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.warning, bgcolor: colors.warningLight },
                        }}
                      >
                        {promotion.isPublished ? (
                          <VisibilityOffRoundedIcon fontSize="small" />
                        ) : (
                          <VisibilityRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(promotion)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.error, bgcolor: colors.errorLight },
                        }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {(totalPages > 1 || hasMore) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            mt: 4,
          }}
        >
          <IconButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            sx={{
              color: colors.textSecondary,
              '&:disabled': { color: colors.textTertiary },
            }}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              onClick={() => handlePageChange(index)}
              variant={currentPage === index ? 'contained' : 'text'}
              sx={paginationButtonSx(colors, currentPage === index)}
            >
              {index + 1}
            </Button>
          ))}
          <IconButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={loadingMore || (currentPage >= totalPages - 1 && !hasMore)}
            sx={{
              color: colors.textSecondary,
              '&:disabled': { color: colors.textTertiary },
            }}
          >
            {loadingMore ? <CircularProgress size={20} /> : <ChevronRightRoundedIcon />}
          </IconButton>
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{ sx: dialogPaperSx(colors) }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 20,
            color: colors.textPrimary,
            pb: 1,
          }}
        >
          {editingPromotion ? '광고 수정' : '새 광고 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 180px' }, gap: 2 }}>
              <TextField
                label="제목"
                value={form.title}
                onChange={(event) => handleFormChange('title', event.target.value)}
                fullWidth
                required
                placeholder="홈 배너에 표시할 제목"
              />
              <TextField
                label="정렬 순서"
                type="number"
                value={form.sortOrder}
                onChange={(event) => handleFormChange('sortOrder', event.target.value)}
                fullWidth
              />
            </Box>

            <TextField
              label="요약"
              value={form.summary}
              onChange={(event) => handleFormChange('summary', event.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="배너와 목록에서 보일 짧은 설명"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, gap: 2 }}>
              <Box
                sx={{
                  height: 124,
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.backgroundAlt,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {form.bannerImageUrl ? (
                  <Box
                    component="img"
                    src={form.bannerImageUrl}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <ImageRoundedIcon sx={{ color: colors.textTertiary, fontSize: 38 }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField
                  label="배너 이미지 URL"
                  value={form.bannerImageUrl}
                  onChange={(event) => handleFormChange('bannerImageUrl', event.target.value)}
                  fullWidth
                  required
                />
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={
                    uploadingBanner ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <AddPhotoAlternateRoundedIcon />
                    )
                  }
                  disabled={uploadingBanner}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  배너 업로드
                  <input hidden accept="image/*" type="file" onChange={handleBannerUpload} />
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 220px' }, gap: 2 }}>
              <TextField
                label="외부 링크 URL"
                value={form.externalLinkUrl}
                onChange={(event) => handleFormChange('externalLinkUrl', event.target.value)}
                fullWidth
                placeholder="https://..."
              />
              <TextField
                label="외부 링크 라벨"
                value={form.externalLinkLabel}
                onChange={(event) => handleFormChange('externalLinkLabel', event.target.value)}
                fullWidth
                placeholder="자세히 보기"
              />
            </Box>

            <Box>
              <Typography sx={{ color: colors.textPrimary, fontWeight: 600, mb: 1 }}>
                상세 내용
              </Typography>
              <Box
                sx={{
                  '& .ql-toolbar': {
                    borderColor: colors.inputBorder,
                    borderRadius: '10px 10px 0 0',
                    bgcolor: colors.cardTint,
                  },
                  '& .ql-container': {
                    minHeight: 220,
                    borderColor: colors.inputBorder,
                    borderRadius: '0 0 10px 10px',
                    bgcolor: colors.inputBackground,
                    fontSize: 15,
                  },
                  '& .ql-editor': {
                    minHeight: 220,
                    lineHeight: 1.7,
                    color: colors.textPrimary,
                  },
                }}
              >
                <ReactQuill
                  theme="snow"
                  value={form.contentHtml}
                  onChange={(value) => handleFormChange('contentHtml', value)}
                  modules={quillModules}
                  formats={quillFormats}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(event) => handleFormChange('isPublished', event.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography sx={{ fontWeight: 500, color: colors.textPrimary }}>
                  공개
                </Typography>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{ px: 3, color: colors.textSecondary }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || uploadingBanner}
            sx={{ px: 4 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PromotionManager;
