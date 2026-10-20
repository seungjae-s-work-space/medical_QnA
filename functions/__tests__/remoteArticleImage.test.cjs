const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { crc32 } = require('node:zlib');
const sharp = require('sharp');
const {
  createRemoteArticleImageDownloader, normalizeSourceUrl, LIMITS,
} = require('../remoteArticleImage');

const PUBLIC_V4 = '93.184.216.34';
const PUBLIC_V6 = '2606:4700:4700::1111';
const SOURCE = 'https://images.example/image.png?secret=never-expose';
const png = () => sharp({ create: { width: 3, height: 2, channels: 3, background: '#aabbcc' } }).png().toBuffer();

function network(routes = [], extra = {}) {
  const calls = [];
  const lookups = [];
  const responses = [];
  const requests = [];
  const lookup = async (hostname, options) => {
    lookups.push({ hostname, options });
    return [{ address: PUBLIC_V4, family: 4 }];
  };
  const request = (options, callback) => {
    calls.push(options);
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy = error => {
      req.destroyed = true;
      if (error) queueMicrotask(() => req.emit('error', error));
    };
    req.end = () => {
      const route = routes[calls.length - 1] || {};
      queueMicrotask(() => {
        if (route.error) { req.emit('error', route.error); return; }
        if (route.hang) return;
        const response = new PassThrough();
        response.statusCode = route.status || 200;
        response.headers = { 'content-type': 'image/png', ...route.headers };
        response.complete = true;
        responses.push(response);
        callback(response);
        if (route.stream) route.stream(response);
        else if (!response.destroyed) response.end(route.body || Buffer.alloc(0));
      });
    };
    requests.push(req);
    return req;
  };
  return {
    calls, lookups, requests, responses,
    download: createRemoteArticleImageDownloader({
      lookup, httpRequest: request, httpsRequest: request, ...extra,
    }),
  };
}

async function safeReject(promise, code = 'invalid-argument') {
  await assert.rejects(promise, error => {
    assert.equal(error.code, code);
    assert.ok(!error.message.includes('never-expose'));
    assert.ok(!error.message.includes('images.example'));
    assert.equal(error.cause, undefined);
    return true;
  });
}

test('normalizes with WHATWG URL and removes fragments but preserves query identity', () => {
  assert.equal(normalizeSourceUrl('HTTPS://IMAGES.EXAMPLE:443/a/../image.png?x=1#fragment'),
    'https://images.example/image.png?x=1');
  assert.equal(normalizeSourceUrl('http://images.example:80/a'), 'http://images.example/a');
  assert.equal(normalizeSourceUrl('https://93.184.216.34/a'), 'https://93.184.216.34/a');
  assert.equal(normalizeSourceUrl(`https://[${PUBLIC_V6}]/a`), `https://[${PUBLIC_V6}]/a`);
});

for (const source of [
  '', 'not-a-url', '/image', null, {}, 'ftp://images.example/a', 'file:///tmp/a',
  'data:image/png,abc', 'https://user:secret@images.example/a',
  'https://images.example:80/a', 'http://images.example:443/a',
  'http://images.example:8080/a', 'https://images.example/a\nb',
  `https://images.example/${'a'.repeat(4096)}`,
  'http://localhost/a', 'http://LOCALHOST./a', 'http://a.localhost/a',
  'http://local/a', 'http://a.local/a', 'http://internal/a', 'http://a.internal./a',
  'http://127.0.0.1/a', 'http://127.1/a', 'http://2130706433/a',
  'http://0177.0.0.1/a', 'http://0x7f000001/a', 'http://%31%32%37.0.0.1/a',
  'http://10.0.0.1/a', 'http://172.16.0.1/a', 'http://192.168.1.1/a',
  'http://169.254.169.254/a', 'http://100.100.100.200/a', 'http://0.0.0.0/a',
  'http://168.63.129.16/a',
  'http://192.0.0.9/a', 'http://192.0.2.1/a', 'http://198.18.0.1/a',
  'http://224.0.0.1/a', 'http://255.255.255.255/a',
  'http://[::]/a', 'http://[::1]/a', 'http://[fe80::1]/a', 'http://[fc00::1]/a',
  'http://[ff02::1]/a', 'http://[2001:db8::1]/a', 'http://[2002:7f00:1::]/a',
  'http://[64:ff9b::7f00:1]/a', 'http://[::ffff:127.0.0.1]/a',
  `http://[::ffff:${PUBLIC_V4}]/a`,
]) {
  test(`blocks unsafe URL before DNS/request: ${String(source).slice(0, 65)}`, async () => {
    const f = network();
    await safeReject(f.download(source));
    assert.equal(f.calls.length, 0);
    assert.equal(f.lookups.length, 0);
  });
}

test('validates every DNS answer and rejects a mixed public/private result', async () => {
  for (const address of ['127.0.0.1', '169.254.169.254', '168.63.129.16', '10.1.1.1', 'fc00::1', '::ffff:10.0.0.1']) {
    const f = network([], { lookup: async () => [
      { address: PUBLIC_V4, family: 4 },
      { address, family: address.includes(':') ? 6 : 4 },
    ] });
    await safeReject(f.download(SOURCE));
    assert.equal(f.calls.length, 0);
  }
});

test('rejects empty, malformed, and mismatched-family DNS answers', async () => {
  for (const answers of [[], [{ address: 'not-an-ip', family: 4 }],
    [{ address: PUBLIC_V4, family: 6 }]]) {
    const f = network([], { lookup: async () => answers });
    await safeReject(f.download(SOURCE));
    assert.equal(f.calls.length, 0);
  }
});

test('pins a validated address, preserves original hostname/SNI and sends only safe headers', async () => {
  const bytes = await png();
  const f = network([{ body: bytes }]);
  const result = await f.download(SOURCE);
  assert.deepEqual(result, { bytes, contentType: 'image/png' });
  assert.equal(f.lookups.length, 1);
  assert.equal(f.lookups[0].hostname, 'images.example');
  assert.equal(f.lookups[0].options.all, true);
  const options = f.calls[0];
  assert.equal(options.hostname, 'images.example');
  assert.equal(options.servername, 'images.example');
  assert.equal(options.path, '/image.png?secret=never-expose');
  assert.equal(options.agent, false);
  assert.equal(options.method, 'GET');
  assert.deepEqual(options.headers, { Accept: 'image/png,image/jpeg,image/webp,image/gif', 'Accept-Encoding': 'identity' });
  for (const all of [false, true]) {
    const answer = await new Promise((resolve, reject) => options.lookup('images.example', { all },
      (error, address, family) => error ? reject(error) : resolve({ address, family })));
    assert.deepEqual(answer, all ? { address: [{ address: PUBLIC_V4, family: 4 }], family: undefined }
      : { address: PUBLIC_V4, family: 4 });
  }
  assert.equal(f.lookups.length, 1, 'custom lookup must never resolve DNS again');
});

test('public IPv6 DNS answers are pinned with family 6', async () => {
  const bytes = await png();
  const f = network([{ body: bytes }], {
    lookup: async () => [{ address: PUBLIC_V6, family: 6 }],
  });
  await f.download(SOURCE);
  const result = await new Promise(resolve => f.calls[0].lookup('images.example', {},
    (error, address, family) => resolve({ error, address, family })));
  assert.deepEqual(result, { error: null, address: PUBLIC_V6, family: 6 });
});

test('public IP literals bypass DNS while keeping request hostname', async () => {
  const f = network([{ body: await png() }]);
  await f.download(`http://${PUBLIC_V4}/image`);
  assert.equal(f.lookups.length, 0);
  assert.equal(f.calls[0].hostname, PUBLIC_V4);
});

test('relative redirect and HTTP to HTTPS upgrade are validated and preserve original bytes', async () => {
  const bytes = await png();
  const f = network([
    { status: 301, headers: { location: 'https://cdn.example/a' } },
    { status: 307, headers: { location: '../b#ignored' } },
    { body: bytes },
  ]);
  assert.deepEqual(await f.download('http://images.example/a'), { bytes, contentType: 'image/png' });
  assert.deepEqual(f.calls.map(call => `${call.protocol}//${call.hostname}${call.path}`),
    ['http://images.example/a', 'https://cdn.example/a', 'https://cdn.example/b']);
  assert.equal(f.lookups.length, 3);
  assert.equal(f.responses[0].destroyed, true);
});

for (const location of ['http://images.example/a', 'https://127.0.0.1/a',
  'https://[::ffff:10.0.0.1]/a', 'https://a.internal/a', 'file:///tmp/a',
  'https://user:pass@images.example/a', 'https://images.example:444/a']) {
  test(`rejects unsafe or downgraded redirect ${location}`, async () => {
    const f = network([{ status: 302, headers: { location } }]);
    await safeReject(f.download(SOURCE));
    assert.equal(f.calls.length, 1);
  });
}

test('resolves and validates DNS again at each redirect, blocking a private answer', async () => {
  let count = 0;
  const f = network([{ status: 302, headers: { location: '/another' } }], {
    lookup: async () => [{ address: count++ ? '127.0.0.1' : PUBLIC_V4, family: 4 }],
  });
  await safeReject(f.download(SOURCE));
  assert.equal(f.calls.length, 1);
});

test('permits three redirects but rejects a fourth without making a fifth request', async () => {
  const route = { status: 302, headers: { location: '/again' } };
  const good = network([route, route, route, { body: await png() }]);
  await good.download(SOURCE);
  assert.equal(good.calls.length, 4);
  const bad = network([route, route, route, route]);
  await safeReject(bad.download(SOURCE));
  assert.equal(bad.calls.length, 4);
});

test('accepts only HTTP 200, rejects missing redirects and compressed content', async () => {
  for (const route of [
    { status: 204 }, { status: 206 }, { status: 404 }, { status: 302 },
    { headers: { 'content-encoding': 'gzip' } },
    { headers: { 'content-encoding': 'br' } },
    { headers: { 'content-type': 'image/svg+xml' } },
    { headers: { 'content-type': 'text/html' } },
  ]) {
    const f = network([{ ...route, body: await png() }]);
    await safeReject(f.download(SOURCE));
  }
});

test('enforces the absolute deadline even when DNS never returns', async () => {
  const f = network([], { lookup: () => new Promise(() => {}), timeoutMs: 25 });
  const start = Date.now();
  await safeReject(f.download(SOURCE), 'deadline-exceeded');
  assert.ok(Date.now() - start < 1000);
  assert.equal(f.calls.length, 0);
});

test('deadline aborts requests before headers and slow chunked bodies', async () => {
  for (const route of [{ hang: true }, { stream: () => {} }]) {
    const f = network([route], { timeoutMs: 25 });
    await safeReject(f.download(SOURCE), 'deadline-exceeded');
    assert.equal(f.requests[0].destroyed, true);
    assert.ok(f.responses.every(response => response.destroyed));
  }
});

test('deadline is shared across DNS and redirects rather than resetting per request', async () => {
  const f = network([
    { status: 302, headers: { location: '/again' } }, { hang: true },
  ], {
    timeoutMs: 45,
    lookup: async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return [{ address: PUBLIC_V4, family: 4 }];
    },
  });
  await safeReject(f.download(SOURCE), 'deadline-exceeded');
  assert.equal(f.calls.length, 1);
});

test('does not start a request past the deadline even when the abort timer is delayed', async t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const f = network([{ hang: true }], {
    timeoutMs: 25,
    lookup: async () => {
      now += 30;
      return [{ address: PUBLIC_V4, family: 4 }];
    },
  });
  await safeReject(f.download(SOURCE), 'deadline-exceeded');
  assert.equal(f.calls.length, 0);
});

test('size limit is below 10 MiB and bounds both declared and chunked bytes', async () => {
  assert.ok(LIMITS.maxBytes < 10 * 1024 * 1024);
  for (const route of [
    { headers: { 'content-length': String(LIMITS.maxBytes + 1) } },
    { headers: { 'transfer-encoding': 'chunked' }, stream(response) {
      const chunk = Buffer.alloc(1024 * 1024);
      for (let i = 0; i < 11 && !response.destroyed; i++) response.write(chunk);
      if (!response.destroyed) response.end();
    } },
  ]) {
    const f = network([route]);
    await safeReject(f.download(SOURCE), 'resource-exhausted');
    assert.equal(f.requests[0].destroyed, true);
    assert.equal(f.responses[0].destroyed, true);
  }
});

test('rejects empty, malformed length, incomplete and abruptly closed responses', async () => {
  for (const route of [
    {},
    { headers: { 'content-length': 'abc' } },
    { headers: { 'content-length': '1000' }, body: await png() },
    { stream(response) { response.complete = false; response.end(Buffer.from('partial')); } },
    { stream(response) { response.destroy(); } },
  ]) {
    const f = network([route]);
    await safeReject(f.download(SOURCE));
  }
});

test('rejects HTML masquerading as PNG and corrupt images with valid-looking signatures', async () => {
  const bytes = await png();
  for (const body of [Buffer.from('<html>not an image</html>'), bytes.subarray(0, 40),
    Buffer.from('GIF89a corrupt'), Buffer.from([0xff, 0xd8, 0xff, 0xd9])]) {
    const f = network([{ body }]);
    await safeReject(f.download(SOURCE));
  }
});

test('rejects PNG animation chunks that sharp otherwise decodes as only a static image', async () => {
  const bytes = await png();
  const animation = Buffer.alloc(20);
  animation.writeUInt32BE(8, 0);
  animation.write('acTL', 4, 'ascii');
  animation.writeUInt32BE(LIMITS.maxFrames + 1, 8);
  animation.writeUInt32BE(crc32(animation.subarray(4, 16)), 16);
  const body = Buffer.concat([bytes.subarray(0, 33), animation, bytes.subarray(33)]);
  const f = network([{ body }]);
  await safeReject(f.download(SOURCE));
});

test('forces full decode to reject damage after otherwise valid metadata', async () => {
  const bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: 'red' } }).jpeg().toBuffer();
  const body = bytes.subarray(0, bytes.length - 16);
  assert.equal((await sharp(body).metadata()).format, 'jpeg', 'fixture metadata must be readable');
  const f = network([{ body, headers: { 'content-type': 'image/jpeg' } }]);
  await safeReject(f.download(SOURCE));
});

test('accepts bounded GIF/WebP animations without losing frames or changing bytes', async () => {
  for (const format of ['gif', 'webp']) {
    const body = await sharp(Buffer.from([
      255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255,
    ]), { raw: { width: 2, height: 2, channels: 3, pageHeight: 1 } })
      [format]({ loop: 0, delay: [100, 100] }).toBuffer();
    assert.equal((await sharp(body, { animated: true }).metadata()).pages, 2);
    const contentType = `image/${format}`;
    const f = network([{ body, headers: { 'content-type': contentType } }]);
    assert.deepEqual(await f.download(SOURCE), { bytes: body, contentType });
  }
});

test('decodes PNG/JPEG/WebP/GIF and preserves original bytes with actual MIME', async () => {
  for (const [format, mime] of [['png', 'image/png'], ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'], ['gif', 'image/gif']]) {
    const bytes = await sharp(await png())[format]().toBuffer();
    const f = network([{ headers: { 'content-type': mime }, body: bytes }]);
    assert.deepEqual(await f.download(SOURCE), { bytes, contentType: mime });
  }
});

test('rejects supported MIME that does not match decoded bytes and unsupported raster formats', async () => {
  for (const body of [await sharp(await png()).jpeg().toBuffer(),
    await sharp(await png()).tiff().toBuffer(), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')]) {
    const f = network([{ body }]);
    await safeReject(f.download(SOURCE));
  }
});

test('limits dimensions, total decoded pixels and animation frames', async () => {
  const fixtures = [
    await sharp({ create: { width: LIMITS.maxDimension + 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer(),
    await sharp({ create: { width: 4097, height: 4097, channels: 3, background: 'red' } }).png().toBuffer(),
    await sharp(Buffer.alloc(2 * 2 * 3 * (LIMITS.maxFrames + 1)), {
      raw: { width: 2, height: 2 * (LIMITS.maxFrames + 1), channels: 3, pageHeight: 2 },
    }).gif({ keepDuplicateFrames: true }).toBuffer(),
  ];
  for (let index = 0; index < fixtures.length; index++) {
    const f = network([{ body: fixtures[index], headers: { 'content-type': index === 2 ? 'image/gif' : 'image/png' } }]);
    await safeReject(f.download(SOURCE), 'resource-exhausted');
  }
});

test('DNS/request errors are sanitized and never expose the source URL', async () => {
  const dnsFailure = network([], { lookup: async () => { throw new Error(SOURCE); } });
  await safeReject(dnsFailure.download(SOURCE), 'unavailable');
  const requestFailure = network([{ error: new Error(SOURCE) }]);
  await safeReject(requestFailure.download(SOURCE), 'unavailable');
});
