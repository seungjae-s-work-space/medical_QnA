import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { colors } from '../theme';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: colors.background,
      }}
    >
      {/* Left side - decorative */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
          p: 6,
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            난임상담톡톡
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              opacity: 0.9,
              lineHeight: 1.6,
            }}
          >
            관리자 대시보드에서
            <br />
            상담 내역과 콘텐츠를 관리하세요
          </Typography>
        </Box>
      </Box>

      {/* Right side - login form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
          }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: colors.primary,
                fontSize: 26,
                fontWeight: 700,
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              }}
            >
              Q
            </Avatar>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: colors.textPrimary,
                mb: 1,
              }}
            >
              관리자 로그인
            </Typography>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: 15,
              }}
            >
              계정에 로그인하여 대시보드에 접속하세요
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                bgcolor: colors.errorLight,
                border: `1px solid ${colors.error}`,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: colors.error,
                },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                placeholder="이메일 주소"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailRoundedIcon sx={{ color: colors.textTertiary }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                placeholder="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon sx={{ color: colors.textTertiary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: colors.textTertiary }}
                      >
                        {showPassword ? (
                          <VisibilityOffRoundedIcon />
                        ) : (
                          <VisibilityRoundedIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  py: 1.75,
                  fontSize: 16,
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  '로그인'
                )}
              </Button>
            </Box>
          </form>

          {/* Footer */}
          <Typography
            sx={{
              textAlign: 'center',
              mt: 4,
              color: colors.textTertiary,
              fontSize: 13,
            }}
          >
            문제가 발생하면 시스템 관리자에게 문의하세요
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;
