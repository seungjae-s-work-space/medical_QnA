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
    expect(app).toMatch(/아기성공연구소 회사소개/);
    expect(app).not.toMatch(/난임상담톡톡 회사소개/);
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

    expect(companyProfile).toMatch(/아기성공연구소/);
    expect(companyProfile).not.toMatch(/>\s*난임상담톡톡\s*</);
    expect(companyProfile).toMatch(/무료 회원제 난임 정보·상담 플랫폼/);
    expect(companyProfile).toMatch(/난임 전문 기자가 운영하는 무료 회원제 난임 정보·상담 플랫폼/);
    expect(companyProfile).not.toMatch(/난임 전문 기자와 골통주부가 함께 운영하는 무료 회원제 난임 정보·상담 플랫폼/);
    expect(companyProfile).toMatch(/생식의학 뉴스·난임백과·상담 콘텐츠를 무료 회원제로 제공합니다/);
    expect(companyProfile).toMatch(/정보와 상담의 접근성을 높이는 데 집중합니다/);
    expect(companyProfile).not.toMatch(/공식 사업 소개/);
    expect(companyProfile).not.toMatch(/난임상담톡톡은 난임을 준비하는 사람들이 정보를 이해하고, 다음 선택을 준비할 수 있도록 돕는 플랫폼입니다/);
    expect(companyProfile).not.toMatch(/난임상담톡톡은 난임 전문 콘텐츠와 상담 서비스를 제공하는 무료 회원제 플랫폼입니다/);
    expect(companyProfile).not.toMatch(/난임 치료 여정에 필요한 정보를 한곳에 모읍니다/);
    expect(companyProfile).toMatch(/무료 회원제로 제공합니다/);
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
    expect(companyProfile).not.toMatch(/회사소개서/);
    expect(companyProfile).not.toMatch(/>\s*agisungong\.net\/company\s*</);
    expect(companyProfile).not.toMatch(/from ['"]\.\.\/firebase['"]/);
    expect(companyProfile).not.toMatch(/collection\(/);
    expect(companyProfile).not.toMatch(/getDocs\(/);
    expect(companyProfile).not.toMatch(/onSnapshot\(/);
  });

  test('company profile uses an independent refined palette instead of app dashboard styling', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/companyPalette/);
    expect(companyProfile).toMatch(/companyFontFamily/);
    expect(companyProfile).toMatch(/companyDisplayTextSx/);
    expect(companyProfile).toMatch(/companyBodyTextSx/);
    expect(companyProfile).toMatch(/-apple-system/);
    expect(companyProfile).toMatch(/BlinkMacSystemFont/);
    expect(companyProfile).toMatch(/Apple SD Gothic Neo/);
    expect(companyProfile).toMatch(/Pretendard/);
    expect(companyProfile).toMatch(/Noto Sans KR/);
    expect(companyProfile).toMatch(/wordBreak: 'keep-all'/);
    expect(companyProfile).toMatch(/#FCFBF8/);
    expect(companyProfile).toMatch(/#183D34/);
    expect(companyProfile).toMatch(/#2B2F2D/);
    expect(companyProfile).toMatch(/#B89B62/);
    expect(companyProfile).toMatch(/AGISUNGONG LAB/);
    expect(companyProfile).not.toMatch(/NANIMTALK/);
    expect(companyProfile).toMatch(/component="h1"/);
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
    expect(companyProfile).not.toMatch(/fontSize: \{ xs: 34, sm: 54, md: 68 \}/);
    expect(companyProfile).not.toMatch(/fontWeight: 9/);
    expect(companyProfile).not.toMatch(/fontWeight: 850/);
  });

  test('company profile uses the home dashboard image as the representative visual', () => {
    const companyProfile = read('components/CompanyProfile.jsx');
    const publicDir = path.join(srcDir, '..', 'public');

    expect(companyProfile).toMatch(/companyHeroImage/);
    expect(companyProfile).toMatch(/home-dashboard\.png\?v=3a2a078/);
    expect(companyProfile).not.toMatch(/대표 이미지/);
    expect(companyProfile).not.toMatch(/홈 화면 대표 이미지/);
    expect(companyProfile).not.toMatch(/서비스의 분위기와 핵심 메시지/);
    expect(companyProfile).not.toMatch(/난임상담톡톡 공식 홈 이미지/);
    expect(companyProfile).not.toMatch(/representativeImageFrameSx/);
    expect(companyProfile).not.toMatch(/phoneMockupSx/);
    expect(companyProfile).not.toMatch(/companyScreenshots/);
    expect(companyProfile).not.toMatch(/company-app-home\.jpg/);
    expect(companyProfile).not.toMatch(/company-app-encyclopedia\.jpg/);
    expect(companyProfile).not.toMatch(/company-app-news\.jpg/);

    const homeDashboardPath = path.join(publicDir, 'home-dashboard.png');

    expect(fs.existsSync(homeDashboardPath)).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'company-app-home.jpg'))).toBe(false);
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

    expect(companyIndex).toMatch(/아기성공연구소 회사소개/);
    expect(companyIndex).not.toMatch(/난임상담톡톡 회사소개/);
    expect(companyIndex).toMatch(/agisungong\.net\/company/);
    expect(companyIndex).toMatch(/URLSearchParams/);
    expect(companyIndex).toMatch(/\?p=/);
    expect(companyIndex).toMatch(/encodeURIComponent\(redirectPath\)/);
  });
});
