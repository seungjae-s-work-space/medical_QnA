import { getArticleContentSx } from '../articleContentStyles';

describe('article content styles', () => {
  it('keeps embedded images inside the article text column', () => {
    const styles = getArticleContentSx({ textPrimary: '#123456' });

    expect(styles['& img']).toMatchObject({
      maxWidth: '100% !important',
      height: 'auto !important',
      display: 'block',
      objectFit: 'contain',
      boxSizing: 'border-box',
      borderRadius: '8px',
      margin: '12px auto',
    });
  });
});
