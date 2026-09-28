import { httpsCallable } from 'firebase/functions';
import { getDocFromServer } from 'firebase/firestore';
import { searchArticles, readSearchArticle } from '../services/articleSearchService';

jest.mock('../firebase', () => ({ db: {}, functions: {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: (_db, section, id) => ({ section, id }), getDocFromServer: jest.fn(),
}));
beforeEach(() => jest.clearAllMocks());

test('search calls the bounded server endpoint, not a Firestore collection scan', async () => {
  const call = jest.fn().mockResolvedValue({ data: { items: [], total: 0, page: 0, pageSize: 30 } });
  httpsCallable.mockReturnValue(call);
  const params = { section: 'news', query: '임신', page: 1, includeDrafts: false };
  expect(await searchArticles(params)).toEqual({ items: [], total: 0, page: 0, pageSize: 30 });
  expect(httpsCallable).toHaveBeenCalledWith({}, 'searchArticles');
  expect(call).toHaveBeenCalledWith(params);
  expect(getDocFromServer).not.toHaveBeenCalled();
});

test('details use fresh reads and reject removed or unpublished public results', async () => {
  getDocFromServer.mockResolvedValueOnce({ exists: () => false });
  await expect(readSearchArticle('news', 'gone')).rejects.toThrow('삭제');
  getDocFromServer.mockResolvedValueOnce({ exists: () => true, data: () => ({ isPublished: false }) });
  await expect(readSearchArticle('encyclopedia', 'hidden')).rejects.toThrow('비공개');
});

test('live detail returns full source; draft access still goes through Firestore rules', async () => {
  const data = { content: '<p>full text</p>', isPublished: false, title: 'draft' };
  getDocFromServer.mockResolvedValueOnce({ id: 'draft', exists: () => true, data: () => data });
  expect(await readSearchArticle('male_infertility', 'draft', true)).toEqual({ ...data, id: 'draft' });
  expect(getDocFromServer).toHaveBeenCalledWith({ section: 'male_infertility', id: 'draft' });
  getDocFromServer.mockRejectedValueOnce(new Error('permission-denied'));
  await expect(readSearchArticle('male_infertility', 'draft', true)).rejects.toThrow('permission-denied');
});

test('unexpected collections are never read', async () => {
  await expect(readSearchArticle('users', 'admin', true)).rejects.toThrow();
  expect(getDocFromServer).not.toHaveBeenCalled();
});
