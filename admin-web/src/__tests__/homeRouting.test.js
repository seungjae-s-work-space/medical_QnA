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
  });
});
