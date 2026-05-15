const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('firebase cost guardrails', () => {
  test('public and admin content queries are limited', () => {
    const files = [
      'components/NewsManager.jsx',
      'components/EncyclopediaManager.jsx',
      'components/NoticeManager.jsx',
      'components/VideoManager.jsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toMatch(/limit\(/);
      expect(source).toMatch(/startAfter/);
      expect(source).toMatch(/const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;/);
      expect(source).toMatch(/getCountFromServer/);
      expect(source).toMatch(/totalItemCount/);
      expect(source).toMatch(/totalPages/);
      expect(source).not.toMatch(/더보기/);
      expect(source).not.toMatch(/handleLoadMore/);
      expect(source).toMatch(/handlePageChange/);
    }
  });

  test('admin high-cardinality lists use limited page queries', () => {
    const conversationList = read('components/ConversationList.jsx');
    const userManagement = read('components/UserManagement.jsx');

    expect(conversationList).toMatch(/limit\(/);
    expect(conversationList).toMatch(/startAfter/);
    expect(conversationList).not.toMatch(/더보기/);
    expect(conversationList).not.toMatch(/handleLoadMore/);
    expect(conversationList).toMatch(/handleNextPage/);
    expect(userManagement).toMatch(/limit\(/);
    expect(userManagement).toMatch(/startAfter/);
    expect(userManagement).toMatch(/getCountFromServer/);
    expect(userManagement).toMatch(/USER_PAGE_SIZE = 20/);
    expect(userManagement).toMatch(/totalPages/);
    expect(userManagement).toMatch(/currentPageIndex/);
    expect(userManagement).toMatch(/handlePreviousPage/);
    expect(userManagement).toMatch(/handleNextPage/);
  });

  test('chat realtime message listeners are bounded', () => {
    const chatWindow = read('components/ChatWindow.jsx');
    const userChatWindow = read('components/UserChatWindow.jsx');
    const conversationList = read('components/ConversationList.jsx');

    expect(chatWindow).toMatch(/MESSAGE_PAGE_SIZE = 20/);
    expect(chatWindow).toMatch(/limitToLast\(MESSAGE_PAGE_SIZE\)/);
    expect(chatWindow).toMatch(/loadOlderMessages/);
    expect(chatWindow).toMatch(/startAfter/);
    expect(userChatWindow).toMatch(/MESSAGE_PAGE_SIZE = 20/);
    expect(userChatWindow).toMatch(/limitToLast\(MESSAGE_PAGE_SIZE\)/);
    expect(userChatWindow).toMatch(/loadOlderMessages/);
    expect(userChatWindow).toMatch(/startAfter/);
    expect(conversationList).toMatch(/MESSAGE_SEARCH_PAGE_SIZE = 20/);
    expect(conversationList).toMatch(/limit\(MESSAGE_SEARCH_PAGE_SIZE\)/);
  });
});
