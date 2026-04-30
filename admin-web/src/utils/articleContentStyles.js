export function getArticleContentSx(colors) {
  return {
    lineHeight: 1.6,
    color: colors.textPrimary,
    fontSize: 15,
    '& p': { margin: 0 },
    '& h1, & h2, & h3': {
      fontWeight: 700,
      margin: '1em 0 0.3em 0',
      color: colors.textPrimary,
    },
    '& h1': { fontSize: '1.75em' },
    '& h2': { fontSize: '1.5em' },
    '& h3': { fontSize: '1.25em' },
    '& blockquote': {
      borderLeft: `4px solid ${colors.textPrimary}`,
      backgroundColor: 'transparent',
      padding: '8px 16px',
      margin: '8px 0',
      color: colors.textPrimary,
    },
    '& ul, & ol': { paddingLeft: '1.5em', margin: '0.3em 0' },
    '& li': { marginBottom: '0.15em' },
    '& img': {
      maxWidth: '100% !important',
      height: 'auto !important',
      display: 'block',
      objectFit: 'contain',
      boxSizing: 'border-box',
      borderRadius: '8px',
      margin: '12px auto',
    },
  };
}
