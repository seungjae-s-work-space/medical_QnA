import React, { useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Alert,
  Box,
  Button,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { colors } from '../theme';

function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isSignupMode = mode === 'signup';

  const submitLabel = useMemo(
    () => (isSignupMode ? '회원가입하고 시작하기' : '로그인'),
    [isSignupMode]
  );

  const getErrorMessage = (errorCode, action) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return '이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.';
      case 'auth/invalid-email':
        return '올바른 이메일 주소를 입력해 주세요.';
      case 'auth/weak-password':
        return '비밀번호는 6자 이상으로 입력해 주세요.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'auth/too-many-requests':
        return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
      default:
        if (action === 'signup') {
          return '회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        }
        if (action === 'reset') {
          return '비밀번호 재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
        }
        return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFeedback(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isSignupMode) {
        if (!name.trim()) {
          setFeedback({ severity: 'error', message: '이름 또는 닉네임을 입력해 주세요.' });
          return;
        }

        if (password.length < 6) {
          setFeedback({
            severity: 'error',
            message: '비밀번호는 6자 이상으로 입력해 주세요.',
          });
          return;
        }

        if (password !== confirmPassword) {
          setFeedback({
            severity: 'error',
            message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
          });
          return;
        }

        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const trimmedName = name.trim();

        await updateProfile(credential.user, { displayName: trimmedName });
        await setDoc(
          doc(db, 'users', credential.user.uid),
          {
            email: normalizedEmail,
            name: trimmedName,
            role: 'user',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: getErrorMessage(err.code, isSignupMode ? 'signup' : 'login'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback({ severity: 'error', message: '비밀번호를 재설정할 이메일을 입력해 주세요.' });
      return;
    }

    setResetLoading(true);
    setFeedback(null);

    try {
      auth.languageCode = 'ko';
      await sendPasswordResetEmail(auth, normalizedEmail);
      setResetDialogOpen(false);
      setFeedback({
        severity: 'success',
        message: '비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.',
      });
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: getErrorMessage(err.code, 'reset'),
      });
    } finally {
      setResetLoading(false);
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
            회원가입 후
            <br />
            상담과 콘텐츠를 편하게 이용해 보세요
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
              {isSignupMode ? '회원가입' : '로그인'}
            </Typography>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: 15,
              }}
            >
              {isSignupMode
                ? '계정을 만들고 난임상담톡톡 서비스를 시작해 보세요'
                : '계정에 로그인하여 상담과 콘텐츠를 이용하세요'}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              p: 0.5,
              mb: 3,
              borderRadius: 3,
              bgcolor: colors.backgroundAlt,
            }}
          >
            <Button
              type="button"
              onClick={() => switchMode('login')}
              variant={isSignupMode ? 'text' : 'contained'}
              sx={{
                py: 1.2,
                fontWeight: 700,
                bgcolor: isSignupMode ? 'transparent' : colors.card,
                color: isSignupMode ? colors.textSecondary : colors.textPrimary,
                boxShadow: isSignupMode ? 'none' : '0 6px 18px rgba(15, 23, 42, 0.08)',
                '&:hover': {
                  bgcolor: isSignupMode ? 'transparent' : colors.card,
                  boxShadow: isSignupMode ? 'none' : '0 6px 18px rgba(15, 23, 42, 0.08)',
                },
              }}
            >
              로그인
            </Button>
            <Button
              type="button"
              onClick={() => switchMode('signup')}
              variant={isSignupMode ? 'contained' : 'text'}
              sx={{
                py: 1.2,
                fontWeight: 700,
                bgcolor: isSignupMode ? colors.card : 'transparent',
                color: isSignupMode ? colors.textPrimary : colors.textSecondary,
                boxShadow: isSignupMode ? '0 6px 18px rgba(15, 23, 42, 0.08)' : 'none',
                '&:hover': {
                  bgcolor: isSignupMode ? colors.card : 'transparent',
                  boxShadow: isSignupMode ? '0 6px 18px rgba(15, 23, 42, 0.08)' : 'none',
                },
              }}
            >
              회원가입
            </Button>
          </Box>

          {feedback && (
            <Alert
              severity={feedback.severity}
              sx={{
                mb: 3,
                borderRadius: 2,
                border: `1px solid ${
                  feedback.severity === 'error' ? colors.error : colors.success
                }`,
                bgcolor:
                  feedback.severity === 'error' ? colors.errorLight : colors.successLight,
              }}
            >
              {feedback.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {isSignupMode && (
                <TextField
                  fullWidth
                  placeholder="이름 또는 닉네임"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRoundedIcon sx={{ color: colors.textTertiary }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
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
              {isSignupMode && (
                <TextField
                  fullWidth
                  placeholder="비밀번호 확인"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{ color: colors.textTertiary }}
                        >
                          {showConfirmPassword ? (
                            <VisibilityOffRoundedIcon />
                          ) : (
                            <VisibilityRoundedIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
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
                  submitLabel
                )}
              </Button>

              {!isSignupMode && (
                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    setResetEmail(email.trim().toLowerCase());
                    setResetDialogOpen(true);
                  }}
                  sx={{
                    alignSelf: 'center',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: colors.primaryDark,
                    },
                  }}
                >
                  비밀번호를 잊으셨나요?
                </Button>
              )}
            </Box>
          </form>

          <Typography
            sx={{
              textAlign: 'center',
              mt: 4,
              color: colors.textTertiary,
              fontSize: 13,
            }}
          >
            로그인 후 상담하기, 뉴스, 난임백과 등 서비스를 이용할 수 있습니다
          </Typography>
        </Box>
      </Box>

      <Dialog
        open={resetDialogOpen}
        onClose={() => {
          if (!resetLoading) {
            setResetDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>비밀번호 재설정</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography
            sx={{
              mb: 2,
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            가입한 이메일 주소로 비밀번호 재설정 링크를 보내드립니다.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            type="email"
            label="이메일 주소"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            type="button"
            onClick={() => setResetDialogOpen(false)}
            disabled={resetLoading}
            color="inherit"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={handlePasswordReset}
            disabled={resetLoading}
          >
            {resetLoading ? <CircularProgress size={20} color="inherit" /> : '메일 보내기'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login;
