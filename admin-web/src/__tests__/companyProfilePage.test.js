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
    expect(companyProfile).toMatch(/공식 사업 소개/);
    expect(companyProfile).toMatch(/난임 전문 기자와 골통주부/);
    expect(companyProfile).toMatch(/난임 치료 여정에 필요한 정보를 한곳에 모읍니다/);
    expect(companyProfile).toMatch(/무료 회원제 난임 정보·상담 서비스/);
    expect(companyProfile).toMatch(/콘텐츠·뉴스·상담 서비스/);
    expect(companyProfile).toMatch(/근거 중심 정보/);
    expect(companyProfile).toMatch(/상담 서비스/);
    expect(companyProfile).toMatch(/사업 영역/);
    expect(companyProfile).toMatch(/운영 원칙/);
    expect(companyProfile).toMatch(/의료기관 연결 및 유도 행위를 하지 않습니다/);
    expect(companyProfile).toMatch(/제휴·광고·콘텐츠 협업/);
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
    expect(companyProfile).toMatch(/companyFontFamily/);
    expect(companyProfile).toMatch(/Apple SD Gothic Neo/);
    expect(companyProfile).toMatch(/Pretendard/);
    expect(companyProfile).toMatch(/Noto Sans KR/);
    expect(companyProfile).toMatch(/wordBreak: 'keep-all'/);
    expect(companyProfile).toMatch(/#FCFBF8/);
    expect(companyProfile).toMatch(/#183D34/);
    expect(companyProfile).toMatch(/#2B2F2D/);
    expect(companyProfile).toMatch(/#B89B62/);
    expect(companyProfile).toMatch(/NANIMTALK/);
    expect(companyProfile).toMatch(/회사 소개/);
    expect(companyProfile).toMatch(/사업 개요/);
    expect(companyProfile).toMatch(/editorialFrameSx/);
    expect(companyProfile).not.toMatch(/OUR ROLE/);
    expect(companyProfile).not.toMatch(/BUSINESS PROFILE/);
    expect(companyProfile).not.toMatch(/Who we are|Business area|Operating principle/);
    expect(companyProfile).not.toMatch(/import \{ colors \} from '\.\.\/theme'/);
    expect(companyProfile).not.toMatch(/linear-gradient/);
    expect(companyProfile).not.toMatch(/colors\./);
    expect(companyProfile).not.toMatch(/primaryLight|cardTint|backgroundWarm|aqua/);
    expect(companyProfile).not.toMatch(/letterSpacing: '0\./);
    expect(companyProfile).not.toMatch(/fontWeight: 9/);
    expect(companyProfile).not.toMatch(/fontWeight: 850/);
  });

  test('company profile uses one app screenshot in a phone mockup instead of a gallery', () => {
    const companyProfile = read('components/CompanyProfile.jsx');
    const publicDir = path.join(srcDir, '..', 'public');

    expect(companyProfile).toMatch(/companyHeroScreenshot/);
    expect(companyProfile).toMatch(/phoneMockupSx/);
    expect(companyProfile).toMatch(/company-app-home\.jpg/);
    expect(companyProfile).toMatch(/서비스 화면/);
    expect(companyProfile).toMatch(/실제 앱 화면/);
    expect(companyProfile).not.toMatch(/companyScreenshots/);
    expect(companyProfile).not.toMatch(/company-app-encyclopedia\.jpg/);
    expect(companyProfile).not.toMatch(/company-app-news\.jpg/);
    expect(companyProfile).not.toMatch(/home-dashboard\.png/);

    const homeScreenshotPath = path.join(publicDir, 'company-app-home.jpg');

    expect(fs.existsSync(homeScreenshotPath)).toBe(true);
    expect(fs.statSync(homeScreenshotPath).size).toBeLessThan(500 * 1024);
    expect(fs.existsSync(path.join(publicDir, 'company-app-encyclopedia.jpg'))).toBe(false);
    expect(fs.existsSync(path.join(publicDir, 'company-app-news.jpg'))).toBe(false);
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
    expect(companyProfile).not.toMatch(/필요한 정보를 짧고 명확하게 연결합니다/);
    expect(companyProfile).not.toMatch(/난임 정보 콘텐츠와 상담 접점/);
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
