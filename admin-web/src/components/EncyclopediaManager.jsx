import { useState, useEffect, useRef, useMemo } from 'react';
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
import RemoveRedEyeRoundedIcon from '@mui/icons-material/RemoveRedEyeRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { colors } from '../theme';
import { v4 as uuidv4 } from 'uuid';
import { nonCopyableContentProps, protectedContentSx } from '../utils/contentProtection';
import { getArticleContentSx } from '../utils/articleContentStyles';
import { installQuillDialogScrollGuard, runWithPreservedScroll } from '../utils/quillScrollGuard';
import {
  contentCardSx,
  dialogPaperSx,
  emptyStateSx,
  pageHeaderSx,
  paginationButtonSx,
  searchFieldSx,
  statCardSx,
  widePageShellSx, // extends pageShellSx for the wider encyclopedia grid
} from '../utils/webDesignStyles';

// 이미지 리사이즈 모듈 등록
Quill.register('modules/imageResize', ImageResize);

// 폰트 사이즈 설정
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
Quill.register(Size, true);

const quillFormats = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
  'align',
  'blockquote',
  'image',
  'width',
  'height',
  'style',
  'float',
  'display',
];

// HTML에서 이미지 URL 추출하는 함수
const extractImagesFromContent = (html) => {
  if (!html) return [];
  // DOM 파서를 사용하여 더 정확하게 이미지 URL 추출
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');
  const images = [];
  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      images.push(src);
    }
  });
  return images;
};

// HTML에서 텍스트만 추출하는 함수 (카드 미리보기용)
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// 연속된 blockquote 병합 함수
const mergeConsecutiveBlockquotes = (html) => {
  if (!html) return html;
  // </blockquote> 바로 다음에 <blockquote>가 오면 <br>로 교체
  return html.replace(/<\/blockquote>\s*<blockquote>/gi, '<br>');
};

const ITEMS_PER_PAGE = 17;
const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;

function EncyclopediaManager({ readOnly = false }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewArticle, setViewArticle] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItemCount, setTotalItemCount] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [references, setReferences] = useState(''); // 의학적 참고자료
  const [sourceUrl, setSourceUrl] = useState(''); // 기사 원문 링크
  const quillRef = useRef(null);
  const dialogContentRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // 본문 내 이미지 목록
  const contentImages = useMemo(() => extractImagesFromContent(content), [content]);

  // base64 이미지를 Storage에 업로드하고 URL 반환
  const uploadBase64Image = async (base64String) => {
    try {
      // base64에서 blob 생성
      const response = await fetch(base64String);
      const blob = await response.blob();

      // MIME 타입에서 확장자 추출
      const mimeType = blob.type || 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const fileName = `${uuidv4()}.${ext}`;
      const storageRef = ref(storage, `encyclopedia_images/${fileName}`);

      // 메타데이터와 함께 업로드
      const metadata = { contentType: mimeType };
      await uploadBytes(storageRef, blob, metadata);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Base64 upload error:', error);
      return null;
    }
  };

  // 콘텐츠 내 base64 이미지들을 Storage URL로 변환
  const convertBase64ImagesToUrls = async (htmlContent) => {
    const base64Regex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"/g;
    let match;
    let result = htmlContent;
    const matches = [];

    while ((match = base64Regex.exec(htmlContent)) !== null) {
      matches.push(match[1]);
    }

    for (const base64 of matches) {
      const url = await uploadBase64Image(base64);
      if (url) {
        result = result.replace(base64, url);
      }
    }

    return result;
  };

  // 썸네일 업로드 핸들러
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${uuidv4()}.${ext}`;
      const storageRef = ref(storage, `encyclopedia_thumbnails/${fileName}`);
      const metadata = { contentType: file.type };
      await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(storageRef);
      setCustomThumbnail(url);
      setSnackbar({ open: true, message: '썸네일이 업로드되었습니다', severity: 'success' });
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      setSnackbar({ open: true, message: '썸네일 업로드 실패', severity: 'error' });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const incrementArticleViewCount = async (article) => {
    if (!readOnly || !auth.currentUser) return;

    try {
      await updateDoc(doc(db, 'encyclopedia', article.id), {
        viewCount: increment(1),
      });
      setArticles((prev) => prev.map((item) => (
        item.id === article.id
          ? { ...item, viewCount: (item.viewCount || 0) + 1 }
          : item
      )));
      setViewArticle((current) => (
        current?.id === article.id
          ? { ...current, viewCount: (current.viewCount || 0) + 1 }
          : current
      ));
    } catch (error) {
      console.error('View count update error:', error);
    }
  };

  const handleArticleOpen = async (article) => {
    setViewArticle(article);
    incrementArticleViewCount(article);
  };

  // 이미지 업로드 핸들러 (Quill 에디터용)
  const imageHandler = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        // 파일 확장자 추출
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${uuidv4()}.${ext}`;
        const storageRef = ref(storage, `encyclopedia_images/${fileName}`);

        // 메타데이터와 함께 업로드
        const metadata = { contentType: file.type };
        await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(storageRef);

        const quill = quillRef.current?.getEditor();
        if (quill) {
          runWithPreservedScroll(dialogContentRef.current, () => {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1);
          });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setSnackbar({ open: true, message: '이미지 업로드 실패', severity: 'error' });
      }
    };
  };

  // Quill 모듈 설정 (imageHandler + imageResize 포함)
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['blockquote'],
        ['image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      },
    },
    keyboard: {
      bindings: {
        // Shift+Enter: 같은 블록 내 줄바꿈 (soft break)
        linebreak: {
          key: 13, // Enter
          shiftKey: true,
          handler: function(range) {
            this.quill.insertText(range.index, '\n');
            this.quill.setSelection(range.index + 1);
            return false;
          },
        },
      },
    },
    clipboard: {
      matchVisual: false,
    },
    imageResize: {
      parchment: Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize', 'Toolbar'],
      toolbarStyles: {
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
      },
    },
  }), []);

  // Quill 붙여넣기/삽입이 DialogContent 스크롤을 튕기지 않도록 보호
  useEffect(() => {
    if (!dialogOpen || !quillRef.current || !dialogContentRef.current) return undefined;

    const quill = quillRef.current.getEditor();
    return installQuillDialogScrollGuard(quill, dialogContentRef.current);
  }, [dialogOpen]);

  const buildArticlesQuery = (cursor = null) => {
    const constraints = readOnly
      ? [where('isPublished', '==', true), orderBy('createdAt', 'desc')]
      : [orderBy('createdAt', 'desc')];

    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(QUERY_PAGE_SIZE));

    return query(collection(db, 'encyclopedia'), ...constraints);
  };

  const buildArticlesCountQuery = () => {
    const constraints = readOnly ? [where('isPublished', '==', true)] : [];
    return query(collection(db, 'encyclopedia'), ...constraints);
  };

  const mapArticlesSnapshot = (snapshot) => snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const loadTotalCount = async () => {
    const snapshot = await getCountFromServer(buildArticlesCountQuery());
    setTotalItemCount(snapshot.data().count);
  };

  const updatePaginationCursor = (snapshot) => {
    setLastVisibleDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
    setHasMore(snapshot.docs.length === QUERY_PAGE_SIZE);
  };

  // 데이터 로드 함수
  const loadArticles = async () => {
    await loadTotalCount();
    const q = buildArticlesQuery();

    if (readOnly) {
      // 일반 사용자: 일회성 조회 (read 수 절약)
      const snapshot = await getDocs(q);
      const articleList = mapArticlesSnapshot(snapshot);
      setArticles(articleList);
      updatePaginationCursor(snapshot);
      setLoading(false);
    } else {
      // 관리자: 실시간 리스너 (CRUD 반영)
      return onSnapshot(q, (snapshot) => {
        const articleList = mapArticlesSnapshot(snapshot);
        setArticles(articleList);
        updatePaginationCursor(snapshot);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    let unsubscribe;
    loadArticles().then((result) => {
      unsubscribe = result;
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const readArticlesPage = async (cursor) => {
    const snapshot = await getDocs(buildArticlesQuery(cursor));
    const articleList = mapArticlesSnapshot(snapshot);
    return {
      articleList,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : cursor,
      nextHasMore: snapshot.docs.length === QUERY_PAGE_SIZE,
    };
  };

  const handlePageChange = async (page) => {
    if (page < 0 || loadingMore) return;

    if (page >= totalPages) return;

    const loadedPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
    if (page < loadedPages) {
      setCurrentPage(page);
      return;
    }

    if (searchQuery || !hasMore || !lastVisibleDoc) return;

    setLoadingMore(true);
    try {
      let cursor = lastVisibleDoc;
      let nextHasMore = hasMore;
      let loadedPageCount = loadedPages;
      const appendedArticles = [];

      while (page >= loadedPageCount && nextHasMore && cursor) {
        const result = await readArticlesPage(cursor);
        if (result.articleList.length === 0) {
          nextHasMore = false;
          break;
        }

        appendedArticles.push(...result.articleList);
        cursor = result.lastDoc;
        nextHasMore = result.nextHasMore;
        loadedPageCount += 1;
      }

      if (appendedArticles.length > 0) {
        setArticles((prev) => [...prev, ...appendedArticles]);
      }
      setLastVisibleDoc(cursor);
      setHasMore(nextHasMore);
      if (page < loadedPageCount) setCurrentPage(page);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPublished(true);
    setSelectedImageUrl(null);
    setCustomThumbnail(null);
    setReferences('');
    setSourceUrl('');
    setEditingArticle(null);
  };

  const handleOpenDialog = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setTitle(article.title || '');
      setContent(article.content || '');
      setIsPublished(article.isPublished !== false);
      setReferences(article.references || '');
      setSourceUrl(article.sourceUrl || '');
      // 기존 이미지가 본문에 없으면 커스텀 썸네일로 설정
      const existingImages = extractImagesFromContent(article.content || '');
      if (article.imageUrl && !existingImages.includes(article.imageUrl)) {
        setCustomThumbnail(article.imageUrl);
        setSelectedImageUrl(null);
      } else {
        setCustomThumbnail(null);
        setSelectedImageUrl(article.imageUrl || null);
      }
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
      // base64 이미지를 Storage URL로 변환
      let convertedContent = await convertBase64ImagesToUrls(content.trim());
      // 연속된 blockquote 병합
      convertedContent = mergeConsecutiveBlockquotes(convertedContent);

      // 변환된 콘텐츠에서 이미지 추출
      const updatedImages = extractImagesFromContent(convertedContent);
      // 커스텀 썸네일 > 선택된 본문 이미지 > 첫 번째 본문 이미지
      let imageUrl = customThumbnail;
      if (!imageUrl) {
        imageUrl = selectedImageUrl && updatedImages.includes(selectedImageUrl)
          ? selectedImageUrl
          : (updatedImages.length > 0 ? updatedImages[0] : null);
      }

      const user = auth.currentUser;

      if (editingArticle) {
        await updateDoc(doc(db, 'encyclopedia', editingArticle.id), {
          title: title.trim(),
          content: convertedContent,
          imageUrl,
          isPublished,
          references: references.trim(),
          sourceUrl: sourceUrl.trim(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '글이 수정되었습니다', severity: 'success' });
      } else {
        await addDoc(collection(db, 'encyclopedia'), {
          title: title.trim(),
          content: convertedContent,
          imageUrl,
          isPublished,
          references: references.trim(),
          sourceUrl: sourceUrl.trim(),
          authorId: user?.uid || '',
          authorName: '이승주',
          viewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSnackbar({ open: true, message: '글이 등록되었습니다', severity: 'success' });
      }

      await loadTotalCount();
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
      await loadTotalCount();
    } catch (error) {
      setSnackbar({ open: true, message: '변경 실패', severity: 'error' });
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`"${article.title}" 글을 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'encyclopedia', article.id));
      setSnackbar({ open: true, message: '삭제되었습니다', severity: 'success' });
      await loadTotalCount();
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
  const displayArticles = readOnly
    ? articles.filter((a) => a.isPublished)
    : articles;

  const filteredArticles = displayArticles.filter((article) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (article.title || '').toLowerCase().includes(q) ||
      (article.content || '').toLowerCase().includes(q)
    );
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(
    (searchQuery ? filteredArticles.length : totalItemCount) / ITEMS_PER_PAGE
  );
  const paginatedArticles = filteredArticles.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // 검색어 변경 시 첫 페이지로
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const publishedCount = articles.filter((a) => a.isPublished).length;
  const draftCount = articles.filter((a) => !a.isPublished).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={widePageShellSx}>
      {/* Header */}
      <Box sx={pageHeaderSx}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
              {readOnly ? '난임백과' : '난임백과 관리'}
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary }}>
              {readOnly ? '난임 관련 정보를 확인하세요' : '난임 관련 정보를 작성하고 관리하세요'}
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ px: 3 }}
            >
              새 글 작성
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats Cards - 관리자만 표시 */}
      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Box
            sx={statCardSx(colors)}
          >
            <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
              전체 글
            </Typography>
            <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
              {totalItemCount}
            </Typography>
          </Box>
          <Box
            sx={statCardSx(colors)}
          >
            <Typography variant="body2" sx={{ color: colors.success, mb: 0.5 }}>
              공개
            </Typography>
            <Typography variant="h4" sx={{ color: colors.success, fontWeight: 700 }}>
              {publishedCount}
            </Typography>
          </Box>
          <Box
            sx={statCardSx(colors, false, 'warning')}
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
        sx={searchFieldSx()}
      />

      {/* Article Grid */}
      {filteredArticles.length === 0 ? (
        <Box
          sx={emptyStateSx(colors)}
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
            <AutoStoriesRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '등록된 글이 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {paginatedArticles.map((article) => (
            <Grid item xs={12} sm={6} lg={4} key={article.id}>
              <Card
                {...nonCopyableContentProps}
                onClick={() => handleArticleOpen(article)}
                sx={{
                  ...protectedContentSx,
                  ...contentCardSx(colors),
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
                    <AutoStoriesRoundedIcon sx={{ fontSize: 56, color: colors.textTertiary, opacity: 0.5 }} />
                  </Box>
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    {!readOnly && (
                      <Chip
                        size="small"
                        label={article.isPublished ? '공개' : '비공개'}
                        sx={{
                          height: 24,
                          fontSize: 12,
                          fontWeight: 600,
                          bgcolor: article.isPublished ? colors.successLight : colors.warningLight,
                          color: article.isPublished ? colors.success : colors.warning,
                        }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: colors.textTertiary }}>
                      {formatDate(article.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontSize: 16 }} noWrap>
                    {article.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      color: colors.textSecondary,
                      mb: 2,
                    }}
                  >
                    {stripHtml(article.content)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: `1px solid ${colors.divider}`,
                      pt: 2,
                      mt: 'auto',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <RemoveRedEyeRoundedIcon sx={{ fontSize: 16, color: colors.textTertiary }} />
                      <Typography variant="caption" sx={{ color: colors.textTertiary }}>
                        {article.viewCount || 0}
                      </Typography>
                    </Box>
                    {!readOnly && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(article)}
                          sx={{ color: colors.textSecondary }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleTogglePublish(article)}
                          sx={{ color: colors.textSecondary }}
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
                          sx={{ color: colors.error }}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
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
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              onClick={() => handlePageChange(i)}
              variant={currentPage === i ? 'contained' : 'text'}
              sx={paginationButtonSx(colors, currentPage === i)}
            >
              {i + 1}
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

      {/* Edit Dialog */}
      <Dialog
        open={dialogOpen}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            ...dialogPaperSx(colors),
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
          {editingArticle ? '글 수정' : '새 글 작성'}
        </DialogTitle>
        <DialogContent ref={dialogContentRef} sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />

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
                    minHeight: 500,
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
                    minHeight: 500,
                  },
                  '& .ql-editor.ql-blank::before': {
                    color: colors.textTertiary,
                    fontStyle: 'normal',
                  },
                  // 폰트 사이즈 드롭다운 라벨
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label::before, & .ql-snow .ql-picker.ql-size .ql-picker-item::before': {
                    content: '"기본"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before': {
                    content: '"10px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before': {
                    content: '"12px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before': {
                    content: '"14px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before': {
                    content: '"16px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before': {
                    content: '"18px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before': {
                    content: '"20px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before': {
                    content: '"24px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before': {
                    content: '"28px"',
                  },
                  '& .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before, & .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before': {
                    content: '"32px"',
                  },
                  '& .ql-editor blockquote': {
                    borderLeft: `4px solid ${colors.textPrimary}`,
                    backgroundColor: 'transparent',
                    padding: '12px 16px',
                    margin: '16px 0',
                    color: colors.textPrimary,
                  },
                  // 이미지 기본 스타일
                  '& .ql-editor img': {
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: 400,
                    objectFit: 'contain',
                    borderRadius: 2,
                  },
                  // 좌측 정렬 이미지 (float left)
                  '& .ql-editor img[style*="float: left"]': {
                    marginRight: 20,
                    marginBottom: 10,
                  },
                  // 우측 정렬 이미지 (float right)
                  '& .ql-editor img[style*="float: right"]': {
                    marginLeft: 20,
                    marginBottom: 10,
                  },
                }}
              >
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="내용을 입력하세요 (툴바의 이미지 버튼으로 사진 추가)"
                  preserveWhitespace
                />
              </Box>
            </Box>

            {/* 대표 이미지 (썸네일) */}
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1.5 }}
              >
                대표 이미지 {contentImages.length > 0 && !customThumbnail && '(기본: 첫 번째 본문 이미지)'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* 커스텀 썸네일 업로드 버튼 */}
                <Box
                  onClick={() => thumbnailInputRef.current?.click()}
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: 2,
                    border: `2px dashed ${colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    bgcolor: colors.backgroundAlt,
                    '&:hover': {
                      borderColor: colors.primary,
                      bgcolor: colors.primaryLight,
                    },
                  }}
                >
                  {uploadingThumbnail ? (
                    <CircularProgress size={24} />
                  ) : (
                    <>
                      <AddPhotoAlternateRoundedIcon sx={{ fontSize: 28, color: colors.textTertiary, mb: 0.5 }} />
                      <Typography sx={{ fontSize: 11, color: colors.textTertiary }}>
                        직접 업로드
                      </Typography>
                    </>
                  )}
                </Box>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleThumbnailUpload}
                />

                {/* 커스텀 썸네일 (업로드된 경우) */}
                {customThumbnail && (
                  <Box
                    sx={{
                      position: 'relative',
                      width: 100,
                      height: 100,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: `3px solid ${colors.primary}`,
                    }}
                  >
                    <img
                      src={customThumbnail}
                      alt="커스텀 썸네일"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: colors.primary,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => setCustomThumbnail(null)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        padding: 0.3,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}

                {/* 본문 이미지 목록 (커스텀 썸네일이 없을 때만 선택 가능) */}
                {contentImages.map((imgUrl, index) => {
                  const isSelected = !customThumbnail && (selectedImageUrl === imgUrl || (!selectedImageUrl && index === 0));
                  return (
                    <Box
                      key={imgUrl}
                      onClick={() => {
                        setCustomThumbnail(null);
                        setSelectedImageUrl(imgUrl);
                      }}
                      sx={{
                        position: 'relative',
                        width: 100,
                        height: 100,
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isSelected ? `3px solid ${colors.primary}` : `2px solid ${colors.border}`,
                        opacity: customThumbnail ? 0.5 : 1,
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: colors.primary,
                          transform: 'scale(1.05)',
                          opacity: 1,
                        },
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`본문 이미지 ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: colors.primary,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* 의학적 참고자료 */}
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1 }}
              >
                의학적 참고자료 (출처)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="예시:&#10;대한산부인과학회 난임 가이드라인&#10;WHO – Infertility Fact Sheet&#10;ESHRE Clinical Practice Guidelines"
                value={references}
                onChange={(e) => setReferences(e.target.value)}
                helperText="앱스토어 의료정보 가이드라인 준수를 위해 출처를 입력해주세요 (줄바꿈으로 구분)"
              />
            </Box>

            {/* 기사 원문 링크 */}
            <TextField
              label="기사/논문 원문 링크"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              fullWidth
              helperText="참고한 기사나 논문의 원문 URL을 입력해주세요"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  color="primary"
                />
              }
              label="공개"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleCloseDialog} disabled={saving} variant="outlined">
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        PaperProps={{
          ...nonCopyableContentProps,
          sx: {
            ...protectedContentSx,
            ...dialogPaperSx(colors),
          },
        }}
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
                  {!readOnly && (
                    <Chip
                      size="small"
                      label={viewArticle.isPublished ? '공개' : '비공개'}
                      sx={{
                        fontWeight: 600,
                        bgcolor: viewArticle.isPublished ? colors.successLight : colors.warningLight,
                        color: viewArticle.isPublished ? colors.success : colors.warning,
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: colors.textTertiary }}>
                    {formatDate(viewArticle.createdAt)} · 조회 {viewArticle.viewCount || 0}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setViewArticle(null)}>
                  <CloseRoundedIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent {...nonCopyableContentProps} sx={protectedContentSx}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
                {viewArticle.title}
              </Typography>
              <Box
                sx={getArticleContentSx(colors)}
                dangerouslySetInnerHTML={{ __html: viewArticle.content }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              {!readOnly && (
                <Button
                  onClick={() => {
                    setViewArticle(null);
                    handleOpenDialog(viewArticle);
                  }}
                  startIcon={<EditRoundedIcon />}
                  variant="outlined"
                >
                  수정
                </Button>
              )}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 로그인 필요 모달 */}
    </Box>
  );
}

export default EncyclopediaManager;
