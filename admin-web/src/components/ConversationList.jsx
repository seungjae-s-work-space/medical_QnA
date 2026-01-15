import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  List,
  ListItem,
  ListItemButton,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { colors } from '../theme';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (conv.userName || '').toLowerCase().includes(query) ||
      (conv.lastMessage || '').toLowerCase().includes(query)
    );
  });

  const unreadCount = conversations.filter((c) => c.unreadByAdmin > 0).length;

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h5" fontWeight={700} color={colors.textPrimary}>
            상담 채팅
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount}개 읽지 않음`}
              size="small"
              sx={{
                bgcolor: '#FFEBEE',
                color: '#E57373',
                fontWeight: 600,
                fontSize: 12,
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color={colors.textSecondary}>
          사용자의 상담 내역을 확인하고 답변하세요
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="사용자 이름 또는 메시지 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textSecondary }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Conversation List */}
      {filteredConversations.length === 0 ? (
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
            <Typography sx={{ fontSize: 32, opacity: 0.5 }}>💬</Typography>
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            {searchQuery ? '검색 결과가 없습니다' : '아직 상담 내역이 없습니다'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            bgcolor: colors.inputBackground,
            borderRadius: 3,
            border: `1px solid ${colors.divider}`,
            overflow: 'hidden',
          }}
        >
          <List sx={{ p: 0 }}>
            {filteredConversations.map((conv, index) => {
              const userName = conv.userName || '익명';
              const initial = userName.charAt(0);
              const hasUnread = conv.unreadByAdmin > 0;

              return (
                <ListItem
                  key={conv.id}
                  disablePadding
                  sx={{
                    borderBottom:
                      index < filteredConversations.length - 1
                        ? `1px solid ${colors.divider}`
                        : 'none',
                  }}
                >
                  <ListItemButton
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    sx={{
                      py: 2.5,
                      px: 3,
                      bgcolor: hasUnread ? 'rgba(229, 115, 115, 0.04)' : 'transparent',
                      '&:hover': {
                        bgcolor: hasUnread
                          ? 'rgba(229, 115, 115, 0.08)'
                          : colors.backgroundAlt,
                      },
                    }}
                  >
                    {/* Avatar */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: hasUnread ? '#FFEBEE' : colors.backgroundAlt,
                        border: `1px solid ${hasUnread ? '#FFCDD2' : colors.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2.5,
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: hasUnread ? '#E57373' : colors.textPrimary,
                        }}
                      >
                        {initial}
                      </Typography>
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography
                            sx={{
                              fontWeight: hasUnread ? 700 : 600,
                              color: colors.textPrimary,
                              fontSize: 15,
                            }}
                          >
                            {userName}
                          </Typography>
                          {hasUnread && (
                            <Chip
                              label={conv.unreadByAdmin}
                              size="small"
                              sx={{
                                height: 20,
                                minWidth: 20,
                                bgcolor: '#E57373',
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 700,
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: colors.textTertiary,
                          }}
                        >
                          {formatTime(conv.lastMessageAt)}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          color: hasUnread ? colors.textPrimary : colors.textSecondary,
                          fontSize: 14,
                          fontWeight: hasUnread ? 500 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.lastMessage}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}
    </Box>
  );
}

export default ConversationList;
