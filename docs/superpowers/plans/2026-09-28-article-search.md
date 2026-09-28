# Board-Wide Article Search Implementation Plan

**Goal:** Search every article in the current news, encyclopedia, or male-infertility board on explicit submission and show compact, title-only results.

**Architecture:** Keep the existing paginated browsing and article dialogs. A shared search component calls a Firebase callable endpoint. The endpoint searches a private, compressed Storage catalog and returns 30 titles at a time, with publication checks against current Firestore documents before returning public results. Firestore triggers update only the changed article in the catalog using Storage generation preconditions; view-count-only writes do not update it. No external search subscription or full-collection reads per search.

**Tech Stack:** React/MUI, Firebase callable and Firestore triggers, Admin Firestore/Storage SDKs, html-to-text, Jest/node:test, Playwright.

## Scope And Contracts

- Boards are independent: `news`, `encyclopedia`, `male_infertility`.
- Match normalized case-insensitive substrings in titles or visible body text, not HTML attributes, scripts, or image URLs. Preserve phrase search and Unicode normalization.
- Search is explicit via Enter or search icon. Typing does not filter cards or send requests. Clearing the search restores the existing browse page.
- Fixed 30-result pages, complete matching count from the catalog, newest-first ordering and deterministic ID tie-breaks. Empty, loading, retry, and opening states are visible.
- Public searches exclude drafts. Requests for drafts require a fresh Firestore administrator-role check. Public results are rechecked against current publication state before returning titles. Index/count changes are eventually consistent with document triggers; details use live Firestore reads.
- Catalogs are private Storage objects, inaccessible to client SDKs, with no download tokens. Callers never receive body text from the index.
- Existing articles are bootstrapped by an explicit administrative script. Missing catalogs fail with an actionable error, never silently return incomplete results or trigger a full scan for public requests.
- Bootstrap and updates use compare-and-swap generation checks. Concurrent/out-of-order triggers reread the current source document, and retry conflicts. No source article is modified and no publication notifications are triggered by indexing.
- Frontend ignores superseded requests and resets search on board/permission changes. Opening/closing article details preserves the search page. Admin search results retain the edit action.
- No app changes, production deployment, or production backfill in this implementation step.

## Tasks

- [x] Add failing backend tests for normalization, HTML extraction, full-catalog matching/pagination, draft protection, ignored view-count changes, missing-index handling, and concurrent catalog updates.
- [x] Implement `functions/articleSearch.js`, callable/trigger exports in `functions/index.js`, and `functions/scripts/buildArticleSearchIndex.js` (explicit project/board arguments).
- [x] Add failing frontend tests for submitted searches beyond the first 17 records, compact results, page changes, live detail reads, stale responses, errors, and preserving the browse page.
- [x] Implement `admin-web/src/services/articleSearchService.js` and `admin-web/src/components/ArticleSearch.jsx`; integrate into `NewsManager.jsx` and `EncyclopediaManager.jsx` without changing editor behavior.
- [x] Update superseded loaded-only-search tests; run complete web/backend tests and production build.
- [x] Verify real components with isolated backend fixtures at desktop/mobile widths, including result/detail/edit transitions. Inspect screenshots and check errors/overflow.
- [x] Document backend-first deployment and existing-article bootstrap commands. Leave production and unrelated working changes untouched.

## Verification Results

- Web: 95 tests / 21 suites passed; production build compiled successfully.
- Search backend: 9 node:test cases passed, including the reproduced same-document
  unpublish/republish race. Every relevant event now advances the catalog generation,
  including equal values, to fence older in-flight writes.
- Existing functions: 9 tests / 4 Jest suites passed.
- Function exports load without `FIREBASE_CONFIG`; bucket selection is deferred
  until invocation, not deployment discovery.
- Browser: 12 scenarios (3 boards x public/admin x 1440px/390px) passed with real
  React/MUI/editors and isolated Firebase fixtures. Checked submission, 30 compact
  rows, pagination, live detail/edit, browsing-page restoration, retry, empty state,
  console errors, row overlap, and horizontal overflow. Desktop/mobile screenshots
  inspected. Fixture and screenshots: `/tmp/gukitso-search-qa`.
- Production data, catalogs, functions, and web deployment remain unchanged.

## Verification Commands

- Backend: `node --test functions/__tests__/articleSearch.test.cjs`.
- Web: `CI=true ./node_modules/.bin/react-scripts test --watchAll=false --runInBand` from `admin-web`.
- Build: `npm run build` from `admin-web`.
- Repository: `git diff --check`; inspect scope before any future commit.

## Deployment Order (Separate Approval)

1. Deploy only the search callable and three search-index triggers.
2. Run the administrative bootstrap for all three boards with explicit `medicalqa-e5313` project ID. Verify indexed counts and a known older matching article.
3. Deploy the web frontend. Do not deploy a frontend whose callable/catalogs are missing.
