# Home Tab Polish Design

Date: 2026-05-17

## Decision

The selected direction is **B. Service Hub Home**.

The home tab should become a warm, practical starting screen rather than a poster-only landing view. It should keep the botanical sage/mint/ivory tone from the current web refresh and the existing `home-dashboard.png` asset, while adding clear entry points into the main service areas.

## Goals

- Make `/` feel like the service home, not only an image preview.
- Keep the sidebar visible and compatible with the current `Layout`.
- Preserve the current free-membership positioning and login prompt behavior.
- Guide users toward the core actions: chat, encyclopedia, news, notice, and video.
- Avoid Firebase reads on the home screen unless already available through existing app state.

## Non-Goals

- No Flutter app changes.
- No Firebase schema or query changes.
- No subscription, login, chat, or pagination logic changes.
- No new remote image or font dependency.

## Layout

`HomeDashboard.jsx` should change from a single framed poster into a hub layout:

- Full-page botanical gradient background using existing `colors`.
- A main hero panel with:
  - Brand title: `난임상담톡톡`
  - Supporting copy about expert consultation and curated infertility information.
  - Primary CTA for consultation/login flow.
  - A compact framed `home-dashboard.png` poster preview.
- A grid of quick-entry cards:
  - `상담하기`
  - `난임백과`
  - `뉴스`
  - `공지사항`
  - `아기성공TV`
  - `회원제(무료)`
- A small update/curation strip with static copy, such as latest-news and recommended-encyclopedia prompts, linking to the existing routes without reading Firestore.

## Interaction

- Cards and CTAs should navigate through existing routes with `useNavigate`.
- For non-logged-in users, existing route-level membership prompt behavior should remain the source of truth for news/encyclopedia prompts.
- Chat CTA should route to `/chat`; current app logic already handles logged-out users by showing the login-oriented chat home.
- The home screen must not open new dialogs of its own unless that behavior already exists globally in `Layout`.

## Visual Rules

- Use existing `colors` from `admin-web/src/theme.js`.
- Keep `home-dashboard.png` visible but smaller than the current poster-only layout.
- Use rounded, lightly translucent white surfaces, thin sage borders, and restrained shadows.
- Use lucide only if already present; this app currently uses MUI icons, so use MUI icons for quick cards.
- Text should fit on desktop and narrow browser widths without overlap.

## Testing

Update or add string-guard tests around `HomeDashboard.jsx` so the chosen hub structure is protected:

- The home route still renders `HomeDashboard`.
- `HomeDashboard.jsx` still references `home-dashboard.png`.
- It includes hub markers such as `상담하기`, `난임백과`, `회원제(무료)`, and route navigation to `/chat`, `/encyclopedia`, and `/news`.
- Existing web design, membership prompt, subscription removal, and cost guardrail tests should continue to pass.

## Acceptance Criteria

- `/` shows a service-hub home with hero, poster preview, quick cards, and update strip.
- No app-side Flutter files are modified.
- No Firebase read/query code is added to the home screen.
- `npm run build` completes successfully.
- Browser smoke check confirms `/` renders without console errors.
