import { createTheme } from '@mui/material/styles';

// 웜그레이/아이보리 톤 - Flutter 앱과 동일
const colors = {
  background: '#F4F3F1',
  backgroundAlt: '#EFEDE9',
  userMessage: '#E8E6E2',
  adminMessage: '#DCD9D4',
  textPrimary: '#3C3C3C',
  textSecondary: '#8A8A8A',
  textTertiary: '#B0B0B0',
  buttonBorder: '#D0CEC9',
  buttonText: '#5A5A5A',
  divider: '#E0DED9',
  inputBorder: '#D8D6D1',
  inputBackground: '#FAF9F7',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: colors.background,
      paper: colors.inputBackground,
    },
    primary: {
      main: colors.textPrimary,
      contrastText: colors.background,
    },
    secondary: {
      main: colors.textSecondary,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          backgroundColor: colors.textPrimary,
          color: colors.background,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#2C2C2C',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: colors.buttonBorder,
          color: colors.textPrimary,
          '&:hover': {
            borderColor: colors.textSecondary,
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.background,
            borderRadius: 12,
            '& fieldset': {
              borderColor: colors.inputBorder,
            },
            '&:hover fieldset': {
              borderColor: colors.textSecondary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.textPrimary,
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.inputBackground,
          color: colors.textPrimary,
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: colors.backgroundAlt,
          },
        },
      },
    },
  },
});

export { colors };
export default theme;
