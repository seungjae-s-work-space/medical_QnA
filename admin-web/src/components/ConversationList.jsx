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
  Avatar,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { colors } from '../theme';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unread', 'new'
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
    // 필터 모드
    if (filterMode === 'unread' && conv.unreadByAdmin <= 0) return false;
    if (filterMode === 'new' && conv.hasAdminReplied) return false;
    // 검색 필터
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (conv.userName || '').toLowerCase().includes(q) ||
      (conv.lastMessage || '').toLowerCase().includes(q)
    );
  });

  const unreadCount = conversations.filter((c) => c.unreadByAdmin > 0).length;
  // 신규: 관리자가 한 번도 답장하지 않은 채팅방
  const newUserCount = conversations.filter((c) => !c.hasAdminReplied).length;
  const totalCount = conversations.length;

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
          상담 채팅
        </Typography>
        <Typography variant="body1" sx={{ color: colors.textSecondary }}>
          사용자의 상담 내역을 확인하고 답변하세요
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Box
          onClick={() => setFilterMode('all')}
          sx={{
            flex: 1,
            p: 3,
            bgcolor: filterMode === 'all' ? colors.primary : colors.card,
            borderRadius: 3,
            border: `1px solid ${filterMode === 'all' ? colors.primary : colors.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
          }}
        >
          <Typography variant="body2" sx={{ color: filterMode === 'all' ? 'white' : colors.textSecondary, mb: 0.5 }}>
            전체 대화
          </Typography>
          <Typography variant="h4" sx={{ color: filterMode === 'all' ? 'white' : colors.textPrimary, fontWeight: 700 }}>
            {totalCount}
          </Typography>
        </Box>
        <Box
          onClick={() => unreadCount > 0 && setFilterMode(filterMode === 'unread' ? 'all' : 'unread')}
          sx={{
            flex: 1,
            p: 3,
            bgcolor: filterMode === 'unread' ? colors.primary : (unreadCount > 0 ? colors.errorLight : colors.card),
            borderRadius: 3,
            border: `1px solid ${filterMode === 'unread' ? colors.primary : (unreadCount > 0 ? colors.error : colors.border)}`,
            cursor: unreadCount > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s',
            '&:hover': unreadCount > 0 ? {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            } : {},
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: filterMode === 'unread' ? 'white' : (unreadCount > 0 ? colors.error : colors.textSecondary), mb: 0.5 }}
          >
            {filterMode === 'unread' ? '필터 중' : '읽지 않음'}
          </Typography>
          <Typography
            variant="h4"
            sx={{ color: filterMode === 'unread' ? 'white' : (unreadCount > 0 ? colors.error : colors.textPrimary), fontWeight: 700 }}
          >
            {unreadCount}
          </Typography>
        </Box>
        <Box
          onClick={() => newUserCount > 0 && setFilterMode(filterMode === 'new' ? 'all' : 'new')}
          sx={{
            flex: 1,
            p: 3,
            bgcolor: filterMode === 'new' ? colors.primary : (newUserCount > 0 ? colors.warningLight : colors.card),
            borderRadius: 3,
            border: `1px solid ${filterMode === 'new' ? colors.primary : (newUserCount > 0 ? colors.warning : colors.border)}`,
            cursor: newUserCount > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s',
            '&:hover': newUserCount > 0 ? {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            } : {},
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: filterMode === 'new' ? 'white' : (newUserCount > 0 ? colors.warning : colors.textSecondary), mb: 0.5 }}
          >
            {filterMode === 'new' ? '필터 중' : '신규 사용자'}
          </Typography>
          <Typography
            variant="h4"
            sx={{ color: filterMode === 'new' ? 'white' : (newUserCount > 0 ? colors.warning : colors.textPrimary), fontWeight: 700 }}
          >
            {newUserCount}
          </Typography>
        </Box>
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
              <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
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
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary }} />
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15, fontWeight: 500 }}>
            {searchQuery ? '검색 결과가 없습니다' : '아직 상담 내역이 없습니다'}
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
                      bgcolor: hasUnread ? colors.primaryLight : 'transparent',
                      '&:hover': {
                        bgcolor: hasUnread ? colors.primaryLight : colors.backgroundAlt,
                      },
                    }}
                  >
                    {/* Avatar */}
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: hasUnread ? colors.primary : colors.backgroundAlt,
                        color: hasUnread ? '#fff' : colors.textPrimary,
                        mr: 2.5,
                        fontWeight: 600,
                        fontSize: 18,
                      }}
                    >
                      {initial}
                    </Avatar>

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
                                height: 22,
                                minWidth: 22,
                                bgcolor: colors.primary,
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 700,
                                '& .MuiChip-label': { px: 1 },
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: colors.textTertiary,
                            fontWeight: 500,
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
