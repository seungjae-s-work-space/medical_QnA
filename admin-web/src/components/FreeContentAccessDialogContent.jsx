import { Box, Button, Chip, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { colors } from '../theme';

function FreeContentAccessDialogContent({ onClose, remainingViews, limit }) {
  const usedViews = Math.max(limit - remainingViews, 0);
  const isLastFreeView = remainingViews === 0;

  return (
    <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
      <Box
        sx={{
          width: 88,
          height: 88,
          mx: 'auto',
          mb: 2,
          borderRadius: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.backgroundAlt} 100%)`,
        }}
      >
        <VisibilityRoundedIcon sx={{ fontSize: 42, color: colors.primary }} />
      </Box>

      <Chip
        label={`무료 열람 ${usedViews}/${limit}`}
        sx={{
          mb: 2,
          backgroundColor: colors.primaryLight,
          color: colors.primaryDark,
          fontWeight: 700,
        }}
      />

      <Typography sx={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary, mb: 1.5 }}>
        {isLastFreeView ? '이번이 마지막 무료 열람이에요' : '무료 열람이 적용되었어요'}
      </Typography>

      <Typography
        sx={{
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 1.8,
          whiteSpace: 'pre-line',
          maxWidth: 420,
          mx: 'auto',
          mb: 3,
        }}
      >
        {isLastFreeView
          ? `총 ${limit}번의 무료 열람 중 ${usedViews}번째 기회를 사용했어요.\n이번 열람까지 이용 가능하며, 다음부터는 이용권이 필요합니다.`
          : `총 ${limit}번의 무료 열람 중 ${usedViews}번째 기회를 사용했어요.\n앞으로 ${remainingViews}번 더 볼 수 있습니다.`}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            py: 1.75,
          }}
        >
          <Typography sx={{ fontSize: 12, color: colors.textSecondary, mb: 0.5 }}>이번까지 사용</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>
            {usedViews}
            <Box component="span" sx={{ fontSize: 14, color: colors.textSecondary, ml: 0.5 }}>
              / {limit}
            </Box>
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${colors.primaryLight}`,
            backgroundColor: colors.primaryLight,
            py: 1.75,
          }}
        >
          <Typography sx={{ fontSize: 12, color: colors.textSecondary, mb: 0.5 }}>앞으로 남은 횟수</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: colors.primaryDark }}>
            {remainingViews}
            <Box component="span" sx={{ fontSize: 14, color: colors.textSecondary, ml: 0.5 }}>
              회
            </Box>
          </Typography>
        </Box>
      </Box>

      <Button variant="contained" fullWidth onClick={onClose}>
        계속 보기
      </Button>
    </Box>
  );
}

export default FreeContentAccessDialogContent;
