import Quill from 'quill';
import { insertEditorSymbol, insertEditorDivider } from '../utils/quillInsertions';

let host;
let quill;
beforeAll(() => {
  document.execCommand = jest.fn();
  Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
  Range.prototype.getClientRects = () => [];
});
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  quill = new Quill(host, { modules: { toolbar: false } });
});
afterEach(() => host.remove());

test('symbol replaces the selection, retains inline formatting, and undoes as one change', () => {
  quill.setText('before SELECT after');
  quill.formatText(7, 6, 'bold', true);
  quill.history.clear();
  insertEditorSymbol(quill, { index: 7, length: 6 }, '±', host);
  expect(quill.getText()).toBe('before ± after\n');
  expect(quill.getFormat(7, 1).bold).toBe(true);
  expect(quill.getSelection()).toMatchObject({ index: 8, length: 0 });
  quill.history.undo();
  expect(quill.getText()).toBe('before SELECT after\n');
  quill.history.redo();
  expect(quill.getText()).toBe('before ± after\n');
});

test.each([
  ['', 0], ['text', 0], ['beforeafter', 6], ['text', 4],
])('divider inserts into %j at %i and round trips through HTML', (text, index) => {
  quill.setText(text);
  quill.history.clear();
  insertEditorDivider(quill, { index, length: 0 }, host);
  expect(host.querySelectorAll('hr')).toHaveLength(1);
  expect(quill.getText().replace(/\n/g, '')).toBe(text);
  expect(quill.root.lastElementChild.tagName).toBe('P');
  const html = quill.root.innerHTML;
  quill.history.undo();
  expect(host.querySelectorAll('hr')).toHaveLength(0);
  expect(quill.getText()).toBe(`${text}\n`);
  quill.history.redo();
  expect(host.querySelectorAll('hr')).toHaveLength(1);
  quill.setContents(quill.clipboard.convert(html));
  expect(host.querySelectorAll('hr')).toHaveLength(1);
});

test('divider replaces selected text and splits a paragraph cleanly', () => {
  quill.setText('before SELECT after');
  insertEditorDivider(quill, { index: 7, length: 7 }, host);
  expect(quill.root.innerHTML).toBe('<p>before </p><hr><p>after</p>');
});

test('insertion clamps a stale range without removing the final paragraph', () => {
  quill.setText('text');
  insertEditorDivider(quill, { index: 100, length: 100 }, host);
  expect(host.querySelectorAll('hr')).toHaveLength(1);
  expect(quill.root.lastElementChild.tagName).toBe('P');
});

test.each([['header', 2, 'H2'], ['list', 'bullet', 'UL']])(
  'divider keeps the preceding %s block formatting', (format, value, tag) => {
    quill.setText('beforeafter');
    quill.formatLine(0, 1, format, value);
    insertEditorDivider(quill, { index: 6, length: 0 }, host);
    expect(quill.root.firstElementChild.tagName).toBe(tag);
    expect(quill.root.firstElementChild.textContent).toBe('before');
  },
);
