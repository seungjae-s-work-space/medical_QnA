import { createTheme } from '@mui/material/styles';

// Botanical wellness design - sage/mint/ivory tone from home-dashboard.png
const colors = {
  background: '#F6FBF7',
  backgroundAlt: '#EAF6EF',
  backgroundWarm: '#FFF9EA',
  sidebar: '#FBFEFA',
  card: '#FFFFFF',
  cardTint: '#F8FCF9',

  textPrimary: '#1F332B',
  textSecondary: '#5E756B',
  textTertiary: '#91A69B',

  primary: '#70B789',
  primaryLight: '#E5F5EA',
  primaryDark: '#0B6B47',
  primarySoft: '#F0FAF3',

  secondary: '#D4A853',
  secondaryLight: '#FFF1BD',
  aqua: '#DDF4F2',
  aquaDark: '#5B9A96',

  success: '#6FA87B',
  successLight: '#E4F4E8',
  warning: '#D4A853',
  warningLight: '#FFF4CF',
  error: '#D97171',
  errorLight: '#FBE7E7',

  divider: '#DDEBE2',
  border: '#D7E8DF',
  inputBorder: '#C9E0D4',
  inputBackground: '#FCFFFD',

  userMessage: '#E6F4EB',
  adminMessage: '#FFF7E1',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: colors.background,
      paper: colors.card,
    },
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryLight,
    },
    success: {
      main: colors.success,
      light: colors.successLight,
    },
    warning: {
      main: colors.warning,
      light: colors.warningLight,
    },
    error: {
      main: colors.error,
      light: colors.errorLight,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    body2: {
      color: colors.textSecondary,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background,
          backgroundImage: `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          padding: '10px 20px',
        },
        contained: {
          boxShadow: '0 10px 22px rgba(112, 183, 137, 0.22)',
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
          '&:hover': {
            background: colors.primaryDark,
            boxShadow: '0 12px 26px rgba(112, 183, 137, 0.3)',
          },
        },
        outlined: {
          borderColor: colors.border,
          color: colors.primaryDark,
          backgroundColor: 'rgba(255,255,255,0.62)',
          '&:hover': {
            borderColor: colors.primary,
            backgroundColor: colors.primaryLight,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.inputBackground,
            borderRadius: 10,
            '& fieldset': {
              borderColor: colors.inputBorder,
            },
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 16px 40px rgba(31, 51, 43, 0.07)',
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 16px 40px rgba(31, 51, 43, 0.07)',
          border: `1px solid ${colors.border}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&:hover': {
            backgroundColor: colors.backgroundAlt,
          },
          '&.Mui-selected': {
            backgroundColor: colors.primaryLight,
            '&:hover': {
              backgroundColor: colors.primaryLight,
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export { colors };
export default theme;
