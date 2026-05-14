import { useState, useEffect, useCallback } from 'react';
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
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
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

// 유튜브 URL에서 비디오 ID 추출
const extractYoutubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// 유튜브 썸네일 URL 생성
const getYoutubeThumbnail = (videoId) => {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// YouTube Data API로 메타데이터 가져오기 (제목 + 설명)
const fetchYoutubeMetadata = async (videoId) => {
  const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YouTube API key not found');
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title || '',
        description: snippet.description || '',
        author: snippet.channelTitle || '',
      };
    }
    return null;
  } catch (error) {
    console.error('YouTube metadata fetch error:', error);
    return null;
  }
};

const ITEMS_PER_PAGE = 17;
const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;

function VideoManager({ readOnly = false }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewVideo, setViewVideo] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  // 추출된 유튜브 ID 및 썸네일
  const videoId = extractYoutubeId(youtubeUrl);
  const thumbnailUrl = getYoutubeThumbnail(videoId);

  // 유튜브 URL에서 메타데이터 자동 가져오기
  const handleFetchMetadata = useCallback(async () => {
    if (!videoId || fetchingMetadata) return;

    setFetchingMetadata(true);
    const metadata = await fetchYoutubeMetadata(videoId);
    if (metadata) {
      if (metadata.title && !title) {
        setTitle(metadata.title);
      }
      if (metadata.description && !description) {
        setDescription(metadata.description);
      }
      setSnackbar({ open: true, message: '유튜브 정보를 가져왔습니다', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: '유튜브 정보를 가져오지 못했습니다', severity: 'warning' });
    }
    setFetchingMetadata(false);
  }, [videoId, title, description, fetchingMetadata]);

  // URL 변경 시 자동으로 메타데이터 가져오기 (새 영상 등록 시에만)
  useEffect(() => {
    if (videoId && !editingVideo && !title && !fetchingMetadata) {
      handleFetchMetadata();
    }
  }, [videoId, editingVideo, title, fetchingMetadata, handleFetchMetadata]);

  const buildVideosQuery = (cursor = null) => {
    const constraints = readOnly
      ? [where('isPublished', '==', true), orderBy('createdAt', 'desc')]
      : [orderBy('createdAt', 'desc')];

    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(QUERY_PAGE_SIZE));

    return query(collection(db, 'videos'), ...constraints);
  };

  const updatePaginationCursor = (snapshot) => {
    setLastVisibleDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
    setHasMore(snapshot.docs.length === QUERY_PAGE_SIZE);
  };

  const loadVideos = async () => {
    const q = buildVideosQuery();

    if (readOnly) {
      const snapshot = await getDocs(q);
      const videoList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVideos(videoList);
      updatePaginationCursor(snapshot);
      setLoading(false);
    } else {
      return onSnapshot(q, (snapshot) => {
        const videoList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVideos(videoList);
        updatePaginationCursor(snapshot);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    let unsubscribe;
    loadVideos().then((result) => {
      unsubscribe = result;
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastVisibleDoc) return;

    setLoadingMore(true);
    try {
      const snapshot = await getDocs(buildVideosQuery(lastVisibleDoc));
      const videoList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVideos((prev) => [...prev, ...videoList]);
      updatePaginationCursor(snapshot);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setYoutubeUrl('');
    setDescription('');
    setIsPublished(true);
    setEditingVideo(null);
  };

  const handleOpenDialog = (video = null) => {
    if (video) {
      setEditingVideo(video);
      setTitle(video.title || '');
      setYoutubeUrl(video.youtubeUrl || '');
      setDescription(video.description || '');
      setIsPublished(video.isPublished !== false);
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
    if (!title.trim()) {
      setSnackbar({ open: true, message: '제목을 입력해주세요', severity: 'error' });
      return;
    }

    if (!videoId) {
      setSnackbar({ open: true, message: '유효한 유튜브 URL을 입력해주세요', severity: 'error' });
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;
      const thumbnail = thumbnailUrl;

      if (editingVideo) {
        await updateDoc(doc(db, 'videos', editingVideo.id), {
          title: title.trim(),
          youtubeUrl: youtubeUrl.trim(),
          videoId,
          thumbnailUrl: thumbnail,
          description: description.trim(),
          isPublished,
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '영상이 수정되었습니다', severity: 'success' });
      } else {
        await addDoc(collection(db, 'videos'), {
          title: title.trim(),
          youtubeUrl: youtubeUrl.trim(),
          videoId,
          thumbnailUrl: thumbnail,
          description: description.trim(),
          isPublished,
          authorId: user?.uid || '',
          authorName: '이승주',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '영상이 등록되었습니다', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Save error:', error);
      setSnackbar({ open: true, message: '저장 실패: ' + error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (video) => {
    try {
      await updateDoc(doc(db, 'videos', video.id), {
        isPublished: !video.isPublished,
        updatedAt: serverTimestamp(),
      });
      setSnackbar({
        open: true,
        message: video.isPublished ? '비공개로 전환되었습니다' : '공개되었습니다',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ open: true, message: '변경 실패', severity: 'error' });
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`"${video.title}" 영상을 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'videos', video.id));
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
  const displayVideos = readOnly ? videos.filter((v) => v.isPublished) : videos;

  const filteredVideos = displayVideos.filter((video) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (video.title || '').toLowerCase().includes(q) ||
      (video.description || '').toLowerCase().includes(q)
    );
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE);
  const paginatedVideos = filteredVideos.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // 검색어 변경 시 첫 페이지로
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const publishedCount = displayVideos.filter((v) => v.isPublished).length;
  const draftCount = displayVideos.filter((v) => !v.isPublished).length;

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
              {readOnly ? '아기성공TV' : '아기성공TV 관리'}
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary }}>
              {readOnly ? '난임 관련 유익한 영상을 시청하세요' : '유튜브 영상을 등록하고 관리하세요'}
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ px: 3, py: 1.5 }}
            >
              새 영상 등록
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
              전체 영상
            </Typography>
            <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
              {videos.length}
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
        placeholder="제목 또는 설명 검색..."
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

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
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
            <YouTubeIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 영상이 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {paginatedVideos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={video.id}>
              <Card
                onClick={() => setViewVideo(video)}
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
                {/* 썸네일에 재생 아이콘 오버레이 */}
                <Box sx={{ position: 'relative' }}>
                  {video.thumbnailUrl ? (
                    <CardMedia
                      component="img"
                      sx={{ height: 180, objectFit: 'cover' }}
                      image={video.thumbnailUrl}
                      alt={video.title}
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
                      <YouTubeIcon sx={{ fontSize: 48, color: colors.textTertiary }} />
                    </Box>
                  )}
                  {/* 재생 버튼 오버레이 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PlayCircleFilledRoundedIcon sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                </Box>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    {!readOnly && (
                      <Chip
                        size="small"
                        label={video.isPublished ? '공개' : '비공개'}
                        sx={{
                          height: 24,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: video.isPublished ? colors.successLight : colors.warningLight,
                          color: video.isPublished ? colors.success : colors.warning,
                        }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: colors.textTertiary, fontWeight: 500 }}>
                      {formatDate(video.createdAt)}
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
                    {video.title}
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
                    {video.description || '설명 없음'}
                  </Typography>
                  {/* 관리자 액션 버튼 */}
                  {!readOnly && (
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
                        onClick={() => handleOpenDialog(video)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.primary, bgcolor: colors.primaryLight },
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePublish(video)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.warning, bgcolor: colors.warningLight },
                        }}
                      >
                        {video.isPublished ? (
                          <VisibilityOffRoundedIcon fontSize="small" />
                        ) : (
                          <VisibilityRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(video)}
                        sx={{
                          color: colors.textSecondary,
                          '&:hover': { color: colors.error, bgcolor: colors.errorLight },
                        }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 20,
            color: colors.textPrimary,
            pb: 1,
          }}
        >
          {editingVideo ? '영상 수정' : '새 영상 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              placeholder="영상 제목을 입력하세요"
            />

            <TextField
              label="유튜브 URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              fullWidth
              required
              placeholder="https://www.youtube.com/watch?v=..."
              helperText={videoId ? `비디오 ID: ${videoId}` : '유튜브 URL을 입력하면 자동으로 제목과 설명을 가져옵니다'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <YouTubeIcon sx={{ color: '#FF0000' }} />
                  </InputAdornment>
                ),
                endAdornment: videoId && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={handleFetchMetadata}
                      disabled={fetchingMetadata}
                      startIcon={fetchingMetadata ? <CircularProgress size={16} /> : <AutoFixHighRoundedIcon />}
                      sx={{
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                      }}
                    >
                      {fetchingMetadata ? '가져오는 중...' : '정보 가져오기'}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {/* 썸네일 미리보기 */}
            {thumbnailUrl && (
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1.5 }}
                >
                  썸네일 미리보기
                </Typography>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <img
                    src={thumbnailUrl}
                    alt="썸네일"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onError={(e) => {
                      // maxresdefault가 없으면 hqdefault로 대체
                      e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      width: 64,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PlayCircleFilledRoundedIcon sx={{ fontSize: 48, color: 'white' }} />
                  </Box>
                </Box>
              </Box>
            )}

            <TextField
              label="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="영상에 대한 간단한 설명을 입력하세요"
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

      {/* View Dialog - 유튜브 임베드 */}
      <Dialog
        open={!!viewVideo}
        onClose={() => setViewVideo(null)}
        maxWidth="md"
        fullWidth
      >
        {viewVideo && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {!readOnly && (
                    <Chip
                      size="small"
                      label={viewVideo.isPublished ? '공개' : '비공개'}
                      sx={{
                        fontWeight: 600,
                        bgcolor: viewVideo.isPublished ? colors.successLight : colors.warningLight,
                        color: viewVideo.isPublished ? colors.success : colors.warning,
                      }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: colors.textTertiary, fontWeight: 500 }}>
                    {formatDate(viewVideo.createdAt)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setViewVideo(null)}
                  sx={{ color: colors.textSecondary }}
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: colors.textPrimary, mb: 2 }}
              >
                {viewVideo.title}
              </Typography>

              {/* 유튜브 임베드 */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%', // 16:9 비율
                  mb: 2,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${viewVideo.videoId}`}
                  title={viewVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              </Box>

              {viewVideo.description && (
                <Typography
                  sx={{
                    color: colors.textSecondary,
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  {viewVideo.description}
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              <Button
                onClick={() => window.open(viewVideo.youtubeUrl, '_blank')}
                startIcon={<YouTubeIcon />}
                sx={{ color: '#FF0000' }}
              >
                YouTube에서 보기
              </Button>
              {!readOnly && (
                <Button
                  onClick={() => {
                    setViewVideo(null);
                    handleOpenDialog(viewVideo);
                  }}
                  startIcon={<EditRoundedIcon />}
                  sx={{ color: colors.textSecondary }}
                >
                  수정
                </Button>
              )}
              <Button onClick={() => setViewVideo(null)} variant="contained" sx={{ px: 3 }}>
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

export default VideoManager;
