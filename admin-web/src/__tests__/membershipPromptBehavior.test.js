const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('membership prompt behavior', () => {
  test('news and encyclopedia stay accessible while anonymous users are prompted', () => {
    const app = read('App.jsx');
    const layout = read('components/Layout.jsx');
    const dialog = read('components/MembershipRequiredDialog.jsx');

    expect(app).not.toMatch(/MembershipRequiredGate/);
    expect(app).toMatch(/<EncyclopediaManager readOnly=\{!isAdmin\} \/>/);
    expect(app).toMatch(/<NewsManager readOnly=\{!isAdmin\} \/>/);
    expect(layout).toMatch(/shouldShowMembershipPrompt\(location\.pathname, isLoggedIn\)/);
    expect(layout).toMatch(/navigate\(path\)/);
    expect(dialog).toMatch(/계속 보기/);
    expect(dialog).toMatch(/로그인하러가기/);
  });
});
