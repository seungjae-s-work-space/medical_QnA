# Move existing articles to male infertility

The news and encyclopedia administrator lists offer article checkboxes and a selected-article move action (maximum 100 articles). A single article can also be moved from its detail dialog. The confirmation dialog lists every selected title and its visibility. The optional JSON backup downloads the currently displayed source data before moving.

Only `news` / `encyclopedia` → `male_infertility` is supported, in both UI and transaction validation. Reverse moves and news/encyclopedia cross-moves are intentionally unavailable: their existing creation triggers can send publication push notifications. No Cloud Functions or security rules were changed for this operation.

`moveArticles` reads every original and destination in one Firestore transaction, verifies that all originals exist and all destination IDs are unused, then copies each complete stored document to the same ID and deletes its original. It does not alter content, timestamps, view counts, publication status, references, source URLs, image URLs, or other fields. One collision or commit failure aborts the entire batch. Images stay at their existing URLs.

The source UI removes committed articles, updates its count, and retains loaded older pages and the search text. Live first-page refills update the cursor when appropriate, and appended pages deduplicate IDs. Moving the last page of search results clamps the current page to the remaining results.

Validation:

- Existing baseline: 15 suites / 53 tests passed.
- Final web regression suite: 17 suites / 112 tests passed.
- Production web build: `npm run build`.
- New cases cover data/type preservation, atomic multi-article moves, collision/absence/commit failures, invalid directions and IDs, backup without writes, public-reader controls, loaded-page retention, cursor refills, and search-page clamping.

No production data changes or deployment were performed during implementation. Browser visual verification and a real administrator move remain operational checks for the parent task.
