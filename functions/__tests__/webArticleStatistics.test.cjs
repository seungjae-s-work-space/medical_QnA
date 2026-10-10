const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { createWebArticleStatistics, koreanDate } = require('../webArticleStatistics');

// Transactions stage writes, so failures never leave a partially counted view.
function fixture() {
  const records = new Map([
    ['news/a', { title: '뉴스 A', isPublished: true, viewCount: 12 }],
    ['encyclopedia/a', { title: '백과 A', isPublished: true, viewCount: 3 }],
    ['male_infertility/a', { title: '남성난임 A', isPublished: true }],
    ['news/draft', { title: '비공개', isPublished: false }],
    ['users/admin', { role: 'admin' }], ['users/member', { role: 'user' }],
  ]);
  const reads = [];
  const snapshot = (ref) => ({ exists: records.has(ref.path), data: () => records.get(ref.path), ref });
  const db = {
    doc: (path) => ({ path, get: async () => { reads.push(path); return snapshot({ path }); } }),
    getAll: async (...refs) => { reads.push(...refs.map(r => r.path)); return refs.map(snapshot); },
    collection: (name) => {
      const filters = []; let maximum = Infinity;
      const query = {
        where: (field, op, value) => { filters.push({ field, op, value }); return query; },
        limit: (value) => { maximum = value; return query; },
        get: async () => {
          assert.ok(Number.isFinite(maximum), 'report reads must be bounded');
          const docs = [...records.entries()].filter(([path, data]) => path.startsWith(`${name}/`) &&
            filters.every(({ field, op, value }) => op === '>=' ? data[field] >= value : data[field] <= value))
            .slice(0, maximum).map(([path]) => { reads.push(path); return snapshot({ path }); });
          return { docs };
        },
      };
      return query;
    },
    runTransaction: async (fn) => {
      const pending = [];
      const result = await fn({
        get: async (ref) => { assert.equal(pending.length, 0, 'reads must precede writes'); reads.push(ref.path); return snapshot(ref); },
        set: (ref, value) => pending.push([ref.path, value]),
        update: (ref, value) => pending.push([ref.path, { ...records.get(ref.path), ...value }]),
      });
      pending.forEach(([path, value]) => records.set(path, value));
      return result;
    },
  };
  let time = Date.parse('2026-10-10T03:00:00Z');
  const service = createWebArticleStatistics({ db, now: () => time });
  const request = (overrides = {}) => ({
    data: { section: 'news', articleId: 'a', eventId: randomUUID(), sentAt: time },
    rawRequest: { ip: '192.0.2.1', headers: { 'x-forwarded-for': '192.0.2.1' }, socket: { remoteAddress: '127.0.0.1' } }, ...overrides,
  });
  return { records, reads, service, request, advance: (ms) => { time += ms; } };
}

test('Korean date switches at 15:00 UTC', () => {
  assert.equal(koreanDate(Date.parse('2026-10-09T14:59:59Z')), '2026-10-09');
  assert.equal(koreanDate(Date.parse('2026-10-09T15:00:00Z')), '2026-10-10');
});

test('guest opening increments cumulative and web daily counts exactly once on retry', async () => {
  const f = fixture(); const req = f.request();
  assert.equal((await f.service.record(req)).recorded, true);
  assert.equal((await f.service.record(req)).duplicate, true);
  assert.equal(f.records.get('news/a').viewCount, 13);
  const stats = await f.service.report({ auth: { uid: 'admin' }, data: { days: 7 } });
  assert.equal(stats.daily.length, 7);
  assert.equal(stats.daily.at(-1).counts.news, 1);
  assert.equal(stats.daily[0].counts, null, 'pre-tracking history is unknown, not zero');
  assert.equal(stats.topArticles.all[0].views, 1);
  assert.equal(stats.topArticles.all[0].title, '뉴스 A');
});

test('member openings count, admin previews do not, absent/malformed claims cannot grant access', async () => {
  const f = fixture();
  assert.equal((await f.service.record(f.request({ auth: { uid: 'admin' } }))).recorded, false);
  await f.service.record(f.request({ auth: { uid: 'member' } }));
  assert.equal(f.records.get('news/a').viewCount, 13);
  await assert.rejects(f.service.report({ data: { days: 7 } }), { code: 'unauthenticated' });
  await assert.rejects(f.service.report({ auth: { uid: 'member', token: { admin: true } }, data: { days: 7 } }), { code: 'permission-denied' });
});

test('publication and identifiers are validated without partial writes', async () => {
  const f = fixture();
  for (const edit of [{ articleId: 'draft' }, { articleId: 'missing' }]) {
    const req = f.request(); Object.assign(req.data, edit);
    await assert.rejects(f.service.record(req), { code: 'not-found' });
  }
  for (const edit of [{ section: 'users' }, { articleId: '../users' }, { eventId: 'bad' }, { sentAt: 0 }]) {
    const req = f.request(); Object.assign(req.data, edit);
    await assert.rejects(f.service.record(req), { code: 'invalid-argument' });
  }
  assert.equal(f.records.size, 6);
});

test('request identity cannot be reused for a different article', async () => {
  const f = fixture(); const req = f.request();
  await f.service.record(req);
  req.data.section = 'encyclopedia';
  await assert.rejects(f.service.record(req), { code: 'invalid-argument' });
  assert.equal(f.records.get('encyclopedia/a').viewCount, 3);
});

test('server date controls attribution, midnight retry does not count twice', async () => {
  const f = fixture(); const req = f.request();
  await f.service.record(req);
  f.advance(13 * 3600000);
  assert.equal((await f.service.record(req)).duplicate, true);
  await f.service.record(f.request());
  const report = await f.service.report({ auth: { uid: 'admin' }, data: { days: 7 } });
  assert.deepEqual(report.daily.slice(-2).map(d => d.counts.news), [1, 1]);
});

test('network burst is bounded and limits reset; transient markers have expiration', async () => {
  const f = fixture();
  for (let i = 0; i < 60; i++) await f.service.record(f.request());
  await assert.rejects(f.service.record(f.request()), { code: 'resource-exhausted' });
  assert.equal(f.records.get('news/a').viewCount, 72);
  f.advance(60001);
  await f.service.record(f.request());
  for (const [path, value] of f.records) {
    if (/web_view_(events|limits)\//.test(path)) assert.ok(value.expiresAt instanceof Date);
    assert.ok(!JSON.stringify(value).includes('192.0.2.1'), 'raw address must not be persisted');
  }
});

test('report is bounded, cached after authorization, and never scans article collections', async () => {
  const f = fixture(); await f.service.record(f.request());
  const req = { auth: { uid: 'admin' }, data: { days: 30 } };
  f.reads.length = 0;
  const first = await f.service.report(req);
  assert.ok(f.reads.length <= 482);
  assert.ok(f.reads.every(p => /^(users|web_view_meta|web_view_daily)\//.test(p)));
  f.reads.length = 0;
  assert.deepEqual(await f.service.report(req), first);
  assert.deepEqual(f.reads, ['users/admin']);
  f.records.set('users/admin', { role: 'user' });
  await assert.rejects(f.service.report(req), { code: 'permission-denied' });
});

test('rankings sum period counts across boards, retain history and exclude old app counts', async () => {
  const f = fixture(); await f.service.record(f.request());
  const req = f.request(); req.data.section = 'encyclopedia';
  await f.service.record(req);
  f.advance(86400000);
  await f.service.record(f.request());
  f.records.get('news/a').viewCount += 100; // Unmodified app path.
  const report = await f.service.report({ auth: { uid: 'admin' }, data: { days: 7 } });
  assert.equal(report.topArticles.all[0].views, 2);
  assert.equal(report.topArticles.encyclopedia[0].views, 1);
  assert.equal(report.daily.at(-1).counts.encyclopedia, 0);
  await assert.rejects(f.service.report({ auth: { uid: 'admin' }, data: { days: 365 } }), { code: 'invalid-argument' });
});

test('empty report has no invented historical zeros', async () => {
  const f = fixture();
  const report = await f.service.report({ auth: { uid: 'admin' }, data: { days: 7 } });
  assert.equal(report.startedAt, null);
  assert.ok(report.daily.every(d => d.counts === null));
  assert.deepEqual(report.topArticles.all, []);
});

test('forged forwarded prefixes cannot change the managed-hop rate limit identity', async () => {
  const f = fixture();
  for (let i = 0; i < 60; i++) {
    await f.service.record(f.request({ rawRequest: {
      ip: `198.51.100.${i}`, headers: { 'x-forwarded-for': `198.51.100.${i}, 192.0.2.1` },
    } }));
  }
  await assert.rejects(f.service.record(f.request({ rawRequest: {
    ip: '203.0.113.5', headers: { 'x-forwarded-for': '203.0.113.5, 192.0.2.1' },
  } })), { code: 'resource-exhausted' });
});

test('full daily bucket overflows without growing the original document or losing counts', async () => {
  const f = fixture();
  const key = createHash('sha256').update('news/a').digest('hex');
  const path = `web_view_daily/2026-10-10_${parseInt(key[0], 16)}`;
  const articles = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`existing-${i}`, {
    articleId: `old-${i}`, section: 'news', title: '긴'.repeat(200), views: 1, lastViewedAt: 0,
  }]));
  f.records.set(path, { date: '2026-10-10', articles });
  await f.service.record(f.request());
  assert.equal(Object.keys(f.records.get(path).articles).length, 256);
  assert.equal(f.records.get(`${path}_${key[1]}`).articles[key].views, 1);
  await f.service.record(f.request());
  const report = await f.service.report({ auth: { uid: 'admin' }, data: { days: 7 } });
  assert.equal(report.daily.at(-1).counts.news, 258);
  assert.equal(report.topArticles.all[0].views, 2);
});

test('oversized report fails explicitly rather than silently returning a partial total', async () => {
  const f = fixture();
  f.records.set('web_view_meta/config', { startedAt: '2026-10-10T00:00:00Z' });
  for (let i = 0; i < 513; i++) f.records.set(`web_view_daily/overflow-${i}`, { date: '2026-10-10', articles: {} });
  await assert.rejects(f.service.report({ auth: { uid: 'admin' }, data: { days: 30 } }), { code: 'resource-exhausted' });
});
