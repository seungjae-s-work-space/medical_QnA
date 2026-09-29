# Web Home Support Implementation Plan

**Goal:** Add voluntary support information to the web home only, preserving the supplied message and bank details.

**Architecture:** A self-contained `HomeSupportSection` below the existing home links. A short introduction and selectable account details remain visible; an accessible MUI dialog contains the complete supplied message. No login, payment integration, tracking, Firebase reads/writes, app changes, new routes, or automatic deployment.

**Tech Stack:** Existing React, MUI, theme tokens, Clipboard API, Jest, Playwright.

## Design

- Unframed section with a top divider, existing sage/white colors, system typography, and zero letter spacing.
- Desktop uses introduction/account columns; mobile stacks them. Account details form a restrained functional panel, not another promotional tile.
- Preserve all supplied paragraphs in the dialog. Show the free-access statement next to the account on the home page as well.
- Bank: 신한은행. Display account: 100-034-168251. Holder: 아기성공연구소.
- Copy only the account digits (`100034168251`) through an explicitly labeled icon button. Announce success only after resolution; denied/unavailable clipboard provides selectable text and failure feedback. Never initiate a transfer.
- Full text dialog supports scrolling, keyboard dismissal, close button, and focus restoration. No repeated popup or automatic opening.
- Existing home navigation and membership dialog remain unchanged.

## Tasks

- [x] Add failing rendered-home tests for visibility without auth, exact bank details, full supplied message, copy success/failure/unavailable API, and existing membership dialog behavior.
- [x] Implement `admin-web/src/components/HomeSupportSection.jsx` and insert it once in `HomeDashboard.jsx` after the existing update links.
- [x] Run targeted/full Jest tests and production build.
- [x] Inspect real home and dialog at desktop/mobile widths, verify clipboard content, keyboard/focus, layout and no runtime errors. Keep existing development server available.

## Verification

```sh
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false --runInBand --runTestsByPath src/__tests__/homeSupport.test.jsx
CI=true ./node_modules/.bin/react-scripts test --watchAll=false --runInBand
npm run build
```

Jest tests mock the existing promotion carousel. Browser checks use the actual local home page and block Firestore writes; existing read-only data loading remains enabled. The support component itself has no network dependency.

## Results

- Confirmed failing tests before implementation; all six focused tests now pass.
- Full web suite: 101 tests in 22 suites pass. Production build succeeds. Existing Browserslist data-age warning remains unchanged.
- Playwright at 1440px, 390px, and 320px: exact clipboard digits, failure feedback, full message, close button, Escape, focus restoration, and no horizontal overflow, page errors, or Firestore writes.
- Browser testing exposed native disabled buttons dropping focus during an asynchronous copy. The copy button now retains focus with `aria-disabled` and a duplicate-click guard, with regression coverage.
- Reviewed home and dialog screenshots at desktop/mobile widths. Existing membership modal remains functional.
- App/Firebase files were not changed by this task. Existing unrelated workspace changes are preserved. No commit, push, or deployment performed.
