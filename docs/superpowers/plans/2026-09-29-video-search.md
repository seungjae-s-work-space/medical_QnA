# Video Search Implementation Plan

**Goal:** Extend the previously approved board-wide web search behavior to all registered Agisungong TV videos, not just loaded browse pages.

**Architecture:** Reuse the private catalog/callable and compact `ArticleSearch` UI. Add the `videos` section with plain-text `description` indexing and a document-write trigger. Preserve normal 17-item browsing, existing playback/edit dialogs, public visibility checks, and admin-only draft searches. No YouTube-wide search, Flutter changes, new dependencies, or automatic deployment.

## Tasks

- [x] Add failing backend tests for full video catalog coverage, description matching, bounded result reads, source projection, updates/deletion, and draft privacy.
- [x] Add failing web tests for video service reads and VideoManager submission, remote results, pagination, playback, editing, clearing, errors, and unchanged limited browse queries.
- [x] Extend `functions/articleSearch.js` with section-specific source text and projection; add `syncVideoSearchIndex` in `functions/index.js`; allow video-only bootstrap in the existing script.
- [x] Extend `articleSearchService.js` and video wording in `ArticleSearch.jsx`; replace local filtering in `VideoManager.jsx` with the existing compact search wrapper.
- [x] Update `docs/ARTICLE_SEARCH.md` with video behavior and deployment order: callable + video trigger, `--section videos` bootstrap, then web deployment.
- [x] Run backend/web suites and production build; inspect desktop/mobile with isolated browser fixtures and no production writes.

## Verification

```sh
node --test functions/__tests__/*.test.cjs
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false --runInBand
npm run build
```

Use more than 200 backend fixtures so catalog bootstrap crosses a page boundary; verify a title/description outside the first 17 videos, 30-title search pages, and no Firestore collection scan per search. Browser fixtures must cover the real VideoManager and server search implementation without calling production Firebase or YouTube. Live catalog bootstrap and function deployment remain a separate release step.

## Results

- Red/green confirmed: four backend video tests and five web video integration/service tests failed before implementation, then passed.
- Search backend: 13 Node tests pass, including 215-video catalog pagination, projected descriptions, bounded reads, title-only responses, draft privacy, edits and deletions.
- Other Cloud Functions: 9 Jest tests in four suites pass. The functions directory resolves a different Jest environment version, so these checks explicitly used the web project's matching `jest-environment-node`; no dependencies were changed.
- Web: 106 tests in 23 suites pass. Production build succeeds with the existing Browserslist data-age warning.
- Browser: real VideoManager and search implementation connected to in-memory fixtures at 1440px and 390px, public/admin modes. Verified 30 compact title rows, description matches beyond loaded pages, draft exclusion, live playback/edit reads, query pagination, clear/restore, errors/retry, empty results, and no horizontal result overflow or page errors.
- Production Firebase and YouTube calls were blocked during browser QA. No source data was changed; temporary browser/server processes exited.
- No commit, push, catalog bootstrap, function deployment, or web deployment performed. Existing unrelated app changes are preserved.
