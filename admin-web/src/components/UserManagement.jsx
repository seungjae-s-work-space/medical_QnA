import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { colors } from '../theme';

function formatDate(value) {
  const date = value?.toDate?.() || null;
  if (!date) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const nextUsers = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const aDate = a.createdAt?.toDate?.()?.getTime() ?? 0;
            const bDate = b.createdAt?.toDate?.()?.getTime() ?? 0;
            return bDate - aDate;
          });

        setUsers(nextUsers);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('사용자 목록 조회 오류:', err);
        setError('사용자 목록을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

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
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
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
        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              전체 사용자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {users.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              일반 사용자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {normalUserCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 13, color: colors.textSecondary, mb: 1 }}>
              관리자
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>
              {adminCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 3 }}>
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
            <Typography variant="h6" sx={{ color: colors.textPrimary }}>
              사용자 목록
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="이름, 이메일, 권한 검색"
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
      </Paper>
    </Box>
  );
}

export default UserManagement;
