const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('company profile page', () => {
  test('company page is a public indexable route outside the admin layout', () => {
    const app = read('App.jsx');

    expect(app).toMatch(/import CompanyProfile/);
    expect(app).toMatch(/path="\/company\/\*"/);
    expect(app).toMatch(/<CompanyProfile \/>/);
    expect(app).toMatch(/'\/company': \{/);
    expect(app).toMatch(/난임상담톡톡 회사소개/);
    expect(app).toMatch(/shouldIndex: true/);
    expect(app).not.toMatch(/path="\/company"[\s\S]*?<Layout>[\s\S]*?<CompanyProfile \/>[\s\S]*?<\/Layout>/);
  });

  test('company page handles trailing slash as the same public route', () => {
    const app = read('App.jsx');

    expect(app).toMatch(/function normalizePathname/);
    expect(app).toMatch(/normalizedPathname === '\/company'/);
    expect(app).toMatch(/path="\/company\/\*"/);
    expect(app).toMatch(/getRouteMetadata\(\s*normalizedPathname/);
  });

  test('company profile component contains share-card copy and no Firebase reads', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/난임상담톡톡/);
    expect(companyProfile).toMatch(/법인·사업 소개/);
    expect(companyProfile).toMatch(/디지털 헬스케어 콘텐츠 팀/);
    expect(companyProfile).toMatch(/난임 정보와 상담 접점을 운영합니다/);
    expect(companyProfile).toMatch(/무료 회원제 난임 정보·상담 서비스/);
    expect(companyProfile).toMatch(/근거 중심 정보/);
    expect(companyProfile).toMatch(/사업 영역/);
    expect(companyProfile).toMatch(/운영 원칙/);
    expect(companyProfile).toMatch(/구독\/인앱결제 없이 운영/);
    expect(companyProfile).toMatch(/agisungong\.net\/company/);
    expect(companyProfile).toMatch(/navigator\.clipboard\.writeText/);
    expect(companyProfile).toMatch(/navigate\('\/'\)/);
    expect(companyProfile).toMatch(/navigate\('\/chat'\)/);
    expect(companyProfile).not.toMatch(/from ['"]\.\.\/firebase['"]/);
    expect(companyProfile).not.toMatch(/collection\(/);
    expect(companyProfile).not.toMatch(/getDocs\(/);
    expect(companyProfile).not.toMatch(/onSnapshot\(/);
  });

  test('company profile uses an independent refined palette instead of app dashboard styling', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/companyPalette/);
    expect(companyProfile).toMatch(/#FCFBF8/);
    expect(companyProfile).toMatch(/#183D34/);
    expect(companyProfile).toMatch(/#2B2F2D/);
    expect(companyProfile).toMatch(/#B89B62/);
    expect(companyProfile).toMatch(/NANIMTALK/);
    expect(companyProfile).toMatch(/회사 소개/);
    expect(companyProfile).toMatch(/사업 개요/);
    expect(companyProfile).toMatch(/home-dashboard\.png/);
    expect(companyProfile).toMatch(/editorialFrameSx/);
    expect(companyProfile).not.toMatch(/OUR ROLE/);
    expect(companyProfile).not.toMatch(/BUSINESS PROFILE/);
    expect(companyProfile).not.toMatch(/Who we are|Business area|Operating principle/);
    expect(companyProfile).not.toMatch(/import \{ colors \} from '\.\.\/theme'/);
    expect(companyProfile).not.toMatch(/linear-gradient/);
    expect(companyProfile).not.toMatch(/colors\./);
    expect(companyProfile).not.toMatch(/primaryLight|cardTint|backgroundWarm|aqua/);
  });

  test('company profile includes lightweight interactive editorial touches', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/scrollProgress/);
    expect(companyProfile).toMatch(/setScrollProgress/);
    expect(companyProfile).toMatch(/addEventListener\('scroll'/);
    expect(companyProfile).toMatch(/activeSection/);
    expect(companyProfile).toMatch(/setActiveSection/);
    expect(companyProfile).toMatch(/aria-pressed/);
    expect(companyProfile).toMatch(/component="button"/);
    expect(companyProfile).toMatch(/링크 복사됨/);
    expect(companyProfile).not.toMatch(/위로보다 방향이 필요한 순간/);
  });

  test('company route has a static GitHub Pages entrypoint for direct share links', () => {
    const companyIndexPath = path.join(srcDir, '..', 'public', 'company', 'index.html');

    expect(fs.existsSync(companyIndexPath)).toBe(true);

    const companyIndex = fs.readFileSync(companyIndexPath, 'utf8');

    expect(companyIndex).toMatch(/난임상담톡톡 회사소개/);
    expect(companyIndex).toMatch(/agisungong\.net\/company/);
    expect(companyIndex).toMatch(/URLSearchParams/);
    expect(companyIndex).toMatch(/\?p=/);
    expect(companyIndex).toMatch(/encodeURIComponent\(redirectPath\)/);
  });
});
