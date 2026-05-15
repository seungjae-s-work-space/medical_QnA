# Web Design Refresh Design

## Decision

Use direction C: a full web visual refresh based on the new home dashboard image.

The web app should feel like the image: fresh, botanical, bright, warm, and credible. The current blue-purple admin SaaS look should move toward sage green, mint, clean white, soft sunlight gold, and gentle medical/lab freshness.

## Goals

- Make the web experience visually match the `home-dashboard.png` brand tone.
- Keep the existing routes, data fetching, pagination, auth, membership prompts, and admin/user permissions intact.
- Preserve the sidebar shell, but make it feel branded rather than generic.
- Refresh the public content screens and admin management screens, not only the homepage.
- Improve perceived quality without making dense admin workflows harder to scan.

## Scope

1. Global theme
   - Replace the current indigo/blue palette with sage green, mint, pale aqua, warm ivory, champagne gold, and deep green text.
   - Update button hover, selected nav, input focus, card borders, chips, and message colors through `admin-web/src/theme.js`.
   - Keep system font behavior and high contrast.

2. App shell
   - Update `Layout.jsx` sidebar background, active menu style, logo/avatar treatment, badges, and page background.
   - Sidebar should stay functional and readable, with botanical freshness in color and depth.
   - Do not introduce a marketing-only top nav; the app shell remains the primary navigation.

3. Home dashboard
   - Use `home-dashboard.png` as the first visual signal on `/`.
   - Improve the surrounding frame so the image feels intentionally placed, not dropped onto a blank page.
   - Add subtle brand-toned background treatment and simple calls to action into existing app routes where appropriate.

4. Content and management screens
   - Refresh repeated cards, list panels, stats blocks, empty states, pagination controls, dialogs, and search inputs in:
     - News
     - Encyclopedia
     - Notice
     - Video
     - User management
     - Conversation list
   - Keep table/list density practical for admin work.
   - Avoid decorative clutter inside operational screens.

5. Chat surfaces
   - Align user/admin message colors with the new palette.
   - Keep chat readability, attachment controls, and scroll behavior unchanged.

## Non-Goals

- No Firestore schema changes.
- No pagination or query behavior changes.
- No auth, subscription, or membership logic changes.
- No mobile Flutter app redesign in this pass.
- No new external font or remote visual dependency.

## Design Rules

- Dominant colors: white, warm ivory, mint, sage green, pale aqua.
- Accent colors: champagne gold and small warm highlights.
- Text colors: deep green/cocoa for primary, muted sage-gray for secondary.
- Cards should use soft borders and shallow shadows.
- Page backgrounds may use gentle gradients, but no purple/blue orb decoration.
- Admin screens should remain scan-friendly and not become poster-like.
- Home may be more expressive; operational screens should be restrained.

## Implementation Shape

- Centralize most color and component changes in `admin-web/src/theme.js`.
- Add small reusable style constants only if repeated patterns become noisy.
- Update `Layout.jsx` and `HomeDashboard.jsx` first to establish the shell.
- Then adjust high-impact repeated surfaces across content managers and chat/list screens.
- Prefer existing MUI components and current local patterns.

## Verification

- Run targeted route/design guard tests:
  - `homeRouting.test.js`
  - `membershipPromptBehavior.test.js`
  - `subscriptionRemoval.test.js`
  - `costGuardrails.test.js`
- Run `npm run build`.
- Use browser verification on `/`, `/chat`, `/encyclopedia`, `/news`, `/notice`, `/video`, and `/users`.
- Check desktop and narrower viewport behavior for text overflow, sidebar usability, and image framing.
