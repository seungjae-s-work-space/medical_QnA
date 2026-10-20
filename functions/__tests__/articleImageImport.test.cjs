const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { createArticleImageImporter } = require('../articleImageImport');
const { RemoteImageError } = require('../remoteArticleImage');

const SOURCE = 'https://images.example/photo.png?secret=never-expose';
const TOKEN = 'f1438eb3-fbb1-452b-9b46-637607ff4269';
const hash = value => createHash('sha256').update(value).digest('hex');
const request = (data = {}, auth = { uid: 'admin' }) => ({
  auth, data: { section: 'news', sourceUrl: SOURCE, ...data },
});

function fixture() {
  const users = new Map([['admin', { role: 'admin' }], ['revoked', { role: 'user' }]]);
  const objects = new Map();
  const events = [];
  let downloadError;
  let saveHook;
  const db = {
    collection(name) {
      assert.equal(name, 'users', 'no source article read or write is allowed');
      return { doc(uid) { return { async get() {
        events.push(`auth:${uid}`);
        return { exists: users.has(uid), data: () => users.get(uid) };
      } }; } };
    },
  };
  const bucket = {
    name: 'test-bucket.appspot.com',
    file(path) {
      events.push(`file:${path}`);
      return {
        async getMetadata() {
          events.push('metadata');
          if (!objects.has(path)) throw Object.assign(new Error(SOURCE), { code: 404 });
          return [objects.get(path).metadata];
        },
        async save(bytes, options) {
          events.push('save');
          assert.equal(options.preconditionOpts.ifGenerationMatch, 0);
          assert.equal(options.resumable, false);
          assert.notEqual(options.gzip, true);
          assert.ok(!JSON.stringify(options).includes(SOURCE));
          if (saveHook) await saveHook({ path, bytes, options });
          if (objects.has(path)) throw Object.assign(new Error(SOURCE), { code: 412 });
          objects.set(path, {
            bytes: Buffer.from(bytes),
            metadata: { ...options.metadata, size: String(bytes.length), generation: '1' },
          });
        },
        delete() { assert.fail('never delete retained image objects'); },
        setMetadata() { assert.fail('never rotate an existing download token'); },
      };
    },
  };
  const download = async url => {
    events.push(`download:${url}`);
    if (downloadError) throw downloadError;
    return { bytes: Buffer.from('validated-original-image'), contentType: 'image/png' };
  };
  return {
    users, objects, events, db, bucket, download,
    service: createArticleImageImporter({ db, bucket, download }),
    failDownload(error) { downloadError = error; },
    onSave(hook) { saveHook = hook; },
  };
}

test('requires current admin authorization before input validation, storage, or network', async () => {
  const f = fixture();
  await assert.rejects(f.service.importImage(request({ section: 'users' }, null)), { code: 'unauthenticated' });
  assert.deepEqual(f.events, []);
  for (const uid of ['missing', 'revoked']) {
    await assert.rejects(f.service.importImage(request({ section: 'users' }, {
      uid, token: { admin: true, role: 'admin' },
    })), { code: 'permission-denied' });
  }
  assert.deepEqual(f.events, ['auth:missing', 'auth:revoked']);
});

test('rechecks authorization even on a cached object after role revocation', async () => {
  const f = fixture();
  await f.service.importImage(request());
  f.users.set('admin', { role: 'user' });
  f.events.length = 0;
  await assert.rejects(f.service.importImage(request()), { code: 'permission-denied' });
  assert.deepEqual(f.events, ['auth:admin']);
});

for (const section of ['videos', 'users', '../news', '', null, 0]) {
  test(`rejects unsupported section ${JSON.stringify(section)} before storage/network`, async () => {
    const f = fixture();
    await assert.rejects(f.service.importImage(request({ section })), { code: 'invalid-argument' });
    assert.deepEqual(f.events, ['auth:admin']);
  });
}

for (const section of ['news', 'encyclopedia', 'male_infertility']) {
  test(`stores ${section} images by normalized source hash and reuses across fresh instances`, async () => {
    const f = fixture();
    const sourceUrl = 'HTTPS://IMAGES.EXAMPLE:443/a/../photo.png?secret=never-expose#fragment';
    const expectedPath = `${section}_images/imported-${hash(SOURCE)}`;
    const first = await f.service.importImage(request({ section, sourceUrl }));
    assert.equal(first.reused, false);
    assert.ok(f.objects.has(expectedPath));
    assert.equal(f.events[0], 'auth:admin');
    const object = f.objects.get(expectedPath);
    assert.equal(object.metadata.contentType, 'image/png');
    assert.equal(object.metadata.metadata.sourceSha256, hash(SOURCE));
    assert.equal(object.metadata.metadata.articleImageImportVersion, '1');
    assert.match(object.metadata.metadata.firebaseStorageDownloadTokens, /^[0-9a-f-]{36}$/);
    assert.equal(object.bytes.toString(), 'validated-original-image');
    assert.ok(!JSON.stringify(object.metadata).includes('secret'));
    const url = new URL(first.url);
    assert.equal(url.origin, 'https://firebasestorage.googleapis.com');
    assert.equal(url.pathname, `/v0/b/${f.bucket.name}/o/${encodeURIComponent(expectedPath)}`);
    assert.equal(url.searchParams.get('alt'), 'media');
    assert.equal(url.searchParams.get('token'), object.metadata.metadata.firebaseStorageDownloadTokens);
    const fresh = createArticleImageImporter({ db: f.db, bucket: f.bucket, download: f.download });
    const second = await fresh.importImage(request({ section, sourceUrl: `${SOURCE}#another` }));
    assert.deepEqual(second, { url: first.url, reused: true });
    assert.equal(f.events.filter(event => event.startsWith('download:')).length, 1);
    assert.equal(f.events.filter(event => event === 'save').length, 1);
  });
}

test('queries remain part of the source identity', async () => {
  const f = fixture();
  await f.service.importImage(request());
  await f.service.importImage(request({ sourceUrl: `${SOURCE}&v=2` }));
  assert.equal(f.objects.size, 2);
});

for (const sourceUrl of [
  null, '', '/relative', 'file:///image', 'data:image/png,abc',
  'https://user:secret@images.example/a', 'https://images.example:444/a',
  'https://localhost/a', 'http://0x7f000001/a', 'http://[::ffff:127.0.0.1]/a',
  `https://images.example/${'a'.repeat(4096)}`,
]) {
  test(`rejects unsafe source before any storage access (${String(sourceUrl).slice(0, 45)})`, async () => {
    const f = fixture();
    await assert.rejects(f.service.importImage(request({ sourceUrl })), { code: 'invalid-argument' });
    assert.deepEqual(f.events, ['auth:admin']);
  });
}

test('create-only race reuses the winner token without replacing metadata', async () => {
  const f = fixture();
  f.onSave(async ({ path, bytes, options }) => {
    f.objects.set(path, {
      bytes,
      metadata: { ...options.metadata, size: String(bytes.length), generation: '7',
        metadata: { ...options.metadata.metadata, firebaseStorageDownloadTokens: TOKEN } },
    });
  });
  const result = await f.service.importImage(request());
  assert.equal(result.reused, true);
  assert.equal(new URL(result.url).searchParams.get('token'), TOKEN);
  assert.equal(f.objects.size, 1);
});

test('a partial save with lost acknowledgement is retained and reused', async () => {
  const f = fixture();
  f.onSave(async ({ path, bytes, options }) => {
    f.objects.set(path, {
      bytes, metadata: { ...options.metadata, size: String(bytes.length), generation: '1' },
    });
    throw Object.assign(new Error(SOURCE), { code: 503 });
  });
  const first = await f.service.importImage(request());
  const second = await f.service.importImage(request());
  assert.equal(first.reused, true);
  assert.deepEqual(second, first);
  assert.equal(f.events.filter(event => event === 'save').length, 1);
});

test('failed download is retryable and never writes an object or an article', async () => {
  const f = fixture();
  f.failDownload(new Error(`upstream ${SOURCE}`));
  await assert.rejects(f.service.importImage(request()), error => {
    assert.equal(error.code, 'internal');
    assert.ok(!JSON.stringify(error).includes('secret'));
    assert.ok(!error.message.includes(SOURCE));
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(f.objects.size, 0);
  f.failDownload(null);
  assert.equal((await f.service.importImage(request())).reused, false);
});

test('sanitizes even typed upstream errors and their details', async () => {
  for (const failure of [
    new HttpsError('invalid-argument', SOURCE, { source: SOURCE }),
    Object.assign(new RemoteImageError('unavailable'), { message: SOURCE }),
  ]) {
    const f = fixture();
    f.failDownload(failure);
    await assert.rejects(f.service.importImage(request()), error => {
      assert.ok(!error.message.includes(SOURCE));
      assert.ok(!JSON.stringify(error).includes('never-expose'));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('simultaneous imports converge on a single object and token', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 5 }, () => f.service.importImage(request())));
  assert.equal(f.objects.size, 1);
  assert.equal(new Set(results.map(result => result.url)).size, 1);
  assert.equal(results.filter(result => !result.reused).length, 1);
});

test('save errors never expose source URL and do not delete other successful imports', async () => {
  const f = fixture();
  const first = await f.service.importImage(request());
  f.onSave(async () => { throw new Error(SOURCE); });
  await assert.rejects(f.service.importImage(request({ sourceUrl: `${SOURCE}&other=1` })), error => {
    assert.equal(error.code, 'internal');
    assert.ok(!error.message.includes(SOURCE));
    return true;
  });
  assert.equal(f.objects.size, 1);
  assert.equal((await f.service.importImage(request())).url, first.url);
});

for (const corrupt of [
  metadata => { delete metadata.metadata.articleImageImportVersion; },
  metadata => { metadata.metadata.sourceSha256 = 'other'; },
  metadata => { delete metadata.metadata.firebaseStorageDownloadTokens; },
  metadata => { metadata.contentType = 'text/html'; },
  metadata => { metadata.size = '999999999'; },
]) {
  test('unvalidated existing objects fail closed without downloading or overwriting', async () => {
    const f = fixture();
    await f.service.importImage(request());
    corrupt([...f.objects.values()][0].metadata);
    f.events.length = 0;
    await assert.rejects(f.service.importImage(request()), { code: 'failed-precondition' });
    assert.equal(f.events.some(event => event.startsWith('download:')), false);
    assert.equal(f.events.includes('save'), false);
  });
}
