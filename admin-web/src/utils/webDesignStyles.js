export const pageShellSx = {
  p: { xs: 2.5, md: 4 },
  maxWidth: 1240,
  mx: 'auto',
};

export const widePageShellSx = {
  ...pageShellSx,
  maxWidth: 1400,
};

export const pageHeaderSx = {
  mb: 4,
  p: { xs: 2.5, md: 3 },
  borderRadius: 3,
  border: '1px solid rgba(215, 232, 223, 0.82)',
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.86) 0%, rgba(229,245,234,0.78) 52%, rgba(255,247,225,0.72) 100%)',
  boxShadow: '0 18px 44px rgba(31, 51, 43, 0.07)',
};

export function statCardSx(colors, active = false, tone = 'primary') {
  const softColor =
    tone === 'warning'
      ? colors.warningLight
      : tone === 'error'
        ? colors.errorLight
        : colors.primaryLight;
  const activeToneStart =
    tone === 'warning'
      ? '#8A5B08'
      : tone === 'error'
        ? '#A64040'
        : colors.primaryDark;
  const activeToneEnd =
    tone === 'warning'
      ? '#9C6818'
      : tone === 'error'
        ? '#C05050'
        : '#2F7D55';

  return {
    flex: 1,
    p: 3,
    bgcolor: active ? activeToneStart : colors.card,
    color: active ? 'white' : colors.textPrimary,
    borderRadius: 3,
    border: `1px solid ${active ? activeToneStart : colors.border}`,
    boxShadow: active
      ? '0 16px 34px rgba(31, 51, 43, 0.16)'
      : '0 12px 30px rgba(31, 51, 43, 0.06)',
    background: active
      ? `linear-gradient(135deg, ${activeToneStart}, ${activeToneEnd})`
      : `linear-gradient(180deg, ${colors.card}, ${softColor})`,
  };
}

export function contentCardSx(colors) {
  return {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
    bgcolor: colors.card,
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    boxShadow: '0 14px 36px rgba(31, 51, 43, 0.07)',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 18px 44px rgba(31, 51, 43, 0.12)',
      borderColor: colors.primary,
    },
  };
}

export function emptyStateSx(colors) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 10,
    bgcolor: 'rgba(255,255,255,0.78)',
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 14px 36px rgba(31, 51, 43, 0.06)',
  };
}

export function searchFieldSx() {
  return {
    mb: 3,
    '& .MuiOutlinedInput-root': {
      boxShadow: '0 10px 26px rgba(31, 51, 43, 0.05)',
    },
  };
}

export function paginationButtonSx(colors, active = false) {
  return {
    minWidth: 40,
    height: 40,
    borderRadius: 2,
    fontWeight: 700,
    ...(active
      ? {
          color: 'white',
          bgcolor: colors.primaryDark,
          borderColor: colors.primaryDark,
          boxShadow: '0 10px 22px rgba(11, 107, 71, 0.22)',
          '&:hover': { bgcolor: '#095A3B', borderColor: '#095A3B' },
        }
      : {
          color: colors.textSecondary,
          '&:hover': { bgcolor: colors.primaryLight, color: colors.primaryDark },
        }),
  };
}

export function dialogPaperSx(colors) {
  return {
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
    background: colors.card,
  };
}
