import { Box } from '@mui/material';
import { colors } from '../theme';

function HomeDashboard() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box
        component="img"
        src="/home-dashboard.png"
        alt="난임상담톡톡"
        sx={{
          display: 'block',
          width: '100%',
          maxWidth: 860,
          maxHeight: 'calc(100vh - 80px)',
          objectFit: 'contain',
          borderRadius: { xs: 2, md: 3 },
        }}
      />
    </Box>
  );
}

export default HomeDashboard;
