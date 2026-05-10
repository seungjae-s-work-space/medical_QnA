import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { colors } from '../theme';

function MembershipRequiredDialog({ open, onContinue, onLogin }) {
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return;
        onContinue();
      }}
      aria-labelledby="membership-required-title"
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        id="membership-required-title"
        sx={{
          color: colors.textPrimary,
          fontSize: 20,
          fontWeight: 700,
          pb: 1,
        }}
      >
        로그인이 필요합니다
      </DialogTitle>
      <DialogContent>
        <Typography
          sx={{
            color: colors.textSecondary,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          본 서비스는 회원제(무료)로 운영됩니다.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onContinue}
          sx={{
            color: colors.textSecondary,
          }}
        >
          계속 보기
        </Button>
        <Button variant="contained" onClick={onLogin}>
          로그인하러가기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MembershipRequiredDialog;
