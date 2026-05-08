import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Dialog,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
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
import { colors } from '../theme';

function ChatWindow() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 대화방 정보 가져오기
    const fetchConversation = async () => {
      const convDoc = await getDoc(doc(db, 'conversations', conversationId));
      if (convDoc.exists()) {
        setUserName(convDoc.data().userName || '익명');
      }
    };
    fetchConversation();

    // 메시지 실시간 리스너
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    // 읽음 표시 + 관리자가 본 적 있음 표시
    updateDoc(doc(db, 'conversations', conversationId), {
      unreadByAdmin: 0,
      hasAdminViewed: true,
    });

    return unsubscribe;
  }, [conversationId]);

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

  // 파일 크기 제한 (storage.rules와 동일)
  const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,   // 10MB
    video: 100 * 1024 * 1024,  // 100MB
    file: 50 * 1024 * 1024,    // 50MB
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

    // 파일 크기 검증
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

  // 드래그 앤 드롭 핸들러
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
    if ((!newMessage.trim() && pendingFiles.length === 0) || sending) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSending(true);
    setUploading(pendingFiles.length > 0);

    try {
      // 파일 업로드
      let attachments = null;
      if (pendingFiles.length > 0) {
        attachments = await Promise.all(pendingFiles.map(uploadFile));
      }

      // 마지막 메시지 텍스트 생성
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
        senderRole: 'admin',
        senderName: '전문가',
        text: newMessage.trim(),
        imageUrl: null,
        attachments: attachments,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: lastMessageText,
        lastMessageAt: serverTimestamp(),
        unreadByUser: increment(1),
        hasAdminReplied: true,
      });

      // 정리
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

  const handleMessageKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (e.nativeEvent?.isComposing || e.nativeEvent?.keyCode === 229) return;

    e.preventDefault();
    handleSendMessage(e);
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

  // 날짜별로 메시지 그룹화
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = msg.createdAt?.toDate().toDateString() || 'unknown';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
    return groups;
  }, {});

  // 이미지 그리드 레이아웃 (카카오톡 스타일)
  const renderImageGrid = (images, allAttachments) => {
    const count = images.length;
    const gridSize = 200; // 전체 그리드 크기
    const gap = 2;

    // 전체 이미지 목록에서 현재 이미지의 인덱스를 찾는 함수
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

    // 5개 이상: 2x2 그리드 + 마지막에 "+N" 오버레이
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

  const renderAttachments = (attachments, isAdmin) => {
    if (!attachments || attachments.length === 0) return null;

    // 이미지와 다른 파일 분리
    const images = attachments.filter(att => att.type === 'image');
    const others = attachments.filter(att => att.type !== 'image');

    return (
      <>
        {/* 이미지 그리드 */}
        {images.length > 0 && renderImageGrid(images, attachments)}

        {/* 동영상 및 파일 */}
        {others.map((att, idx) => {
          if (att.type === 'video') {
            return (
              <Box
                key={`other-${idx}`}
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: isAdmin ? 'rgba(255,255,255,0.1)' : colors.divider,
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

          // file
          const FileIcon = getFileIcon(att.fileName);
          return (
            <Box
              key={`other-${idx}`}
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: isAdmin ? 'rgba(255,255,255,0.1)' : colors.divider,
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
          px: 1,
          py: 1.5,
          borderBottom: `1px solid ${colors.divider}`,
          bgcolor: colors.inputBackground,
        }}
      >
        <IconButton
          onClick={() => navigate('/')}
          sx={{ color: colors.textSecondary, mr: 1 }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography
          sx={{
            fontWeight: 500,
            color: colors.textPrimary,
            fontSize: 16,
          }}
        >
          {userName}
        </Typography>
      </Box>

      {/* 메시지 영역 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
        }}
      >
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
              const isAdmin = msg.senderRole === 'admin';
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                    px: isAdmin ? 0 : 0,
                  }}
                >
                  {!isAdmin && (
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
                        mr: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: 14 }}>👤</Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      px: 2,
                      py: 1.5,
                      bgcolor: isAdmin ? colors.userMessage : colors.inputBackground,
                      borderRadius: isAdmin
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                      border: isAdmin ? 'none' : `1px solid ${colors.divider}`,
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
                    {/* 첨부파일 표시 */}
                    {renderAttachments(msg.attachments, isAdmin)}
                    {/* 하위호환: imageUrl */}
                    {msg.imageUrl && !msg.attachments?.length && (
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
                  {isAdmin && (
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
                        ml: 1,
                        flexShrink: 0,
                      }}
                    >
                      <SupportAgentIcon sx={{ fontSize: 18, color: colors.textSecondary }} />
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
            borderTop: `1px solid ${colors.divider}`,
            bgcolor: colors.backgroundAlt,
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
          {/* 파일 보관 기간 안내 */}
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
          borderTop: `1px solid ${colors.divider}`,
          bgcolor: colors.inputBackground,
        }}
      >
        {/* 파일 첨부 버튼 */}
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
            placeholder="답변을 입력하세요 (Shift+Enter 줄바꿈)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleMessageKeyDown}
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
              : colors.textPrimary,
            borderRadius: '50%',
            color: colors.background,
            '&:hover': {
              bgcolor: colors.textPrimary,
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
          {/* 닫기 버튼 */}
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

          {/* 이미지 표시 */}
          {previewImage && (
            <>
              {/* 단일 이미지 (이전 방식 호환) */}
              {typeof previewImage === 'string' ? (
                <img
                  src={previewImage}
                  alt="미리보기"
                  style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }}
                />
              ) : (
                /* 갤러리 모드 */
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* 이전 버튼 */}
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

                  {/* 현재 이미지 */}
                  <Box sx={{ textAlign: 'center' }}>
                    <img
                      src={previewImage.images[previewImage.currentIndex]?.url}
                      alt="미리보기"
                      style={{ maxWidth: '80vw', maxHeight: '85vh', display: 'block' }}
                    />
                    {/* 인디케이터 */}
                    {previewImage.images.length > 1 && (
                      <Typography sx={{ color: 'white', mt: 1, fontSize: 14 }}>
                        {previewImage.currentIndex + 1} / {previewImage.images.length}
                      </Typography>
                    )}
                  </Box>

                  {/* 다음 버튼 */}
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

export default ChatWindow;
