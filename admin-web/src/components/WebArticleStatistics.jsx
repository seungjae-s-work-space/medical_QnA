import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { getWebArticleStatistics } from '../services/webArticleStatisticsService';
import { colors } from '../theme';

const sections = [
  { id: 'news', label: '뉴스', color: '#5B8BA8' },
  { id: 'encyclopedia', label: '난임백과', color: colors.primary },
  { id: 'male_infertility', label: '남성난임', color: colors.secondary },
];
const number = value => value === null ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const valueFor = (counts, section) => !counts ? null : section === 'all'
  ? Object.values(counts).reduce((sum, count) => sum + count, 0) : counts[section] || 0;
const dateTime = value => new Date(value).toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const sectionSx = { py: 3, borderBottom: `1px solid ${colors.divider}` };
const titleSx = { fontSize: 17, fontWeight: 700, mb: 2 };

function DailyChart({ rows, section }) {
  const max = Math.max(1, ...rows.map(row => valueFor(row.counts, section) || 0));
  const ceiling = Math.ceil(max / 4) * 4;
  const active = section === 'all' ? sections : sections.filter(item => item.id === section);
  return (
    <Box component="figure" sx={{ m: 0 }} aria-label="일별 조회수 그래프">
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Stack sx={{ height: 200, justifyContent: 'space-between', textAlign: 'right', minWidth: 32 }}>
          {[ceiling, ceiling / 2, 0].map(tick => <Typography key={tick} variant="caption">{number(tick)}</Typography>)}
        </Stack>
        <Box sx={{ overflowX: 'auto', flex: 1, minWidth: 0, pb: 1 }}>
          <Box sx={{ minWidth: rows.length > 7 ? 650 : 0 }}>
            <Box sx={{ height: 200, display: 'grid', gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, gap: 0.75, alignItems: 'end', borderBottom: `1px solid ${colors.border}`, background: `repeating-linear-gradient(to top, transparent 0, transparent calc(50% - 1px), ${colors.divider} calc(50% - 1px), ${colors.divider} 50%)` }}>
              {rows.map(row => {
                const total = valueFor(row.counts, section);
                const label = `${row.date} ${total === null ? '집계 전' : `${number(total)}회`}`;
                return (
                  <Tooltip key={row.date} title={label} arrow enterTouchDelay={0}>
                    <Box tabIndex={0} aria-label={label} sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'end', flexDirection: 'column', outlineOffset: 2 }}>
                      {total === null ? <Typography variant="caption" sx={{ color: colors.textSecondary }}>—</Typography> : (
                        <Box sx={{ display: 'flex', flexDirection: 'column-reverse', width: '72%', maxWidth: 42, height: `${total / ceiling * 100}%`, minHeight: total ? 2 : 0 }}>
                          {active.map(item => <Box key={item.id} sx={{ height: `${total ? row.counts[item.id] / total * 100 : 0}%`, bgcolor: item.color, flexShrink: 0 }} />)}
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, gap: 0.75, mt: 1 }}>
              {rows.map((row, i) => <Typography key={row.date} variant="caption" align="center" sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                {rows.length <= 7 || i % 5 === 0 || i === rows.length - 1 ? row.date.slice(5).replace('-', '.') : ''}
              </Typography>)}
            </Box>
          </Box>
        </Box>
      </Box>
      <Stack component="figcaption" direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {active.map(item => <Stack key={item.id} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, bgcolor: item.color }} />
          <Typography variant="caption">{item.label}</Typography>
        </Stack>)}
      </Stack>
    </Box>
  );
}

export default function WebArticleStatistics() {
  const [days, setDays] = useState(7);
  const [section, setSection] = useState('all');
  const [view, setView] = useState('chart');
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setData(null);
    getWebArticleStatistics(days).then(result => { if (active) setData(result); })
      .catch(failure => {
        if (active) setError(failure.code === 'functions/resource-exhausted'
          ? '통계량이 많습니다. 조회 기간을 줄여 다시 조회해주세요.'
          : '통계를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, refresh]);

  const rows = data?.daily || [];
  const tracked = rows.filter(row => row.counts);
  const total = tracked.reduce((sum, row) => sum + valueFor(row.counts, section), 0);
  const metrics = [
    ['오늘 조회수', valueFor(rows.at(-1)?.counts, section)],
    ['어제 조회수', valueFor(rows.at(-2)?.counts, section)],
    ['기간 조회수', tracked.length ? total : null],
    ['일평균 조회수', tracked.length ? total / tracked.length : null],
  ];
  const ranking = data?.topArticles[section] || [];
  const totals = sections.map(item => ({ ...item, views: tracked.reduce((sum, row) => sum + row.counts[item.id], 0) }));
  const allTotal = totals.reduce((sum, item) => sum + item.views, 0);

  return (
    <Box sx={{ maxWidth: 1160, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3, bgcolor: 'background.paper', minHeight: '100%', '& *': { letterSpacing: 0 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700 }}>통계</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>웹 게시글 조회수</Typography>
        </Box>
        <Tooltip title="통계 새로고침">
          <span><IconButton aria-label="통계 새로고침" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshRoundedIcon /></IconButton></span>
        </Tooltip>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap" gap={2} sx={{ mt: 3, mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={days} aria-label="조회 기간" onChange={(_, value) => { if (value) setDays(value); }}>
          <ToggleButton value={7}>7일</ToggleButton><ToggleButton value={30}>30일</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2">{rows.length ? `${rows[0].date} ~ ${rows.at(-1).date}` : '한국 시간 기준'}</Typography>
      </Stack>
      <Tabs value={section} onChange={(_, value) => setSection(value)} variant="scrollable" scrollButtons="auto" aria-label="게시판" sx={{ borderBottom: `1px solid ${colors.divider}`, '& .MuiTab-root': { minWidth: 68, px: 1.5, fontSize: 14 } }}>
        <Tab label="전체" value="all" />{sections.map(item => <Tab key={item.id} label={item.label} value={item.id} />)}
      </Tabs>

      {loading && <Box role="status" sx={{ py: 10, textAlign: 'center' }}><CircularProgress size={28} aria-label="통계 로딩" /></Box>}
      {error && <Alert severity="error" sx={{ mt: 3 }} action={<Button color="inherit" onClick={() => setRefresh(n => n + 1)}>다시 시도</Button>}>{error}</Alert>}
      {!loading && data && <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 3, ...sectionSx }}>
          {metrics.map(([label, value]) => <Box key={label} aria-label={label}>
            <Typography variant="body2">{label}</Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>{number(value)}<Box component="span" sx={{ ml: 0.75, fontSize: 13, color: colors.textSecondary, fontWeight: 400 }}>회</Box></Typography>
            {label === '일평균 조회수' && <Typography variant="caption" color="text.secondary">집계 시작일·오늘 포함</Typography>}
          </Box>)}
        </Box>
        <Typography variant="caption" component="p" sx={{ mt: 1.5, color: colors.textSecondary }}>비로그인 포함 · 관리자 열람 제외 · 한국 시간 · 방문자 수가 아닌 열람 횟수</Typography>

        {!data.startedAt ? <Box sx={{ py: 8, textAlign: 'center' }}><Typography color="text.secondary">아직 집계된 조회가 없습니다.</Typography></Box> : <>
          <Box component="section" sx={sectionSx}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography component="h2" sx={{ ...titleSx, mb: 0 }}>일별 조회수</Typography>
              <ToggleButtonGroup size="small" value={view} exclusive aria-label="표시 방식" onChange={(_, value) => { if (value) setView(value); }}>
                <ToggleButton value="chart">차트</ToggleButton><ToggleButton value="table">일별 내역</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {view === 'chart' ? <DailyChart rows={rows} section={section} /> : <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small" aria-label="일별 조회수">
                <TableHead><TableRow><TableCell>날짜</TableCell><TableCell align="right">조회수</TableCell></TableRow></TableHead>
                <TableBody>{[...rows].reverse().map(row => <TableRow key={row.date}><TableCell>{row.date}</TableCell><TableCell align="right">{row.counts ? `${number(valueFor(row.counts, section))}회` : '집계 전'}</TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>}
          </Box>

          <Box component="section" sx={sectionSx}>
            <Typography component="h2" sx={titleSx}>게시판별 조회수</Typography>
            <Stack spacing={2}>
              {totals.map(item => <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 76px', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">{item.label}</Typography>
                <Box sx={{ bgcolor: colors.background, height: 8 }}><Box sx={{ width: `${allTotal ? item.views / allTotal * 100 : 0}%`, height: '100%', bgcolor: item.color }} /></Box>
                <Typography variant="body2" align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{number(item.views)}회</Typography>
              </Box>)}
            </Stack>
          </Box>

          <Box component="section" sx={sectionSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography component="h2" sx={titleSx}>인기 글</Typography><Typography variant="caption">선택 기간 · 상위 20개</Typography>
            </Stack>
            {!ranking.length ? <Typography variant="body2" sx={{ py: 3 }}>선택한 게시판의 조회 기록이 없습니다.</Typography> : <TableContainer>
              <Table size="small" aria-label="인기 글 순위" sx={{ tableLayout: 'fixed' }}>
                <TableHead><TableRow><TableCell sx={{ width: 48, pl: 0 }}>순위</TableCell><TableCell>제목</TableCell><TableCell align="right" sx={{ width: 76, pr: 0 }}>조회수</TableCell></TableRow></TableHead>
                <TableBody>{ranking.map((article, i) => <TableRow key={`${article.section}/${article.articleId}`}>
                  <TableCell sx={{ pl: 0, verticalAlign: 'top', py: 1.75, color: colors.textSecondary }}>{i + 1}</TableCell>
                  <TableCell sx={{ py: 1.5, overflowWrap: 'anywhere' }}>
                    <Typography sx={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{article.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{sections.find(item => item.id === article.section)?.label}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{number(article.views)}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </TableContainer>}
          </Box>
        </>}
        <Box sx={{ pt: 2, color: colors.textSecondary }}>
          <Typography variant="caption" component="p">{data.startedAt ? `집계 시작 ${dateTime(data.startedAt)} · 이전 기간 기록 없음` : '첫 웹 열람부터 집계됩니다.'}</Typography>
          <Typography variant="caption" component="p">최근 반영 {dateTime(data.generatedAt)} · 최대 1분 지연</Typography>
        </Box>
      </>}
    </Box>
  );
}
