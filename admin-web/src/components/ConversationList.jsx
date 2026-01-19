import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
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
  IconButton,
  CircularProgress,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { colors } from '../theme';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unread', 'new'
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null); // { conversationId: matchedMessage }
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

  // 전체 메시지 검색 함수
  const handleDeepSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    const results = {};
    const keyword = searchQuery.toLowerCase();

    try {
      // 모든 대화방의 메시지를 병렬로 검색
      await Promise.all(
        conversations.map(async (conv) => {
          const messagesRef = collection(db, 'conversations', conv.id, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);

          for (const msgDoc of messagesSnapshot.docs) {
            const msgData = msgDoc.data();
            const text = (msgData.text || '').toLowerCase();

            if (text.includes(keyword)) {
              // 첫 번째 매칭 메시지만 저장
              if (!results[conv.id]) {
                results[conv.id] = msgData.text;
              }
              break;
            }
          }
        })
      );

      setSearchResults(results);
    } catch (error) {
      console.error('검색 중 오류:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 결과 초기화
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // 키워드 하이라이트 함수
  const highlightKeyword = (text, keyword) => {
    if (!keyword || !text) return text;

    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);

    if (index === -1) return text;

    // 키워드 주변 텍스트 추출 (앞뒤로 20자)
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + keyword.length + 20);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
  };

  // 메시지가 있는 대화방만 (빈 대화방 제외)
  const activeConversations = conversations.filter((c) => c.lastMessage);

  const filteredConversations = activeConversations.filter((conv) => {
    // 필터 모드
    if (filterMode === 'unread') {
      // 읽지 않음: unreadByAdmin > 0이고 메시지가 있는 경우만
      if (conv.unreadByAdmin <= 0) return false;
    }
    // 신규 사용자: 관리자가 답장 안 한 경우
    if (filterMode === 'new' && conv.hasAdminReplied) return false;

    // 깊은 검색 결과가 있으면 해당 결과로 필터링
    if (searchResults !== null) {
      return conv.id in searchResults;
    }

    // 기본 검색 필터 (사용자 이름만)
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (conv.userName || '').toLowerCase().includes(q);
  });

  const unreadCount = activeConversations.filter((c) => c.unreadByAdmin > 0).length;
  // 신규: 관리자가 한 번도 답장하지 않은 채팅방
  const newUserCount = activeConversations.filter((c) => !c.hasAdminReplied).length;
  const totalCount = activeConversations.length;

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
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="대화 내용 검색... (검색 버튼을 눌러주세요)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value) {
              setSearchResults(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleDeepSearch();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
              </InputAdornment>
            ),
            endAdornment: searchResults !== null && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <Typography sx={{ fontSize: 12, color: colors.textTertiary }}>✕</Typography>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <IconButton
          onClick={handleDeepSearch}
          disabled={isSearching || !searchQuery.trim()}
          sx={{
            width: 56,
            height: 56,
            bgcolor: colors.primary,
            color: 'white',
            borderRadius: 2,
            '&:hover': {
              bgcolor: colors.primary,
              opacity: 0.9,
            },
            '&.Mui-disabled': {
              bgcolor: colors.divider,
              color: colors.textTertiary,
            },
          }}
        >
          {isSearching ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            <SearchRoundedIcon />
          )}
        </IconButton>
      </Box>

      {/* 검색 결과 안내 */}
      {searchResults !== null && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
            "{searchQuery}" 검색 결과: <strong>{Object.keys(searchResults).length}</strong>개의 채팅방
          </Typography>
          <Chip
            label="검색 초기화"
            size="small"
            onClick={clearSearch}
            sx={{
              bgcolor: colors.backgroundAlt,
              color: colors.textSecondary,
              fontSize: 12,
              cursor: 'pointer',
              '&:hover': { bgcolor: colors.divider },
            }}
          />
        </Box>
      )}

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
                      {/* 검색 결과가 있으면 매칭된 메시지 표시 */}
                      {searchResults && searchResults[conv.id] ? (
                        <Typography
                          sx={{
                            color: colors.primary,
                            fontSize: 14,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          💬 {highlightKeyword(searchResults[conv.id], searchQuery)}
                        </Typography>
                      ) : (
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
                      )}
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
