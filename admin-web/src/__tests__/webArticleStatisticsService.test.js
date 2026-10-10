import { httpsCallable } from 'firebase/functions';
import { recordWebArticleView, getWebArticleStatistics } from '../services/webArticleStatisticsService';

jest.mock('../firebase', () => ({ functions: {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('opening uses the public callable, and a transient retry retains its identity', async () => {
  const callable = jest.fn().mockRejectedValueOnce({ code: 'functions/unavailable' })
    .mockResolvedValue({ data: { recorded: false, duplicate: true } });
  httpsCallable.mockReturnValue(callable);
  await recordWebArticleView('news', 'article-1');
  expect(httpsCallable).toHaveBeenCalledWith({}, 'recordWebArticleView');
  expect(callable).toHaveBeenCalledTimes(2);
  expect(callable.mock.calls[0][0]).toEqual(callable.mock.calls[1][0]);
  expect(callable.mock.calls[0][0]).toEqual(expect.objectContaining({
    section: 'news', articleId: 'article-1', eventId: expect.any(String), sentAt: expect.any(Number),
  }));
});

test('separate openings get separate identities; limits and permission errors are not retried', async () => {
  const callable = jest.fn().mockResolvedValue({ data: { recorded: true } });
  httpsCallable.mockReturnValue(callable);
  await recordWebArticleView('news', 'a'); await recordWebArticleView('news', 'a');
  expect(callable.mock.calls[0][0].eventId).not.toBe(callable.mock.calls[1][0].eventId);
  callable.mockClear().mockRejectedValue({ code: 'functions/resource-exhausted' });
  await expect(recordWebArticleView('news', 'a')).rejects.toEqual({ code: 'functions/resource-exhausted' });
  expect(callable).toHaveBeenCalledTimes(1);
});

test('statistics delegates only the selected period to the protected callable', async () => {
  const callable = jest.fn().mockResolvedValue({ data: { daily: [] } });
  httpsCallable.mockReturnValue(callable);
  expect(await getWebArticleStatistics(30)).toEqual({ daily: [] });
  expect(httpsCallable).toHaveBeenCalledWith({}, 'getWebArticleStatistics');
  expect(callable).toHaveBeenCalledWith({ days: 30 });
});
