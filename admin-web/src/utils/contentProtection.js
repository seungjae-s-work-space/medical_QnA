export function preventContentCopy(event) {
  event.preventDefault();
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
  onContextMenu: preventContentCopy,
  onContextMenuCapture: preventContentCopy,
};

export const protectedContentSx = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  WebkitTouchCallout: 'none',
  '& *': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
  },
  '& img': {
    WebkitUserDrag: 'none',
  },
};
