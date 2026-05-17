import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { db } from '../firebase';
import { colors } from '../theme';
import {
  pageHeaderSx,
  pageShellSx,
  paginationButtonSx,
  statCardSx,
} from '../utils/webDesignStyles';

const USER_PAGE_SIZE = 20;

function formatDate(value) {
  const date = value?.toDate?.() || null;
  if (!date) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

async function fetchUsersPage(cursor = null) {
  const constraints = [orderBy('createdAt', 'desc')];
  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limit(USER_PAGE_SIZE));

  const snapshot = await getDocs(query(collection(db, 'users'), ...constraints));

  return {
    users: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    cursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
    hasMore: snapshot.docs.length === USER_PAGE_SIZE,
  };
}

async function fetchUsersCount() {
  const snapshot = await getCountFromServer(query(collection(db, 'users')));
  return snapshot.data().count;
}

function UserManagement() {
  const [pages, setPages] = useState([]);
  const [pageCursors, setPageCursors] = useState([]);
  const [hasMoreByPage, setHasMoreByPage] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState('');
  const [totalUserCount, setTotalUserCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadFirstPage = async () => {
      setLoading(true);
      try {
        const [firstPage, userCount] = await Promise.all([
          fetchUsersPage(),
          fetchUsersCount(),
        ]);
        if (!isMounted) return;

        setPages([firstPage.users]);
        setPageCursors([firstPage.cursor]);
        setHasMoreByPage([firstPage.hasMore]);
        setTotalUserCount(userCount);
        setCurrentPageIndex(0);
        setError('');
      } catch (err) {
        if (!isMounted) return;
        console.error('사용자 목록 조회 오류:', err);
        setError('사용자 목록을 불러오지 못했습니다.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadFirstPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const users = useMemo(
    () => pages[currentPageIndex] || [],
    [pages, currentPageIndex]
  );
  const totalPages = Math.ceil(totalUserCount / USER_PAGE_SIZE);
  const canGoPrevious = currentPageIndex > 0;
  const canGoNext =
    currentPageIndex < totalPages - 1 ||
    Boolean(pages[currentPageIndex + 1]) ||
    Boolean(hasMoreByPage[currentPageIndex]);

  const handlePageChange = async (pageIndex) => {
    if (pageIndex < 0 || loadingPage) return;
    if (pageIndex >= totalPages && !hasMoreByPage[currentPageIndex]) return;

    if (pages[pageIndex]) {
      setCurrentPageIndex(pageIndex);
      return;
    }

    setLoadingPage(true);
    try {
      const nextPages = [...pages];
      const nextCursors = [...pageCursors];
      const nextHasMoreByPage = [...hasMoreByPage];
      let loadedPageIndex = nextPages.length - 1;
      let cursor = nextCursors[loadedPageIndex];

      while (loadedPageIndex < pageIndex && cursor) {
        const nextPage = await fetchUsersPage(cursor);
        if (nextPage.users.length === 0) {
          nextHasMoreByPage[loadedPageIndex] = false;
          break;
        }

        nextHasMoreByPage[loadedPageIndex] = true;
        loadedPageIndex += 1;
        nextPages[loadedPageIndex] = nextPage.users;
        nextCursors[loadedPageIndex] = nextPage.cursor;
        nextHasMoreByPage[loadedPageIndex] = nextPage.hasMore;
        cursor = nextPage.cursor;
      }

      setPages(nextPages);
      setPageCursors(nextCursors);
      setHasMoreByPage(nextHasMoreByPage);
      if (nextPages[pageIndex]) setCurrentPageIndex(pageIndex);
      setError('');
    } catch (err) {
      console.error('사용자 페이지 조회 오류:', err);
      setError('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingPage(false);
    }
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious || loadingPage) return;
    handlePageChange(currentPageIndex - 1);
  };

  const handleNextPage = async () => {
    if (!canGoNext || loadingPage) return;
    await handlePageChange(currentPageIndex + 1);
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      return name.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [users, searchQuery]);

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const normalUserCount = users.length - adminCount;

  return (
    <Box sx={pageShellSx}>
      <Box sx={pageHeaderSx}>
        <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
          사용자 관리
        </Typography>
        <Typography sx={{ color: colors.textSecondary }}>
          가입한 사용자 정보를 조회합니다.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={statCardSx(colors)}>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              전체 사용자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {totalUserCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={statCardSx(colors)}>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              현재 페이지 일반 사용자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {normalUserCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={statCardSx(colors)}>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              현재 페이지 관리자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {adminCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.82)' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PeopleAltRoundedIcon sx={{ color: colors.primary }} />
            <Box>
              <Typography variant="h6" sx={{ color: colors.textPrimary }}>
                사용자 목록
              </Typography>
              <Typography sx={{ fontSize: 12, color: colors.textTertiary }}>
                {currentPageIndex + 1} / {Math.max(totalPages, 1)}페이지 · 페이지당 최대 {USER_PAGE_SIZE}명
              </Typography>
            </Box>
          </Box>
          <TextField
            size="small"
            placeholder="현재 페이지에서 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 320 } }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress sx={{ color: colors.primary }} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>권한</TableCell>
                  <TableCell>가입일</TableCell>
                  <TableCell>기기 상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                      표시할 사용자가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: colors.textPrimary }}>
                            {user.name || '이름 없음'}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: colors.textTertiary }}>
                            {user.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.role === 'admin' ? '관리자' : '사용자'}
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          variant={user.role === 'admin' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.lastDeviceId || user.fcmToken ? '등록됨' : '없음'}
                          color={user.lastDeviceId || user.fcmToken ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mt: 3,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ChevronLeftRoundedIcon />}
              onClick={handlePreviousPage}
              disabled={!canGoPrevious || loadingPage}
              sx={{ borderRadius: 999, px: 3 }}
            >
              이전
            </Button>
            <Typography sx={{ color: colors.textSecondary, fontSize: 14, fontWeight: 700 }}>
              {currentPageIndex + 1} / {Math.max(totalPages, 1)}페이지
            </Typography>
            {Array.from({ length: totalPages }, (_, index) => (
              <Button
                key={index}
                variant={currentPageIndex === index ? 'contained' : 'outlined'}
                onClick={() => handlePageChange(index)}
                disabled={loadingPage}
                sx={paginationButtonSx(colors, currentPageIndex === index)}
              >
                {index + 1}
              </Button>
            ))}
            <Button
              variant="contained"
              endIcon={loadingPage ? null : <ChevronRightRoundedIcon />}
              onClick={handleNextPage}
              disabled={!canGoNext || loadingPage}
              sx={{
                borderRadius: 999,
                px: 3,
                bgcolor: colors.primary,
                '&:hover': { bgcolor: colors.primary },
              }}
            >
              {loadingPage ? '불러오는 중' : '다음'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default UserManagement;
