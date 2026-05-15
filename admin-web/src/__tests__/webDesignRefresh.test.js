const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('web design refresh', () => {
  test('theme uses the botanical brand palette instead of the old indigo palette', () => {
    const theme = read('theme.js');

    expect(theme).toMatch(/botanical/i);
    expect(theme).toMatch(/#70B789/i);
    expect(theme).toMatch(/#0B6B47/i);
    expect(theme).toMatch(/#F6FBF7/i);
    expect(theme).toMatch(/#D4A853/i);
    expect(theme).not.toMatch(/#6366F1/i);
    expect(theme).not.toMatch(/#4F46E5/i);
  });

  test('shared web design styles are used by refreshed repeated surfaces', () => {
    const styles = read('utils/webDesignStyles.js');
    const news = read('components/NewsManager.jsx');
    const encyclopedia = read('components/EncyclopediaManager.jsx');
    const notice = read('components/NoticeManager.jsx');
    const video = read('components/VideoManager.jsx');
    const conversations = read('components/ConversationList.jsx');
    const users = read('components/UserManagement.jsx');

    expect(styles).toMatch(/pageShellSx/);
    expect(styles).toMatch(/contentCardSx/);
    expect(styles).toMatch(/statCardSx/);
    expect(styles).toMatch(/emptyStateSx/);
    expect(news).toMatch(/pageShellSx/);
    expect(encyclopedia).toMatch(/pageShellSx/);
    expect(notice).toMatch(/pageShellSx/);
    expect(video).toMatch(/pageShellSx/);
    expect(conversations).toMatch(/pageShellSx/);
    expect(users).toMatch(/pageShellSx/);
  });

  test('layout and home dashboard use branded shell treatments', () => {
    const layout = read('components/Layout.jsx');
    const home = read('components/HomeDashboard.jsx');

    expect(layout).toMatch(/brandMarkSx/);
    expect(layout).toMatch(/navItemSx/);
    expect(home).toMatch(/home-dashboard\.png/);
    expect(home).toMatch(/linear-gradient/);
    expect(home).toMatch(/난임상담톡톡/);
  });
});
