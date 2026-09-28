const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSearchText, toSearchEntry, isSearchChange, createArticleSearch } = require('../articleSearch');

function fixture(initial = {}) {
  const records = new Map(Object.entries(initial));
  const files = new Map();
  const metrics = { scans: 0, writes: 0, downloads: 0, reads: 0 };
  let conflict;
  const snapshot = (path) => ({ id: path.split('/').pop(), exists: records.has(path), data: () => records.get(path) });
  const db = {
    collection: (name) => ({
      doc: (id) => ({ path: `${name}/${id}`, get: async () => { metrics.reads++; return snapshot(`${name}/${id}`); } }),
      orderBy: () => {
        let cursor = ''; let size = 200;
        const query = {
          select: () => query,
          limit: (value) => { size = value; return query; },
          startAfter: (value) => { cursor = value.id; return query; },
          get: async () => {
            metrics.scans++;
            return { docs: [...records.keys()].filter(key => key.startsWith(`${name}/`) && key.split('/')[1] > cursor).sort().slice(0, size).map(snapshot) };
          },
        };
        return query;
      },
    }),
    getAll: async (...refs) => refs.filter(ref => ref.path).map(ref => { metrics.reads++; return snapshot(ref.path); }),
  };
  const bucket = { file: (path) => ({
    getMetadata: async () => {
      if (!files.has(path)) throw Object.assign(new Error('missing'), { code: 404 });
      return [{ generation: String(files.get(path).generation) }];
    },
    download: async () => { metrics.downloads++; return [Buffer.from(files.get(path).body)]; },
    save: async (body, options) => {
      if (conflict) { const callback = conflict; conflict = null; await callback(path); }
      const generation = files.get(path)?.generation || 0;
      if (Number(options.preconditionOpts.ifGenerationMatch) !== generation) throw Object.assign(new Error('conflict'), { code: 412 });
      assert.equal(options.metadata.cacheControl, 'private, no-store');
      files.set(path, { generation: generation + 1, body: body.toString() });
      metrics.writes++;
    },
  }) };
  return { records, files, metrics, service: createArticleSearch({ db, bucket }), onConflict: callback => { conflict = callback; } };
}

const article = (title, extra = {}) => ({ title, content: '<p>자궁내막과 임신</p>', isPublished: true, createdAt: { toMillis: () => 10 }, ...extra });

test('normalizes Korean, width, case and whitespace without regex interpretation', () => {
  assert.equal(normalizeSearchText('  ＩＶＦ\n 치료  '), 'ivf 치료');
  assert.equal(normalizeSearchText('난임'), '난임');
});

test('indexes visible HTML text and entities, never URLs, scripts or image data', () => {
  const entry = toSearchEntry('1', article('시험관', { content: '<p>IVF&nbsp;&amp; 임신 <strong>검사</strong></p><script>secret</script><img src="data:secret" alt="secret"><a href="https://secret">진료</a>' }));
  assert.ok(entry.text.includes('ivf & 임신 검사'));
  assert.ok(entry.text.includes('진료'));
  assert.ok(!entry.text.includes('secret'));
});

test('view count and timestamp-only writes do not rebuild search data', () => {
  assert.equal(isSearchChange(article('a'), article('a', { viewCount: 4, updatedAt: 20 })), false);
  assert.equal(isSearchChange(article('a'), article('b')), true);
  assert.equal(isSearchChange(article('a'), null), true);
});

test('search covers the complete board, matches bodies, paginates and returns only titles', async () => {
  const initial = Object.fromEntries(Array.from({ length: 215 }, (_, i) => [`news/${String(i).padStart(3, '0')}`, article(`글 ${i}`, { createdAt: i })]));
  initial['encyclopedia/other'] = article('다른 게시판');
  initial['news/private'] = article('비밀', { isPublished: false });
  const f = fixture(initial);
  await f.service.bootstrap('news');
  const scans = f.metrics.scans;
  const response = await f.service.search({ data: { section: 'news', query: '자궁내막', page: 7 } });
  assert.equal(response.total, 215);
  assert.equal(response.items.length, 5);
  assert.deepEqual(Object.keys(response.items[0]).sort(), ['id', 'isPublished', 'title']);
  assert.equal(response.items[0].title, '글 4');
  assert.equal(f.metrics.scans, scans);
  const downloads = f.metrics.downloads;
  await f.service.search({ data: { section: 'news', query: '글 214', page: 0 } });
  assert.equal(f.metrics.downloads, downloads, 'unchanged catalogs are cached by generation');
});

test('draft searches require current admin role, not a supplied flag or stale claim', async () => {
  const f = fixture({ 'news/private': article('비공개', { isPublished: false }), 'users/admin': { role: 'admin' }, 'users/revoked': { role: 'user' } });
  await f.service.bootstrap('news');
  const data = { section: 'news', query: '비공개', includeDrafts: true };
  await assert.rejects(f.service.search({ data }), /관리자/);
  await assert.rejects(f.service.search({ data, auth: { uid: 'revoked', token: { admin: true } } }), /관리자/);
  const result = await f.service.search({ data, auth: { uid: 'admin' } });
  assert.equal(result.items[0].title, '비공개');
});

test('unpublished and deleted matches cannot leak from a stale catalog', async () => {
  const f = fixture({ 'news/a': article('공개 A'), 'news/b': article('공개 B') });
  await f.service.bootstrap('news');
  f.records.set('news/a', article('공개 A', { isPublished: false }));
  f.records.delete('news/b');
  const result = await f.service.search({ data: { section: 'news', query: '공개' } });
  assert.deepEqual(result.items, []);
});

test('missing catalogs fail explicitly and public queries never bootstrap collections', async () => {
  const f = fixture();
  await assert.rejects(f.service.search({ data: { section: 'news', query: '임신' } }), /준비/);
  assert.equal(f.metrics.scans, 0);
  for (const data of [{ section: 'users', query: 'a' }, { section: 'news', query: '' }, { section: 'news', query: 'a', page: -1 }]) {
    await assert.rejects(f.service.search({ data }));
  }
});

test('index updates reread current articles and retry concurrent catalog writes', async () => {
  const f = fixture({ 'news/a': article('old'), 'news/b': article('second') });
  await f.service.bootstrap('news');
  f.records.set('news/a', article('latest'));
  f.onConflict(async () => {
    f.records.set('news/b', article('concurrent'));
    await f.service.sync('news', 'b', article('second'), article('concurrent'));
  });
  await f.service.sync('news', 'a', article('old'), article('stale event'));
  assert.equal((await f.service.search({ data: { section: 'news', query: 'latest' } })).total, 1);
  assert.equal((await f.service.search({ data: { section: 'news', query: 'concurrent' } })).total, 1);
  const writes = f.metrics.writes;
  await f.service.sync('news', 'a', article('latest'), article('latest', { viewCount: 8 }));
  assert.equal(f.metrics.writes, writes);
  f.records.delete('news/a');
  await f.service.sync('news', 'a', article('latest'), null);
  assert.equal((await f.service.search({ data: { section: 'news', query: 'latest' } })).total, 0);
});

test('a republish event fences an older unpublish even when the catalog already matches', async () => {
  const published = article('반복 공개');
  const hidden = article('반복 공개', { isPublished: false });
  const f = fixture({ 'news/a': published });
  await f.service.bootstrap('news');
  f.records.set('news/a', hidden);
  f.onConflict(async () => {
    f.records.set('news/a', published);
    await f.service.sync('news', 'a', hidden, published);
  });
  await f.service.sync('news', 'a', published, hidden);
  const result = await f.service.search({ data: { section: 'news', query: '반복' } });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].isPublished, true);
});
