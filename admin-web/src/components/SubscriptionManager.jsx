import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  MenuItem,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { colors } from '../theme';

const SUBSCRIPTION_PLANS = {
  plan_monthly: '월간 이용권',
  plan_6months: '6개월 이용권',
  plan_12months: '12개월 이용권',
  admin_grant: '관리자 부여',
};

function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantConfirmDialogOpen, setGrantConfirmDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [grantDays, setGrantDays] = useState(30);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingGrant, setPendingGrant] = useState(null); // { user, days } for confirmation

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 전체 사용자 목록 가져오기
  useEffect(() => {
    const fetchAllUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUsers(usersList);
    };
    fetchAllUsers();
  }, []);

  // 구독 목록 실시간 구독
  useEffect(() => {
    let q = query(
      collection(db, 'subscriptions'),
      orderBy('endDate', 'desc')
    );

    if (filter !== 'all') {
      q = query(
        collection(db, 'subscriptions'),
        where('status', '==', filter),
        orderBy('endDate', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const subs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSubscriptions(subs);

      // 사용자 정보 가져오기
      const userIds = [...new Set(subs.map((s) => s.userId))];
      const userMap = {};
      for (const userId of userIds) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userMap[userId] = userDoc.data();
        }
      }
      setUsers(userMap);
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  // 통계 계산
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
      let total = 0;
      let active = 0;
      let expired = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === 'active') {
          const endDate = data.endDate?.toDate();
          if (endDate && endDate > new Date()) {
            active++;
          } else {
            expired++;
          }
        } else if (data.status === 'expired') {
          expired++;
        }
      });

      setStats({ total, active, expired });
    });

    return unsubscribe;
  }, []);

  // 구독이 없는 사용자 필터링 (admin 계정 제외)
  const usersWithoutSubscription = allUsers.filter(user => {
    // admin 계정 제외
    if (user.role === 'admin' || user.isAdmin === true) return false;
    return !subscriptions.some(sub => sub.userId === user.id);
  });

  const handleExtendOpen = (subscription) => {
    setSelectedSubscription(subscription);
    setExtendDays(30);
    setExtendDialogOpen(true);
  };

  const handleBlockOpen = (subscription) => {
    setSelectedSubscription(subscription);
    setBlockDialogOpen(true);
  };

  const handleGrantOpen = () => {
    setSelectedUser(null);
    setGrantDays(30);
    setGrantDialogOpen(true);
  };

  const handleExtend = async () => {
    if (!selectedSubscription) return;

    try {
      const currentEndDate = selectedSubscription.endDate?.toDate() || new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + extendDays);

      await updateDoc(doc(db, 'subscriptions', selectedSubscription.id), {
        endDate: Timestamp.fromDate(newEndDate),
        status: 'active',
        updatedAt: Timestamp.now(),
      });

      setSnackbar({
        open: true,
        message: `구독이 ${extendDays}일 연장되었습니다`,
        severity: 'success',
      });
      setExtendDialogOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '연장 실패: ' + error.message,
        severity: 'error',
      });
    }
  };

  const handleBlock = async () => {
    if (!selectedSubscription) return;

    try {
      await updateDoc(doc(db, 'subscriptions', selectedSubscription.id), {
        status: 'expired',
        endDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setSnackbar({
        open: true,
        message: '구독이 만료 처리되었습니다',
        severity: 'warning',
      });
      setBlockDialogOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '만료 처리 실패: ' + error.message,
        severity: 'error',
      });
    }
  };

  const handleGrant = async () => {
    if (!selectedUser) return;

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + grantDays);

      const subscriptionId = `admin_${selectedUser.id}_${Date.now()}`;

      await setDoc(doc(db, 'subscriptions', subscriptionId), {
        userId: selectedUser.id,
        planId: 'admin_grant',
        platform: 'admin',
        status: 'active',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        grantedBy: 'admin',
      });

      setSnackbar({
        open: true,
        message: `${selectedUser.name}님에게 ${grantDays}일 구독이 부여되었습니다`,
        severity: 'success',
      });
      setGrantDialogOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '구독 부여 실패: ' + error.message,
        severity: 'error',
      });
    }
  };

  // 구독 부여 확인 다이얼로그 열기
  const handleGrantToUser = (user, days) => {
    setPendingGrant({ user, days });
    setGrantConfirmDialogOpen(true);
  };

  // 실제 구독 부여 실행
  const executeGrant = async () => {
    if (!pendingGrant) return;

    const { user, days } = pendingGrant;

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const subscriptionId = `admin_${user.id}_${Date.now()}`;

      await setDoc(doc(db, 'subscriptions', subscriptionId), {
        userId: user.id,
        planId: 'admin_grant',
        platform: 'admin',
        status: 'active',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        grantedBy: 'admin',
      });

      setSnackbar({
        open: true,
        message: `${user.name}님에게 ${days}일 구독이 부여되었습니다`,
        severity: 'success',
      });
      setGrantConfirmDialogOpen(false);
      setPendingGrant(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '구독 부여 실패: ' + error.message,
        severity: 'error',
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getRemainingDays = (endDate) => {
    if (!endDate) return 0;
    const end = endDate.toDate();
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusChip = (subscription) => {
    const endDate = subscription.endDate?.toDate();
    const isActive = subscription.status === 'active' && endDate && endDate > new Date();

    if (isActive) {
      return <Chip label="활성" size="small" sx={{ bgcolor: '#E8F5E9', color: '#4CAF50', fontWeight: 600 }} />;
    } else if (subscription.status === 'expired') {
      return <Chip label="만료" size="small" sx={{ bgcolor: '#FFF3E0', color: '#FF9800', fontWeight: 600 }} />;
    } else if (subscription.status === 'cancelled') {
      return <Chip label="취소" size="small" sx={{ bgcolor: '#FFEBEE', color: '#F44336', fontWeight: 600 }} />;
    }
    return <Chip label="무료" size="small" sx={{ bgcolor: '#F5F5F5', color: '#9E9E9E', fontWeight: 600 }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: colors.textPrimary }}>
          구독 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleGrantOpen}
          sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#43A047' } }}
        >
          구독 부여
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            bgcolor: '#E3F2FD',
            border: '1px solid #90CAF9',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976D2' }}>
            {stats.total}
          </Typography>
          <Typography variant="body2" sx={{ color: '#1976D2' }}>
            전체
          </Typography>
        </Paper>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            bgcolor: '#E8F5E9',
            border: '1px solid #A5D6A7',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
            {stats.active}
          </Typography>
          <Typography variant="body2" sx={{ color: '#4CAF50' }}>
            활성
          </Typography>
        </Paper>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            bgcolor: '#FFF3E0',
            border: '1px solid #FFCC80',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9800' }}>
            {stats.expired}
          </Typography>
          <Typography variant="body2" sx={{ color: '#FF9800' }}>
            만료
          </Typography>
        </Paper>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            bgcolor: '#F3E5F5',
            border: '1px solid #CE93D8',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#9C27B0' }}>
            {usersWithoutSubscription.length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#9C27B0' }}>
            미구독
          </Typography>
        </Paper>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="구독자 관리" />
          <Tab label={`미구독 사용자 (${usersWithoutSubscription.length})`} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          {/* Filter */}
          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(e, newFilter) => newFilter && setFilter(newFilter)}
              size="small"
            >
              <ToggleButton value="all" sx={{ px: 3 }}>전체</ToggleButton>
              <ToggleButton value="active" sx={{ px: 3 }}>활성</ToggleButton>
              <ToggleButton value="expired" sx={{ px: 3 }}>만료</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 600 }}>사용자</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>플랜</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>상태</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>플랫폼</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>시작일</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>만료일</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>남은 기간</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8, color: colors.textSecondary }}>
                      구독 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => {
                    const user = users[subscription.userId];
                    const endDate = subscription.endDate?.toDate();
                    const isActive = subscription.status === 'active' && endDate && endDate > new Date();
                    const remainingDays = getRemainingDays(subscription.endDate);

                    return (
                      <TableRow key={subscription.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user?.name || '알 수 없음'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                              {user?.email || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {SUBSCRIPTION_PLANS[subscription.planId] || subscription.planId || '-'}
                        </TableCell>
                        <TableCell>{getStatusChip(subscription)}</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase' }}>
                          {subscription.platform || '-'}
                        </TableCell>
                        <TableCell>{formatDate(subscription.startDate)}</TableCell>
                        <TableCell>{formatDate(subscription.endDate)}</TableCell>
                        <TableCell>
                          {isActive ? (
                            <Chip
                              label={`${remainingDays}일`}
                              size="small"
                              sx={{ bgcolor: '#E8F5E9', color: '#4CAF50', fontWeight: 600 }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleExtendOpen(subscription)}
                              sx={{ color: '#4CAF50' }}
                              title="기간 연장"
                            >
                              <AddCircleOutlineIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleBlockOpen(subscription)}
                              disabled={!isActive}
                              sx={{ color: isActive ? '#F44336' : '#E0E0E0' }}
                              title="이용 차단"
                            >
                              <BlockIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                <TableCell sx={{ fontWeight: 600 }}>사용자</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>이메일</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>가입일</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>구독 부여</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersWithoutSubscription.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8, color: colors.textSecondary }}>
                    모든 사용자가 구독 중입니다
                  </TableCell>
                </TableRow>
              ) : (
                usersWithoutSubscription.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.name || '알 수 없음'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        {user.email || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? formatDate(user.createdAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleGrantToUser(user, 7)}
                          sx={{ minWidth: 60 }}
                        >
                          1주
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleGrantToUser(user, 30)}
                          sx={{ minWidth: 60 }}
                        >
                          1개월
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleGrantToUser(user, 365)}
                          sx={{ minWidth: 60, bgcolor: '#4CAF50', '&:hover': { bgcolor: '#43A047' } }}
                        >
                          1년
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onClose={() => setExtendDialogOpen(false)}>
        <DialogTitle>구독 기간 연장</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
            {users[selectedSubscription?.userId]?.name || '사용자'}님의 구독을 연장합니다.
          </Typography>
          <TextField
            select
            fullWidth
            label="연장 기간"
            value={extendDays}
            onChange={(e) => setExtendDays(Number(e.target.value))}
          >
            <MenuItem value={7}>1주 (7일)</MenuItem>
            <MenuItem value={30}>1개월 (30일)</MenuItem>
            <MenuItem value={90}>3개월 (90일)</MenuItem>
            <MenuItem value={180}>6개월 (180일)</MenuItem>
            <MenuItem value={365}>1년 (365일)</MenuItem>
          </TextField>
          {selectedSubscription && (
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: colors.textSecondary }}>
              새 만료일: {(() => {
                const currentEnd = selectedSubscription.endDate?.toDate() || new Date();
                const newEnd = new Date(currentEnd);
                newEnd.setDate(newEnd.getDate() + extendDays);
                return newEnd.toLocaleDateString('ko-KR');
              })()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialogOpen(false)}>취소</Button>
          <Button onClick={handleExtend} variant="contained" sx={{ bgcolor: '#4CAF50' }}>
            연장
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
        <DialogTitle>구독 만료</DialogTitle>
        <DialogContent>
          <Typography>
            {users[selectedSubscription?.userId]?.name || '사용자'}님의 구독을 만료시키겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: colors.textSecondary }}>
            즉시 서비스 이용이 불가능해집니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>아니오</Button>
          <Button onClick={handleBlock} variant="contained" color="error">
            만료시키기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grant Dialog */}
      <Dialog open={grantDialogOpen} onClose={() => setGrantDialogOpen(false)}>
        <DialogTitle>구독 부여</DialogTitle>
        <DialogContent sx={{ minWidth: 350 }}>
          <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
            사용자를 선택하고 구독 기간을 설정하세요.
          </Typography>
          <Autocomplete
            options={usersWithoutSubscription}
            getOptionLabel={(option) => `${option.name || '알 수 없음'} (${option.email || '-'})`}
            value={selectedUser}
            onChange={(e, newValue) => setSelectedUser(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="사용자 선택" fullWidth sx={{ mb: 2 }} />
            )}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="구독 기간"
            value={grantDays}
            onChange={(e) => setGrantDays(Number(e.target.value))}
          >
            <MenuItem value={7}>1주 (7일)</MenuItem>
            <MenuItem value={30}>1개월 (30일)</MenuItem>
            <MenuItem value={90}>3개월 (90일)</MenuItem>
            <MenuItem value={180}>6개월 (180일)</MenuItem>
            <MenuItem value={365}>1년 (365일)</MenuItem>
          </TextField>
          {selectedUser && (
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: colors.textSecondary }}>
              만료일: {(() => {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + grantDays);
                return endDate.toLocaleDateString('ko-KR');
              })()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleGrant}
            variant="contained"
            disabled={!selectedUser}
            sx={{ bgcolor: '#4CAF50' }}
          >
            부여
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grant Confirm Dialog */}
      <Dialog open={grantConfirmDialogOpen} onClose={() => setGrantConfirmDialogOpen(false)}>
        <DialogTitle>구독 부여 확인</DialogTitle>
        <DialogContent>
          <Typography>
            {pendingGrant?.user?.name || '사용자'}님에게 {pendingGrant?.days}일 구독을 부여하시겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: colors.textSecondary }}>
            만료일: {(() => {
              if (!pendingGrant) return '-';
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + pendingGrant.days);
              return endDate.toLocaleDateString('ko-KR');
            })()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setGrantConfirmDialogOpen(false);
            setPendingGrant(null);
          }}>
            취소
          </Button>
          <Button onClick={executeGrant} variant="contained" sx={{ bgcolor: '#4CAF50' }}>
            부여하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SubscriptionManager;
