import {
  nonCopyableContentProps,
  preventContentCopy,
  protectedContentSx,
} from '../contentProtection';

describe('content protection utilities', () => {
  it('prevents default browser copy and drag actions', () => {
    const event = { preventDefault: jest.fn() };

    preventContentCopy(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('clears any selection range left by a drag gesture', () => {
    const removeAllRanges = jest.fn();
    const originalGetSelection = window.getSelection;
    window.getSelection = jest.fn(() => ({ removeAllRanges }));

    preventContentCopy({ preventDefault: jest.fn() });

    expect(removeAllRanges).toHaveBeenCalledTimes(1);

    window.getSelection = originalGetSelection;
  });

  it('exposes props that block common copy paths', () => {
    const eventNames = [
      'onCopy',
      'onCopyCapture',
      'onCut',
      'onCutCapture',
      'onDragStart',
      'onDragStartCapture',
      'onMouseDown',
      'onMouseDownCapture',
      'onMouseUp',
      'onMouseUpCapture',
      'onSelect',
      'onSelectCapture',
      'onContextMenu',
      'onContextMenuCapture',
    ];

    for (const eventName of eventNames) {
      const event = { preventDefault: jest.fn() };

      nonCopyableContentProps[eventName](event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    }

    expect(nonCopyableContentProps.draggable).toBe(false);
  });

  it('disables text selection through CSS', () => {
    expect(protectedContentSx).toMatchObject({
      userSelect: 'none !important',
      WebkitUserSelect: 'none !important',
      MozUserSelect: 'none !important',
      msUserSelect: 'none !important',
    });
  });
});
