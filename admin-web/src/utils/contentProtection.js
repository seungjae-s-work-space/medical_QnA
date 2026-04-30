export function preventContentCopy(event) {
  event.preventDefault();
  window.getSelection?.()?.removeAllRanges?.();
}

export const nonCopyableContentProps = {
  draggable: false,
  onCopy: preventContentCopy,
  onCopyCapture: preventContentCopy,
  onCut: preventContentCopy,
  onCutCapture: preventContentCopy,
  onDragStart: preventContentCopy,
  onDragStartCapture: preventContentCopy,
  onMouseDown: preventContentCopy,
  onMouseDownCapture: preventContentCopy,
  onMouseUp: preventContentCopy,
  onMouseUpCapture: preventContentCopy,
  onSelect: preventContentCopy,
  onSelectCapture: preventContentCopy,
  onContextMenu: preventContentCopy,
  onContextMenuCapture: preventContentCopy,
};

export const protectedContentSx = {
  userSelect: 'none !important',
  WebkitUserSelect: 'none !important',
  MozUserSelect: 'none !important',
  msUserSelect: 'none !important',
  WebkitTouchCallout: 'none !important',
  '& *': {
    userSelect: 'none !important',
    WebkitUserSelect: 'none !important',
    MozUserSelect: 'none !important',
    msUserSelect: 'none !important',
    WebkitTouchCallout: 'none !important',
  },
  '& img': {
    WebkitUserDrag: 'none !important',
  },
};
