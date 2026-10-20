import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { addDoc, updateDoc, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { prepareArticleImages } from '../services/articleImages';
import NewsManager from '../components/NewsManager';
import EncyclopediaManager from '../components/EncyclopediaManager';
import { ARTICLE_SECTIONS } from '../utils/articleSections';
import { uploadBytes, getDownloadURL } from 'firebase/storage';

const mockHideImageResize = jest.fn();

jest.mock('../services/articleImages', () => ({ prepareArticleImages: jest.fn() }));
jest.mock('../firebase', () => ({ db: {}, storage: {}, auth: { currentUser: { uid: 'admin' } } }));
jest.mock('../components/ArticleSearch', () => ({ children }) => children);
jest.mock('../components/EditorInsertTools', () => () => null);
jest.mock('../services/webArticleStatisticsService', () => ({ recordWebArticleView: jest.fn() }));
jest.mock('../utils/quillScrollGuard', () => ({
  installQuillDialogScrollGuard: () => () => {},
  isQuillDialogScrollGuardActive: () => false,
}));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  doc: (_db, name, id) => ({ name, id }),
  query: ref => ref,
  where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(), startAfter: jest.fn(),
  onSnapshot: jest.fn(), getCountFromServer: jest.fn(), getDocs: jest.fn(),
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
  serverTimestamp: () => 'timestamp',
}));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('quill-image-resize-module-react', () => ({}));
jest.mock('react-quill', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(({ defaultValue, onChange, readOnly }, ref) => {
      const input = React.useRef();
      React.useImperativeHandle(ref, () => ({
        getEditor: () => ({
          root: { innerHTML: input.current.value },
          getModule: () => ({ hide: mockHideImageResize }),
        }),
      }));
      return <textarea ref={input} aria-label="본문" defaultValue={defaultValue}
        onChange={e => onChange(e.target.value)} readOnly={readOnly} />;
    }),
    Quill: { register: jest.fn(), import: () => ({}) },
  };
});

const boards = [
  ['news', NewsManager, {}],
  ['encyclopedia', EncyclopediaManager, {}],
  ['male_infertility', EncyclopediaManager, { section: ARTICLE_SECTIONS.maleInfertility }],
];
const original = '<p>원래 본문</p><img src="https://example.org/image.png">';
const imported = '<p>저장할 본문</p><img src="https://storage.example/image.png">';
const article = { title: '기존 글', content: original, imageUrl: 'https://example.org/image.png', isPublished: true };
let root;
let container;
const click = async node => act(async () => node.click());
const dialog = () => document.querySelector('[role="dialog"]');
const saveButton = () => [...dialog().querySelectorAll('button')].find(button => button.textContent === '저장');
const setValue = async (node, value) => act(async () => {
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  onSnapshot.mockImplementation((_q, callback) => {
    callback({ docs: [{ id: 'existing', data: () => article }] });
    return () => {};
  });
  getCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) });
  prepareArticleImages.mockResolvedValue({ content: imported, imageUrl: 'https://storage.example/image.png' });
  addDoc.mockResolvedValue({});
  updateDoc.mockResolvedValue();
  getDownloadURL.mockResolvedValue('https://storage.example/thumbnail.png');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

test.each(boards)('%s edits only after image preparation and preserves thumbnail choice', async (section, Component, props) => {
  await act(async () => root.render(<Component {...props} />));
  await click(container.querySelector('[data-testid="EditRoundedIcon"]').closest('button'));
  let finish;
  prepareArticleImages.mockImplementationOnce(({ onProgress }) => {
    onProgress({ completed: 0, total: 2 });
    return new Promise(resolve => { finish = resolve; });
  });
  const save = saveButton();
  await act(async () => { save.click(); save.click(); });
  expect(prepareArticleImages).toHaveBeenCalledTimes(1);
  expect(mockHideImageResize).toHaveBeenCalledTimes(1);
  expect(mockHideImageResize.mock.invocationCallOrder[0]).toBeLessThan(prepareArticleImages.mock.invocationCallOrder[0]);
  expect(prepareArticleImages).toHaveBeenCalledWith(expect.objectContaining({
    section, content: original, selectedImageUrl: article.imageUrl, customThumbnail: null,
  }));
  expect(updateDoc).not.toHaveBeenCalled();
  expect(dialog().querySelector('fieldset').disabled).toBe(true);
  expect(dialog().querySelector('textarea[aria-label="본문"]').readOnly).toBe(true);
  expect(dialog().querySelector('[role="status"]').textContent).toContain('0 / 2');
  await act(async () => finish({ content: imported, imageUrl: 'https://storage.example/image.png' }));
  expect(updateDoc).toHaveBeenCalledWith({ name: section, id: 'existing' }, expect.objectContaining({
    content: imported, imageUrl: 'https://storage.example/image.png',
  }));
});

test.each(boards)('%s thumbnail upload disables the picker and allows choosing the same file again', async (_section, Component, props) => {
  await act(async () => root.render(<Component {...props} />));
  await click(container.querySelector('[data-testid="EditRoundedIcon"]').closest('button'));
  const input = dialog().querySelector('input[type="file"]');
  const setInputValue = jest.fn();
  Object.defineProperty(input, 'value', { configurable: true, get: () => 'fakepath/image.png', set: setInputValue });
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['image'], 'image.png', { type: 'image/png' })] });
  let finish;
  uploadBytes.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  expect(input.disabled).toBe(true);
  expect(saveButton().disabled).toBe(true);
  expect(setInputValue).toHaveBeenCalledWith('');
  await act(async () => finish({}));
  expect(input.disabled).toBe(false);
  uploadBytes.mockResolvedValueOnce({});
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  expect(uploadBytes).toHaveBeenCalledTimes(2);
});

test.each(boards)('%s failed image import keeps the draft and never writes the article', async (_section, Component, props) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => root.render(<Component {...props} />));
  await click(container.querySelector('[data-testid="EditRoundedIcon"]').closest('button'));
  prepareArticleImages.mockRejectedValueOnce(new Error('본문 이미지 1번을 저장하지 못했습니다.'));
  await click(saveButton());
  expect(updateDoc).not.toHaveBeenCalled();
  expect(addDoc).not.toHaveBeenCalled();
  expect(dialog().querySelector('textarea').value).toBe(original);
  expect(dialog().querySelector('fieldset').disabled).toBe(false);
  expect(document.body.textContent).toContain('본문 이미지 1번을 저장하지 못했습니다.');
  await click(saveButton());
  expect(updateDoc).toHaveBeenCalledTimes(1);
});

test.each(boards)('%s new article uses converted HTML and thumbnail', async (section, Component, props) => {
  await act(async () => root.render(<Component {...props} />));
  await click(container.querySelector('[data-testid="AddRoundedIcon"]').closest('button'));
  await setValue(dialog().querySelector('input'), '새 글');
  await setValue(dialog().querySelector('textarea'), original);
  await click(saveButton());
  expect(prepareArticleImages).toHaveBeenCalledWith(expect.objectContaining({ section, content: original }));
  expect(addDoc).toHaveBeenCalledWith({ name: section }, expect.objectContaining({
    title: '새 글', content: imported, imageUrl: 'https://storage.example/image.png',
  }));
  expect(updateDoc).not.toHaveBeenCalled();
});
