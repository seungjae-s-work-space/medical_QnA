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
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
    });
  });
});
