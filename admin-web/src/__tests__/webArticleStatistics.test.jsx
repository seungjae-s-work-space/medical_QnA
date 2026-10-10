import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import WebArticleStatistics from '../components/WebArticleStatistics';
import { getWebArticleStatistics } from '../services/webArticleStatisticsService';
import theme from '../theme';

jest.mock('../services/webArticleStatisticsService', () => ({ getWebArticleStatistics: jest.fn() }));
const sample = {
  days: 7, startedAt: '2026-10-09T03:00:00Z', generatedAt: '2026-10-10T03:00:00Z',
  daily: [
    { date: '2026-10-08', counts: null },
    { date: '2026-10-09', counts: { news: 10, encyclopedia: 4, male_infertility: 1 } },
    { date: '2026-10-10', counts: { news: 3, encyclopedia: 7, male_infertility: 2 } },
  ],
  topArticles: {
    all: [{ articleId: 'a', section: 'news', title: '가장 많이 읽은 뉴스', views: 13 }],
    news: [{ articleId: 'a', section: 'news', title: '가장 많이 읽은 뉴스', views: 13 }],
    encyclopedia: [{ articleId: 'b', section: 'encyclopedia', title: '백과의 인기 글', views: 11 }],
    male_infertility: [],
  },
};
let root; let container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  getWebArticleStatistics.mockResolvedValue(sample);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = () => act(async () => root.render(<ThemeProvider theme={theme}><WebArticleStatistics /></ThemeProvider>));
const click = async label => act(async () => {
  const button = [...container.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
  if (!button) throw new Error(`Missing ${label}`);
  button.click();
});
const metric = label => container.querySelector(`[aria-label="${label}"]`).textContent;

test('shows scoped totals, unknown history, daily series and compact rankings', async () => {
  await render();
  expect(metric('오늘 조회수')).toContain('12');
  expect(metric('어제 조회수')).toContain('15');
  expect(metric('기간 조회수')).toContain('27');
  expect(container.textContent).toContain('비로그인 포함');
  expect(container.textContent).toContain('관리자 열람 제외');
  expect(container.textContent).toContain('가장 많이 읽은 뉴스');
  expect(container.querySelector('[aria-label="2026-10-08 집계 전"]')).not.toBeNull();
  await click('일별 내역');
  expect(container.querySelector('table[aria-label="일별 조회수"]')).not.toBeNull();
  expect(container.textContent).toContain('집계 전');
});

test('category selection filters metrics/rankings without additional reads; periods refetch', async () => {
  await render(); await click('난임백과');
  expect(metric('오늘 조회수')).toContain('7');
  expect(metric('기간 조회수')).toContain('11');
  expect(container.textContent).toContain('백과의 인기 글');
  expect(container.textContent).not.toContain('가장 많이 읽은 뉴스');
  expect(getWebArticleStatistics).toHaveBeenCalledTimes(1);
  await click('30일');
  expect(getWebArticleStatistics).toHaveBeenLastCalledWith(30);
});

test('loading, empty, failure and retry states are honest', async () => {
  let resolve;
  getWebArticleStatistics.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await render(); expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  await act(async () => resolve({ ...sample, startedAt: null, daily: sample.daily.map(d => ({ ...d, counts: null })), topArticles: { all: [] } }));
  expect(container.textContent).toContain('아직 집계된 조회가 없습니다');
  getWebArticleStatistics.mockRejectedValueOnce(new Error('offline'));
  await click('통계 새로고침');
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.textContent).not.toContain('가장 많이 읽은 뉴스');
  await click('다시 시도');
  expect(container.textContent).toContain('가장 많이 읽은 뉴스');
});

test('late response from an old period cannot replace the current one', async () => {
  let resolve;
  getWebArticleStatistics.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await render(); await click('30일');
  await act(async () => resolve({ ...sample, topArticles: { all: [{ title: '오래된 응답', section: 'news', articleId: 'old', views: 9 }] } }));
  expect(container.textContent).not.toContain('오래된 응답');
  expect(container.textContent).toContain('가장 많이 읽은 뉴스');
});

test('an oversized report asks for a smaller range instead of showing partial numbers', async () => {
  getWebArticleStatistics.mockRejectedValueOnce({ code: 'functions/resource-exhausted' });
  await render();
  expect(container.querySelector('[role="alert"]').textContent).toContain('조회 기간을 줄여');
  expect(container.querySelector('[aria-label="기간 조회수"]')).toBeNull();
});
