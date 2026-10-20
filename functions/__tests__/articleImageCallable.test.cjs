const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

test("image callable uses the default bucket with bounded resources and forwards auth", async () => {
  const filename = join(__dirname, "../index.js");
  const realRequire = createRequire(filename);
  const exports = {};
  const bucket = { name: "fixture.appspot.com" };
  const db = { doc: () => ({}) };
  const request = { auth: { uid: "admin" }, data: { section: "news", sourceUrl: "https://example.com/a.png" } };
  let created = 0;
  runInNewContext(readFileSync(filename, "utf8"), {
    exports,
    require(name) {
      if (name === "firebase-admin/app") return { initializeApp() {} };
      if (name.startsWith("firebase-admin/")) return {
        getFirestore: () => db, getAuth: () => ({}), getMessaging: () => ({}),
        getStorage: () => ({ bucket: () => bucket }),
      };
      if (name === "./articleImageImport") return {
        createArticleImageImporter(options) {
          created++;
          assert.equal(options.db, db);
          assert.equal(options.bucket, bucket);
          return { importImage: input => { assert.equal(input, request); return { url: "stored" }; } };
        },
      };
      return realRequire(name);
    },
  }, { filename });
  assert.equal(created, 0);
  assert.equal(typeof exports.importArticleImage?.run, "function");
  assert.deepEqual(await exports.importArticleImage.run(request), { url: "stored" });
  await exports.importArticleImage.run(request);
  assert.equal(created, 1);
  const config = exports.importArticleImage.__endpoint;
  assert.equal(config.availableMemoryMb, 512);
  assert.equal(config.concurrency, 1);
  assert.equal(config.maxInstances, 2);
  assert.equal(config.timeoutSeconds, 30);
});
