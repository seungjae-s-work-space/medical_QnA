import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { colors } from '../theme';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('로그인 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ px: 3 }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 360,
          p: 4,
          bgcolor: colors.inputBackground,
          borderRadius: 3,
          border: `1px solid ${colors.divider}`,
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          align="center"
          sx={{
            fontWeight: 600,
            color: colors.textPrimary,
            mb: 1,
          }}
        >
          난임&상담톡
        </Typography>
        <Typography
          align="center"
          sx={{
            color: colors.textSecondary,
            fontSize: 14,
            mb: 4,
          }}
        >
          관리자 로그인
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              bgcolor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            placeholder="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              py: 1.5,
              fontSize: 15,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </Box>
    </Box>
  );
}

export default Login;
