import { Box } from '@mui/material';
import { colors } from '../theme';

function HomeDashboard() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 5 },
        background:
          `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 980,
          borderRadius: { xs: 3, md: 5 },
          p: { xs: 1.25, md: 2 },
          bgcolor: 'rgba(255,255,255,0.76)',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 24px 70px rgba(31, 51, 43, 0.13)',
        }}
      >
        <Box
          component="img"
          src="/home-dashboard.png"
          alt="난임상담톡톡"
          sx={{
            display: 'block',
            width: '100%',
            maxWidth: 980,
            maxHeight: 'calc(100vh - 112px)',
            objectFit: 'contain',
            borderRadius: { xs: 2, md: 4 },
          }}
        />
      </Box>
    </Box>
  );
}

export default HomeDashboard;
