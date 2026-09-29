import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDocs, getCountFromServer, onSnapshot } from 'firebase/firestore';
import VideoManager from '../components/VideoManager';
import { searchArticles, readSearchArticle } from '../services/articleSearchService';

jest.mock('../services/articleSearchService', () => ({ searchArticles: jest.fn(), readSearchArticle: jest.fn() }));
jest.mock('../firebase', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }), doc: (_db, name, id) => ({ name, id }),
  query: (ref, ...constraints) => ({ ...ref, constraints }),
  where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
  limit: size => ({ limit: size }), startAfter: cursor => ({ startAfter: cursor }),
  getDocs: jest.fn(), getCountFromServer: jest.fn(), onSnapshot: jest.fn(),
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(), serverTimestamp: jest.fn(),
}));

const page = start => ({ docs: Array.from({ length: 17 }, (_, i) => ({ id: `video-${start + i}`, data: () => ({ title: `영상 ${start + i}`, description: '일반 설명', isPublished: true }) })) });
const result = { items: [{ id: 'older', title: '오래된 DNA 영상', isPublished: true }], total: 31, page: 0, pageSize: 30 };
let root;
let container;
const render = async (readOnly = true) => act(async () => root.render(<VideoManager readOnly={readOnly} />));
const button = label => container.querySelector(`button[aria-label="${label}"]`);
const type = async text => act(async () => {
  const input = container.querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = async () => {
  expect(container.querySelector('form[role="search"]')).not.toBeNull();
  await act(async () => container.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 65 }) });
  getDocs.mockImplementation(async q => page(q.constraints.some(c => c.startAfter) ? 18 : 1));
  onSnapshot.mockImplementation((_q, callback) => { callback(page(1)); return jest.fn(); });
  searchArticles.mockResolvedValue(result);
  readSearchArticle.mockResolvedValue({ id: 'older', title: '오래된 DNA 영상', description: '전체 영상 설명', videoId: 'youtube1234', youtubeUrl: 'https://youtu.be/youtube1234', isPublished: true });
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('video search submits the full-board query and clearing restores the previous browse page', async () => {
  await render();
  await act(async () => [...container.querySelectorAll('button')].find(el => el.textContent === '2').click());
  expect(container.textContent).toContain('영상 18');
  await type('DNA');
  expect(container.textContent).toContain('영상 18');
  expect(searchArticles).not.toHaveBeenCalled();
  const reads = getDocs.mock.calls.length;
  await submit();
  expect(searchArticles).toHaveBeenCalledWith({ section: 'videos', query: 'DNA', page: 0, includeDrafts: false });
  expect(container.textContent).toContain('오래된 DNA 영상');
  expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(0);
  expect(container.querySelector('img')).toBeNull();
  expect(getDocs).toHaveBeenCalledTimes(reads);
  expect(container.querySelector('label').textContent).toContain('제목 또는 설명 검색');
  await act(async () => button('검색 초기화').click());
  expect(container.textContent).toContain('영상 18');
  expect(container.textContent).not.toContain('오래된 DNA 영상');
  expect(getDocs.mock.calls.every(([q]) => q.constraints.some(c => c.limit === 17))).toBe(true);
});

test('result pagination uses the submitted query and opens the existing video playback dialog', async () => {
  await render(); await type('DNA'); await submit(); await type('미완성 검색');
  searchArticles.mockResolvedValueOnce({ ...result, page: 1 });
  await act(async () => button('검색 결과 2 페이지').click());
  expect(searchArticles).toHaveBeenLastCalledWith({ section: 'videos', query: 'DNA', page: 1, includeDrafts: false });
  await act(async () => button('오래된 DNA 영상').click());
  expect(readSearchArticle).toHaveBeenCalledWith('videos', 'older', false);
  expect(document.querySelector('iframe').src).toBe('https://www.youtube.com/embed/youtube1234');
  expect(document.querySelector('[role="dialog"]').textContent).toContain('전체 영상 설명');
});

test('administrators can search drafts and edit a full video result', async () => {
  await render(false); await type('DNA'); await submit();
  expect(searchArticles).toHaveBeenCalledWith(expect.objectContaining({ section: 'videos', includeDrafts: true }));
  await act(async () => button('오래된 DNA 영상 수정').click());
  expect(readSearchArticle).toHaveBeenCalledWith('videos', 'older', true);
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('영상 수정');
  expect([...dialog.querySelectorAll('input')].some(input => input.value === 'https://youtu.be/youtube1234')).toBe(true);
  expect(dialog.querySelector('textarea').value).toBe('전체 영상 설명');
});

test('failed searches can retry and unavailable video errors use video wording', async () => {
  searchArticles.mockRejectedValueOnce(new Error('offline'));
  await render(); await type('DNA'); await submit();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => button('검색 다시 시도').click());
  readSearchArticle.mockRejectedValueOnce(new Error('hidden'));
  await act(async () => button('오래된 DNA 영상').click());
  expect(container.querySelector('[role="alert"]').textContent).toContain('영상을 열 수 없습니다.');
  expect(container.textContent).toContain('오래된 DNA 영상');
  expect(document.querySelector('iframe')).toBeNull();
});
