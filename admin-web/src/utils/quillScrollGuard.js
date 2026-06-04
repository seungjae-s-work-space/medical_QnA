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
    setTimeout(() => restoreScrollSnapshot(snapshot), 0);
    setTimeout(() => restoreScrollSnapshot(snapshot), 40);
  }
};

export const runWithPreservedScroll = (primaryScrollElement, operation) => {
  const snapshot = captureScrollSnapshot(primaryScrollElement);

  try {
    return operation();
  } finally {
    restoreScrollSnapshotSoon(snapshot);
  }
};

export const installQuillDialogScrollGuard = (quill, primaryScrollElement) => {
  if (!quill || !primaryScrollElement) return () => {};

  const root = quill.root;
  const selection = quill.selection;
  const originalScrollIntoView = quill.scrollIntoView;
  const originalSelectionScrollIntoView = selection?.scrollIntoView;
  let preserveUntil = 0;

  const shouldPreserveScroll = () => Date.now() <= preserveUntil;
  const startPreservingScroll = () => {
    preserveUntil = Date.now() + 160;
    restoreScrollSnapshotSoon(captureScrollSnapshot(primaryScrollElement));
  };

  if (typeof originalScrollIntoView === 'function') {
    quill.scrollIntoView = function guardedScrollIntoView(...args) {
      const scrollOperation = () => originalScrollIntoView.apply(this, args);
      return shouldPreserveScroll()
        ? runWithPreservedScroll(primaryScrollElement, scrollOperation)
        : scrollOperation();
    };
  }

  if (selection && typeof originalSelectionScrollIntoView === 'function') {
    selection.scrollIntoView = function guardedSelectionScrollIntoView(...args) {
      const scrollOperation = () => originalSelectionScrollIntoView.apply(this, args);
      return shouldPreserveScroll()
        ? runWithPreservedScroll(primaryScrollElement, scrollOperation)
        : scrollOperation();
    };
  }

  root?.addEventListener?.('paste', startPreservingScroll, true);
  root?.addEventListener?.('drop', startPreservingScroll, true);

  return () => {
    if (typeof originalScrollIntoView === 'function') {
      quill.scrollIntoView = originalScrollIntoView;
    }
    if (selection && typeof originalSelectionScrollIntoView === 'function') {
      selection.scrollIntoView = originalSelectionScrollIntoView;
    }
    root?.removeEventListener?.('paste', startPreservingScroll, true);
    root?.removeEventListener?.('drop', startPreservingScroll, true);
  };
};
