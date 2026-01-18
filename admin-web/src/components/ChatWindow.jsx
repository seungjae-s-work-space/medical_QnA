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
import { db, auth } from '../firebase';
import {
  Box,
  TextField,
  IconButton,
  Typography,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { colors } from '../theme';

function ChatWindow() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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

    // 메시지 실시간 구독
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

    // 읽음 표시
    updateDoc(doc(db, 'conversations', conversationId), {
      unreadByAdmin: 0,
    });

    return unsubscribe;
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSending(true);

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId: currentUser.uid,
      senderRole: 'admin',
      senderName: '전문가',
      text: newMessage,
      imageUrl: null,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: newMessage,
      lastMessageAt: serverTimestamp(),
      unreadByUser: increment(1),
      hasAdminReplied: true,
    });

    setNewMessage('');
    setSending(false);
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

  // 날짜별로 메시지 그룹화
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = msg.createdAt?.toDate().toDateString() || 'unknown';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(msg);
    return groups;
  }, {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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

      {/* 입력 영역 */}
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${colors.divider}`,
          bgcolor: colors.inputBackground,
        }}
      >
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
            placeholder="답변을 입력하세요"
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
          disabled={sending || !newMessage.trim()}
          sx={{
            width: 44,
            height: 44,
            bgcolor: sending || !newMessage.trim() ? colors.divider : colors.textPrimary,
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
          <ArrowUpwardIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default ChatWindow;
