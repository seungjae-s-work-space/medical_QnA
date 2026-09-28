# Web Article Search

## Behavior

News, encyclopedia, and male-infertility searches cover their own entire board.
Enter or the search button submits the query. Typing alone does not change the list.
Results show 30 titles per page, newest first; opening a title reads its current
Firestore document and uses the existing detail dialog. Clearing the search
restores the previous browsing page. Administrators can edit a result directly.

Matching is a case-insensitive, Unicode-normalized substring in the title or
visible HTML body text. Whitespace is normalized; this is not fuzzy or semantic
search. Image URLs, HTML attributes, scripts, and image contents are not searched.

## Server And Privacy

`searchArticles` is a Firebase callable. It reads a private compressed JSON catalog
at `_article_search/v1/{section}.json` in the default Storage bucket. Catalogs
contain body text and may include drafts: never make this prefix public, attach
download tokens, or copy it into the web build. Existing Storage rules do not grant
client access to it; deployment must also keep bucket/object IAM private.

Each request checks the object generation; unchanged catalogs are cached in the
function instance. Before returning titles, the server reads the current candidate
documents, excluding deleted or unpublished articles from public responses.
Draft searches require a current `users/{uid}.role === 'admin'` check. Direct
article reads still use Firestore security rules.

Three document-write triggers update the catalogs. Generation preconditions and
retries protect concurrent updates. Triggers read the current source document so
out-of-order events do not restore stale data. View-count/updatedAt-only events
return without reading or rewriting the catalog.

Index updates are asynchronous. New/edited titles, matches, and total counts can
lag until their trigger finishes. A deleted/unpublished hit can temporarily leave
a short result page, but its title is not returned to public callers. The refresh
icon reruns the submitted search. Missing catalogs produce an explicit error;
public searches never silently search only loaded articles or start a full scan.

## Deployment Order

Backend and initial catalogs must be ready before deploying the web changes.
No Flutter release, Firestore schema migration, or new client rules are needed.

1. Install functions dependencies with Node 22 (`npm ci` in `functions`).
2. Deploy only the search functions from the repository root:

```sh
firebase deploy --project medicalqa-e5313 --only functions:searchArticles,functions:syncNewsSearchIndex,functions:syncEncyclopediaSearchIndex,functions:syncMaleInfertilitySearchIndex
```

3. With authorized Application Default Credentials, bootstrap existing articles:

```sh
node functions/scripts/buildArticleSearchIndex.js \
  --project medicalqa-e5313 \
  --bucket medicalqa-e5313.firebasestorage.app \
  --section all
```

The account needs Firestore read and Storage object read/write permissions.
Firebase CLI sign-in alone does not necessarily provide ADC. Do not put service
account keys in the repository. The script prints counts only, never article text.
It leaves existing catalogs unchanged; `--rebuild` explicitly reconstructs them.
It does not modify source articles, send notifications, or delete existing content.

4. Verify counts (including drafts), a known older title/body match in every board,
   public draft exclusion, administrator editing, and no public Storage access.
5. Deploy the web through the existing main/GitHub Pages workflow.

If rollback is needed, roll back the web first. Catalogs are derived data and can
be rebuilt; they are not article backups. Keep existing article backups intact.

## Cost Characteristics

- Initial bootstrap/rebuild reads each source article once in 200-document pages.
  A missing catalog may also be bootstrapped once by an article-write trigger.
- Search does not scan Firestore collections. It uses Storage metadata and, when
  generation changes or an instance is cold, downloads the compressed catalog.
- Each result page reads at most 30 Firestore documents to verify current titles
  and visibility. Administrator searches also read one role document. Opening a
  result reads its full document separately, plus existing view-count behavior.
- Content edits update one entry, but rewrite the board's compressed object.
  View-count events still invoke the trigger, although it exits without catalog IO.
- Function invocations, compute, Storage operations/versions, and Firestore reads
  still incur usage. `maxInstances` limits concurrency, not total spending.
  Monitor these metrics and budget alerts after deployment. No external paid
  search provider is introduced.
- This design fits the current modest article corpus. Catalog memory/scan time
  and rewrite sizes grow with the corpus; monitor them before significantly
  expanding content or traffic. It is not a general-purpose large search engine.

## Verification

```sh
node --test functions/__tests__/articleSearch.test.cjs
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false --runInBand
npm run build
```

Browser QA uses isolated Firebase fixtures, with all external requests blocked,
at desktop and mobile widths. Production backfill and end-to-end callable/IAM
verification are required during deployment; unit fixtures cannot verify live IAM.
