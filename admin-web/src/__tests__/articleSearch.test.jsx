import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ArticleSearch from '../components/ArticleSearch';
import { searchArticles, readSearchArticle } from '../services/articleSearchService';

jest.mock('../services/articleSearchService', () => ({ searchArticles: jest.fn(), readSearchArticle: jest.fn() }));
let root;
let container;
let onOpen;
const response = (title = '첫 페이지 밖의 글', page = 0) => ({ items: [{ id: 'older', title, isPublished: true }], total: 65, page, pageSize: 30 });
const input = () => container.querySelector('input');
const type = async (text) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input(), text);
  input().dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = async () => act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
const button = (label) => container.querySelector(`button[aria-label="${label}"]`);
const render = async (props = {}) => act(async () => root.render(
  <ArticleSearch section="news" readOnly onOpen={onOpen} {...props}><div>원래 목록 2페이지</div></ArticleSearch>,
));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  searchArticles.mockResolvedValue(response());
  readSearchArticle.mockResolvedValue({ id: 'older', title: '최신 제목', content: '<p>전체 본문</p>' });
  onOpen = jest.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('typing preserves browsing; submission searches the board and shows compact titles only', async () => {
  await render();
  await type('  자궁  ');
  expect(searchArticles).not.toHaveBeenCalled();
  expect(container.textContent).toContain('원래 목록 2페이지');
  await submit();
  expect(searchArticles).toHaveBeenCalledWith({ section: 'news', query: '자궁', page: 0, includeDrafts: false });
  expect(container.textContent).toContain('첫 페이지 밖의 글');
  expect(container.textContent).not.toContain('원래 목록');
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.MuiCard-root')).toBeNull();
  expect(container.textContent).toContain('65');
});

test('pagination uses the submitted query, not unfinished input; clearing restores the browse page', async () => {
  await render(); await type('자궁'); await submit(); await type('작성 중');
  searchArticles.mockResolvedValue(response('다음 결과', 1));
  await act(async () => button('검색 결과 2 페이지').click());
  expect(searchArticles).toHaveBeenLastCalledWith({ section: 'news', query: '자궁', page: 1, includeDrafts: false });
  await act(async () => button('검색 초기화').click());
  expect(container.textContent).toContain('원래 목록 2페이지');
  expect(input().value).toBe('');
});

test('opening a result fetches the live article and preserves the results', async () => {
  await render(); await type('자궁'); await submit();
  await act(async () => button('첫 페이지 밖의 글').click());
  expect(readSearchArticle).toHaveBeenCalledWith('news', 'older', false);
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ content: '<p>전체 본문</p>' }));
  expect(container.textContent).toContain('첫 페이지 밖의 글');
});

test('failed searches can retry and missing detail does not discard the results', async () => {
  searchArticles.mockRejectedValueOnce(new Error('offline'));
  await render(); await type('자궁'); await submit();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => button('검색 다시 시도').click());
  expect(container.textContent).toContain('첫 페이지 밖의 글');
  readSearchArticle.mockRejectedValueOnce(new Error('missing'));
  await act(async () => button('첫 페이지 밖의 글').click());
  expect(onOpen).not.toHaveBeenCalled();
  expect(container.textContent).toContain('첫 페이지 밖의 글');
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
});

test('late responses cannot replace a newer search or restore a cleared search', async () => {
  let resolveOld;
  searchArticles.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  await render(); await type('옛 검색'); await submit();
  await type('새 검색'); await submit();
  await act(async () => resolveOld(response('오래된 응답')));
  expect(container.textContent).not.toContain('오래된 응답');
  expect(container.textContent).toContain('첫 페이지 밖의 글');
  searchArticles.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  await type('다른 검색'); await submit();
  await act(async () => button('검색 초기화').click());
  await act(async () => resolveOld(response('늦게 온 응답')));
  expect(container.textContent).toContain('원래 목록 2페이지');
  expect(container.textContent).not.toContain('늦게 온 응답');
});

test('changing boards or permissions clears the previous search, including drafts', async () => {
  await render({ readOnly: false }); await type('임신'); await submit();
  expect(searchArticles).toHaveBeenLastCalledWith(expect.objectContaining({ includeDrafts: true }));
  await render({ section: 'male_infertility' });
  expect(input().value).toBe('');
  expect(container.textContent).not.toContain('첫 페이지 밖의 글');
  await type('임신'); await submit();
  expect(searchArticles).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'male_infertility', includeDrafts: false }));
});

test('administrators can edit a result after reading its complete source', async () => {
  const onEdit = jest.fn();
  await render({ readOnly: false, onEdit }); await type('자궁'); await submit();
  await act(async () => button('첫 페이지 밖의 글 수정').click());
  expect(readSearchArticle).toHaveBeenCalledWith('news', 'older', true);
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ content: '<p>전체 본문</p>' }));
});
