const fs = require('fs');
const path = require('path');

const {
  handleQuillPasteWithPreservedScroll,
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

    expect(quill.scrollingContainer).toBe(dialogContent);

    quill.scrollIntoView();
    expect(dialogContent.scrollTop).toBe(0);

    dialogContent.scrollTop = 320;
    handlers.drop();
    quill.scrollIntoView();
    quill.selection.scrollIntoView();
    expect(dialogContent.scrollTop).toBe(320);

    cleanup();
    expect(root.removeEventListener).toHaveBeenCalledWith('paste', handlers.paste, true);
    expect(root.removeEventListener).toHaveBeenCalledWith('drop', handlers.drop, true);
  });

  test('handles paste before Quill moves focus to its hidden clipboard', () => {
    const handlers = {};
    const root = {
      addEventListener: jest.fn((eventName, handler) => {
        handlers[eventName] = handler;
      }),
      removeEventListener: jest.fn(),
    };
    const delta = {
      length: () => 4,
    };
    const change = {
      delete: jest.fn(() => change),
      concat: jest.fn(() => change),
    };
    const Delta = jest.fn(function MockDelta() {
      return {
        retain: jest.fn(() => change),
      };
    });
    const dialogContent = { scrollTop: 420 };
    const event = {
      clipboardData: {
        getData: jest.fn((type) => (type === 'text/html' ? '<p>붙여넣기</p>' : '')),
      },
      preventDefault: jest.fn(),
    };
    const quill = {
      root,
      scrollingContainer: { scrollTop: 0 },
      constructor: {
        import: jest.fn(() => Delta),
      },
      clipboard: {
        convert: jest.fn(() => delta),
      },
      getSelection: jest.fn(() => ({ index: 7, length: 2 })),
      updateContents: jest.fn(() => {
        dialogContent.scrollTop = 0;
      }),
      setSelection: jest.fn(() => {
        dialogContent.scrollTop = 12;
      }),
      isEnabled: jest.fn(() => true),
    };

    installQuillDialogScrollGuard(quill, dialogContent);
    handlers.paste(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(quill.clipboard.convert).toHaveBeenCalledWith('<p>붙여넣기</p>');
    expect(change.delete).toHaveBeenCalledWith(2);
    expect(change.concat).toHaveBeenCalledWith(delta);
    expect(quill.updateContents).toHaveBeenCalledWith(change, 'user');
    expect(quill.setSelection).toHaveBeenCalledWith(11, 'silent');
    expect(dialogContent.scrollTop).toBe(420);
  });

  test('handles dialog-level paste capture before Quill native clipboard logic', () => {
    const editorRoot = {
      contains: jest.fn((target) => target === 'editor'),
    };
    const delta = {
      length: () => 5,
    };
    const change = {
      delete: jest.fn(() => change),
      concat: jest.fn(() => change),
    };
    const Delta = jest.fn(function MockDelta() {
      return {
        retain: jest.fn(() => change),
      };
    });
    const dialogContent = { scrollTop: 180 };
    const event = {
      target: 'editor',
      clipboardData: {
        getData: jest.fn((type) => (type === 'text/html' ? '<p>hello</p>' : '')),
      },
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      nativeEvent: {
        stopImmediatePropagation: jest.fn(),
      },
    };
    const quill = {
      root: editorRoot,
      container: editorRoot,
      constructor: {
        import: jest.fn(() => Delta),
      },
      clipboard: {
        convert: jest.fn(() => delta),
      },
      getSelection: jest.fn(() => ({ index: 3, length: 0 })),
      updateContents: jest.fn(() => {
        dialogContent.scrollTop = 0;
      }),
      setSelection: jest.fn(),
      isEnabled: jest.fn(() => true),
    };

    expect(handleQuillPasteWithPreservedScroll(quill, dialogContent, event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.nativeEvent.stopImmediatePropagation).toHaveBeenCalled();
    expect(quill.updateContents).toHaveBeenCalledWith(change, 'user');
    expect(quill.setSelection).toHaveBeenCalledWith(8, 'silent');
    expect(dialogContent.scrollTop).toBe(180);
  });

  test('news and encyclopedia editors install the scroll guard', () => {
    ['NewsManager.jsx', 'EncyclopediaManager.jsx'].forEach((fileName) => {
      const source = read(`components/${fileName}`);

      expect(source).toMatch(/handleQuillPasteWithPreservedScroll/);
      expect(source).toMatch(/installQuillDialogScrollGuard/);
      expect(source).toMatch(/runWithPreservedScroll/);
      expect(source).toMatch(/handleEditorChange/);
      expect(source).toMatch(/handleDialogPasteCapture/);
      expect(source).toMatch(/onPasteCapture=\{handleDialogPasteCapture\}/);
      expect(source).toMatch(/handleEditFromView/);
      expect(source).toMatch(/getCurrentEditorContent/);
      expect(source).toMatch(/dialogContentRef = useRef\(null\)/);
      expect(source).toMatch(/ref=\{dialogContentRef\}/);
      expect(source).toMatch(/onChange=\{handleEditorChange\}/);
      expect(source).toMatch(/defaultValue=\{content\}/);
      expect(source).not.toMatch(/value=\{content\}/);
      expect(source).toMatch(/disableAutoFocus/);
      expect(source).toMatch(/disableEnforceFocus/);
      expect(source).toMatch(/disableRestoreFocus/);
      expect(source).toMatch(/disableScrollLock/);
      expect(source).toMatch(/ql-clipboard/);
      expect(source).toMatch(/left: 0/);
    });
  });
});
