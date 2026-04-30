export function preventContentCopy(event) {
  event.preventDefault();
}

export const nonCopyableContentProps = {
  draggable: false,
  onCopy: preventContentCopy,
  onCut: preventContentCopy,
  onDragStart: preventContentCopy,
  onMouseDown: preventContentCopy,
  onContextMenu: preventContentCopy,
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
