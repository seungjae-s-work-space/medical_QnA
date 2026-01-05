import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  List,
  ListItem,
  ListItemButton,
  Typography,
  Box,
  IconButton,
  Snackbar
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { colors } from '../theme';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convs);
    });

    return unsubscribe;
  }, []);

  // 알림 설정 로드
  useEffect(() => {
    const loadNotificationSetting = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNotificationsEnabled(data.notificationsEnabled !== false);
        }
      } catch (error) {
        console.error('알림 설정 로드 실패:', error);
      }
    };

    loadNotificationSetting();
  }, []);

  const handleToggleNotification = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newValue = !notificationsEnabled;

    try {
      await setDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: newValue,
      }, { merge: true });

      setNotificationsEnabled(newValue);
      setSnackbarMessage(newValue ? '알림이 켜졌습니다' : '알림이 꺼졌습니다');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('알림 설정 변경 실패:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2,
          borderBottom: `1px solid ${colors.divider}`,
          bgcolor: colors.inputBackground,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: colors.textPrimary,
            letterSpacing: 0.5,
          }}
        >
          난임&상담톡
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            onClick={handleToggleNotification}
            sx={{ color: colors.textSecondary }}
          >
            {notificationsEnabled ? (
              <NotificationsActiveIcon fontSize="small" />
            ) : (
              <NotificationsOffIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            onClick={handleLogout}
            sx={{ color: colors.textSecondary }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 대화 목록 */}
      <Box sx={{ py: 1 }}>
        {conversations.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: colors.inputBackground,
                border: `1px solid ${colors.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 28, opacity: 0.4 }}>💬</Typography>
            </Box>
            <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
              아직 질문이 없습니다
            </Typography>
          </Box>
        ) : (
          <List sx={{ px: 2, py: 1 }}>
            {conversations.map((conv, index) => {
              const userName = conv.userName || '익명';
              const initial = userName.charAt(0);
              const hasUnread = conv.unreadByAdmin > 0;

              return (
                <ListItem key={conv.id} disablePadding sx={{ mb: 1.5 }}>
                  <ListItemButton
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    sx={{
                      borderRadius: 3,
                      py: 2,
                      px: 2,
                      bgcolor: colors.inputBackground,
                      border: `1px solid ${hasUnread ? colors.buttonBorder : colors.divider}`,
                      boxShadow: hasUnread
                        ? '0 2px 8px rgba(0,0,0,0.06)'
                        : '0 1px 3px rgba(0,0,0,0.02)',
                      '&:hover': {
                        bgcolor: colors.backgroundAlt,
                        borderColor: colors.buttonBorder,
                      },
                    }}
                  >
                    {/* 프로필 아바타 */}
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: hasUnread ? colors.adminMessage : colors.backgroundAlt,
                        border: `1px solid ${colors.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: colors.textPrimary,
                        }}
                      >
                        {initial}
                      </Typography>
                    </Box>

                    {/* 내용 */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: hasUnread ? 600 : 500,
                              color: colors.textPrimary,
                              fontSize: 15,
                            }}
                          >
                            {userName}
                          </Typography>
                          {hasUnread && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: '#E57373',
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: colors.textTertiary,
                          }}
                        >
                          {formatTime(conv.lastMessageAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          sx={{
                            color: hasUnread ? colors.textPrimary : colors.textSecondary,
                            fontSize: 13,
                            fontWeight: hasUnread ? 500 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {conv.lastMessage}
                        </Typography>
                        {hasUnread && (
                          <Box
                            sx={{
                              minWidth: 22,
                              height: 22,
                              borderRadius: 11,
                              bgcolor: '#E57373',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              px: 0.75,
                            }}
                          >
                            {conv.unreadByAdmin}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* 스낵바 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default ConversationList;
