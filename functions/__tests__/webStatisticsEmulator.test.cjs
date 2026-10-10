const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createWebArticleStatistics } = require('../webArticleStatistics');

const host = process.env.FIRESTORE_EMULATOR_HOST;
const project = 'demo-web-statistics';
function token(uid) {
  const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: uid, user_id: uid, aud: project, iss: `https://securetoken.google.com/${project}`,
    exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000),
    firebase: { sign_in_provider: 'password', identities: {} },
  })}.`;
}

test('real rules prevent role escalation and private stats access, retaining app/profile flows', { skip: !host }, async () => {
  assert.match(host, /^127\.0\.0\.1:\d+$/, 'Only an isolated local emulator is allowed');
  const app = initializeApp({ projectId: project }, 'statistics-rules');
  const db = getFirestore(app);
  const request = async (uid, path, fields, mask) => {
    const suffix = mask ? `?updateMask.fieldPaths=${mask}` : '';
    const response = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents/${path}${suffix}`, {
      method: fields ? 'PATCH' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
      ...(fields ? { body: JSON.stringify({ fields }) } : {}),
    });
    return response.status;
  };
  try {
    await db.doc('users/rules-admin').set({ role: 'admin' });
    await db.doc('users/rules-member').set({ role: 'user', displayName: 'Member' });
    await db.doc('web_view_meta/config').set({ startedAt: '2026-10-10T00:00:00Z' });
    assert.equal(await request('self-admin', 'users/self-admin', { role: { stringValue: 'admin' } }), 403);
    assert.equal(await request('rules-member', 'users/rules-member', { role: { stringValue: 'admin' } }, 'role'), 403);
    assert.equal(await request('new-member', 'users/new-member', { role: { stringValue: 'user' } }), 200);
    await db.doc('users/legacy-member').delete();
    assert.equal(await request('legacy-member', 'users/legacy-member', { displayName: { stringValue: 'Legacy' } }), 200);
    assert.equal(await request('legacy-member', 'users/legacy-member', { displayName: { stringValue: 'Updated legacy' } }, 'displayName'), 200);
    assert.equal(await request('legacy-member', 'users/legacy-member', { role: { stringValue: 'user' } }, 'role'), 200);
    assert.equal(await request('rules-member', 'users/rules-member', { displayName: { stringValue: 'Updated' } }, 'displayName'), 200);
    assert.equal(await request('rules-admin', 'users/rules-member', { role: { stringValue: 'admin' } }, 'role'), 200);
    for (const uid of [null, 'new-member', 'rules-admin']) {
      assert.equal(await request(uid, 'web_view_meta/config'), 403);
      assert.equal(await request(uid, 'web_view_daily/fake', { articles: { mapValue: { fields: {} } } }), 403);
    }
    for (const section of ['news', 'encyclopedia', 'male_infertility']) {
      await db.doc(`${section}/rules-article`).set({ isPublished: true, viewCount: 0 });
      assert.equal(await request('new-member', `${section}/rules-article`, { viewCount: { integerValue: '1' } }, 'viewCount'), 200);
      assert.equal(await request(null, `${section}/rules-article`, { viewCount: { integerValue: '2' } }, 'viewCount'), 403);
    }
  } finally { await deleteApp(app); }
});

test('real transactions serialize retries and concurrent web openings atomically', { skip: !host }, async () => {
  assert.match(host, /^127\.0\.0\.1:\d+$/);
  const app = initializeApp({ projectId: project }, 'statistics-transactions');
  const db = getFirestore(app);
  try {
    const articleId = `concurrent-${randomUUID()}`;
    await db.doc(`news/${articleId}`).set({ title: 'Concurrent', isPublished: true, viewCount: 0 });
    const service = createWebArticleStatistics({ db });
    const event = { data: { section: 'news', articleId, eventId: randomUUID(), sentAt: Date.now() }, rawRequest: { socket: { remoteAddress: '192.0.2.42' } } };
    const duplicateResults = await Promise.all(Array.from({ length: 4 }, () => service.record(event)));
    assert.equal(duplicateResults.filter(r => r.recorded).length, 1);
    await Promise.all(Array.from({ length: 4 }, () => service.record({ ...event, data: { ...event.data, eventId: randomUUID() } })));
    assert.equal((await db.doc(`news/${articleId}`).get()).data().viewCount, 5);
    const report = await service.report({ auth: { uid: 'rules-admin' }, data: { days: 7 } });
    assert.equal(report.topArticles.all.find(a => a.articleId === articleId).views, 5);
  } finally { await deleteApp(app); }
});

test('real Firestore accepts maximum-length bucket entries and overflow atomically', { skip: !host }, async () => {
  assert.match(host, /^127\.0\.0\.1:\d+$/);
  const app = initializeApp({ projectId: project }, 'statistics-overflow');
  const db = getFirestore(app);
  try {
    const articleId = '긴'.repeat(150);
    const key = createHash('sha256').update(`news/${articleId}`).digest('hex');
    const day = '2026-09-01';
    const bucket = `web_view_daily/${day}_${parseInt(key[0], 16)}`;
    const entries = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [
      createHash('sha256').update(`old-${i}`).digest('hex'),
      { articleId: '긴'.repeat(146) + String(i).padStart(4, '0'), title: '긴'.repeat(200), section: 'news', views: 1, lastViewedAt: 0 },
    ]));
    await db.doc(bucket).set({ date: day, articles: entries });
    await db.doc(`news/${articleId}`).set({ title: '긴'.repeat(200), isPublished: true, viewCount: 0 });
    const now = Date.parse(`${day}T03:00:00Z`);
    const service = createWebArticleStatistics({ db, now: () => now });
    await service.record({ data: { section: 'news', articleId, eventId: randomUUID(), sentAt: now }, rawRequest: { socket: { remoteAddress: '192.0.2.60' } } });
    assert.equal(Object.keys((await db.doc(bucket).get()).data().articles).length, 256);
    assert.equal((await db.doc(`${bucket}_${key[1]}`).get()).data().articles[key].views, 1);
    assert.equal((await db.doc(`news/${articleId}`).get()).data().viewCount, 1);
  } finally { await deleteApp(app); }
});
