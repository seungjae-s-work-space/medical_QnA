const fs = require('fs');
const path = require('path');

const {
  installQuillDialogScrollGuard,
  runWithPreservedScroll,
} = require('../utils/quillScrollGuard');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('quill editor scroll guard', () => {
  test('restores the dialog scroll position after a guarded editor operation', () => {
    const dialogContent = { scrollTop: 240 };

    const result = runWithPreservedScroll(dialogContent, () => {
      dialogContent.scrollTop = 0;
      return 'inserted';
    });

    expect(result).toBe('inserted');
    expect(dialogContent.scrollTop).toBe(240);
  });

  test('preserves dialog scroll only during paste-driven Quill scroll calls', () => {
    const handlers = {};
    const root = {
      addEventListener: jest.fn((eventName, handler) => {
        handlers[eventName] = handler;
      }),
      removeEventListener: jest.fn(),
    };
    const dialogContent = { scrollTop: 320 };
    const quill = {
      root,
      scrollIntoView: jest.fn(() => {
        dialogContent.scrollTop = 0;
      }),
      selection: {
        scrollIntoView: jest.fn(() => {
          dialogContent.scrollTop = 12;
        }),
      },
    };

    const cleanup = installQuillDialogScrollGuard(quill, dialogContent);

    quill.scrollIntoView();
    expect(dialogContent.scrollTop).toBe(0);

    dialogContent.scrollTop = 320;
    handlers.paste();
    quill.scrollIntoView();
    quill.selection.scrollIntoView();
    expect(dialogContent.scrollTop).toBe(320);

    cleanup();
    expect(root.removeEventListener).toHaveBeenCalledWith('paste', handlers.paste, true);
    expect(root.removeEventListener).toHaveBeenCalledWith('drop', handlers.drop, true);
  });

  test('news and encyclopedia editors install the scroll guard', () => {
    ['NewsManager.jsx', 'EncyclopediaManager.jsx'].forEach((fileName) => {
      const source = read(`components/${fileName}`);

      expect(source).toMatch(/installQuillDialogScrollGuard/);
      expect(source).toMatch(/runWithPreservedScroll/);
      expect(source).toMatch(/dialogContentRef = useRef\(null\)/);
      expect(source).toMatch(/ref=\{dialogContentRef\}/);
    });
  });
});
