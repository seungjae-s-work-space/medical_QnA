# Company Profile Page Design

## Goal

Create a public company profile page that can be shared like a digital business card. The page should work cleanly on mobile, feel trustworthy and warm, and introduce Nanimsangdam Toktok without requiring login.

## Route

- Add a public route at `/company`.
- The production share URL will be `https://agisungong.net/company`.
- The route must not require authentication.
- It should render outside the admin/sidebar layout so the first mobile view feels like a focused share card, not an admin dashboard.

## Audience

The page is for external partners, interviewees, collaborators, and people who receive a simple introduction link. They may know nothing about the service, so the page should answer: who we are, what we provide, why it is credible, and how to continue.

## Content Structure

The page will use a single-column mobile-first layout with a desktop max width.

1. Hero profile card
   - Brand name: `난임상담톡톡`
   - Short category: `난임 정보·상담 플랫폼`
   - One-sentence introduction: `난임 전문 기자와 골통주부가 함께 만든, 무료 회원제 난임 정보·상담 서비스입니다.`
   - Primary action: open service home
   - Secondary action: start chat or login

2. Trust points
   - `근거 중심 정보`: 난임백과와 뉴스 기반 정보 제공
   - `전문가 상담 흐름`: 로그인 후 상담 채팅 이용
   - `무료 회원제`: 구독/인앱결제 없이 운영

3. Service preview links
   - 난임백과
   - 뉴스
   - 아기성공TV
   - 공지사항

4. Contact/share area
   - Show the production domain.
   - Provide a copy-link button where browser support allows it.
   - Provide a simple CTA back to the main site.

5. Compliance note
   - Mention that the service follows medical and bioethics boundaries and does not perform medical referral or inducement.

## Visual Direction

Use the existing Warm Reassurance direction from `DESIGN.md`:

- Sage green, mint, ivory, champagne gold accents.
- System sans-serif typography.
- Rounded but restrained surfaces.
- No heavy marketing hero or decorative gradient blobs.
- Mobile first, with enough breathing room for link sharing.

The page should feel like a polished mobile card with botanical wellness cues from the current home design, not like a dense admin page.

## Architecture

- Add a new React component: `admin-web/src/components/CompanyProfile.jsx`.
- Add a route in `admin-web/src/App.jsx`.
- Add route metadata for `/company`.
- Reuse `colors` from `admin-web/src/theme.js`.
- Avoid Firestore reads. This page is static and should have zero Firebase cost.
- Keep the page independent from `Layout` to avoid loading sidebar UI and admin chat listeners.

## Error Handling

- Copy-link action should fail gracefully by showing fallback text if Clipboard API is unavailable.
- Internal navigation should use existing React Router navigation.
- No network-dependent data should be required for the page to render.

## Testing

- Add or update React tests to verify:
  - `/company` renders without login.
  - company profile text and CTA links are present.
  - sidebar/admin layout is not rendered on the company page.
  - route metadata indexes `/company`.

## Out Of Scope

- Editable company profile content in admin.
- Analytics events.
- New image generation.
- Backend or Firestore schema changes.
