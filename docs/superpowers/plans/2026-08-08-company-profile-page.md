# Company Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/company` page that external people can open on mobile like a polished company introduction card.

**Architecture:** Add one static React component outside the authenticated admin layout, wire it into React Router, and update SEO metadata. The page reads no Firebase data, so it adds no Firestore or Storage cost.

**Tech Stack:** React 18, React Router, Material UI, Jest file-structure tests, existing `admin-web/src/theme.js` color tokens.

---

## File Structure

- Create: `admin-web/src/components/CompanyProfile.jsx`
  - Owns the public company profile UI, copy-link behavior, and internal navigation CTAs.
- Create: `admin-web/src/__tests__/companyProfilePage.test.js`
  - Verifies the route, metadata, component copy, layout isolation, and zero Firebase import.
- Modify: `admin-web/src/App.jsx`
  - Imports `CompanyProfile`, adds `/company` route, and adds indexable metadata.

---

### Task 1: Add Failing Route And Component Tests

**Files:**
- Create: `admin-web/src/__tests__/companyProfilePage.test.js`

- [ ] **Step 1: Write the failing test**

Create `admin-web/src/__tests__/companyProfilePage.test.js`:

```javascript
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('company profile page', () => {
  test('company page is a public indexable route outside the admin layout', () => {
    const app = read('App.jsx');

    expect(app).toMatch(/import CompanyProfile/);
    expect(app).toMatch(/path="\\/company"/);
    expect(app).toMatch(/<CompanyProfile \\/>/);
    expect(app).toMatch(/'\\/company': \\{/);
    expect(app).toMatch(/난임상담톡톡 회사소개/);
    expect(app).toMatch(/shouldIndex: true/);
    expect(app).not.toMatch(/path="\\/company"[\\s\\S]*?<Layout>[\\s\\S]*?<CompanyProfile \\/>[\\s\\S]*?<\\/Layout>/);
  });

  test('company profile component contains share-card copy and no Firebase reads', () => {
    const companyProfile = read('components/CompanyProfile.jsx');

    expect(companyProfile).toMatch(/난임상담톡톡/);
    expect(companyProfile).toMatch(/난임 정보·상담 플랫폼/);
    expect(companyProfile).toMatch(/무료 회원제 난임 정보·상담 서비스/);
    expect(companyProfile).toMatch(/근거 중심 정보/);
    expect(companyProfile).toMatch(/전문가 상담 흐름/);
    expect(companyProfile).toMatch(/구독\\/인앱결제 없이 운영/);
    expect(companyProfile).toMatch(/agisungong\\.net\\/company/);
    expect(companyProfile).toMatch(/navigator\\.clipboard\\.writeText/);
    expect(companyProfile).toMatch(/navigate\\('\\/'\\)/);
    expect(companyProfile).toMatch(/navigate\\('\\/chat'\\)/);
    expect(companyProfile).not.toMatch(/from ['"]\\.\\.\\/firebase['"]/);
    expect(companyProfile).not.toMatch(/collection\\(/);
    expect(companyProfile).not.toMatch(/getDocs\\(/);
    expect(companyProfile).not.toMatch(/onSnapshot\\(/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd admin-web
npm test -- --watchAll=false companyProfilePage.test.js
```

Expected: FAIL because `CompanyProfile.jsx` does not exist and `/company` is not routed yet.

---

### Task 2: Implement The Static Company Profile Component

**Files:**
- Create: `admin-web/src/components/CompanyProfile.jsx`

- [ ] **Step 1: Add the component**

Create `admin-web/src/components/CompanyProfile.jsx`:

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import MedicalInformationRoundedIcon from '@mui/icons-material/MedicalInformationRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { colors } from '../theme';

const COMPANY_URL = 'https://agisungong.net/company';

const trustItems = [
  {
    title: '근거 중심 정보',
    body: '난임백과와 뉴스로 임신 준비와 치료 흐름을 차분하게 정리합니다.',
    icon: <AutoStoriesRoundedIcon />,
  },
  {
    title: '전문가 상담 흐름',
    body: '로그인 후 상담 채팅으로 개인 상황을 이어서 확인할 수 있습니다.',
    icon: <ChatBubbleOutlineRoundedIcon />,
  },
  {
    title: '무료 회원제',
    body: '구독/인앱결제 없이 운영하며 필요한 정보 접근성을 우선합니다.',
    icon: <VolunteerActivismRoundedIcon />,
  },
];

const serviceLinks = [
  { label: '난임백과', path: '/encyclopedia', icon: <AutoStoriesRoundedIcon /> },
  { label: '뉴스', path: '/news', icon: <NewspaperRoundedIcon /> },
  { label: '아기성공TV', path: '/video', icon: <YouTubeIcon /> },
  { label: '공지사항', path: '/notice', icon: <MedicalInformationRoundedIcon /> },
];

function CompanyProfile() {
  const navigate = useNavigate();
  const [copyMessage, setCopyMessage] = useState('');

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('링크 복사를 지원하지 않는 브라우저입니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(COMPANY_URL);
      setCopyMessage('소개 링크를 복사했습니다.');
    } catch (error) {
      setCopyMessage('링크를 복사하지 못했습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 5 },
        bgcolor: colors.background,
        background: `linear-gradient(145deg, ${colors.background} 0%, ${colors.aqua} 48%, ${colors.backgroundWarm} 100%)`,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
        <Box
          component="section"
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.82)',
            boxShadow: '0 26px 72px rgba(31, 51, 43, 0.13)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Chip
              label="난임 정보·상담 플랫폼"
              sx={{
                mb: 2,
                bgcolor: colors.primaryLight,
                color: colors.primaryDark,
                fontWeight: 800,
              }}
            />
            <Typography
              component="h1"
              sx={{
                color: colors.textPrimary,
                fontSize: { xs: 34, sm: 46 },
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: 0,
                mb: 1.5,
              }}
            >
              난임상담톡톡
            </Typography>
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: { xs: 16, sm: 18 },
                lineHeight: 1.75,
                mb: 3,
              }}
            >
              난임 전문 기자와 골통주부가 함께 만든, 무료 회원제 난임 정보·상담 서비스입니다.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate('/')}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                서비스 보기
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/chat')}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                상담 시작하기
              </Button>
            </Box>
          </Box>
          <Divider sx={{ borderColor: colors.border }} />
          <Box sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gap: 1.25 }}>
            {trustItems.map((item) => (
              <Box
                key={item.title}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 1.75,
                  borderRadius: 3,
                  bgcolor: colors.cardTint,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Box sx={{ color: colors.primaryDark, pt: 0.25 }}>{item.icon}</Box>
                <Box>
                  <Typography sx={{ color: colors.textPrimary, fontWeight: 850, fontSize: 15.5 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: colors.textSecondary, fontSize: 13.5, lineHeight: 1.6, mt: 0.4 }}>
                    {item.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
          {serviceLinks.map((item) => (
            <Button
              key={item.path}
              variant="outlined"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{ minHeight: 52, borderRadius: 3, justifyContent: 'flex-start' }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box
          sx={{
            mt: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 4,
            border: `1px solid ${colors.border}`,
            bgcolor: 'rgba(255,255,255,0.76)',
          }}
        >
          <Typography sx={{ color: colors.primaryDark, fontWeight: 850, mb: 0.75 }}>
            공유 링크
          </Typography>
          <Typography sx={{ color: colors.textSecondary, fontSize: 14, wordBreak: 'break-all', mb: 1.5 }}>
            agisungong.net/company
          </Typography>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={handleCopy}
            sx={{ borderRadius: 3 }}
          >
            소개 링크 복사
          </Button>
          <Typography sx={{ color: colors.textTertiary, fontSize: 12.5, lineHeight: 1.65, mt: 2 }}>
            본 서비스는 의료법과 생명윤리법을 준수하며 의료기관 연결 및 유도 행위를 하지 않습니다.
          </Typography>
        </Box>
      </Box>
      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={2200}
        onClose={() => setCopyMessage('')}
        message={copyMessage}
      />
    </Box>
  );
}

export default CompanyProfile;
```

- [ ] **Step 2: Run test**

Run:

```bash
cd admin-web
npm test -- --watchAll=false companyProfilePage.test.js
```

Expected: still FAIL because `App.jsx` has not imported or routed `CompanyProfile`.

---

### Task 3: Wire Public Route And SEO Metadata

**Files:**
- Modify: `admin-web/src/App.jsx`

- [ ] **Step 1: Import and route the component**

Modify `admin-web/src/App.jsx`:

```javascript
import CompanyProfile from './components/CompanyProfile';
```

Add `/company` metadata in `routeMetadata`:

```javascript
'/company': {
  title: `난임상담톡톡 회사소개 | ${SITE_NAME}`,
  description:
    '외부 공유용 난임상담톡톡 회사소개 페이지입니다. 난임 정보, 뉴스, 백과, 상담 흐름을 한눈에 확인할 수 있습니다.',
  shouldIndex: true,
},
```

Add the public route before authenticated/admin routes that can redirect:

```jsx
<Route path="/company" element={<CompanyProfile />} />
```

The route must not be wrapped in `<Layout>`.

- [ ] **Step 2: Run focused test**

Run:

```bash
cd admin-web
npm test -- --watchAll=false companyProfilePage.test.js
```

Expected: PASS.

---

### Task 4: Verify Existing Web Build

**Files:**
- No code edits.

- [ ] **Step 1: Run related tests**

Run:

```bash
cd admin-web
npm test -- --watchAll=false companyProfilePage.test.js homeRouting.test.js webDesignRefresh.test.js
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
cd admin-web
npm run build
```

Expected: PASS and build files created under `admin-web/build`.

- [ ] **Step 3: Check working tree**

Run:

```bash
git status --short
```

Expected: only intentional company page files plus pre-existing unrelated mobile promotion files are modified.

- [ ] **Step 4: Commit implementation files**

Run:

```bash
git add admin-web/src/App.jsx admin-web/src/components/CompanyProfile.jsx admin-web/src/__tests__/companyProfilePage.test.js
git commit -m "feat: add public company profile page"
```

Expected: commit succeeds with only web company profile files.

---

## Self-Review

- Spec coverage: `/company` route, public access, mobile-first static page, route metadata, no Firebase reads, copy-link fallback, service CTAs, compliance note, and tests are all covered.
- Completion-marker scan: no incomplete markers remain.
- Type consistency: component name, file path, route path, and test file names are consistent across tasks.
