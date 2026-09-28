import fs from 'fs';
import path from 'path';
import { sanitizePromotionHtml as sanitizeStoredHtml } from '../services/promotionService';
import { sanitizePromotionHtml as sanitizeDisplayedHtml } from '../components/PromotionDetail';

jest.mock('../firebase', () => ({ auth: {}, db: {}, storage: {}, functions: {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));

test.each([sanitizeStoredHtml, sanitizeDisplayedHtml])(
  'preserves symbols and horizontal dividers without permitting event handlers',
  (sanitize) => {
    expect(sanitize('<p>※ ± ①</p><hr onclick="alert(1)"><p>Next</p>'))
      .toBe('<p>※ ± ①</p><hr><p>Next</p>');
  },
);

test.each(['NewsManager', 'EncyclopediaManager', 'PromotionManager'])(
  '%s exposes insertion tools and retains the divider format',
  (name) => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', `${name}.jsx`), 'utf8');
    expect(source.includes('<EditorInsertTools')).toBe(true);
    expect(source.includes("'divider'")).toBe(true);
  },
);
