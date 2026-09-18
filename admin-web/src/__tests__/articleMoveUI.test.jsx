import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDocs, getCountFromServer, onSnapshot, runTransaction } from 'firebase/firestore';
import NewsManager from '../components/NewsManager';
import EncyclopediaManager from '../components/EncyclopediaManager';
import { ARTICLE_SECTIONS } from '../utils/articleSections';

jest.mock('../firebase', () => ({ db: {}, storage: {}, auth: { currentUser: { uid: 'admin' } } }));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }), doc: (_db, name, id) => ({ name, id }),
  query: (ref, ...constraints) => ({ ...ref, constraints }),
  where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
  limit: (size) => ({ limit: size }), startAfter: (cursor) => ({ startAfter: cursor }),
  getDocs: jest.fn(), getCountFromServer: jest.fn(), onSnapshot: jest.fn(), runTransaction: jest.fn(),
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: () => 'timestamp', increment: (amount) => ({ increment: amount }),
}));
jest.mock('quill-image-resize-module-react', () => ({}));
jest.mock('../utils/quillScrollGuard', () => ({
  installQuillDialogScrollGuard: () => () => {}, isQuillDialogScrollGuardActive: () => false,
}));
jest.mock('react-quill', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef(() => <div />), Quill: { register: jest.fn(), import: () => ({}) } };
});

const articleData = { title: '남성난임 원본 글', content: '<p>원본 본문</p>', isPublished: false, viewCount: 42 };
const sample = { id: 'original-id', data: () => articleData };
let root;
let container;
let transaction;
let sourceCollection;
let targetExists;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  sourceCollection = 'news';
  targetExists = false;
  transaction = {
    get: jest.fn(async (ref) => ({ exists: () => ref.name === sourceCollection || targetExists, data: () => articleData })),
    set: jest.fn(), delete: jest.fn(),
  };
  runTransaction.mockImplementation(async (_db, callback) => callback(transaction));
  getDocs.mockResolvedValue({ docs: [] });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) });
  onSnapshot.mockImplementation((_query, callback) => { callback({ docs: [sample] }); return jest.fn(); });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const render = async (source, readOnly = false) => {
  sourceCollection = source;
  await act(async () => root.render(source === 'news'
    ? <NewsManager readOnly={readOnly} />
    : <EncyclopediaManager section={source === 'male_infertility' ? ARTICLE_SECTIONS.maleInfertility : ARTICLE_SECTIONS.encyclopedia} readOnly={readOnly} />));
};
const click = async (text) => act(async () => {
  const element = [...document.body.querySelectorAll('button, h6, h5')].find((el) => el.textContent === text);
  if (!element) throw new Error(`Missing action: ${text}`);
  element.click();
});

test.each([
  ['news', 'male_infertility'], ['encyclopedia', 'male_infertility'],
])('admin can move from %s to %s with preserved identity and list refresh', async (source, target) => {
  await render(source);
  await click(articleData.title);
  await click('남성난임으로 이동');
  expect(document.body.textContent).toContain('등록일·조회수·공개 상태는 그대로 유지됩니다.');
  expect(document.querySelector('select')).toBeNull();
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });
  await click('이동');
  expect(transaction.set).toHaveBeenCalledWith({ name: target, id: sample.id }, articleData);
  expect(transaction.delete).toHaveBeenCalledWith({ name: source, id: sample.id });
  expect(document.body.textContent).not.toContain('원본 백업 다운로드');
  expect(container.textContent).not.toContain(articleData.title);
  expect(container.textContent).toContain('이동했습니다');
});

test('destination collision leaves the source visible and shows a retryable error', async () => {
  await render('news');
  await click(articleData.title);
  await click('남성난임으로 이동');
  targetExists = true;
  await click('이동');
  expect(transaction.delete).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(document.body.textContent).toContain('같은 ID');
  await click('취소');
  expect(container.textContent).toContain(articleData.title);
});

test('public readers have no move action', async () => {
  getDocs.mockResolvedValue({ docs: [{ ...sample, data: () => ({ ...articleData, isPublished: true }) }] });
  await render('encyclopedia', true);
  await click(articleData.title);
  expect(document.body.textContent).not.toContain('남성난임으로 이동');
});

test('admin can review and atomically move selected articles together', async () => {
  const second = { id: 'second-id', data: () => ({ ...articleData, title: '두 번째 글' }) };
  onSnapshot.mockImplementation((_query, callback) => { callback({ docs: [sample, second] }); return jest.fn(); });
  await render('news');
  const boxes = [...document.querySelectorAll('input[type="checkbox"]')];
  expect(boxes).toHaveLength(2);
  await act(async () => { boxes.forEach((box) => box.click()); });
  await click('선택한 글 2개 남성난임으로 이동');
  expect([...document.querySelectorAll('[role="dialog"]')].some((dialog) => dialog.textContent.includes('두 번째 글'))).toBe(true);
  await click('이동');
  expect(runTransaction).toHaveBeenCalledTimes(1);
  expect(transaction.set).toHaveBeenCalledTimes(2);
  expect(container.textContent).not.toContain('두 번째 글');
});

test('moving keeps already loaded older articles searchable after the live first page updates', async () => {
  const firstPage = Array.from({ length: 17 }, (_, i) => ({ id: `id-${i}`, data: () => ({ ...articleData, title: `첫글 ${i}` }) }));
  const older = { id: 'older-id', data: () => ({ ...articleData, title: '오래된 글' }) };
  let receivePage;
  onSnapshot.mockImplementation((_query, callback) => { receivePage = callback; callback({ docs: firstPage }); return jest.fn(); });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 18 }) });
  getDocs.mockResolvedValue({ docs: [older] });
  await render('news');
  await click('2');
  await click('1');
  await click('첫글 0');
  await click('남성난임으로 이동');
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 17 }) });
  await click('이동');
  await act(async () => receivePage({ docs: firstPage.slice(1) }));
  await act(async () => {
    const search = document.querySelector('input[placeholder="제목 또는 내용 검색..."]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '오래된');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.textContent).toContain('오래된 글');
});

test('a failed commit keeps the selection and allows retry without reporting completion', async () => {
  await render('news');
  await act(async () => document.querySelector('input[type="checkbox"]').click());
  await click('선택한 글 1개 남성난임으로 이동');
  runTransaction.mockRejectedValueOnce(new Error('연결을 확인해주세요'));
  await click('이동');
  expect(document.body.textContent).toContain('연결을 확인해주세요');
  expect(container.textContent).not.toContain('이동했습니다');
  expect(container.textContent).toContain('선택한 글 1개 남성난임으로 이동');
  await click('이동');
  expect(container.textContent).toContain('이동했습니다');
});

test('backup downloads selected article data without moving any document', async () => {
  const createURL = jest.fn(() => 'blob:backup');
  const revokeURL = jest.fn();
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = createURL;
  URL.revokeObjectURL = revokeURL;
  const linkClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    await render('news');
    await click(articleData.title);
    await click('남성난임으로 이동');
    await click('원본 백업 다운로드');
    expect(createURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(linkClick).toHaveBeenCalledTimes(1);
    expect(runTransaction).not.toHaveBeenCalled();
  } finally {
    linkClick.mockRestore();
    URL.createObjectURL = originalCreate;
    // Keep the stub available until the component's deferred URL cleanup runs.
    window.setTimeout(() => { URL.revokeObjectURL = originalRevoke; }, 1100);
  }
});

test('live refill advances the cursor when only the first page was loaded', async () => {
  const docs = Array.from({ length: 35 }, (_, i) => ({ id: `id-${i}`, data: () => ({ ...articleData, title: `글 ${i}` }) }));
  let receivePage;
  onSnapshot.mockImplementation((_query, callback) => { receivePage = callback; callback({ docs: docs.slice(0, 17) }); return jest.fn(); });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 35 }) });
  await render('news');
  await click('글 0');
  await click('남성난임으로 이동');
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 34 }) });
  await click('이동');
  await act(async () => receivePage({ docs: docs.slice(1, 18) }));
  getDocs.mockResolvedValue({ docs: docs.slice(18, 35) });
  await click('2');
  expect(getDocs.mock.calls.at(-1)[0].constraints).toContainEqual({ startAfter: docs[17] });
});

test('moving the last page of filtered results clamps to the remaining search page', async () => {
  const docs = Array.from({ length: 34 }, (_, i) => ({ id: `id-${i}`, data: () => ({ ...articleData, title: `${i < 18 ? '검색대상' : '기타'} ${i}` }) }));
  onSnapshot.mockImplementation((_query, callback) => { callback({ docs: docs.slice(0, 17) }); return jest.fn(); });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 34 }) });
  getDocs.mockResolvedValue({ docs: docs.slice(17) });
  await render('news');
  await click('2');
  await act(async () => {
    const search = document.querySelector('input[placeholder="제목 또는 내용 검색..."]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '검색대상');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('2');
  await click('검색대상 17');
  await click('남성난임으로 이동');
  await click('이동');
  expect(container.textContent).toContain('검색대상 0');
});

test('male infertility has no reverse move controls that could resend publication alerts', async () => {
  await render('male_infertility');
  expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  await click(articleData.title);
  expect(document.body.textContent).not.toContain('남성난임으로 이동');
  expect(document.body.textContent).not.toContain('다른 게시판으로 이동');
});

test.each(['news', 'encyclopedia'])('a new first-page article does not drop already loaded boundary articles in %s', async (source) => {
  const timestamp = (seconds) => ({ seconds, nanoseconds: 0, toDate: () => new Date(seconds * 1000) });
  const docs = Array.from({ length: 34 }, (_, i) => ({ id: `id-${i}`, data: () => ({ ...articleData, title: `경계글 ${i}`, createdAt: timestamp(100 - i) }) }));
  const newest = { id: 'newest', data: () => ({ ...articleData, title: '새 글', createdAt: timestamp(101) }) };
  let receivePage;
  onSnapshot.mockImplementation((_query, callback) => { receivePage = callback; callback({ docs: docs.slice(0, 17) }); return jest.fn(); });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 34 }) });
  getDocs.mockResolvedValue({ docs: docs.slice(17) });
  await render(source);
  await click('2');
  await act(async () => receivePage({ docs: [newest, ...docs.slice(0, 16)] }));
  await act(async () => {
    const search = document.querySelector('input[placeholder="제목 또는 내용 검색..."]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '경계글 16');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.textContent).toContain('경계글 16');
});
