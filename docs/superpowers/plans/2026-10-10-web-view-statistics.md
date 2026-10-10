# Web View Statistics Implementation Plan

> **For agentic workers:** Use executing-plans and test-driven-development to implement this plan task-by-task.

**Goal:** Add an administrator-only web statistics page for news, encyclopedia and male infertility, including guest views without changing Flutter code.

**Architecture:** An atomic callable records a web opening and increments the existing article count. Private daily rollups provide bounded reads for a 7/30-day dashboard. Admin previews are excluded. Public calls validate published articles, deduplicate request IDs and rate-limit by a short-lived hashed network identifier. Daily dates use Asia/Seoul; no historical daily counts are invented.

**Tech Stack:** Existing React/MUI, Firebase callable functions, Firestore transactions, Node/Jest tests.

## Contract

`recordWebArticleView({section, articleId, eventId, sentAt})` returns `{recorded, duplicate?}`. One retry uses the same payload. `getWebArticleStatistics({days: 7 | 30})` returns `{startedAt, generatedAt, days, daily, topArticles}`. Each daily row has date and per-section counts; each ranking row has articleId, section, title and views. Reads are authorized server-side and cached for 60 seconds only after authorization.

## Tasks

- [x] Backend: add `functions/webArticleStatistics.js` and `functions/__tests__/webArticleStatistics.test.cjs`; run `node --test functions/__tests__/webArticleStatistics.test.cjs` red then green. Cover guest/member/admin, publication, duplicate retry, midnight, abuse limit, admin authorization and aggregation. Register the two bounded callables in `functions/index.js`.
- [x] Security: restrict profile role creation/updates in `medical_qa_app/firestore.rules`; private statistics remain inaccessible through client Firestore. Configure TTL for event/rate-limit records and exempt rollup maps from indexing in `medical_qa_app/firestore.indexes.json`. Test real rules in an isolated emulator where available. No Flutter source changes.
- [x] Tracking: add `admin-web/src/services/webArticleStatisticsService.js`; replace direct increments in `NewsManager.jsx` and `EncyclopediaManager.jsx`. Add service tests and update count regression tests. Count only successful article opens, never admin previews or failed search detail loads; don't block content on telemetry failure.
- [x] Dashboard: add `admin-web/src/components/WebArticleStatistics.jsx`; add guarded `/statistics` route/noindex metadata and admin sidebar item. Add tests for period/category selection, unavailable history, error/retry and permissions. Render compact KPIs, daily bars, board totals and top-20 titles using existing MUI/theme.
- [x] Verification: run all web and functions tests, production build, desktop/mobile browser checks using isolated fixtures (no production writes), `git diff --check`; document rollout order, costs, retention and limitations. Do not deploy or commit until requested.

## Data And Rollout

Use 16 initial daily article-hash buckets capped at 256 entries each, with stable hash-prefix overflow documents. Read only rollups in the selected date range (normally up to 480 base documents for 30 days); reject a report exceeding 512 documents explicitly rather than returning partial statistics. Event markers expire after 2 days; accept client retry timestamps for 24 hours only. Rate-limit records expire after 2 days. Keep long-term daily aggregates. TTL must be enabled at deployment; no existing content is subject to these policies. Ignore untrusted forwarded prefixes and verify the managed proxy boundary during rollout.

Deploy rules/index configuration (including TTL), then the two callables, then web. Existing mobile increments remain unchanged and are excluded from web daily analytics. Existing article cumulative counts include both platforms and are not the dashboard's historical total. Public collection is approximate traffic analytics, not unique visitors, and not a hard billing cap or proof of a human visit. Consider App Check/edge protection if abuse is observed.

## Verification Results (2026-10-10)

- Web: 138 tests passed across 27 suites; production build passed.
- Server: 29 native tests (including three real Firestore emulator tests) and nine existing Jest tests passed.
- Browser: 1440px, 390px and 320px isolated fixture checks passed for layout, period/category controls, chart/table switching and error/retry. Real local public boards sent exactly one intercepted event per guest opening, kept counts hidden and redirected a guest from `/statistics`; no production analytics writes.
- Review follow-ups: ignore spoofable forwarded prefixes, default-safe profile role checks, capped maps with tested overflow, and explicitly reject oversized reports. Managed proxy behavior still needs verification during deployment; no production ingress probe was performed.
- `git diff --check` passed. Existing React Router future flags, Node punycode and old Browserslist data produce non-failing warnings.
- Branch `codex/web-view-statistics`, not committed or deployed. Existing unrelated mobile changes preserved.
