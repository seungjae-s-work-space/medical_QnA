const preserveUntilKey = '__quillDialogScrollGuardPreserveUntil';

const getDocumentScrollTargets = () => {
  if (typeof document === 'undefined') return [];
  return [document.scrollingElement, document.documentElement, document.body];
};

const getScrollTargets = (primaryScrollElement) => {
  const targets = [primaryScrollElement, ...getDocumentScrollTargets()];
  return targets.filter((target, index) => (
    target &&
    typeof target.scrollTop === 'number' &&
    targets.indexOf(target) === index
  ));
};

const captureScrollSnapshot = (primaryScrollElement) => (
  getScrollTargets(primaryScrollElement).map((target) => ({
    target,
    scrollTop: target.scrollTop,
  }))
);

const restoreScrollSnapshot = (snapshot) => {
  snapshot.forEach(({ target, scrollTop }) => {
    target.scrollTop = scrollTop;
  });
};

const restoreScrollSnapshotSoon = (snapshot) => {
  restoreScrollSnapshot(snapshot);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => restoreScrollSnapshot(snapshot));
  }

  if (typeof setTimeout === 'function') {
    [0, 40, 120, 240, 500].forEach((delay) => {
      setTimeout(() => restoreScrollSnapshot(snapshot), delay);
    });
  }
};

export const isQuillDialogScrollGuardActive = (primaryScrollElement) => (
  !!primaryScrollElement &&
  Date.now() <= (primaryScrollElement[preserveUntilKey] || 0)
);

export const runWithPreservedScroll = (primaryScrollElement, operation) => {
  const snapshot = captureScrollSnapshot(primaryScrollElement);

  try {
    return operation();
  } finally {
    restoreScrollSnapshotSoon(snapshot);
  }
};

const startPreservingScroll = (primaryScrollElement) => {
  primaryScrollElement[preserveUntilKey] = Date.now() + 800;
  restoreScrollSnapshotSoon(captureScrollSnapshot(primaryScrollElement));
};

const getClipboardTextDelta = (quill, text) => {
  const Delta = quill.constructor.import('delta');
  return new Delta().insert(text);
};

const getClipboardDelta = (quill, clipboardData) => {
  const html = clipboardData.getData('text/html');
  if (html) return quill.clipboard.convert(html);

  const text = clipboardData.getData('text/plain');
  return getClipboardTextDelta(quill, text);
};

const isQuillPasteTarget = (quill, eventTarget) => {
  if (!eventTarget) return true;

  try {
    return !!(
      quill.root?.contains?.(eventTarget) ||
      quill.container?.contains?.(eventTarget)
    );
  } catch (error) {
    return false;
  }
};

export const handleQuillPasteWithPreservedScroll = (quill, primaryScrollElement, event) => {
  if (!quill || !primaryScrollElement || !event) return false;
  if (event.defaultPrevented) return false;
  if (typeof quill.isEnabled === 'function' && !quill.isEnabled()) return false;
  if (!isQuillPasteTarget(quill, event.target)) return false;

  const clipboardData = event.clipboardData ||
    (typeof window !== 'undefined' ? window.clipboardData : null);
  if (!clipboardData) return false;

  event.preventDefault?.();
  event.stopPropagation?.();
  event.nativeEvent?.stopImmediatePropagation?.();
  startPreservingScroll(primaryScrollElement);

  runWithPreservedScroll(primaryScrollElement, () => {
    const range = quill.getSelection() || quill.getSelection(true);
    if (!range) return;

    const paste = getClipboardDelta(quill, clipboardData);
    const Delta = quill.constructor.import('delta');
    const change = new Delta()
      .retain(range.index)
      .delete(range.length)
      .concat(paste);

    quill.updateContents(change, 'user');
    quill.setSelection(range.index + paste.length(), 'silent');
  });

  return true;
};

export const installQuillDialogScrollGuard = (quill, primaryScrollElement) => {
  if (!quill || !primaryScrollElement) return () => {};

  const root = quill.root;
  const selection = quill.selection;
  const originalScrollingContainer = quill.scrollingContainer;
  const originalScrollIntoView = quill.scrollIntoView;
  const originalSelectionScrollIntoView = selection?.scrollIntoView;

  const handlePaste = (event) => {
    handleQuillPasteWithPreservedScroll(quill, primaryScrollElement, event);
  };
  const handleDrop = () => startPreservingScroll(primaryScrollElement);

  quill.scrollingContainer = primaryScrollElement;

  if (typeof originalScrollIntoView === 'function') {
    quill.scrollIntoView = function guardedScrollIntoView(...args) {
      const scrollOperation = () => originalScrollIntoView.apply(this, args);
      return isQuillDialogScrollGuardActive(primaryScrollElement)
        ? runWithPreservedScroll(primaryScrollElement, scrollOperation)
        : scrollOperation();
    };
  }

  if (selection && typeof originalSelectionScrollIntoView === 'function') {
    selection.scrollIntoView = function guardedSelectionScrollIntoView(...args) {
      const scrollOperation = () => originalSelectionScrollIntoView.apply(this, args);
      return isQuillDialogScrollGuardActive(primaryScrollElement)
        ? runWithPreservedScroll(primaryScrollElement, scrollOperation)
        : scrollOperation();
    };
  }

  root?.addEventListener?.('paste', handlePaste, true);
  root?.addEventListener?.('drop', handleDrop, true);

  return () => {
    quill.scrollingContainer = originalScrollingContainer;
    if (typeof originalScrollIntoView === 'function') {
      quill.scrollIntoView = originalScrollIntoView;
    }
    if (selection && typeof originalSelectionScrollIntoView === 'function') {
      selection.scrollIntoView = originalSelectionScrollIntoView;
    }
    root?.removeEventListener?.('paste', handlePaste, true);
    root?.removeEventListener?.('drop', handleDrop, true);
  };
};
