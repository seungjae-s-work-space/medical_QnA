const fs = require('fs');
const path = require('path');

jest.mock('../services/promotionService', () => ({
  getPromotion: jest.fn(),
}));

const {
  normalizePromotionExternalUrl,
  sanitizePromotionHtml,
} = require('../components/PromotionDetail');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('promotion banners', () => {
  test('public web has promotion carousel and detail route', () => {
    const app = read('App.jsx');
    const homeDashboard = read('components/HomeDashboard.jsx');
    const carousel = read('components/PromotionCarousel.jsx');
    const detail = read('components/PromotionDetail.jsx');
    const service = read('services/promotionService.js');
    const indexes = fs.readFileSync(
      path.join(srcDir, '..', '..', 'medical_qa_app', 'firestore.indexes.json'),
      'utf8'
    );
    const promotionIndex = JSON.parse(indexes).indexes.find(
      (index) => index.collectionGroup === 'promotions'
    );

    expect(app).toMatch(/import PromotionDetail/);
    expect(app).toMatch(/path="\/promotions\/:promotionId"/);
    expect(homeDashboard).toMatch(/import PromotionCarousel/);
    expect(homeDashboard).toMatch(/<PromotionCarousel \/>/);
    expect(carousel).toMatch(/getPublishedPromotions/);
    expect(carousel).toMatch(/setInterval/);
    expect(carousel).toMatch(/navigate\(`\/promotions\/\$\{promotion\.id\}`\)/);
    expect(detail).toMatch(/getPromotion/);
    expect(detail).toMatch(/dangerouslySetInnerHTML/);
    expect(detail).toMatch(/sanitizePromotionHtml/);
    expect(detail).toMatch(/normalizePromotionExternalUrl/);
    expect(detail).toMatch(/script,\s*style,\s*iframe,\s*object,\s*embed/);
    expect(detail).toMatch(/startsWith\('on'\)/);
    expect(detail).toMatch(/javascript:/);
    expect(detail).toMatch(/externalLinkUrl/);
    expect(detail).toMatch(/externalLinkLabel/);
    expect(detail).not.toMatch(/externalUrl/);
    expect(detail).not.toMatch(/externalLinkText/);
    expect(detail).toMatch(/target="_blank"/);
    expect(detail).toMatch(/rel="noopener noreferrer"/);
    expect(service).toMatch(/PROMOTION_HOME_LIMIT = 10/);
    expect(service).toMatch(/export function normalizePromotionExternalUrl/);
    expect(service).toMatch(/export function sanitizePromotionHtml/);
    expect(service).toMatch(/collection\(db, 'promotions'\)/);
    expect(service).toMatch(/where\('isPublished', '==', true\)/);
    expect(service).toMatch(/orderBy\('sortOrder'\)/);
    expect(service).toMatch(/orderBy\('createdAt', 'desc'\)/);
    expect(service).toMatch(/limit\(PROMOTION_HOME_LIMIT\)/);
    expect(service).toMatch(/getDocs/);
    expect(service).toMatch(/isPublished !== true/);
    expect(service).not.toMatch(/onSnapshot/);
    expect(indexes).toMatch(/"collectionGroup": "promotions"/);
    expect(promotionIndex.fields).toEqual([
      { fieldPath: 'isPublished', order: 'ASCENDING' },
      { fieldPath: 'sortOrder', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ]);
  });

  test('admin web exposes promotion management only to admins', () => {
    const app = read('App.jsx');
    const layout = read('components/Layout.jsx');
    const manager = read('components/PromotionManager.jsx');
    const service = read('services/promotionService.js');

    expect(app).toMatch(/import PromotionManager/);
    expect(app).toMatch(/path="\/promotions"/);
    expect(app).toMatch(/<PromotionManager \/>/);
    expect(app).toMatch(/isAdmin \?/);
    expect(app).toMatch(/title: `광고 관리 \| \$\{SITE_NAME\}`/);
    expect(layout).toMatch(/label: '광고 관리'/);
    expect(layout).toMatch(/path: '\/promotions'/);
    expect(layout).toMatch(/visible: isAdmin/);
    expect(manager).toMatch(/PROMOTION_ADMIN_PAGE_SIZE/);
    expect(manager).toMatch(/ReactQuill/);
    expect(manager).toMatch(/uploadPromotionBanner/);
    expect(manager).toMatch(/savePromotion/);
    expect(manager).toMatch(/deletePromotion/);
    expect(manager).toMatch(/sortOrder/);
    expect(manager).toMatch(/isPublished/);
    expect(manager).toMatch(/getCountFromServer/);
    expect(manager).toMatch(/startAfter/);
    expect(manager).toMatch(/limit\(QUERY_PAGE_SIZE\)/);
    expect(service).toMatch(/ref\(storage, `promotion_banners\/\$\{fileName\}`\)/);
    expect(service).toMatch(/createdBy/);
    expect(service).toMatch(/updatedBy/);
  });

  test('admin promotion search is bounded on the server and indexed', () => {
    const manager = read('components/PromotionManager.jsx');
    const service = read('services/promotionService.js');
    const indexes = JSON.parse(fs.readFileSync(
      path.join(srcDir, '..', '..', 'medical_qa_app', 'firestore.indexes.json'),
      'utf8'
    ));

    const promotionIndexes = indexes.indexes.filter(
      (index) => index.collectionGroup === 'promotions'
    );

    expect(manager).toMatch(/normalizePromotionSearchQuery/);
    expect(manager).toMatch(/where\('searchKeywords', 'array-contains', normalizedSearchQuery\)/);
    expect(manager).toMatch(/getCountFromServer\(buildPromotionsCountQuery\(normalizedSearchQuery\)\)/);
    expect(manager).toMatch(/getDocs\(buildPromotionsQuery\(cursor, normalizedSearchQuery\)\)/);
    expect(manager).toMatch(/onSnapshot\(\s*buildPromotionsQuery\(null, normalizedSearchQuery\)/);
    expect(manager).not.toMatch(/if \(searchQuery \|\| !hasMore \|\| !lastVisibleDoc\) return/);
    expect(service).toMatch(/export function normalizePromotionSearchQuery/);
    expect(service).toMatch(/export function buildPromotionSearchKeywords/);
    expect(service).toMatch(/searchKeywords: buildPromotionSearchKeywords\(promotionPayload\)/);
    expect(service).toMatch(/summary/);
    expect(service).toMatch(/contentHtml/);
    expect(service).toMatch(/externalLinkLabel/);
    expect(service).toMatch(/externalLinkUrl/);

    expect(promotionIndexes).toContainEqual({
      collectionGroup: 'promotions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'sortOrder', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    });
    expect(promotionIndexes).toContainEqual({
      collectionGroup: 'promotions',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'searchKeywords', arrayConfig: 'CONTAINS' },
        { fieldPath: 'sortOrder', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    });
  });

  test('admin promotion publish toggle records the current admin', () => {
    const manager = read('components/PromotionManager.jsx');

    expect(manager).toMatch(/import \{ auth, db \} from '\.\.\/firebase'/);
    expect(manager).toMatch(/updatedBy: auth\.currentUser\?\.uid \|\| ''/);
  });

  test('sanitizes public promotion body HTML with a positive URL allowlist', () => {
    const sanitized = sanitizePromotionHtml(`
      <p onclick="alert('bad')">
        일반 <strong>강조</strong>
        <script>alert('bad')</script>
        <a href="https://example.com/path">정상 링크</a>
        <a href="javascript:alert('bad')">스크립트 링크</a>
        <a href="data:text/html,bad">데이터 링크</a>
        <img src="https://example.com/image.jpg" alt="정상 이미지" />
        <img src="data:image/svg+xml,bad" alt="데이터 이미지" />
        <img src="/relative-image.jpg" alt="상대 이미지" />
      </p>
    `);

    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('<strong>강조</strong>');
    expect(sanitized).toContain('href="https://example.com/path"');
    expect(sanitized).toContain('src="https://example.com/image.jpg"');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('data:text');
    expect(sanitized).not.toContain('data:image');
    expect(sanitized).not.toContain('src="/relative-image.jpg"');
  });

  test('normalizes promotion CTA URLs with a positive protocol allowlist', () => {
    expect(typeof normalizePromotionExternalUrl).toBe('function');

    if (typeof normalizePromotionExternalUrl !== 'function') {
      return;
    }

    expect(normalizePromotionExternalUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(normalizePromotionExternalUrl('http://example.com/path')).toBe('http://example.com/path');
    expect(normalizePromotionExternalUrl('  https://example.com/path  ')).toBe(
      'https://example.com/path'
    );
    expect(normalizePromotionExternalUrl('javascript:alert(1)')).toBe('');
    expect(normalizePromotionExternalUrl('data:text/html,bad')).toBe('');
    expect(normalizePromotionExternalUrl('/relative-path')).toBe('');
    expect(normalizePromotionExternalUrl('not a url')).toBe('');
  });
});
