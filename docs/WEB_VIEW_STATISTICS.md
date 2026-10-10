# Web Article Statistics

## Scope

- Administrator navigation: `/statistics`, guarded by the existing authenticated role context. The report callable also rereads `users/{uid}.role` on every request, including cache hits.
- Web news, encyclopedia and male-infertility article detail openings, including guests. Admin previews are excluded in both UI and backend.
- Existing article `viewCount` is preserved and incremented in the same transaction as the daily web record. Existing mobile clients continue their current Firestore increments; no Flutter changes or mobile release is needed for this feature.
- The dashboard is **not** the existing cumulative counter: previous web and mobile totals cannot be separated or attributed to historical dates. Daily history begins with the first successfully recorded web opening.
- It counts openings, not unique people, sessions, reading duration or conversions. Reopening counts again; a network retry with the same event ID does not. Rate-limited, blocked, offline or failed requests can be missing. Robots can make public requests; these numbers are not fraud-proof analytics.
- Korea time (UTC+9) determines daily boundaries. Today and the first day are partial days. The daily average includes tracked calendar days, including those partial days. Last 7/30 days include today; other periods are not currently exposed.
- A ranking title is its last-seen title during the selected period. Deleted or unpublished articles remain in historical rankings, visible only to admins. Ranking rows intentionally are not public article links.

## Data And Cost

`functions/webArticleStatistics.js` owns all server logic; web calls are in `admin-web/src/services/webArticleStatisticsService.js`.

- `web_view_daily/YYYY-MM-DD_bucket`: 16 initial article-hash buckets per day, each capped at 256 article entries. A full bucket routes new articles to stable hash-prefix child documents; existing articles stay in their original document. Titles and IDs are length-bounded and maps are exempt from indexing, keeping each document below the 1 MiB limit. All buckets and children carry an indexed `date` for report queries.
- `web_view_meta/config`: first recorded timestamp. No global total document is rewritten on each view.
- `web_view_events/UUID`: deduplication marker, expiration after two days. Client timestamps are used only to bound retries to 24 hours, never for daily attribution.
- `web_view_limits/digest`: daily SHA-256 digest of the final managed-proxy address plus day; at most 60 new openings per minute and 2,000 per day for that network bucket. Express's `request.ip` and unverified forwarded prefixes are deliberately ignored. A direct Cloud Run/Functions endpoint is assumed; an added CDN or load balancer can group visitors under its address. Verify the appended-address boundary and rate-limit grouping with normal and forged-prefix requests during rollout and whenever ingress changes. Shared networks/proxies may reach the limit together. No raw address, user identity or visitor profile is saved in these collections. Digests are pseudonymous, not a claim of irreversible anonymization; platform request logging is separate.
- A successful guest opening normally reads five documents and writes four, plus a one-time metadata write. Each overflow level adds one read. A signed-in opening adds one role read. Transactions may retry; rejected and duplicate requests can still incur reads. Existing article update triggers still run, although search-index code ignores view-only changes.
- A normal 30-day report reads up to 480 existing base rollups plus any overflow documents. The query stops at 513 documents and explicitly rejects reports above 512, never presenting partial totals; select 7 days if necessary. At larger scale, add a reporting pipeline rather than raising limits blindly. Results are cached for 60 seconds; categories filter locally without extra reads. The report function uses one instance/concurrent request with 512 MiB, keeping large reads from multiplying memory pressure; recording uses three maximum instances with 20 concurrency and 256 MiB. There is no realtime statistics listener or all-article scan. Cold instances and separate clients still cause reads.
- TTL deletes also incur billing and are asynchronous. Aggregated history has no automatic expiration; only deduplication/rate-limit markers expire. No article, user, message, image or attachment is targeted.
- Callable instance/concurrency limits, rate limits and caching reduce costs; **they are not a spending cap or complete DoS prevention**. A distributed attacker can still invoke the public function. CORS is only a browser control. Consider App Check and edge/rate protections before traffic requires stronger abuse resistance. Budget alerts are still required.

## Deployment Order

Run from the repository root for project `medicalqa-e5313`, only after deployment is authorized:

1. Deploy the role-security rules and index/TTL configuration:
   `firebase deploy --only firestore:rules,firestore:indexes --project medicalqa-e5313`
2. Verify the `expiresAt` TTL policies for **only** `web_view_events` and `web_view_limits` are active. The root `firebase.json` points to `medical_qa_app/firestore.indexes.json`; that directory name does not mean the Flutter app is changed.
3. Deploy exactly the two callables:
   `firebase deploy --only functions:recordWebArticleView,functions:getWebArticleStatistics --project medicalqa-e5313`
4. Deploy the web build through the normal main/GitHub Pages workflow. Do not deploy web first: old direct counting is replaced, and a missing callable would drop web counts.
5. Verify guest and member openings, excluded administrator previews, admin-only access, TTL state and the managed forwarded-header boundary. Never trust a client-supplied leftmost address. These checks will add real views if performed against production; prefer a designated test article. No production ingress behavior was changed or probed during implementation.

If reverting the UI, deploy the prior web version and leave stored rollups intact. Direct mobile counting is unaffected. Do not remove the profile-role restriction to roll back the statistics UI.

## Verification

Web: `cd admin-web && CI=true npm test -- --watchAll=false --runInBand`, then `npm run build`.

Server: `node --test functions/__tests__/*.test.cjs`. Native tests skip the two emulator tests unless `FIRESTORE_EMULATOR_HOST` is explicitly set to a loopback host.

Existing server Jest suites: `node functions/node_modules/jest/bin/jest.js --config '{"rootDir":"functions","testEnvironment":"node","testMatch":["**/__tests__/*.test.js"]}' --runInBand`.

Emulator: use a Java 21+ runtime, `-Duser.language=en -Duser.country=US`, project **demo-web-statistics**, `--rules medical_qa_app/firestore.rules`, and an unused loopback port. Then run `FIRESTORE_EMULATOR_HOST=127.0.0.1:8095 node --test functions/__tests__/webStatisticsEmulator.test.cjs`. The test refuses non-loopback hosts. The emulator suite exercises real role restrictions, old mobile increments, guest rejection for direct Firestore writes, private data isolation, retry deduplication and concurrent transactions. Do not point it at production.
