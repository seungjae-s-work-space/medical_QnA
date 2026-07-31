const fs = require('fs');
const path = require('path');

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
});
