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
    expect(app).toMatch(/path="\/company"/);
    expect(app).toMatch(/<CompanyProfile \/>/);
    expect(app).toMatch(/'\/company': \{/);
    expect(app).toMatch(/난임상담톡톡 회사소개/);
    expect(app).toMatch(/shouldIndex: true/);
    expect(app).not.toMatch(/path="\/company"[\s\S]*?<Layout>[\s\S]*?<CompanyProfile \/>[\s\S]*?<\/Layout>/);
  });

  test('company profile component contains share-card copy and no Firebase reads', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/난임상담톡톡/);
    expect(companyProfile).toMatch(/난임 정보·상담 플랫폼/);
    expect(companyProfile).toMatch(/무료 회원제 난임 정보·상담 서비스/);
    expect(companyProfile).toMatch(/근거 중심 정보/);
    expect(companyProfile).toMatch(/전문가 상담 흐름/);
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
    expect(companyProfile).toMatch(/Who we are/);
    expect(companyProfile).toMatch(/What we do/);
    expect(companyProfile).not.toMatch(/import \{ colors \} from '\.\.\/theme'/);
    expect(companyProfile).not.toMatch(/linear-gradient/);
    expect(companyProfile).not.toMatch(/colors\./);
    expect(companyProfile).not.toMatch(/primaryLight|cardTint|backgroundWarm|aqua/);
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
