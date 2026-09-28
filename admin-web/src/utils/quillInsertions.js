import { Quill } from 'react-quill';
import { runWithPreservedScroll } from './quillScrollGuard';

const BlockEmbed = Quill.import('blots/block/embed');
const Delta = Quill.import('delta');

class Divider extends BlockEmbed {
  static value() {
    return true;
  }
}
Divider.blotName = 'divider';
Divider.tagName = 'hr';
Quill.register(Divider, true);

function clampRange(quill, range) {
  const end = Math.max(0, quill.getLength() - 1);
  const index = Math.max(0, Math.min(range?.index || 0, end));
  return { index, length: Math.max(0, Math.min(range?.length || 0, end - index)) };
}

export function restoreEditorSelection(quill, range, scrollElement) {
  const selection = clampRange(quill, range);
  runWithPreservedScroll(scrollElement, () => {
    quill.root.focus({ preventScroll: true });
    quill.setSelection(selection.index, selection.length, 'silent');
  });
}

function applyInsertion(quill, change, caret, scrollElement) {
  runWithPreservedScroll(scrollElement, () => {
    const history = quill.getModule('history');
    history.cutoff();
    quill.updateContents(change, 'user');
    history.cutoff();
    restoreEditorSelection(quill, { index: caret, length: 0 }, scrollElement);
  });
  return { index: caret, length: 0 };
}

export function insertEditorSymbol(quill, range, symbol, scrollElement) {
  if (!symbol || !quill.isEnabled()) return;
  const selection = clampRange(quill, range);
  const formats = quill.getFormat(selection.index, selection.length);
  const inlineFormats = {};
  ['bold', 'italic', 'underline', 'strike', 'size', 'color', 'background', 'link'].forEach((key) => {
    if (formats[key] !== undefined && !Array.isArray(formats[key])) inlineFormats[key] = formats[key];
  });
  const change = new Delta().retain(selection.index).delete(selection.length).insert(symbol, inlineFormats);
  return applyInsertion(quill, change, selection.index + symbol.length, scrollElement);
}

export function insertEditorDivider(quill, range, scrollElement) {
  if (!quill.isEnabled()) return;
  const selection = clampRange(quill, range);
  // Split a paragraph when needed, while retaining Quill's mandatory final newline.
  const prefix = selection.index > 0 && quill.getText(selection.index - 1, 1) !== '\n' ? '\n' : '';
  const change = new Delta().retain(selection.index).delete(selection.length);
  if (prefix) {
    const [line, offset] = quill.getLine(selection.index);
    const newline = selection.index - offset + line.length() - 1;
    change.insert(prefix, quill.getContents(newline, 1).ops[0]?.attributes);
  }
  change.insert({ divider: true });
  return applyInsertion(quill, change, selection.index + prefix.length + 1, scrollElement);
}
