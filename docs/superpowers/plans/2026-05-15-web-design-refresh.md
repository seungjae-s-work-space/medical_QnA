# Web Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the admin/public web UI so it matches the `home-dashboard.png` botanical sage/mint brand tone across the shell, homepage, content screens, user management, and chat surfaces.

**Architecture:** Keep the existing React/MUI structure, routes, Firebase reads, auth behavior, pagination, and permissions unchanged. Centralize the new palette in `admin-web/src/theme.js`, add reusable surface style helpers in `admin-web/src/utils/webDesignStyles.js`, then apply those helpers to repeated page shells, stats blocks, cards, empty states, pagination, dialogs, and chat surfaces.

**Tech Stack:** React 18, Material UI 5, Firebase Web SDK, CRA/react-scripts, Jest file-structure guard tests.

---

## File Map

- Modify: `admin-web/src/theme.js`
  - Owns the new botanical palette and MUI component defaults.
- Create: `admin-web/src/utils/webDesignStyles.js`
  - Provides reusable `sx` helper functions for page shells, headers, stats cards, content cards, empty states, pagination, dialogs, and search fields.
- Modify: `admin-web/src/components/Layout.jsx`
  - Applies the refreshed sidebar, active nav, logo badge, login/logout treatment, and global page background.
- Modify: `admin-web/src/components/HomeDashboard.jsx`
  - Frames the dashboard image in a more intentional branded homepage layout.
- Modify: `admin-web/src/components/NewsManager.jsx`
- Modify: `admin-web/src/components/EncyclopediaManager.jsx`
- Modify: `admin-web/src/components/NoticeManager.jsx`
- Modify: `admin-web/src/components/VideoManager.jsx`
  - Applies the new shared surface styles while preserving all query and CRUD logic.
- Modify: `admin-web/src/components/ConversationList.jsx`
- Modify: `admin-web/src/components/UserManagement.jsx`
  - Refreshes dense admin list/table pages without reducing scan efficiency.
- Modify: `admin-web/src/components/UserChatWindow.jsx`
- Modify: `admin-web/src/components/ChatWindow.jsx`
  - Aligns chat headers, message bubbles, input surfaces, and empty states with the new palette.
- Create: `admin-web/src/__tests__/webDesignRefresh.test.js`
  - Guards the visual refresh against reverting to the old indigo/blue generic SaaS palette.
- Modify: `admin-web/src/__tests__/homeRouting.test.js`
  - Keeps the homepage image and `/chat` route behavior protected.

---

### Task 1: Add Design Refresh Guard Test

**Files:**
- Create: `admin-web/src/__tests__/webDesignRefresh.test.js`
- Modify: `admin-web/src/__tests__/homeRouting.test.js`

- [ ] **Step 1: Write the failing guard test**

Create `admin-web/src/__tests__/webDesignRefresh.test.js`:

```js
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('web design refresh', () => {
  test('theme uses the botanical brand palette instead of the old indigo palette', () => {
    const theme = read('theme.js');

    expect(theme).toMatch(/botanical/i);
    expect(theme).toMatch(/#70B789/i);
    expect(theme).toMatch(/#0B6B47/i);
    expect(theme).toMatch(/#F6FBF7/i);
    expect(theme).toMatch(/#D4A853/i);
    expect(theme).not.toMatch(/#6366F1/i);
    expect(theme).not.toMatch(/#4F46E5/i);
  });

  test('shared web design styles are used by refreshed repeated surfaces', () => {
    const styles = read('utils/webDesignStyles.js');
    const news = read('components/NewsManager.jsx');
    const encyclopedia = read('components/EncyclopediaManager.jsx');
    const notice = read('components/NoticeManager.jsx');
    const video = read('components/VideoManager.jsx');
    const conversations = read('components/ConversationList.jsx');
    const users = read('components/UserManagement.jsx');

    expect(styles).toMatch(/pageShellSx/);
    expect(styles).toMatch(/contentCardSx/);
    expect(styles).toMatch(/statCardSx/);
    expect(styles).toMatch(/emptyStateSx/);
    expect(news).toMatch(/pageShellSx/);
    expect(encyclopedia).toMatch(/pageShellSx/);
    expect(notice).toMatch(/pageShellSx/);
    expect(video).toMatch(/pageShellSx/);
    expect(conversations).toMatch(/pageShellSx/);
    expect(users).toMatch(/pageShellSx/);
  });

  test('layout and home dashboard use branded shell treatments', () => {
    const layout = read('components/Layout.jsx');
    const home = read('components/HomeDashboard.jsx');

    expect(layout).toMatch(/brandMarkSx/);
    expect(layout).toMatch(/navItemSx/);
    expect(home).toMatch(/home-dashboard\.png/);
    expect(home).toMatch(/linear-gradient/);
    expect(home).toMatch(/난임상담톡톡/);
  });
});
```

Update `admin-web/src/__tests__/homeRouting.test.js` to also assert the static dashboard image remains available:

```js
expect(fs.existsSync(path.join(srcDir, '..', 'public', 'home-dashboard.png'))).toBe(true);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js src/__tests__/homeRouting.test.js --watchAll=false
```

Expected: `webDesignRefresh.test.js` fails because `webDesignStyles.js` does not exist and the old indigo palette is still present in `theme.js`.

- [ ] **Step 3: Commit only the failing test**

Run:

```bash
git add admin-web/src/__tests__/webDesignRefresh.test.js admin-web/src/__tests__/homeRouting.test.js
git commit -m "test: add web design refresh guard"
```

---

### Task 2: Refresh Global Theme Palette

**Files:**
- Modify: `admin-web/src/theme.js`

- [ ] **Step 1: Replace the color tokens**

In `admin-web/src/theme.js`, replace the current `colors` object with:

```js
// Botanical wellness design - sage/mint/ivory tone from home-dashboard.png
const colors = {
  background: '#F6FBF7',
  backgroundAlt: '#EAF6EF',
  backgroundWarm: '#FFF9EA',
  sidebar: '#FBFEFA',
  card: '#FFFFFF',
  cardTint: '#F8FCF9',

  textPrimary: '#1F332B',
  textSecondary: '#5E756B',
  textTertiary: '#91A69B',

  primary: '#70B789',
  primaryLight: '#E5F5EA',
  primaryDark: '#0B6B47',
  primarySoft: '#F0FAF3',

  secondary: '#D4A853',
  secondaryLight: '#FFF1BD',
  aqua: '#DDF4F2',
  aquaDark: '#5B9A96',

  success: '#6FA87B',
  successLight: '#E4F4E8',
  warning: '#D4A853',
  warningLight: '#FFF4CF',
  error: '#D97171',
  errorLight: '#FBE7E7',

  divider: '#DDEBE2',
  border: '#D7E8DF',
  inputBorder: '#C9E0D4',
  inputBackground: '#FCFFFD',

  userMessage: '#E6F4EB',
  adminMessage: '#FFF7E1',
};
```

- [ ] **Step 2: Update component defaults**

In the same file:

```js
contained: {
  boxShadow: '0 10px 22px rgba(112, 183, 137, 0.22)',
  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
  '&:hover': {
    boxShadow: '0 12px 26px rgba(112, 183, 137, 0.3)',
  },
},
outlined: {
  borderColor: colors.border,
  color: colors.primaryDark,
  backgroundColor: 'rgba(255,255,255,0.62)',
  '&:hover': {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
},
```

Update card and paper shadows:

```js
boxShadow: '0 16px 40px rgba(31, 51, 43, 0.07)',
border: `1px solid ${colors.border}`,
```

Update `MuiCssBaseline` body:

```js
backgroundColor: colors.background,
backgroundImage: `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
```

- [ ] **Step 3: Run the guard test**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js --watchAll=false
```

Expected: The palette assertion passes, but the shared style helper assertions still fail until Task 3.

- [ ] **Step 4: Commit**

Run:

```bash
git add admin-web/src/theme.js
git commit -m "style: refresh web theme palette"
```

---

### Task 3: Add Shared Design Style Helpers

**Files:**
- Create: `admin-web/src/utils/webDesignStyles.js`

- [ ] **Step 1: Add the helper file**

Create `admin-web/src/utils/webDesignStyles.js`:

```js
export const pageShellSx = {
  p: { xs: 2.5, md: 4 },
  maxWidth: 1240,
  mx: 'auto',
};

export const widePageShellSx = {
  ...pageShellSx,
  maxWidth: 1400,
};

export const pageHeaderSx = {
  mb: 4,
  p: { xs: 2.5, md: 3 },
  borderRadius: 3,
  border: '1px solid rgba(215, 232, 223, 0.82)',
  background:
    'linear-gradient(135deg, rgba(255,255,255,0.86) 0%, rgba(229,245,234,0.78) 52%, rgba(255,247,225,0.72) 100%)',
  boxShadow: '0 18px 44px rgba(31, 51, 43, 0.07)',
};

export function statCardSx(colors, active = false, tone = 'primary') {
  const toneColor = tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : colors.primary;
  const softColor = tone === 'warning' ? colors.warningLight : tone === 'error' ? colors.errorLight : colors.primaryLight;

  return {
    flex: 1,
    p: 3,
    bgcolor: active ? toneColor : colors.card,
    color: active ? 'white' : colors.textPrimary,
    borderRadius: 3,
    border: `1px solid ${active ? toneColor : colors.border}`,
    boxShadow: active
      ? '0 16px 34px rgba(31, 51, 43, 0.16)'
      : '0 12px 30px rgba(31, 51, 43, 0.06)',
    background: active
      ? `linear-gradient(135deg, ${toneColor}, ${colors.primaryDark})`
      : `linear-gradient(180deg, ${colors.card}, ${softColor})`,
  };
}

export function contentCardSx(colors) {
  return {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
    bgcolor: colors.card,
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    boxShadow: '0 14px 36px rgba(31, 51, 43, 0.07)',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 18px 44px rgba(31, 51, 43, 0.12)',
      borderColor: colors.primary,
    },
  };
}

export function emptyStateSx(colors) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 10,
    bgcolor: 'rgba(255,255,255,0.78)',
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 14px 36px rgba(31, 51, 43, 0.06)',
  };
}

export function searchFieldSx() {
  return {
    mb: 3,
    '& .MuiOutlinedInput-root': {
      boxShadow: '0 10px 26px rgba(31, 51, 43, 0.05)',
    },
  };
}

export function paginationButtonSx(colors, active = false) {
  return {
    minWidth: 40,
    height: 40,
    borderRadius: 2,
    fontWeight: 700,
    ...(active
      ? {}
      : {
          color: colors.textSecondary,
          '&:hover': { bgcolor: colors.primaryLight, color: colors.primaryDark },
        }),
  };
}

export function dialogPaperSx(colors) {
  return {
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
    background: colors.card,
  };
}
```

- [ ] **Step 2: Run the guard test**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js --watchAll=false
```

Expected: Shared helper file assertions pass; component usage assertions still fail until Tasks 5 and 6.

- [ ] **Step 3: Commit**

Run:

```bash
git add admin-web/src/utils/webDesignStyles.js
git commit -m "style: add web design surface helpers"
```

---

### Task 4: Refresh Layout and Home Dashboard

**Files:**
- Modify: `admin-web/src/components/Layout.jsx`
- Modify: `admin-web/src/components/HomeDashboard.jsx`

- [ ] **Step 1: Import and use shell style names in `Layout.jsx`**

Add local helper functions near `DRAWER_WIDTH`:

```js
const brandMarkSx = {
  width: 46,
  height: 46,
  bgcolor: colors.primaryDark,
  color: 'white',
  fontSize: 18,
  fontWeight: 800,
  boxShadow: '0 12px 26px rgba(11, 107, 71, 0.24)',
};

const navItemSx = (isActive) => ({
  borderRadius: 3,
  py: 1.45,
  px: 2,
  bgcolor: isActive ? colors.primaryLight : 'transparent',
  border: `1px solid ${isActive ? colors.border : 'transparent'}`,
  '&:hover': {
    bgcolor: isActive ? colors.primaryLight : 'rgba(229, 245, 234, 0.72)',
  },
});
```

Use `brandMarkSx` on the `<Avatar>` and `navItemSx(isActive)` on each `ListItemButton`.

Update the drawer paper:

```js
bgcolor: colors.sidebar,
borderRight: `1px solid ${colors.border}`,
boxShadow: '12px 0 36px rgba(31, 51, 43, 0.06)',
background:
  'linear-gradient(180deg, rgba(251,254,250,0.98) 0%, rgba(239,249,243,0.92) 100%)',
```

Update the main wrapper:

```js
<Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.background }}>
```

to:

```js
<Box
  sx={{
    display: 'flex',
    minHeight: '100vh',
    bgcolor: colors.background,
    background:
      `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 46%, ${colors.backgroundWarm} 100%)`,
  }}
>
```

- [ ] **Step 2: Enhance `HomeDashboard.jsx`**

Replace the component body with:

```jsx
return (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: { xs: 2, md: 5 },
      py: { xs: 3, md: 5 },
      background:
        `linear-gradient(135deg, ${colors.background} 0%, ${colors.aqua} 45%, ${colors.backgroundWarm} 100%)`,
    }}
  >
    <Box
      sx={{
        width: '100%',
        maxWidth: 980,
        borderRadius: { xs: 3, md: 5 },
        p: { xs: 1.25, md: 2 },
        bgcolor: 'rgba(255,255,255,0.76)',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 24px 70px rgba(31, 51, 43, 0.13)',
      }}
    >
      <Box
        component="img"
        src="/home-dashboard.png"
        alt="난임상담톡톡"
        sx={{
          display: 'block',
          width: '100%',
          maxHeight: 'calc(100vh - 112px)',
          objectFit: 'contain',
          borderRadius: { xs: 2, md: 4 },
        }}
      />
    </Box>
  </Box>
);
```

- [ ] **Step 3: Run routing and design guard tests**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/homeRouting.test.js src/__tests__/webDesignRefresh.test.js --watchAll=false
```

Expected: Layout/home assertions pass; repeated screen usage assertions remain until Tasks 5 and 6.

- [ ] **Step 4: Commit**

Run:

```bash
git add admin-web/src/components/Layout.jsx admin-web/src/components/HomeDashboard.jsx
git commit -m "style: refresh web shell and home"
```

---

### Task 5: Refresh Content Manager Surfaces

**Files:**
- Modify: `admin-web/src/components/NewsManager.jsx`
- Modify: `admin-web/src/components/EncyclopediaManager.jsx`
- Modify: `admin-web/src/components/NoticeManager.jsx`
- Modify: `admin-web/src/components/VideoManager.jsx`

- [ ] **Step 1: Import shared helpers in all four files**

Add imports:

```js
import {
  contentCardSx,
  dialogPaperSx,
  emptyStateSx,
  pageHeaderSx,
  pageShellSx,
  paginationButtonSx,
  searchFieldSx,
  statCardSx,
  widePageShellSx,
} from '../utils/webDesignStyles';
```

Use `widePageShellSx` only in `EncyclopediaManager.jsx`; use `pageShellSx` in the other three managers.

- [ ] **Step 2: Replace page shells**

Replace:

```jsx
<Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
```

with:

```jsx
<Box sx={pageShellSx}>
```

In `EncyclopediaManager.jsx`, replace:

```jsx
<Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
```

with:

```jsx
<Box sx={widePageShellSx}>
```

In `NoticeManager.jsx`, replace:

```jsx
<Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
```

with:

```jsx
<Box sx={pageShellSx}>
```

- [ ] **Step 3: Replace headers**

Wrap each page header content in:

```jsx
<Box sx={pageHeaderSx}>
  ...
</Box>
```

Keep the existing title, subtitle, and create button logic.

- [ ] **Step 4: Replace stat cards**

For each stats card in the four files, replace repeated `bgcolor`, `borderRadius`, and `border` blocks with:

```jsx
sx={statCardSx(colors)}
```

For success cards:

```jsx
sx={statCardSx(colors, false, 'primary')}
```

For draft/warning cards:

```jsx
sx={statCardSx(colors, false, 'warning')}
```

- [ ] **Step 5: Replace content card surfaces**

For grid cards in News, Encyclopedia, and Video, replace the root `Card` `sx` object with:

```jsx
sx={{
  ...protectedContentSx,
  ...contentCardSx(colors),
}}
```

For Notice list panels, replace the list container `Box` surface with:

```jsx
sx={{
  ...emptyStateSx(colors),
  alignItems: 'stretch',
  py: 0,
}}
```

- [ ] **Step 6: Replace empty states, search, pagination, and dialogs**

Search fields:

```jsx
sx={searchFieldSx()}
```

Empty states:

```jsx
sx={emptyStateSx(colors)}
```

Page number buttons:

```jsx
sx={paginationButtonSx(colors, currentPage === i)}
```

Dialog `PaperProps`:

```jsx
PaperProps={{ sx: dialogPaperSx(colors) }}
```

- [ ] **Step 7: Run design and cost guard tests**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js src/__tests__/costGuardrails.test.js --watchAll=false
```

Expected: Tests pass, confirming design helpers are used and pagination/cost guardrails remain intact.

- [ ] **Step 8: Commit**

Run:

```bash
git add admin-web/src/components/NewsManager.jsx admin-web/src/components/EncyclopediaManager.jsx admin-web/src/components/NoticeManager.jsx admin-web/src/components/VideoManager.jsx
git commit -m "style: refresh content manager surfaces"
```

---

### Task 6: Refresh Admin Lists and Chat Surfaces

**Files:**
- Modify: `admin-web/src/components/ConversationList.jsx`
- Modify: `admin-web/src/components/UserManagement.jsx`
- Modify: `admin-web/src/components/UserChatWindow.jsx`
- Modify: `admin-web/src/components/ChatWindow.jsx`

- [ ] **Step 1: Import shared helpers**

In `ConversationList.jsx` and `UserManagement.jsx`, add:

```js
import {
  emptyStateSx,
  pageHeaderSx,
  pageShellSx,
  paginationButtonSx,
  searchFieldSx,
  statCardSx,
} from '../utils/webDesignStyles';
```

- [ ] **Step 2: Refresh `ConversationList.jsx`**

Replace the root shell with:

```jsx
<Box sx={pageShellSx}>
```

Wrap the title/subtitle header in:

```jsx
<Box sx={pageHeaderSx}>
```

For filter cards:

```jsx
sx={statCardSx(colors, filterMode === 'all')}
sx={statCardSx(colors, filterMode === 'unread', 'error')}
sx={statCardSx(colors, filterMode === 'new', 'warning')}
```

For the search field:

```jsx
sx={{ ...searchFieldSx(), flex: 1 }}
```

For empty state:

```jsx
sx={emptyStateSx(colors)}
```

For pagination icon buttons, keep the existing click/disabled logic and update hover colors to `colors.primaryLight`.

- [ ] **Step 3: Refresh `UserManagement.jsx`**

Replace root shell:

```jsx
<Box sx={pageShellSx}>
```

Wrap header:

```jsx
<Box sx={pageHeaderSx}>
```

Stats cards:

```jsx
<Card sx={statCardSx(colors)}>
```

Main paper:

```jsx
<Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.82)' }}>
```

Page number buttons:

```jsx
sx={paginationButtonSx(colors, currentPageIndex === index)}
```

- [ ] **Step 4: Refresh chat windows**

In both chat files, keep message fetching and upload logic untouched.

Change header surfaces from `colors.inputBackground` to:

```js
bgcolor: 'rgba(255,255,255,0.82)',
borderBottom: `1px solid ${colors.border}`,
```

Change input area surfaces from `colors.backgroundAlt`/`colors.inputBackground` to:

```js
bgcolor: colors.cardTint,
borderTop: `1px solid ${colors.border}`,
```

Use the new message colors from `theme.js`:

```js
bgcolor: isUser ? colors.userMessage : colors.adminMessage
```

or in admin view:

```js
bgcolor: isAdmin ? colors.adminMessage : colors.userMessage
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath src/__tests__/webDesignRefresh.test.js src/__tests__/costGuardrails.test.js src/__tests__/subscriptionRemoval.test.js --watchAll=false
```

Expected: All selected tests pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add admin-web/src/components/ConversationList.jsx admin-web/src/components/UserManagement.jsx admin-web/src/components/UserChatWindow.jsx admin-web/src/components/ChatWindow.jsx
git commit -m "style: refresh admin and chat surfaces"
```

---

### Task 7: Build and Browser Verification

**Files:**
- No source edits expected unless verification finds visual breakage.

- [ ] **Step 1: Run the full targeted web test set**

Run:

```bash
cd admin-web
CI=true npx react-scripts test --runTestsByPath \
  src/__tests__/webDesignRefresh.test.js \
  src/__tests__/homeRouting.test.js \
  src/__tests__/membershipPromptBehavior.test.js \
  src/__tests__/subscriptionRemoval.test.js \
  src/__tests__/costGuardrails.test.js \
  --watchAll=false
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
cd admin-web
npm run build
```

Expected: `Compiled successfully.`

- [ ] **Step 3: Start local web server**

Run:

```bash
cd admin-web
npm run start
```

Expected: CRA starts at a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Browser check key routes**

Open:

- `/`
- `/chat`
- `/encyclopedia`
- `/news`
- `/notice`
- `/video`
- `/users` when logged in as admin

Verify:

- No blank screen.
- Sidebar remains visible and active item is legible.
- Homepage image is framed and not cropped awkwardly.
- Content cards have the new sage/mint look.
- Admin lists remain readable.
- Buttons and pagination do not overflow.
- Chat input and message bubbles remain readable.

- [ ] **Step 5: Fix any visual regressions**

If a route has overflow or unreadable contrast, make the smallest scoped correction in the affected component or in `webDesignStyles.js`, then rerun:

```bash
cd admin-web
npm run build
```

- [ ] **Step 6: Final commit if verification fixes were needed**

If Step 5 changed files:

```bash
git add admin-web/src
git commit -m "style: polish web design refresh"
```

---

## Self-Review

- Spec coverage: The plan covers theme, shell, home, content screens, admin lists, chat surfaces, tests, build, and browser QA.
- Incomplete-marker scan: No unfinished-marker or fill-in steps are used.
- Type consistency: Helper names are consistently `pageShellSx`, `widePageShellSx`, `pageHeaderSx`, `statCardSx`, `contentCardSx`, `emptyStateSx`, `searchFieldSx`, `paginationButtonSx`, and `dialogPaperSx`.
- Scope check: The plan avoids Firebase, auth, pagination, and Flutter changes, matching the non-goals.
