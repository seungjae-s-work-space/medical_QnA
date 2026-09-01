import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  limit,
  limitToLast,
  startAfter,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Dialog,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { colors } from '../theme';
import { isChatAttachmentExpired } from '../utils/chatAttachmentRetention';

const MESSAGE_PAGE_SIZE = 20;

const getTimestampMillis = (timestamp) => {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  return new Date(timestamp).getTime();
};

const getOldestMessageTime = (messages) => {
  const times = messages.map((message) => getTimestampMillis(message.createdAt)).filter(Boolean);
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
};

function UserChatWindow() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const canLoadOlderMessagesRef = useRef(false);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const scrollToBottom = () => {
    canLoadOlderMessagesRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    window.setTimeout(() => {
      canLoadOlderMessagesRef.current = true;
    }, 0);
  };

  // 사용자의 대화방 찾기 또는 생성
  useEffect(() => {
    if (!user) return;

    const initConversation = async () => {
      // 사용자 UID로 대화방 ID 설정 (1:1 매핑)
      // Firestore 보안 규칙과 일치하도록 'user_' 접두사 사용
      const convId = 'user_' + user.uid;
      const convRef = doc(db, 'conversations', convId);
      const convDoc = await getDoc(convRef);

      if (!convDoc.exists()) {
        // 대화방이 없으면 생성
        await setDoc(convRef, {
          oderId: '', // 주문 ID (필요시 사용)
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || '사용자',
          userEmail: user.email || '',
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadByAdmin: 0,
          unreadByUser: 0,
          hasAdminReplied: false,
          hasAdminViewed: false,
          createdAt: serverTimestamp(),
        });
      }

      setConversationId(convId);
      setLoading(false);
    };

    initConversation();
  }, [user]);

  // 메시지 실시간 리스너
  useEffect(() => {
    if (!conversationId) return;

    setMessages([]);
    setHasOlderMessages(true);
    setLoadingOlderMessages(false);
    canLoadOlderMessagesRef.current = false;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(MESSAGE_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHasOlderMessages(snapshot.docs.length === MESSAGE_PAGE_SIZE);
      setMessages((previousMessages) => {
        const liveIds = new Set(msgs.map((message) => message.id));
        const oldestLiveTime = getOldestMessageTime(msgs);
        const olderMessages = previousMessages.filter((message) => (
          !liveIds.has(message.id) &&
          getTimestampMillis(message.createdAt) < oldestLiveTime
        ));
        return [...olderMessages, ...msgs];
      });
      setTimeout(scrollToBottom, 100);
    });

    // 사용자가 읽음 표시
    updateDoc(doc(db, 'conversations', conversationId), {
      unreadByUser: 0,
    });

    return unsubscribe;
  }, [conversationId]);

  const loadOlderMessages = async () => {
    if (loadingOlderMessages || !hasOlderMessages || messages.length === 0 || !conversationId) {
      return;
    }

    const oldestMessage = messages[0];
    if (!oldestMessage?.createdAt) return;

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;

    setLoadingOlderMessages(true);
    try {
      const snapshot = await getDocs(query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(oldestMessage.createdAt),
        limit(MESSAGE_PAGE_SIZE)
      ));
      const olderMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).reverse();

      setMessages((previousMessages) => {
        const existingIds = new Set(previousMessages.map((message) => message.id));
        return [
          ...olderMessages.filter((message) => !existingIds.has(message.id)),
          ...previousMessages,
        ];
      });
      setHasOlderMessages(snapshot.docs.length === MESSAGE_PAGE_SIZE);

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight;
        }
      });
    } catch (error) {
      console.error('이전 메시지 로드 오류:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleMessagesScroll = (event) => {
    if (canLoadOlderMessagesRef.current && event.currentTarget.scrollTop <= 80) {
      loadOlderMessages();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = '';
  };

  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'hwp', 'hwpx'];

  const isAllowedFile = (file) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      return true;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    return allowedExtensions.includes(ext);
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    file: 50 * 1024 * 1024,
  };

  const checkFileSize = (file) => {
    const type = getFileType(file);
    const limit = FILE_SIZE_LIMITS[type];
    return file.size <= limit;
  };

  const formatSizeLimit = (type) => {
    const limit = FILE_SIZE_LIMITS[type];
    return `${limit / (1024 * 1024)}MB`;
  };

  const addFiles = (files) => {
    const validFiles = files.filter(isAllowedFile);
    const invalidCount = files.length - validFiles.length;

    if (invalidCount > 0) {
      alert(`${invalidCount}개 파일은 지원하지 않는 형식입니다.\n(이미지, 동영상, PDF, 문서, 압축파일만 가능)`);
    }

    if (validFiles.length === 0) return;

    const oversizedFiles = validFiles.filter(f => !checkFileSize(f));
    if (oversizedFiles.length > 0) {
      const messages = oversizedFiles.map(f => {
        const type = getFileType(f);
        const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
        return `• ${f.name} (${sizeMB}MB) - 최대 ${formatSizeLimit(type)}`;
      });
      alert(`파일 크기 제한을 초과했습니다:\n${messages.join('\n')}`);
      return;
    }

    if (pendingFiles.length + validFiles.length > 5) {
      alert('최대 5개까지 첨부할 수 있습니다');
      return;
    }

    const newFiles = validFiles.map(file => ({
      file,
      type: getFileType(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFile = async (fileObj) => {
    const { file, type } = fileObj;
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();

    let folder = 'chat_files';
    if (type === 'image') folder = 'chat_images';
    if (type === 'video') folder = 'chat_videos';

    const storageRef = ref(storage, `${folder}/${timestamp}_${randomId}.${extension}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
      url,
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingFiles.length === 0) || sending || !conversationId) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSending(true);
    setUploading(pendingFiles.length > 0);

    try {
      let attachments = null;
      if (pendingFiles.length > 0) {
        attachments = await Promise.all(pendingFiles.map(uploadFile));
      }

      let lastMessageText = newMessage.trim();
      if (!lastMessageText && attachments && attachments.length > 0) {
        const first = attachments[0];
        if (first.type === 'image') lastMessageText = '📷 사진';
        else if (first.type === 'video') lastMessageText = '🎬 동영상';
        else lastMessageText = `📎 ${first.fileName}`;
        if (attachments.length > 1) {
          lastMessageText += ` 외 ${attachments.length - 1}개`;
        }
      }

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: currentUser.uid,
        senderRole: 'user',
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || '사용자',
        text: newMessage.trim(),
        imageUrl: null,
        attachments: attachments,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: lastMessageText,
        lastMessageAt: serverTimestamp(),
        unreadByAdmin: increment(1),
      });

      pendingFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      setNewMessage('');
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다');
    }

    setSending(false);
    setUploading(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return '오늘';
    if (isYesterday) return '어제';
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return InsertDriveFileIcon;
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return PictureAsPdfIcon;
      case 'doc':
      case 'docx': return DescriptionIcon;
      case 'xls':
      case 'xlsx': return TableChartIcon;
      case 'ppt':
      case 'pptx': return SlideshowIcon;
      case 'zip':
      case 'rar': return FolderZipIcon;
      default: return InsertDriveFileIcon;
    }
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = msg.createdAt?.toDate().toDateString() || 'unknown';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const renderImageGrid = (images) => {
    const count = images.length;
    const gridSize = 200;
    const gap = 2;

    const openGallery = (startIndex) => {
      setPreviewImage({ images, currentIndex: startIndex });
    };

    if (count === 1) {
      return (
        <Box sx={{ mt: 1, cursor: 'pointer' }} onClick={() => openGallery(0)}>
          <img
            src={images[0].url}
            alt="첨부 이미지"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
          />
        </Box>
      );
    }

    if (count === 2) {
      return (
        <Box sx={{ mt: 1, display: 'flex', gap: `${gap}px`, maxWidth: gridSize }}>
          {images.map((img, idx) => (
            <Box
              key={idx}
              sx={{ flex: 1, height: gridSize / 2, cursor: 'pointer', overflow: 'hidden', borderRadius: 1 }}
              onClick={() => openGallery(idx)}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      );
    }

    if (count === 3) {
      return (
        <Box sx={{ mt: 1, display: 'flex', gap: `${gap}px`, maxWidth: gridSize, height: gridSize * 0.75 }}>
          <Box
            sx={{ flex: 2, cursor: 'pointer', overflow: 'hidden', borderRadius: 1 }}
            onClick={() => openGallery(0)}
          >
            <img src={images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {images.slice(1).map((img, idx) => (
              <Box
                key={idx}
                sx={{ flex: 1, cursor: 'pointer', overflow: 'hidden', borderRadius: 1 }}
                onClick={() => openGallery(idx + 1)}
              >
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    if (count === 4) {
      return (
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${gap}px`, maxWidth: gridSize }}>
          {images.map((img, idx) => (
            <Box
              key={idx}
              sx={{ height: gridSize / 2 - gap, cursor: 'pointer', overflow: 'hidden', borderRadius: 1 }}
              onClick={() => openGallery(idx)}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      );
    }

    const displayImages = images.slice(0, 4);
    const remaining = count - 4;

    return (
      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${gap}px`, maxWidth: gridSize }}>
        {displayImages.map((img, idx) => (
          <Box
            key={idx}
            sx={{ height: gridSize / 2 - gap, cursor: 'pointer', overflow: 'hidden', borderRadius: 1, position: 'relative' }}
            onClick={() => openGallery(idx)}
          >
            <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {idx === 3 && remaining > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 600 }}>
                  +{remaining}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const renderExpiredAttachmentNotice = (isUser) => (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        bgcolor: isUser ? 'rgba(255,255,255,0.1)' : colors.divider,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 18, color: colors.textTertiary }} />
      <Typography sx={{ fontSize: 13, color: colors.textTertiary }}>
        첨부파일 보관 기간이 만료되었습니다
      </Typography>
    </Box>
  );

  const renderAttachments = (message, isUser) => {
    const attachments = message?.attachments;
    if (!attachments || attachments.length === 0) return null;
    if (isChatAttachmentExpired(message.createdAt)) {
      return renderExpiredAttachmentNotice(isUser);
    }

    const images = attachments.filter(att => att.type === 'image');
    const others = attachments.filter(att => att.type !== 'image');

    return (
      <>
        {images.length > 0 && renderImageGrid(images)}

        {others.map((att, idx) => {
          if (att.type === 'video') {
            return (
              <Box
                key={`other-${idx}`}
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: isUser ? 'rgba(255,255,255,0.1)' : colors.divider,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                }}
                onClick={() => window.open(att.url, '_blank')}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: 'rgba(229, 115, 115, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlayCircleFilledIcon sx={{ color: '#E57373' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: colors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.fileName || '동영상'}
                  </Typography>
                  {att.fileSize && (
                    <Typography sx={{ fontSize: 11, color: colors.textTertiary }}>
                      {formatFileSize(att.fileSize)}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }

          const FileIcon = getFileIcon(att.fileName);
          return (
            <Box
              key={`other-${idx}`}
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: isUser ? 'rgba(255,255,255,0.1)' : colors.divider,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
              }}
              onClick={() => window.open(att.url, '_blank')}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: 'rgba(129, 199, 132, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileIcon sx={{ color: '#81C784' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: colors.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.fileName || '파일'}
                </Typography>
                {att.fileSize && (
                  <Typography sx={{ fontSize: 11, color: colors.textTertiary }}>
                    {formatFileSize(att.fileSize)}
                  </Typography>
                )}
              </Box>
              <DownloadIcon sx={{ fontSize: 18, color: colors.textTertiary }} />
            </Box>
          );
        })}
      </>
    );
  };

  // 비로그인 시 로그인 안내
  if (!isLoggedIn) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: colors.background, gap: 3, px: 3 }}
      >
        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 64, color: colors.textTertiary }} />
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 30, sm: 40 },
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: 'center',
            letterSpacing: '-0.03em',
          }}
        >
          난임정보톡톡
        </Typography>
        <Typography
          sx={{
            maxWidth: 720,
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 1.9,
          }}
        >
          난임정보톡톡 공식 홈페이지에서는 난임백과, 뉴스, 공지사항, 아기성공TV와 전문가 1:1
          상담을 제공합니다.
        </Typography>
        <Typography
          sx={{
            maxWidth: 720,
            fontSize: 14,
            color: colors.textTertiary,
            textAlign: 'center',
            lineHeight: 1.8,
          }}
        >
          로그인하면 전문가 상담을 시작할 수 있고, 비로그인 상태에서도 난임백과와 뉴스 같은
          공개 콘텐츠를 확인할 수 있습니다.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <Box
            component="button"
            onClick={() => navigate('/login')}
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: 2,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#5558E6' },
            }}
          >
            로그인 / 회원가입
          </Box>
          <Box
            component="a"
            href="/encyclopedia"
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              bgcolor: 'white',
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            난임백과 보기
          </Box>
          <Box
            component="a"
            href="/news"
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              bgcolor: 'white',
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            뉴스 보기
          </Box>
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress sx={{ color: colors.textSecondary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(100, 181, 246, 0.15)',
            border: '3px dashed #64B5F6',
            borderRadius: 2,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              px: 4,
              py: 3,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              textAlign: 'center',
            }}
          >
            <AddIcon sx={{ fontSize: 48, color: '#64B5F6', mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 500, color: colors.textPrimary }}>
              파일을 여기에 놓으세요
            </Typography>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mt: 0.5 }}>
              최대 5개까지 첨부 가능
            </Typography>
          </Box>
        </Box>
      )}

      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${colors.border}`,
          bgcolor: 'rgba(255,255,255,0.82)',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <SupportAgentIcon sx={{ fontSize: 24, color: 'white' }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 600,
              color: colors.textPrimary,
              fontSize: 16,
            }}
          >
            난임 전문 상담
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            이승주가 친절하게 답변해드립니다
          </Typography>
        </Box>
      </Box>

      {/* 메시지 영역 */}
      <Box
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
        }}
      >
        {loadingOlderMessages && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={18} sx={{ color: colors.textSecondary }} />
          </Box>
        )}
        {/* 대화가 없을 때 안내 메시지 */}
        {messages.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              py: 8,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 40, color: colors.primary }} />
            </Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 600,
                color: colors.textPrimary,
                mb: 1,
              }}
            >
              상담을 시작해보세요
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                maxWidth: 300,
              }}
            >
              난임에 관한 궁금한 점이나 고민이 있으시면
              언제든지 메시지를 보내주세요.
            </Typography>
          </Box>
        )}

        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <Box key={dateKey}>
            {/* 날짜 구분선 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                my: 3,
              }}
            >
              <Box sx={{ flex: 1, height: 1, bgcolor: colors.divider }} />
              <Typography
                sx={{
                  px: 2,
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontWeight: 500,
                }}
              >
                {formatDate(msgs[0]?.createdAt)}
              </Typography>
              <Box sx={{ flex: 1, height: 1, bgcolor: colors.divider }} />
            </Box>

            {/* 메시지들 */}
            {msgs.map((msg) => {
              const isUser = msg.senderRole === 'user';
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                  }}
                >
                  {!isUser && (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: colors.adminMessage,
                        border: `1px solid ${colors.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1,
                        flexShrink: 0,
                      }}
                    >
                      <SupportAgentIcon sx={{ fontSize: 18, color: colors.textSecondary }} />
                    </Box>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      px: 2,
                      py: 1.5,
                      bgcolor: isUser ? colors.userMessage : colors.adminMessage,
                      borderRadius: isUser
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                      border: isUser ? 'none' : `1px solid ${colors.divider}`,
                    }}
                  >
                    {msg.text && (
                      <Typography
                        sx={{
                          fontSize: 15,
                          color: colors.textPrimary,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.text}
                      </Typography>
                    )}
                    {renderAttachments(msg, isUser)}
                    {msg.imageUrl && !msg.attachments?.length && (
                      isChatAttachmentExpired(msg.createdAt)
                        ? renderExpiredAttachmentNotice(isUser)
                        : (
                          <Box
                            sx={{ mt: msg.text ? 1 : 0, cursor: 'pointer' }}
                            onClick={() => setPreviewImage(msg.imageUrl)}
                          >
                            <img
                              src={msg.imageUrl}
                              alt="첨부 이미지"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 200,
                                borderRadius: 8,
                              }}
                            />
                          </Box>
                        )
                    )}
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: colors.textTertiary,
                        mt: 0.75,
                        textAlign: 'right',
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                  </Box>
                  {isUser && (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: colors.backgroundAlt,
                        border: `1px solid ${colors.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: 14 }}>👤</Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* 첨부파일 미리보기 */}
      {pendingFiles.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: `1px solid ${colors.border}`,
            bgcolor: colors.cardTint,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 0.5 }}>
            {pendingFiles.map((fileObj, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  borderRadius: 2,
                  border: `1px solid ${colors.divider}`,
                  bgcolor: colors.background,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {fileObj.type === 'image' ? (
                  <img
                    src={fileObj.preview}
                    alt="미리보기"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : fileObj.type === 'video' ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(229, 115, 115, 0.1)',
                    }}
                  >
                    <VideoFileIcon sx={{ color: '#E57373' }} />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(129, 199, 132, 0.1)',
                      p: 0.5,
                    }}
                  >
                    <InsertDriveFileIcon sx={{ color: '#81C784', fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: 8,
                        color: colors.textSecondary,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                      }}
                    >
                      {fileObj.file.name}
                    </Typography>
                  </Box>
                )}
                <IconButton
                  size="small"
                  onClick={() => removePendingFile(index)}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: 11, color: colors.textTertiary }}>
            {pendingFiles.some(f => f.type === 'video')
              ? '동영상 7일, 이미지/문서 30일 후 자동 삭제'
              : '이미지/문서는 30일 후 자동 삭제됩니다'}
          </Typography>
        </Box>
      )}

      {/* 입력 영역 */}
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${colors.border}`,
          bgcolor: colors.cardTint,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          multiple
          style={{ display: 'none' }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          sx={{
            width: 40,
            height: 40,
            bgcolor: colors.background,
            border: `1px solid ${colors.divider}`,
            borderRadius: '50%',
            '&:hover': { bgcolor: colors.backgroundAlt },
          }}
        >
          <AddIcon sx={{ color: colors.textSecondary }} />
        </IconButton>

        <Box
          sx={{
            flex: 1,
            bgcolor: colors.background,
            borderRadius: 3,
            border: `1px solid ${colors.divider}`,
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="메시지를 입력하세요"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'transparent',
                '& fieldset': { border: 'none' },
              },
              '& .MuiInputBase-input': {
                py: 1.5,
                px: 2,
                fontSize: 15,
              },
            }}
          />
        </Box>
        <IconButton
          type="submit"
          disabled={sending || (!newMessage.trim() && pendingFiles.length === 0)}
          sx={{
            width: 44,
            height: 44,
            bgcolor: sending || (!newMessage.trim() && pendingFiles.length === 0)
              ? colors.divider
              : colors.primary,
            borderRadius: '50%',
            color: 'white',
            '&:hover': {
              bgcolor: colors.primary,
            },
            '&.Mui-disabled': {
              bgcolor: colors.divider,
              color: colors.background,
            },
          }}
        >
          {uploading ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <ArrowUpwardIcon />
          )}
        </IconButton>
      </Box>

      {/* 이미지 갤러리 다이얼로그 */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            maxWidth: '95vw',
            maxHeight: '95vh',
          }
        }}
      >
        <Box sx={{ position: 'relative', minWidth: 300 }}>
          <IconButton
            onClick={() => setPreviewImage(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {previewImage && (
            <>
              {typeof previewImage === 'string' ? (
                <img
                  src={previewImage}
                  alt="미리보기"
                  style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    onClick={() => setPreviewImage(prev => ({
                      ...prev,
                      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                    }))}
                    sx={{
                      color: 'white',
                      mx: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                    disabled={previewImage.images.length <= 1}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 40 }} />
                  </IconButton>

                  <Box sx={{ textAlign: 'center' }}>
                    <img
                      src={previewImage.images[previewImage.currentIndex]?.url}
                      alt="미리보기"
                      style={{ maxWidth: '80vw', maxHeight: '85vh', display: 'block' }}
                    />
                    {previewImage.images.length > 1 && (
                      <Typography sx={{ color: 'white', mt: 1, fontSize: 14 }}>
                        {previewImage.currentIndex + 1} / {previewImage.images.length}
                      </Typography>
                    )}
                  </Box>

                  <IconButton
                    onClick={() => setPreviewImage(prev => ({
                      ...prev,
                      currentIndex: (prev.currentIndex + 1) % prev.images.length
                    }))}
                    sx={{
                      color: 'white',
                      mx: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                    disabled={previewImage.images.length <= 1}
                  >
                    <ChevronRightIcon sx={{ fontSize: 40 }} />
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}

export default UserChatWindow;
