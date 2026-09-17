# Male Infertility Section

## Scope

- Web route: `/male-infertility`, visible in the sidebar and home shortcuts.
- Flutter: home shortcut, public list/detail, and admin content tab.
- Home: full-width news shortcut above the existing grid. The app retains four tiles: encyclopedia, about, male infertility, and video.
- Web mobile navigation uses a collapsible drawer so content keeps the available width.

## Data and Access

`male_infertility` is an independent Firestore collection using the existing encyclopedia document schema. The shared web editor and Flutter service receive a section configuration; reads, writes, view counts, and image paths stay in that section.

Public queries filter `isPublished == true` and order by `createdAt DESC`. App pages fetch 5 documents; web pages keep the existing encyclopedia page size of 17. Flutter administrator pages fetch 20 documents. Anonymous visitors see the existing free membership prompt and may continue reading. Authenticated members increment views by one; only administrators manage articles.

Storage folders: `male_infertility_images` and `male_infertility_thumbnails`. Reads are public, uploads require an existing administrator claim, allowed image types are JPEG, PNG, GIF, and WebP below 10 MB. Article references and source links reuse the existing fields. No existing content migration or sample production posts are required.

Firestore rules, Storage rules, and the published/date composite index were deployed to `medicalqa-e5313`. Existing remote-only indexes were preserved. This feature does not add publication push notifications.

## Verification

```sh
cd admin-web
CI=true npm exec -- react-scripts test --watchAll=false --runInBand
npm run build
```

```sh
cd medical_qa_app
flutter test --reporter expanded
flutter analyze
flutter build ios --simulator --debug
```

From the repository root, install test dependencies with `npm ci --prefix firebase-tests`, then run:

```sh
firebase emulators:exec --only firestore,storage --project demo-medical-qa --config firebase.test.json 'npm --prefix firebase-tests test'
```

The emulator suite checks guest/member/admin reads and writes, restricted view-count updates, image MIME/size limits, and existing encyclopedia access. Production data is not seeded by tests.

`html` is pinned to `0.15.6` because `flutter_html 3.0.0` imports a selector function removed in `html 0.15.7`.
