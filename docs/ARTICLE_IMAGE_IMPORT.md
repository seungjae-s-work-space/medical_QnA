# Article Image Import

## Scope

The web news, encyclopedia and male-infertility editors prepare every body image
and the chosen thumbnail before creating/updating a Firestore article. This
applies on save, not on paste, and does not bulk-migrate existing articles.
Quill's uncontrolled editor, paste handling and scroll guard are retained.

- Current Firebase bucket download URLs are kept.
- Embedded JPEG/PNG/GIF/WebP data images are uploaded through the existing admin
  Storage permissions. Successful uploads are cached by user, section, MIME and
  byte hash for retries in the current browser session (up to 100 entries).
- Other public HTTP(S) images use the admin-only `importArticleImage` callable.
- URLs are normalized; fragments are ignored but query parameters remain part
  of identity. Repeated sources in one save are imported once.
- Thumbnail priority remains custom thumbnail, selected body image, first body
  image. Selections are remapped to the saved URL.
- `srcset`, `sizes` and `picture source` alternatives are removed after import so
  readers do not silently fetch a different external rendition.
- Editing/save/cancel are disabled during preparation. Save/cancel also wait
  for existing toolbar/thumbnail uploads to finish.

Any preparation failure leaves the editor and its draft open, prevents the
article write, and identifies the affected image number or thumbnail. A download
blocked by the origin, an expired/private URL, an unsupported image or a timeout
requires replacing that image with a supported direct upload. This does not
bypass origin authentication or access restrictions. Import only images the
publisher is permitted to reproduce.

## Server Controls

The callable checks `users/{uid}.role === "admin"` on every invocation, including
cache hits. It uses the default Storage bucket and creates objects under
`{section}_images/imported-{sha256(normalizedSourceURL)}` with a stable download
token. Create-only generation preconditions prevent concurrent overwrites.
Existing imports must have valid version/hash/MIME/token/size metadata.

The downloader:

- Accepts only public HTTP(S) on default ports without credentials.
- Rejects local/internal/metadata/special-use addresses, checks every DNS answer
  and redirect, and pins the validated IP while retaining hostname/TLS validation.
- Sends no cookies, authorization, referer, proxy settings or caller headers.
- Allows up to three redirects, never HTTPS-to-HTTP.
- Uses an absolute 20-second DNS/download/decode deadline.
- Limits remote bytes to 9 MiB; handles both declared and chunked lengths.
- Requires HTTP 200 and identity content encoding.
- Checks JPEG/PNG/WebP/GIF signatures, MIME and full raster decoding with sharp.
- Caps dimensions at 8192, total decoded pixels at 16,777,216, frames at 32.
  SVG, HTML, unsupported raster formats, corrupt images and APNG are rejected.
- Returns sanitized errors without source URLs or query tokens.

Callable runtime: Node 22, 512 MiB, concurrency 1, max instances 2, 30-second
function timeout. Client callable timeout: 30 seconds. Browser preparation is
sequential, with at most 50 new/imported sources in one save. Inline/direct
uploads retain the existing Storage rule limit of less than 10 MiB.

## Storage and Cost

Remote imports reuse the same object for a normalized URL within a section,
including after browser reloads, cold starts and save retries. The original
validated bytes are retained without re-encoding. If an origin changes bytes at
an unchanged URL, the already imported copy remains; use a direct upload/new URL
to replace it.

This adds one current-role read, Storage metadata lookup and callable invocation
per distinct external source encountered on save. A new image additionally needs
download, decoding and one Storage write. Reader views do not call the importer.
Storage and delivery charges still apply to the stored images.

An import that succeeds before a later image/article write fails is retained for
reuse, not deleted. There is no new editorial-image expiration or orphan cleanup:
deleting shared images could break other articles. Existing chat retention is
unchanged.

## Rollout

This implementation is not itself a deployment.

1. Install locked function dependencies using Node 22 (`npm ci` in `functions`).
2. Deploy only the new callable from the configured Firebase project directory:
   `firebase deploy --project medicalqa-e5313 --only functions:importArticleImage`.
3. Verify the callable with an authorized administrator, then deploy the web
   through the existing main/GitHub Pages release workflow.
4. Verify a new draft, an existing-article edit, selected/custom thumbnail,
   failure/retry, and guest/app rendering of the resulting download URLs.

Deploy the function before the new web bundle. Otherwise remote-image saves
fail closed while retaining the draft. No Firestore/Storage rule change and no
Flutter release are required for this feature. Existing saved download URLs
continue to work with older apps. Do not roll back or delete stored images when
rolling back the web.

## Local Verification

Unit and integration tests mock network, Storage and Firestore, including
authorization, SSRF/redirect/DNS pinning, raster/byte/time limits, concurrent
imports, safe errors, new/edit writes, thumbnail choices and draft preservation.
Browser checks use an isolated local Firebase fixture, not production writes.

```sh
node --test functions/__tests__/*.test.cjs
cd admin-web
./node_modules/.bin/react-scripts test --watchAll=false --runInBand
npm run build
```

Production connectivity and actual IAM/Storage behavior still require the
post-deployment smoke check above.
