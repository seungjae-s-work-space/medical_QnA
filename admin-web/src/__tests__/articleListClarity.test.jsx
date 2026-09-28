import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDocs, getCountFromServer, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import NewsManager from '../components/NewsManager';
import EncyclopediaManager from '../components/EncyclopediaManager';
import { ARTICLE_SECTIONS } from '../utils/articleSections';
import { searchArticles } from '../services/articleSearchService';

jest.mock('../services/articleSearchService', () => ({ searchArticles: jest.fn(), readSearchArticle: jest.fn() }));

// Render real MUI cards across pagination and search transitions.
jest.setTimeout(20000);

jest.mock('../firebase', () => ({ db: {}, storage: {}, auth: { currentUser: { uid: 'admin' } } }));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  doc: (_db, name, id) => ({ name, id }),
  query: (ref, ...constraints) => ({ ...ref, constraints }),
  where: (...args) => ({ where: args }),
  orderBy: (...args) => ({ orderBy: args }),
  limit: (size) => ({ limit: size }),
  startAfter: (cursor) => ({ startAfter: cursor }),
  getDocs: jest.fn(), getCountFromServer: jest.fn(), onSnapshot: jest.fn(),
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: () => 'timestamp', increment: (amount) => ({ increment: amount }),
}));
jest.mock('quill-image-resize-module-react', () => ({}));
jest.mock('../components/EditorInsertTools', () => () => null);
jest.mock('../utils/quillScrollGuard', () => ({
  installQuillDialogScrollGuard: () => () => {},
  isQuillDialogScrollGuardActive: () => false,
}));
jest.mock('react-quill', () => ({
  __esModule: true,
  default: () => null,
  Quill: { register: jest.fn(), import: () => ({}) },
}));

const lists = [
  ['news', NewsManager, {}],
  ['encyclopedia', EncyclopediaManager, {}],
  ['male_infertility', EncyclopediaManager, { section: ARTICLE_SECTIONS.maleInfertility }],
];
const page = (start) => ({
  docs: Array.from({ length: 17 }, (_, index) => ({
    id: `article-${start + index}`,
    data: () => ({ title: `Article ${start + index}`, content: '<p>본문</p>', isPublished: true }),
  })),
});
let root;
let container;
let counts;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  counts = { total: 193, published: 192 };
  getCountFromServer.mockImplementation(async (q) => ({
    data: () => ({ count: q.constraints.some((c) => c.where?.[0] === 'isPublished') ? counts.published : counts.total }),
  }));
  getDocs.mockImplementation(async (q) => page(q.constraints.some((c) => c.startAfter) ? 18 : 1));
  onSnapshot.mockImplementation((_query, callback) => { callback(page(1)); return jest.fn(); });
  updateDoc.mockResolvedValue();
  deleteDoc.mockResolvedValue();
  searchArticles.mockResolvedValue({ items: [{ id: 'remote', title: '오래된 검색 결과', isPublished: true }], total: 1, page: 0, pageSize: 30 });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});
const render = async (Component, props) => act(async () => { root.render(<Component {...props} />); });
const stat = (label) => [...container.querySelectorAll('p')]
  .find((node) => node.textContent === label).parentElement.querySelector('h4').textContent;

test.each(lists)('%s admin statistics cover the whole collection, not just the first page', async (name, Component, props) => {
  await render(Component, props);
  expect(stat('전체 글')).toBe('193');
  expect(stat('공개')).toBe('192');
  expect(stat('비공개')).toBe('1');
  expect(getCountFromServer.mock.calls.every(([q]) => q.name === name)).toBe(true);
  expect(container.textContent).not.toContain('남성난임으로 이동');
  expect(container.querySelector('input[type="checkbox"]')).toBeNull();
});

test.each(lists)('%s public list retains a single published-count read', async (name, Component, props) => {
  await render(Component, { ...props, readOnly: true });
  expect(getCountFromServer).toHaveBeenCalledTimes(1);
  expect(getCountFromServer).toHaveBeenCalledWith(expect.objectContaining({
    name, constraints: [{ where: ['isPublished', '==', true] }],
  }));
  expect(onSnapshot).not.toHaveBeenCalled();
});

test.each(lists)('%s searches the whole board on submit and restores the original browse page', async (name, Component, props) => {
  await render(Component, props);
  const input = container.querySelector('input');
  expect(input).not.toBeNull();
  const next = container.querySelector('button[aria-label="다음 페이지"]');
  expect(next).not.toBeNull();
  expect(getComputedStyle(next.parentElement).flexWrap).toBe('wrap');
  expect(container.querySelector('button[aria-label="이전 페이지"]').disabled).toBe(true);
  await act(async () => next.click());
  expect(container.textContent).toContain('Article 18');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '없는 제목');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(searchArticles).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Article 18');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(searchArticles).toHaveBeenCalledWith({ section: name, query: '없는 제목', page: 0, includeDrafts: true });
  expect(container.textContent).toContain('오래된 검색 결과');
  expect(container.querySelector('.MuiCard-root')).toBeNull();
  await act(async () => container.querySelector('button[aria-label="검색 초기화"]').click());
  expect(container.textContent).toContain('Article 18');
  expect(container.textContent).not.toContain('오래된 검색 결과');
});

test.each(lists.slice(0, 2))('%s refreshes global counts after changing visibility', async (_name, Component, props) => {
  await render(Component, props);
  counts.published = 191;
  await act(async () => container.querySelector('[data-testid="VisibilityOffRoundedIcon"]').closest('button').click());
  expect(updateDoc).toHaveBeenCalled();
  expect(stat('공개')).toBe('191');
  expect(stat('비공개')).toBe('2');
});

test.each(lists.slice(0, 2))('%s refreshes global counts after deleting a published article', async (_name, Component, props) => {
  await render(Component, props);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  counts.total = 192;
  counts.published = 191;
  await act(async () => container.querySelector('[data-testid="DeleteRoundedIcon"]').closest('button').click());
  expect(deleteDoc).toHaveBeenCalled();
  expect(stat('전체 글')).toBe('192');
  expect(stat('공개')).toBe('191');
  expect(stat('비공개')).toBe('1');
});
