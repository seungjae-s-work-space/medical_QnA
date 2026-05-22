const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('home routing', () => {
  test('root route renders the dashboard and chat lives under /chat', () => {
    const app = read('App.jsx');
    const layout = read('components/Layout.jsx');
    const chatWindow = read('components/ChatWindow.jsx');
    const homeDashboard = read('components/HomeDashboard.jsx');

    expect(app).toMatch(/import HomeDashboard/);
    expect(app).toMatch(/<HomeDashboard \/>/);
    expect(app).toMatch(/path="\/chat"/);
    expect(app).toMatch(/<UserChatWindow \/>/);
    expect(layout).toMatch(/path: '\/'/);
    expect(layout).toMatch(/path: '\/chat'/);
    expect(layout).toMatch(/location\.pathname\.startsWith\(`\$\{item\.path\}\/`\)/);
    expect(chatWindow).toMatch(/navigate\('\/chat'\)/);
    expect(homeDashboard).toMatch(/home-dashboard\.png/);
    expect(homeDashboard).toMatch(/useNavigate/);
    expect(homeDashboard).toMatch(/상담하기/);
    expect(homeDashboard).toMatch(/난임백과/);
    expect(homeDashboard).toMatch(/뉴스/);
    expect(homeDashboard).toMatch(/공지사항/);
    expect(homeDashboard).toMatch(/아기성공TV/);
    expect(homeDashboard).toMatch(/회원제\(무료\)/);
    expect(homeDashboard).toMatch(/membershipInfoOpen/);
    expect(homeDashboard).toMatch(/회원제\(무료\) 안내/);
    expect(homeDashboard).toMatch(/로그인하러 가기/);
    expect(homeDashboard).toMatch(/setMembershipInfoOpen\(true\)/);
    expect(homeDashboard).toMatch(/navigate\('\/chat'\)/);
    expect(homeDashboard).toMatch(/navigate\('\/encyclopedia'\)/);
    expect(homeDashboard).toMatch(/navigate\('\/news'\)/);
    expect(homeDashboard).toMatch(/navigate\('\/login'\)/);
    expect(fs.existsSync(path.join(srcDir, '..', 'public', 'home-dashboard.png'))).toBe(true);
  });
});
