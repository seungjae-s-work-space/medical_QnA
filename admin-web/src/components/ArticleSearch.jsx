import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, ButtonBase, CircularProgress, IconButton, InputAdornment,
  Pagination, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { searchArticles, readSearchArticle } from '../services/articleSearchService';
import { colors } from '../theme';

function BoardSearch({ section, readOnly, onOpen, onEdit, children }) {
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openError, setOpenError] = useState('');
  const [openingId, setOpeningId] = useState(null);
  const requestId = useRef(0);
  const openId = useRef(0);
  const retryPage = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => () => { requestId.current++; openId.current++; }, []);

  const clear = () => {
    requestId.current++;
    openId.current++;
    setDraft(''); setSubmitted(''); setResult(null); setError('');
    setOpenError(''); setOpeningId(null); setLoading(false);
    inputRef.current?.focus();
  };

  const runSearch = async (query, page = 0) => {
    const sequence = ++requestId.current;
    openId.current++;
    retryPage.current = page;
    setSubmitted(query); setLoading(true); setError('');
    setOpenError(''); setOpeningId(null); setResult(null);
    try {
      const next = await searchArticles({ section, query, page, includeDrafts: !readOnly });
      if (sequence === requestId.current) setResult(next);
    } catch (failure) {
      if (sequence === requestId.current) {
        setError(failure.code === 'functions/failed-precondition'
          ? '검색 데이터를 준비 중입니다. 잠시 후 다시 시도해주세요.'
          : '검색 결과를 불러오지 못했습니다. 다시 시도해주세요.');
      }
    } finally {
      if (sequence === requestId.current) setLoading(false);
    }
  };

  const openArticle = async (id, edit = false) => {
    if (openingId) return;
    const sequence = ++openId.current;
    setOpeningId(id); setOpenError('');
    try {
      const article = await readSearchArticle(section, id, !readOnly);
      if (sequence === openId.current) (edit ? onEdit : onOpen)?.(article);
    } catch (failure) {
      if (sequence === openId.current) setOpenError('글을 열 수 없습니다. 삭제 또는 공개 상태 변경 여부를 확인하거나 다시 시도해주세요.');
    } finally {
      if (sequence === openId.current) setOpeningId(null);
    }
  };

  return (
    <>
      <Box component="form" role="search" onSubmit={(event) => {
        event.preventDefault();
        const query = draft.trim();
        if (query) runSearch(query); else clear();
      }} sx={{ mb: 3 }}>
        <TextField fullWidth inputRef={inputRef} label="제목 또는 내용 검색" value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
          }}
          inputProps={{ maxLength: 200 }}
          InputProps={{ endAdornment: (
            <InputAdornment position="end">
              {(draft || submitted) && <Tooltip title="검색 초기화"><IconButton aria-label="검색 초기화" onClick={clear}><CloseRoundedIcon /></IconButton></Tooltip>}
              <Tooltip title="검색"><IconButton type="submit" aria-label="검색" color="primary"><SearchRoundedIcon /></IconButton></Tooltip>
            </InputAdornment>
          ) }}
        />
      </Box>
      {!submitted ? children : (
        <Box aria-label="검색 결과" aria-busy={loading}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
            <Typography role="status" sx={{ fontSize: 14, color: colors.textSecondary, overflowWrap: 'anywhere' }}>
              <Box component="span" sx={{ color: colors.textPrimary, fontWeight: 600 }}>“{submitted}”</Box>
              {' 검색 결과'}{result && ` ${result.total.toLocaleString()}건`}
            </Typography>
            {!loading && !error && <Tooltip title="검색 결과 새로고침"><IconButton aria-label="검색 결과 새로고침" onClick={() => runSearch(submitted, result?.page || 0)}><RefreshRoundedIcon /></IconButton></Tooltip>}
          </Box>
          {loading && <Box role="status" sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={24} aria-label="검색 중" /></Box>}
          {error && <Alert severity="error" action={<IconButton aria-label="검색 다시 시도" onClick={() => runSearch(submitted, retryPage.current)}><RefreshRoundedIcon /></IconButton>}>{error}</Alert>}
          {openError && <Alert severity="warning" sx={{ mb: 2 }}>{openError}</Alert>}
          {result && <>
            {result.items.length === 0 ? <Typography sx={{ py: 5, textAlign: 'center', color: colors.textSecondary }}>검색 결과가 없습니다.</Typography> : (
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                {result.items.map((article) => (
                  <Box component="li" key={article.id} sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ButtonBase aria-label={article.title} disabled={Boolean(openingId)} onClick={() => openArticle(article.id)}
                      sx={{ minHeight: 48, px: 1, py: 1.25, flex: 1, minWidth: 0, gap: 1, justifyContent: 'flex-start', textAlign: 'left', '&:hover, &.Mui-focusVisible': { bgcolor: colors.backgroundAlt }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
                      {!readOnly && !article.isPublished && <Typography component="span" sx={{ fontSize: 12, color: colors.textSecondary, flexShrink: 0 }}>비공개</Typography>}
                      <Typography component="span" sx={{ fontSize: 15, lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'keep-all' }}>{article.title || '(제목 없음)'}</Typography>
                      {openingId === article.id && <CircularProgress size={16} sx={{ flexShrink: 0 }} />}
                    </ButtonBase>
                    {!readOnly && onEdit && <Tooltip title="수정"><span><IconButton aria-label={`${article.title} 수정`} disabled={Boolean(openingId)} onClick={() => openArticle(article.id, true)}><EditRoundedIcon fontSize="small" /></IconButton></span></Tooltip>}
                  </Box>
                ))}
              </Box>
            )}
            {result.total > result.pageSize && <Pagination count={Math.ceil(result.total / result.pageSize)} page={result.page + 1}
              onChange={(_event, page) => runSearch(submitted, page - 1)} size="small" siblingCount={0}
              getItemAriaLabel={(type, page) => type === 'page' ? `검색 결과 ${page} 페이지` : `검색 결과 ${type === 'next' ? '다음' : '이전'} 페이지`}
              sx={{ mt: 3, '& ul': { justifyContent: 'center' } }} />}
          </>}
        </Box>
      )}
    </>
  );
}

export default function ArticleSearch(props) {
  return <BoardSearch key={`${props.section}:${Boolean(props.readOnly)}`} {...props} />;
}
