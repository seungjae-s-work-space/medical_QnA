import { useState, useEffect } from 'react';
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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  RemoveRedEye as ViewIcon,
} from '@mui/icons-material';
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

function EncyclopediaManager() {
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
      collection(db, 'encyclopedia'),
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
    const storageRef = ref(storage, `encyclopedia_images/${fileName}`);
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
        await updateDoc(doc(db, 'encyclopedia', editingArticle.id), {
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          isPublished,
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '글이 수정되었습니다', severity: 'success' });
      } else {
        await addDoc(collection(db, 'encyclopedia'), {
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          isPublished,
          authorId: user?.uid || '',
          authorName: '관리자',
          viewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '글이 등록되었습니다', severity: 'success' });
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
      await updateDoc(doc(db, 'encyclopedia', article.id), {
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
    if (!window.confirm(`"${article.title}" 글을 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'encyclopedia', article.id));
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color={colors.textPrimary}>
              난임백과 관리
            </Typography>
            <Typography variant="body2" color={colors.textSecondary} sx={{ mt: 0.5 }}>
              난임 관련 정보를 작성하고 관리하세요
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            새 글 작성
          </Button>
        </Box>
      </Box>

      {/* Stats & Search */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flex: 1,
            minWidth: 200,
          }}
        >
          <Chip
            label={`전체 ${articles.length}`}
            sx={{ bgcolor: colors.backgroundAlt, fontWeight: 500 }}
          />
          <Chip
            label={`공개 ${publishedCount}`}
            color="success"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
          <Chip
            label={`비공개 ${draftCount}`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        </Box>
        <TextField
          placeholder="제목 또는 내용 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Article Grid */}
      {filteredArticles.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            bgcolor: colors.inputBackground,
            borderRadius: 3,
            border: `1px solid ${colors.divider}`,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              bgcolor: colors.backgroundAlt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Typography sx={{ fontSize: 32, opacity: 0.5 }}>📚</Typography>
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 글이 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filteredArticles.map((article) => (
            <Grid item xs={12} sm={6} md={4} key={article.id}>
              <Card
                onClick={() => setViewArticle(article)}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  border: article.isPublished
                    ? `1px solid ${colors.divider}`
                    : `2px solid orange`,
                  bgcolor: colors.inputBackground,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  },
                }}
              >
                {article.imageUrl ? (
                  <CardMedia
                    component="img"
                    sx={{ height: 160, objectFit: 'cover' }}
                    image={article.imageUrl}
                    alt={article.title}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 160,
                      bgcolor: colors.backgroundAlt,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 48, opacity: 0.3 }}>📖</Typography>
                  </Box>
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip
                      size="small"
                      label={article.isPublished ? '공개' : '비공개'}
                      color={article.isPublished ? 'success' : 'warning'}
                      sx={{ height: 22, fontSize: 11 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(article.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }} noWrap>
                    {article.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mb: 2,
                    }}
                  >
                    {article.content}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: `1px solid ${colors.divider}`,
                      pt: 1.5,
                      mt: 'auto',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ViewIcon sx={{ fontSize: 16, color: colors.textTertiary }} />
                      <Typography variant="caption" color="textSecondary">
                        {article.viewCount || 0}
                      </Typography>
                    </Box>
                    <Box onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => handleOpenDialog(article)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleTogglePublish(article)}>
                        {article.isPublished ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(article)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingArticle ? '글 수정' : '새 글 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />

            {/* Image Upload */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                대표 이미지
              </Typography>
              {imagePreview ? (
                <Box position="relative" display="inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,
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
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  sx={{ borderStyle: 'dashed', py: 1.5, px: 3 }}
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

            <TextField
              label="내용"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              multiline
              rows={12}
              fullWidth
              required
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
              }
              label="공개"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={saving} sx={{ px: 3 }}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ px: 3 }}
          >
            {saving ? <CircularProgress size={20} /> : '저장'}
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
                    color={viewArticle.isPublished ? 'success' : 'warning'}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {formatDate(viewArticle.createdAt)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    · 조회 {viewArticle.viewCount || 0}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setViewArticle(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
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
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                  color: colors.textPrimary,
                }}
              >
                {viewArticle.content}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={() => {
                  setViewArticle(null);
                  handleOpenDialog(viewArticle);
                }}
                startIcon={<EditIcon />}
              >
                수정
              </Button>
              <Button onClick={() => setViewArticle(null)} variant="contained">
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

export default EncyclopediaManager;
