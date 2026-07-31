# Promotion Banners Design

## Goal

Add a managed promotion banner area for books and similar service promotions. The banner appears below the existing chat banner on the app home screen and also on the web home dashboard. Admins manage promotion content from the web admin UI, and users can open a promotion detail page with an optional external link.

## Approved Decisions

- Placement: keep the existing chat banner, then show the promotion carousel underneath it.
- Surfaces: show the same published promotions on both the Flutter app home and the web home dashboard.
- Access: guests can see promotion banners and detail pages. Chat still requires login through the existing chat flow.
- Detail format: use a banner image, rich detail content, and an optional external link button.
- Carousel behavior: auto-slide, swipe/manual navigation, and dot indicators.
- Ordering: admins set `sortOrder`; lower numbers appear first.
- Data source: use one shared Firestore collection, `promotions`, for both app and web.

## Firestore Model

Collection: `promotions`

Fields:

- `title`: string, required. Used for admin list labels, accessibility, and detail heading.
- `summary`: string, optional short text for admin scanning and lightweight detail context.
- `bannerImageUrl`: string, required for published promotions.
- `contentHtml`: string, optional rich detail body from the admin editor.
- `externalLinkUrl`: string, optional absolute URL.
- `externalLinkLabel`: string, optional button label. Default UI copy is `자세히 보기` when a URL exists and no label is set.
- `sortOrder`: number, required. Ascending order controls carousel order.
- `isPublished`: boolean, required. Only published items are visible to guests.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.
- `createdBy`: string admin uid, optional for audit.
- `updatedBy`: string admin uid, optional for audit.

Initial query:

```text
promotions
  .where('isPublished', isEqualTo: true)
  .orderBy('sortOrder')
  .orderBy('createdAt', descending: true)
  .limit(10)
```

This keeps homepage reads bounded. The app and web should use one-time fetches rather than real-time listeners for home promotion display.

## Storage

Add promotion image folders:

- `promotion_banners/{imageId}` for carousel banner images.
- `promotion_images/{imageId}` for optional images embedded in rich detail content, if the admin editor needs image insertion later.

Because guests can view promotions, these folders need public read access. Writes stay admin-only and should be limited to images under the existing image size policy.

## Flutter App

Add a small promotion feature boundary:

- `PromotionModel`: parses Firestore data and exposes display-safe defaults.
- `PromotionService`: fetches published promotions with a fixed limit of 10.
- `PromotionCarousel`: renders the horizontal banner area below `_ChatBanner`.
- `PromotionDetailScreen`: shows banner, title, rich content, and optional external link button.

Home behavior:

- If no published promotions exist, the home layout simply skips the promotion block.
- If one promotion exists, render it without auto-advance pressure but still allow tapping.
- If multiple promotions exist, auto-slide at a calm interval and allow swipe navigation.
- Tapping any banner opens the in-app detail screen.

The visual tone should follow `DESIGN.md`: warm reassurance, sage green as the primary accent, restrained borders, and no heavy shadow.

## Web

Admin web changes:

- Add `PromotionManager` under a sidebar item named `광고 관리`.
- Allow admins to create, edit, publish/unpublish, reorder, and delete promotions.
- Support banner image upload, rich detail editing, external link URL, external link label, and `sortOrder`.
- Keep the manager paginated or bounded so admin reads do not grow without limit.

Public web changes:

- Show the same promotion carousel on the `/` home dashboard.
- Add a promotion detail route such as `/promotions/:promotionId`.
- Opening a promotion from the carousel navigates to the detail route.
- External links open in a new browser tab from the detail page.

## Security Rules

Firestore:

- Anyone can read a promotion only when `isPublished == true`.
- Admins can read all promotions.
- Admins can create, update, and delete promotions.

Storage:

- Anyone can read promotion images.
- Only admins can write promotion images.
- Uploaded promotion files must be images and stay under the image size cap used elsewhere in the project.

## Cost Controls

- Homepage reads are capped with `.limit(10)`.
- No real-time listeners are needed for promotion carousels.
- The detail page reads only the selected promotion document.
- Admin list reads should remain paginated or limited.
- Images are served from Firebase Storage, so keep uploaded banner assets compressed before upload and reuse the same banner image for app and web.

## Testing

Flutter:

- Unit/source tests for the promotion service query limit/order.
- Widget or source tests confirming the carousel is placed below the chat banner and skips rendering when empty.
- Model tests for default link labels and Firestore timestamp parsing.

Web:

- Source or component tests confirming the admin route/sidebar item exists.
- Tests for the public home carousel and detail route behavior.
- Rule-oriented checks for published public reads and admin-only writes.

Manual verification:

- Add one unpublished promotion and confirm it is hidden from guest app/web.
- Publish two promotions with different `sortOrder` values and confirm both app and web show the same order.
- Tap a banner in the app and web, confirm the detail page opens.
- Tap the external link button and confirm it leaves the service safely.

## Out Of Scope

- Payment or subscription logic.
- Personalized ad targeting.
- Impression/click analytics beyond the current view-count style behavior.
- Scheduled start/end dates. These can be added later if operations need timed campaigns.
