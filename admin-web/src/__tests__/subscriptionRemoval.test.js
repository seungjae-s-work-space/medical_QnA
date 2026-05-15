const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('subscription removal', () => {
  test('routes and navigation use user management instead of subscription management', () => {
    const app = read('App.jsx');
    const layout = read('components/Layout.jsx');

    expect(app).not.toMatch(/SubscriptionManager/);
    expect(app).not.toMatch(/\/subscription/);
    expect(layout).not.toMatch(/구독 관리/);
    expect(layout).not.toMatch(/\/subscription/);

    expect(app).toMatch(/UserManagement/);
    expect(app).toMatch(/\/users/);
    expect(layout).toMatch(/사용자 관리/);
    expect(layout).toMatch(/\/users/);
  });

  test('web source no longer reads subscription collections for access control', () => {
    const authContext = read('contexts/AuthContext.jsx');
    const userChatWindow = read('components/UserChatWindow.jsx');

    expect(authContext).not.toMatch(/subscriptions/);
    expect(authContext).not.toMatch(/hasActiveSubscription/);
    expect(userChatWindow).not.toMatch(/hasActiveSubscription/);
    expect(userChatWindow).not.toMatch(/subscriptionLoading/);
    expect(userChatWindow).not.toMatch(/구독/);
  });

  test('user management is a read-only users view', () => {
    const userManagement = read('components/UserManagement.jsx');

    expect(userManagement).toMatch(/collection\(db, 'users'\)/);
    expect(userManagement).toMatch(/getDocs/);
    expect(userManagement).toMatch(/getCountFromServer/);
    expect(userManagement).toMatch(/USER_PAGE_SIZE = 20/);
    expect(userManagement).not.toMatch(/deleteDoc|updateDoc|setDoc|addDoc|writeBatch|runTransaction/);
  });
});
