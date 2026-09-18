import { useRef, useState } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Typography,
} from '@mui/material';
import { db } from '../firebase';
import { colors } from '../theme';
import { dialogPaperSx } from '../utils/webDesignStyles';
import { moveArticles } from '../utils/moveArticle';

export default function ArticleMoveDialog({ articles, sourceCollection, onClose, onMoved }) {
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  const handleMove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setMoving(true);
    setError('');
    let result;
    try {
      result = await moveArticles({ db, sourceCollection, targetCollection: 'male_infertility', articleIds: articles.map((article) => article.id) });
    } catch (moveError) {
      setError(moveError.message || '이동하지 못했습니다. 원본을 확인한 뒤 다시 시도해주세요.');
      setMoving(false);
      inFlight.current = false;
      return;
    }
    onMoved({ ...result, targetTitle: '남성난임' });
  };

  const downloadBackup = () => {
    const backup = {
      sourceCollection, exportedAt: new Date().toISOString(),
      articles: articles.map(({ id, ...data }) => ({ articleId: id, data })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sourceCollection}-backup-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open onClose={moving ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx(colors) }}>
      <DialogTitle>남성난임으로 이동</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>{articles.length}개 글 이동</Typography>
        <ul style={{ maxHeight: 200, overflowY: 'auto', paddingLeft: 24, marginBottom: 24 }}>
          {articles.map((article) => <li key={article.id}>{article.title} {article.isPublished ? '(공개)' : '(비공개)'}</li>)}
        </ul>
        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
          본문·이미지·등록일·조회수·공개 상태는 그대로 유지됩니다.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={downloadBackup} disabled={moving} sx={{ mr: 'auto' }}>원본 백업 다운로드</Button>
        <Button onClick={onClose} disabled={moving}>취소</Button>
        <Button onClick={handleMove} disabled={moving} variant="contained">
          {moving ? <CircularProgress size={20} color="inherit" /> : '이동'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
