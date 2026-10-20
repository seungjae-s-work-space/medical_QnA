# Article Image Import Implementation Plan

**Goal:** Before saving news, encyclopedia, or male-infertility articles in the
web editor, copy referenced external images into our Firebase Storage and replace
body/thumbnail URLs. Any failure leaves the editor open and the article unchanged.

**Architecture:** A shared browser preparation helper parses a detached HTML
document, deduplicates sources, uploads inline images, and invokes an admin-only
callable for public remote images. The callable performs bounded, DNS-pinned
downloads and idempotent Storage writes. Managers commit Firestore only after
preparation succeeds. Existing scrolling/Quill insertion behavior stays intact.

**Tech Stack:** React, Quill, Firebase callable/Admin SDK, Node 22 HTTP clients,
ipaddr.js for address classification, sharp for raster validation.

## Approved Scope

- New and edited articles only; no automatic bulk rewrite of existing articles.
- News, encyclopedia, male-infertility body images and the chosen thumbnail.
- Preserve selected-thumbnail priority even when its original URL is replaced.
- Existing current-bucket URLs are retained; other remote images are copied.
- Reuse imports by normalized source URL and section, including save retries.
- Only public HTTP(S), default ports, no user credentials or forwarded cookies.
  Validate every DNS answer and redirect; pin the validated address at connect
  time. Reject private, loopback, link-local, reserved and metadata targets.
- Maximum remote image size below 10 MiB, bounded redirects/deadlines, supported
  PNG/JPEG/WebP/GIF only, bounded raster dimensions/decode. Reject SVG and HTML.
- No origin URL/token in logs, error messages, or public object metadata.
- Only a current Firestore administrator can invoke the importer.
- Image errors identify the failed image number/thumbnail without exposing its
  full URL. Preserve the draft; do not silently retain external sources.
- Freeze editing during save, show existing-style progress and recoverable errors.
- Stored objects from a partial failure are reusable. Never delete shared images
  on failed save; no new automatic retention policy for editorial images.
- No app source change, deploy, bulk migration, or commit in this implementation.
  Production rollout requires deploying the callable before the web.

## Tasks

- [x] Backend TDD: `functions/articleImageImport.js`,
  `functions/remoteArticleImage.js`, corresponding `functions/__tests__/*.cjs`.
  Add required direct dependencies, then implement factory:

  ```js
  const importer = createArticleImageImporter({ db, bucket });
  // request.auth.uid required, users/{uid}.role must equal admin
  await importer.importImage({
    auth: { uid },
    data: { section: 'news', sourceUrl: 'https://example.org/image.jpg' },
  }); // => { url, reused }
  ```

  Test auth before network/storage, invalid board/URL, DNS rebinding protection,
  redirects to private IPs, timeout/byte/type/decode limits, duplicate/retry and
  concurrent create-only Storage writes, missing existing objects, safe errors.
- [x] Browser helper TDD: `admin-web/src/services/articleImages.js` and
  `admin-web/src/__tests__/articleImages.test.js`.

  ```js
  const { content, imageUrl } = await prepareArticleImages({
    section, content: html, selectedImageUrl, customThumbnail, onProgress,
  });
  ```

  Use DOMParser, not HTML regex. Normalize URLs, reject unsupported/local sources,
  deduplicate, keep formatting/alt/size, remove remote srcset/picture alternatives.
  Throw before any article write on failure. Cache inline uploads by byte hash
  within the current browser session, using unique Storage objects so concurrent
  uploaders cannot overwrite an existing download token.
  Test repeated sources, thumbnail remapping/fallback, escaped/query URLs, own
  versus foreign buckets, malformed data, failure/retry, and no-image articles.
- [x] Integrate callable export in `functions/index.js` with lazy initialization,
  explicit regional/default limits, and allowed production/local editor origins.
  Wire helper into both managers; encyclopedia covers male-infertility via section.
  Preserve unrelated existing changes in this dirty checkout.
- [x] Add manager integration tests covering new and edited articles, all boards,
  unchanged draft and no Firestore write after image failure, and frozen controls.
- [x] Run focused/full relevant test suites, build web, independent read-only
  security/spec review, and browser checks with isolated Firebase fixtures.
- [x] Document deployment order, limits, recovery, and no app release requirement.

## Verification Commands

```sh
node --test functions/__tests__/articleImageImport.test.cjs functions/__tests__/remoteArticleImage.test.cjs
cd admin-web
./node_modules/.bin/react-scripts test --watchAll=false --runInBand
npm run build
```

Use `./node_modules/.bin/react-scripts test` because this project has no npm test
script. Do not write production content or use live uploads for verification.

## References

- https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- https://nodejs.org/api/http.html#httprequestoptions-callback
- https://firebase.google.com/docs/storage/admin/start

## Verification Results (2026-10-20)

- Web: 176 tests across 29 suites passed; production build succeeded.
- Node 22 backend CJS: 146 passed, 3 existing emulator-only tests skipped.
- Existing backend Jest: 9 tests across 4 suites passed.
- New importer/callable/downloader coverage: 115 passing backend tests.
- Independent backend review: no actionable findings. Frontend review found
  three edge cases (resize-plugin deletion while saving, re-upload on URL lookup
  failure, and busy thumbnail selection); all were fixed and re-reviewed.
- Isolated browser fixture: desktop news import failure preserved 27 paragraphs,
  original image and scrollTop 599; successful import remapped body/thumbnail.
  At 390x844, male-infertility progress/buttons fit. Real Quill resize selection
  was dismissed on encyclopedia save; Backspace during import retained the image.
- Temporary browser fixture used no production Firebase operations. Production
  IAM/network/GCS behavior awaits a post-deployment smoke check.
- `git diff --check` passed. No app edits, commit, push or deployment in this task.
