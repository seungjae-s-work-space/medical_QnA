import { getArticleContentSx } from '../articleContentStyles';

describe('article content styles', () => {
  it('keeps embedded images inside the article text column', () => {
    const styles = getArticleContentSx({ textPrimary: '#123456' });

    expect(styles).toMatchObject({
      maxWidth: '100%',
      overflowX: 'hidden',
      boxSizing: 'border-box',
    });

    expect(styles['& img']).toMatchObject({
      width: 'auto !important',
      maxWidth: '100% !important',
      minWidth: '0 !important',
      height: 'auto !important',
      display: 'block',
      objectFit: 'contain',
      boxSizing: 'border-box',
      borderRadius: '8px',
      margin: '12px auto',
    });

    expect(styles['& p, & figure, & span, & div']).toMatchObject({
      maxWidth: '100%',
      boxSizing: 'border-box',
    });
  });
});
