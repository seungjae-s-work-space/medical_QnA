import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getDocs, getCountFromServer, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import EncyclopediaManager from '../components/EncyclopediaManager';
import { ARTICLE_SECTIONS } from '../utils/articleSections';
import { shouldShowMembershipPrompt } from '../utils/membershipAccess';

jest.mock('../firebase', () => ({ db: {}, storage: {}, auth: { currentUser: null } }));
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
jest.mock('../utils/quillScrollGuard', () => ({
  installQuillDialogScrollGuard: () => () => {},
  isQuillDialogScrollGuardActive: () => false,
}));
jest.mock('react-quill', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({ getEditor: () => ({ root: { innerHTML: '<p>남성난임 본문</p>' } }) }));
      return <div data-testid="editor" />;
    }),
    Quill: { register: jest.fn(), import: () => ({}) },
  };
});

let root;
let container;
const sample = { id: 'male-1', data: () => ({ title: '남성난임 게시글', content: '<p>본문</p>', isPublished: true, viewCount: 0 }) };

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  auth.currentUser = null;
  getDocs.mockResolvedValue({ docs: [sample] });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) });
  onSnapshot.mockImplementation((_query, callback) => { callback({ docs: [] }); return jest.fn(); });
  updateDoc.mockResolvedValue();
  addDoc.mockResolvedValue({ id: 'new' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const render = async (props = {}) => act(async () => {
  root.render(<EncyclopediaManager section={ARTICLE_SECTIONS.maleInfertility} readOnly {...props} />);
});
const clickText = async (text) => act(async () => {
  const element = [...document.body.querySelectorAll('button, h6, h5, p')].find((el) => el.textContent === text);
  if (!element) throw new Error(`Missing element: ${text}`);
  element.click();
});

test('public list reads only published male infertility articles with a page limit', async () => {
  await render();
  expect(container.textContent).toContain('남성난임');
  expect(getDocs).toHaveBeenCalledWith(expect.objectContaining({
    name: 'male_infertility',
    constraints: expect.arrayContaining([{ where: ['isPublished', '==', true] }, { limit: 17 }]),
  }));
  expect(onSnapshot).not.toHaveBeenCalled();
  expect(shouldShowMembershipPrompt('/male-infertility', false)).toBe(true);
  expect(shouldShowMembershipPrompt('/male-infertility/', true)).toBe(false);
});

test('member views increment only the male infertility collection', async () => {
  auth.currentUser = { uid: 'member' };
  await render();
  await clickText('남성난임 게시글');
  expect(updateDoc).toHaveBeenCalledWith({ name: 'male_infertility', id: 'male-1' }, { viewCount: { increment: 1 } });
  expect(document.body.textContent).toContain('조회 1');
});

test('guest views still open the article without attempting an unauthorized increment', async () => {
  await render();
  await clickText('남성난임 게시글');
  expect(document.body.textContent).toContain('본문');
  expect(updateDoc).not.toHaveBeenCalled();
});

test('admin creates a male infertility article using the shared editor', async () => {
  auth.currentUser = { uid: 'admin' };
  await render({ readOnly: false });
  expect(container.textContent).toContain('남성난임 관리');
  expect(onSnapshot.mock.calls[0][0].name).toBe('male_infertility');
  await clickText('새 글 작성');
  await act(async () => {
    const input = document.querySelector('[role="dialog"] input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '새 남성난임 글');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await clickText('저장');
  expect(addDoc).toHaveBeenCalledWith({ name: 'male_infertility' }, expect.objectContaining({
    title: '새 남성난임 글', content: '<p>남성난임 본문</p>', viewCount: 0, authorId: 'admin', isPublished: true,
  }));
});

test('default encyclopedia keeps its original collection', async () => {
  await act(async () => { root.render(<EncyclopediaManager readOnly />); });
  expect(getDocs.mock.calls[0][0].name).toBe('encyclopedia');
});

test('pending admin initialization does not leave a listener after navigating away', async () => {
  let resolveCount;
  getCountFromServer.mockImplementation(() => new Promise((resolve) => { resolveCount = resolve; }));
  await render({ readOnly: false });
  await act(async () => { root.render(null); });
  await act(async () => { resolveCount({ data: () => ({ count: 0 }) }); });
  expect(onSnapshot).not.toHaveBeenCalled();
});

test('failed queries offer retry instead of displaying an empty collection', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    getDocs.mockRejectedValueOnce(new Error('offline'));
    await render();
    expect(container.textContent).toContain('글을 불러오지 못했습니다.');
    expect(container.textContent).not.toContain('등록된 글이 없습니다');
    await clickText('다시 시도');
    expect(container.textContent).toContain('남성난임 게시글');
  } finally {
    errorLog.mockRestore();
  }
});
