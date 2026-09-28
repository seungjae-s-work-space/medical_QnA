import fs from 'fs';
import path from 'path';
import { stickyEditorToolbarSx } from '../utils/webDesignStyles';

describe('sticky rich text editor toolbar', () => {
  test('sticks to the dialog scrollport above the article content', () => {
    expect(stickyEditorToolbarSx).toMatchObject({
      position: 'sticky',
      top: 0,
      zIndex: 2,
    });
    // Pickers must be able to open over the body while the toolbar is pinned.
    expect(stickyEditorToolbarSx.overflow).not.toBe('hidden');
  });

  test.each(['NewsManager', 'EncyclopediaManager', 'PromotionManager'])(
    '%s uses the shared toolbar behavior in its create/edit dialog',
    (name) => {
      const source = fs.readFileSync(
        path.join(__dirname, '..', 'components', `${name}.jsx`),
        'utf8',
      );

      expect(source).toMatch(/'& \.ql-toolbar':\s*\{\s*\.\.\.stickyEditorToolbarSx,/);
    },
  );
});
