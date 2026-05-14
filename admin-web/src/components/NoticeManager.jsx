import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { colors } from '../theme';

const ITEMS_PER_PAGE = 10;
const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;

function NoticeManager({ readOnly = false }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewNotice, setViewNotice] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const buildNoticesQuery = (cursor = null) => {
    const constraints = readOnly
      ? [where('isPublished', '==', true), orderBy('createdAt', 'desc')]
      : [orderBy('createdAt', 'desc')];

    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(QUERY_PAGE_SIZE));

    return query(collection(db, 'notices'), ...constraints);
  };

  const updatePaginationCursor = (snapshot) => {
    setLastVisibleDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
    setHasMore(snapshot.docs.length === QUERY_PAGE_SIZE);
  };

  const loadNotices = async () => {
    const q = buildNoticesQuery();

    if (readOnly) {
      const snapshot = await getDocs(q);
      const noticeList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotices(noticeList);
      updatePaginationCursor(snapshot);
      setLoading(false);
    } else {
      return onSnapshot(q, (snapshot) => {
        const noticeList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotices(noticeList);
        updatePaginationCursor(snapshot);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    let unsubscribe;
    loadNotices().then((result) => {
      unsubscribe = result;
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastVisibleDoc) return;

    setLoadingMore(true);
    try {
      const snapshot = await getDocs(buildNoticesQuery(lastVisibleDoc));
      const noticeList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotices((prev) => [...prev, ...noticeList]);
      updatePaginationCursor(snapshot);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(true);
    setEditingNotice(null);
  };

  const handleOpenDialog = (notice = null) => {
    if (notice) {
      setEditingNotice(notice);
      setTitle(notice.title || '');
      setContent(notice.content || '');
      setIsPublished(notice.isPublished !== false);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setSnackbar({ open: true, message: '제목과 내용을 입력해주세요', severity: 'error' });
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;

      if (editingNotice) {
        await updateDoc(doc(db, 'notices', editingNotice.id), {
          title: title.trim(),
          content: content.trim(),
          isPublished,
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '공지사항이 수정되었습니다', severity: 'success' });
      } else {
        await addDoc(collection(db, 'notices'), {
          title: title.trim(),
          content: content.trim(),
          isPublished,
          authorId: user?.uid || '',
          authorName: '이승주',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '공지사항이 등록되었습니다', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Save error:', error);
      setSnackbar({ open: true, message: '저장 실패: ' + error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (notice) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), {
        isPublished: !notice.isPublished,
        updatedAt: serverTimestamp(),
      });
      setSnackbar({
        open: true,
        message: notice.isPublished ? '비공개로 전환되었습니다' : '공개되었습니다',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: '변경 실패', severity: 'error' });
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(`"${notice.title}" 공지사항을 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'notices', notice.id));
      setSnackbar({ open: true, message: '삭제되었습니다', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: '삭제 실패', severity: 'error' });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
  };

  // readOnly 모드에서는 공개된 콘텐츠만 표시
  const displayNotices = readOnly ? notices.filter((n) => n.isPublished) : notices;

  const filteredNotices = displayNotices.filter((notice) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (notice.title || '').toLowerCase().includes(q) ||
      (notice.content || '').toLowerCase().includes(q)
    );
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredNotices.length / ITEMS_PER_PAGE);
  const paginatedNotices = filteredNotices.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // 검색어 변경 시 첫 페이지로
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const publishedCount = displayNotices.filter((n) => n.isPublished).length;
  const draftCount = displayNotices.filter((n) => !n.isPublished).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.textSecondary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
              {readOnly ? '공지사항' : '공지사항 관리'}
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary }}>
              {readOnly ? '중요한 공지사항을 확인하세요' : '사용자에게 전달할 공지사항을 작성하고 관리하세요'}
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ px: 3, py: 1.5 }}
            >
              새 공지 작성
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats Cards - 관리자만 표시 */}
      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Box
            sx={{
              flex: 1,
              p: 3,
              bgcolor: colors.card,
              borderRadius: 3,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
              전체 공지
            </Typography>
            <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
              {notices.length}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 3,
              bgcolor: colors.successLight,
              borderRadius: 3,
              border: `1px solid ${colors.success}`,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.success, mb: 0.5 }}>
              공개
            </Typography>
            <Typography variant="h4" sx={{ color: colors.success, fontWeight: 700 }}>
              {publishedCount}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 3,
              bgcolor: colors.warningLight,
              borderRadius: 3,
              border: `1px solid ${colors.warning}`,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.warning, mb: 0.5 }}>
              비공개
            </Typography>
            <Typography variant="h4" sx={{ color: colors.warning, fontWeight: 700 }}>
              {draftCount}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="제목 또는 내용 검색..."
        value={searchQuery}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Notice List */}
      {filteredNotices.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            bgcolor: colors.card,
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
          }}
        >
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
            <CampaignRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 공지사항이 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            bgcolor: colors.card,
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          <List sx={{ p: 0 }}>
            {paginatedNotices.map((notice, index) => (
              <ListItem
                key={notice.id}
                disablePadding
                sx={{
                  borderBottom:
                    index < paginatedNotices.length - 1
                      ? `1px solid ${colors.divider}`
                      : 'none',
                }}
              >
                <ListItemButton
                  onClick={() => setViewNotice(notice)}
                  sx={{
                    py: 2.5,
                    px: 3,
                    '&:hover': {
                      bgcolor: colors.backgroundAlt,
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 0.5,
                      }}
                    >
                      {!readOnly && (
                        <Chip
                          size="small"
                          label={notice.isPublished ? '공개' : '비공개'}
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 600,
                            bgcolor: notice.isPublished ? colors.successLight : colors.warningLight,
                            color: notice.isPublished ? colors.success : colors.warning,
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: colors.textPrimary,
                          fontSize: 15,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notice.title}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notice.content}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      ml: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: colors.textTertiary,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(notice.createdAt)}
                    </Typography>
                    {/* 관리자 액션 버튼 */}
                    {!readOnly && (
                      <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', gap: 0.5 }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(notice)}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': { color: colors.primary, bgcolor: colors.primaryLight },
                          }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleTogglePublish(notice)}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': { color: colors.warning, bgcolor: colors.warningLight },
                          }}
                        >
                          {notice.isPublished ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(notice)}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': { color: colors.error, bgcolor: colors.errorLight },
                          }}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            sx={{
              color: colors.textSecondary,
              '&:disabled': { color: colors.textTertiary },
            }}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              onClick={() => setCurrentPage(i)}
              variant={currentPage === i ? 'contained' : 'text'}
              sx={{
                minWidth: 40,
                height: 40,
                borderRadius: 2,
                fontWeight: 600,
                ...(currentPage !== i && {
                  color: colors.textSecondary,
                  '&:hover': { bgcolor: colors.backgroundAlt },
                }),
              }}
            >
              {i + 1}
            </Button>
          ))}
          <IconButton
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            sx={{
              color: colors.textSecondary,
              '&:disabled': { color: colors.textTertiary },
            }}
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      )}

      {hasMore && currentPage >= totalPages - 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loadingMore}
            sx={{ borderRadius: 999, px: 4 }}
          >
            {loadingMore ? '불러오는 중' : '더보기'}
          </Button>
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={dialogOpen}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 20,
            color: colors.textPrimary,
            pb: 1,
          }}
        >
          {editingNotice ? '공지사항 수정' : '새 공지사항 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              placeholder="공지사항 제목을 입력하세요"
            />

            <TextField
              label="내용"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              required
              multiline
              rows={8}
              placeholder="공지사항 내용을 입력하세요"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
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
            disabled={saving}
            sx={{ px: 4 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewNotice}
        onClose={() => setViewNotice(null)}
        maxWidth="sm"
        fullWidth
      >
        {viewNotice && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {!readOnly && (
                    <Chip
                      size="small"
                      label={viewNotice.isPublished ? '공개' : '비공개'}
                      sx={{
                        fontWeight: 600,
                        bgcolor: viewNotice.isPublished ? colors.successLight : colors.warningLight,
                        color: viewNotice.isPublished ? colors.success : colors.warning,
                      }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: colors.textTertiary, fontWeight: 500 }}>
                    {formatDate(viewNotice.createdAt)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setViewNotice(null)}
                  sx={{ color: colors.textSecondary }}
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: colors.textPrimary, mb: 3 }}
              >
                {viewNotice.title}
              </Typography>
              <Typography
                sx={{
                  lineHeight: 1.8,
                  color: colors.textPrimary,
                  fontSize: 15,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewNotice.content}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              {!readOnly && (
                <Button
                  onClick={() => {
                    setViewNotice(null);
                    handleOpenDialog(viewNotice);
                  }}
                  startIcon={<EditRoundedIcon />}
                  sx={{ color: colors.textSecondary }}
                >
                  수정
                </Button>
              )}
              <Button onClick={() => setViewNotice(null)} variant="contained" sx={{ px: 3 }}>
                닫기
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
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

export default NoticeManager;
