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

    expect(app).toMatch(/import PromotionDetail/);
    expect(app).toMatch(/path="\/promotions\/:promotionId"/);
    expect(homeDashboard).toMatch(/import PromotionCarousel/);
    expect(homeDashboard).toMatch(/<PromotionCarousel \/>/);
    expect(carousel).toMatch(/getPublishedPromotions/);
    expect(carousel).toMatch(/setInterval/);
    expect(carousel).toMatch(/navigate\(`\/promotions\/\$\{promotion\.id\}`\)/);
    expect(detail).toMatch(/getPromotion/);
    expect(detail).toMatch(/dangerouslySetInnerHTML/);
    expect(detail).toMatch(/target="_blank"/);
    expect(detail).toMatch(/rel="noopener noreferrer"/);
    expect(service).toMatch(/PROMOTION_HOME_LIMIT = 10/);
    expect(service).toMatch(/collection\(db, 'promotions'\)/);
    expect(service).toMatch(/where\('isPublished', '==', true\)/);
    expect(service).toMatch(/orderBy\('sortOrder'\)/);
    expect(service).toMatch(/orderBy\('createdAt', 'desc'\)/);
    expect(service).toMatch(/limit\(PROMOTION_HOME_LIMIT\)/);
    expect(service).toMatch(/getDocs/);
    expect(service).not.toMatch(/onSnapshot/);
  });
});
