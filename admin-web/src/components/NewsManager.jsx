import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
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
  Grid,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { colors } from '../theme';
import { v4 as uuidv4 } from 'uuid';

// Quill 에디터 설정
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
  'blockquote',
];

// HTML에서 텍스트만 추출하는 함수 (카드 미리보기용)
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

function NewsManager() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewArticle, setViewArticle] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'news'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const articleList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArticles(articleList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(true);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setEditingArticle(null);
  };

  const handleOpenDialog = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setTitle(article.title || '');
      setContent(article.content || '');
      setIsPublished(article.isPublished !== false);
      setExistingImageUrl(article.imageUrl || null);
      setImagePreview(article.imageUrl || null);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const uploadImage = async () => {
    if (!imageFile) return existingImageUrl;

    const fileName = `${uuidv4()}.jpg`;
    const storageRef = ref(storage, `news_images/${fileName}`);
    await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setSnackbar({ open: true, message: '제목과 내용을 입력해주세요', severity: 'error' });
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadImage();
      const user = auth.currentUser;

      if (editingArticle) {
        await updateDoc(doc(db, 'news', editingArticle.id), {
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          isPublished,
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '뉴스가 수정되었습니다', severity: 'success' });
      } else {
        await addDoc(collection(db, 'news'), {
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          isPublished,
          authorId: user?.uid || '',
          authorName: '관리자',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '뉴스가 등록되었습니다', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Save error:', error);
      setSnackbar({ open: true, message: '저장 실패: ' + error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (article) => {
    try {
      await updateDoc(doc(db, 'news', article.id), {
        isPublished: !article.isPublished,
        updatedAt: serverTimestamp(),
      });
      setSnackbar({
        open: true,
        message: article.isPublished ? '비공개로 전환되었습니다' : '공개되었습니다',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: '변경 실패', severity: 'error' });
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`"${article.title}" 뉴스를 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'news', article.id));
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

  const filteredArticles = articles.filter((article) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (article.title || '').toLowerCase().includes(query) ||
      (article.content || '').toLowerCase().includes(query)
    );
  });

  const publishedCount = articles.filter((a) => a.isPublished).length;
  const draftCount = articles.filter((a) => !a.isPublished).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.textSecondary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
              뉴스 관리
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary }}>
              난임 관련 뉴스를 작성하고 관리하세요
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ px: 3, py: 1.5 }}
          >
            새 뉴스 작성
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
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
            전체 글
          </Typography>
          <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
            {articles.length}
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

      {/* Search */}
      <TextField
        fullWidth
        placeholder="제목 또는 내용 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Article Grid */}
      {filteredArticles.length === 0 ? (
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
            <ArticleRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 뉴스가 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredArticles.map((article) => (
            <Grid item xs={12} sm={6} md={4} key={article.id}>
              <Card
                onClick={() => setViewArticle(article)}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.card,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                    borderColor: colors.primary,
                  },
                }}
              >
                {article.imageUrl ? (
                  <CardMedia
                    component="img"
                    sx={{ height: 180, objectFit: 'cover' }}
                    image={article.imageUrl}
                    alt={article.title}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: colors.backgroundAlt,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArticleRoundedIcon sx={{ fontSize: 48, color: colors.textTertiary }} />
                  </Box>
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Chip
                      size="small"
                      label={article.isPublished ? '공개' : '비공개'}
                      sx={{
                        height: 24,
                        fontSize: 11,
                        fontWeight: 600,
                        bgcolor: article.isPublished ? colors.successLight : colors.warningLight,
                        color: article.isPublished ? colors.success : colors.warning,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: colors.textTertiary, fontWeight: 500 }}>
                      {formatDate(article.createdAt)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: colors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {article.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      color: colors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mb: 2,
                      lineHeight: 1.6,
                    }}
                  >
                    {stripHtml(article.content)}
                  </Typography>
                  <Box
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      borderTop: `1px solid ${colors.divider}`,
                      pt: 1.5,
                      mt: 'auto',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(article)}
                      sx={{
                        color: colors.textSecondary,
                        '&:hover': { color: colors.primary, bgcolor: colors.primaryLight },
                      }}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleTogglePublish(article)}
                      sx={{
                        color: colors.textSecondary,
                        '&:hover': { color: colors.warning, bgcolor: colors.warningLight },
                      }}
                    >
                      {article.isPublished ? (
                        <VisibilityOffRoundedIcon fontSize="small" />
                      ) : (
                        <VisibilityRoundedIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(article)}
                      sx={{
                        color: colors.textSecondary,
                        '&:hover': { color: colors.error, bgcolor: colors.errorLight },
                      }}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 20,
            color: colors.textPrimary,
            pb: 1,
          }}
        >
          {editingArticle ? '뉴스 수정' : '새 뉴스 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              placeholder="뉴스 제목을 입력하세요"
            />

            {/* Image Upload */}
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1.5 }}
              >
                대표 이미지
              </Typography>
              {imagePreview ? (
                <Box position="relative" display="inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 240,
                      borderRadius: 12,
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageRoundedIcon />}
                  sx={{
                    borderStyle: 'dashed',
                    py: 2,
                    px: 4,
                    borderColor: colors.border,
                    color: colors.textSecondary,
                    '&:hover': {
                      borderColor: colors.primary,
                      bgcolor: colors.primaryLight,
                    },
                  }}
                >
                  이미지 선택
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Button>
              )}
            </Box>

            {/* Rich Text Editor */}
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1.5 }}
              >
                내용
              </Typography>
              <Box
                sx={{
                  '& .ql-container': {
                    minHeight: 300,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                  },
                  '& .ql-toolbar': {
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    bgcolor: colors.backgroundAlt,
                  },
                  '& .ql-editor': {
                    minHeight: 300,
                  },
                  '& .ql-editor.ql-blank::before': {
                    color: colors.textTertiary,
                    fontStyle: 'normal',
                  },
                  // 강조 블록 스타일
                  '& .ql-editor blockquote': {
                    borderLeft: `4px solid ${colors.primary}`,
                    backgroundColor: colors.primaryLight,
                    padding: '12px 16px',
                    margin: '16px 0',
                    borderRadius: '0 8px 8px 0',
                  },
                }}
              >
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="뉴스 내용을 입력하세요"
                />
              </Box>
            </Box>

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
        open={!!viewArticle}
        onClose={() => setViewArticle(null)}
        maxWidth="md"
        fullWidth
      >
        {viewArticle && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    size="small"
                    label={viewArticle.isPublished ? '공개' : '비공개'}
                    sx={{
                      fontWeight: 600,
                      bgcolor: viewArticle.isPublished ? colors.successLight : colors.warningLight,
                      color: viewArticle.isPublished ? colors.success : colors.warning,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: colors.textTertiary, fontWeight: 500 }}>
                    {formatDate(viewArticle.createdAt)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setViewArticle(null)}
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
                {viewArticle.title}
              </Typography>
              {viewArticle.imageUrl && (
                <Box sx={{ mb: 3 }}>
                  <img
                    src={viewArticle.imageUrl}
                    alt={viewArticle.title}
                    style={{
                      width: '100%',
                      maxHeight: 400,
                      objectFit: 'cover',
                      borderRadius: 12,
                    }}
                  />
                </Box>
              )}
              <Box
                sx={{
                  lineHeight: 1.9,
                  color: colors.textPrimary,
                  fontSize: 15,
                  '& p': { margin: '0 0 1em 0' },
                  '& h1, & h2, & h3': {
                    fontWeight: 700,
                    margin: '1.5em 0 0.5em 0',
                    color: colors.textPrimary,
                  },
                  '& h1': { fontSize: '1.75em' },
                  '& h2': { fontSize: '1.5em' },
                  '& h3': { fontSize: '1.25em' },
                  '& blockquote': {
                    borderLeft: `4px solid ${colors.primary}`,
                    backgroundColor: colors.primaryLight,
                    padding: '12px 16px',
                    margin: '16px 0',
                    borderRadius: '0 8px 8px 0',
                  },
                  '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                  '& li': { marginBottom: '0.25em' },
                }}
                dangerouslySetInnerHTML={{ __html: viewArticle.content }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              <Button
                onClick={() => {
                  setViewArticle(null);
                  handleOpenDialog(viewArticle);
                }}
                startIcon={<EditRoundedIcon />}
                sx={{ color: colors.textSecondary }}
              >
                수정
              </Button>
              <Button onClick={() => setViewArticle(null)} variant="contained" sx={{ px: 3 }}>
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

export default NewsManager;
