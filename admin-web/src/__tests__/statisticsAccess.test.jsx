import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useAuth } from '../contexts/AuthContext';
import { getWebArticleStatistics } from '../services/webArticleStatisticsService';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn(), AuthProvider: ({ children }) => children }));
jest.mock('../firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), query: jest.fn(), where: jest.fn(), onSnapshot: () => () => {} }));
jest.mock('../services/webArticleStatisticsService', () => ({ getWebArticleStatistics: jest.fn() }));
for (const name of ['Login', 'HomeDashboard', 'ConversationList', 'ChatWindow', 'UserChatWindow', 'EncyclopediaManager', 'NewsManager', 'NoticeManager', 'VideoManager', 'UserManagement', 'PromotionManager', 'PromotionDetail', 'CompanyProfile']) {
  jest.doMock(`../components/${name}`, () => () => null);
}
const App = require('../App').default;
let container; let root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  getWebArticleStatistics.mockResolvedValue({ startedAt: null, generatedAt: new Date().toISOString(), daily: [], topArticles: {} });
  window.history.replaceState({}, '', '/statistics');
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test.each(['guest', 'member', 'admin'])('%s sees the statistics route and navigation only with administrator access', async role => {
  useAuth.mockReturnValue({ isAdmin: role === 'admin', isLoggedIn: role !== 'guest', loading: false });
  await act(async () => root.render(<App />));
  const statsNav = [...container.querySelectorAll('.MuiListItemButton-root')].find(el => el.textContent.includes('웹 게시글 조회 분석'));
  expect(Boolean(statsNav)).toBe(role === 'admin');
  if (role === 'admin') {
    expect(window.location.pathname).toBe('/statistics');
    expect(getWebArticleStatistics).toHaveBeenCalledTimes(1);
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
  } else {
    expect(window.location.pathname).toBe('/');
    expect(getWebArticleStatistics).not.toHaveBeenCalled();
  }
});
