# Home Tab Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the web `/` home tab from a poster-only screen into the selected B service-hub layout.

**Architecture:** Keep all behavior inside `HomeDashboard.jsx`. The component remains static and navigation-only, using `useNavigate` for existing routes and no Firebase reads. Tests protect the hub markers and route strings.

**Tech Stack:** React, React Router, MUI components/icons, existing `colors` theme, CRA/Jest string guard tests.

---

## File Structure

- Modify: `admin-web/src/__tests__/homeRouting.test.js`
  - Adds guard assertions for the B service hub markers and route strings.
- Modify: `admin-web/src/components/HomeDashboard.jsx`
  - Implements hero, poster preview, quick cards, and update strip.

---

### Task 1: Add Failing Home Hub Guard

**Files:**
- Modify: `admin-web/src/__tests__/homeRouting.test.js`

- [ ] **Step 1: Write the failing test assertions**

Add these assertions inside the existing root route test after the `home-dashboard.png` assertion:

```js
expect(homeDashboard).toMatch(/useNavigate/);
expect(homeDashboard).toMatch(/상담하기/);
expect(homeDashboard).toMatch(/난임백과/);
expect(homeDashboard).toMatch(/뉴스/);
expect(homeDashboard).toMatch(/공지사항/);
expect(homeDashboard).toMatch(/아기성공TV/);
expect(homeDashboard).toMatch(/회원제\\(무료\\)/);
expect(homeDashboard).toMatch(/navigate\\('\\/chat'\\)/);
expect(homeDashboard).toMatch(/navigate\\('\\/encyclopedia'\\)/);
expect(homeDashboard).toMatch(/navigate\\('\\/news'\\)/);
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/homeRouting.test.js --watchAll=false
```

Expected: FAIL because `HomeDashboard.jsx` does not yet include `useNavigate`, hub markers, or route navigation strings.

- [ ] **Step 3: Commit test**

```bash
git add admin-web/src/__tests__/homeRouting.test.js
git commit -m "test: guard home service hub"
```

---

### Task 2: Implement Service Hub Home

**Files:**
- Modify: `admin-web/src/components/HomeDashboard.jsx`

- [ ] **Step 1: Replace the poster-only component**

Implement `HomeDashboard.jsx` as a static service hub:

```jsx
import { Box, Button, Typography } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
```

The component should define static `quickLinks` and `updates` arrays and render:

- Hero card with `난임상담톡톡`, supporting text, CTA button navigating to `/chat`, and compact `home-dashboard.png`.
- Six quick-entry cards with labels `상담하기`, `난임백과`, `뉴스`, `공지사항`, `아기성공TV`, `회원제(무료)`.
- Static update strip linking to `/news` and `/encyclopedia`.

- [ ] **Step 2: Run focused GREEN tests**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/homeRouting.test.js src/__tests__/webDesignRefresh.test.js --watchAll=false
```

Expected: PASS.

- [ ] **Step 3: Run full targeted web tests**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js src/__tests__/homeRouting.test.js src/__tests__/membershipPromptBehavior.test.js src/__tests__/subscriptionRemoval.test.js src/__tests__/costGuardrails.test.js --watchAll=false
```

Expected: PASS.

- [ ] **Step 4: Build**

Run:

```bash
cd admin-web
npm run build
```

Expected: `Compiled successfully.`

- [ ] **Step 5: Browser smoke**

Start `admin-web` locally and open `/`.

Expected:

- Hero, poster preview, quick cards, and update strip render.
- No console errors.
- No Firebase reads were added to `HomeDashboard.jsx`.

- [ ] **Step 6: Commit implementation**

```bash
git add admin-web/src/components/HomeDashboard.jsx
git commit -m "feat: polish web home tab"
```

---

## Self-Review

- Spec coverage: The plan covers hub layout, route navigation, static update strip, no Firebase reads, tests, build, and browser smoke.
- Placeholder scan: No TBD/TODO/fill-in placeholders remain.
- Type consistency: Route strings and marker strings match the design spec and existing React Router routes.
