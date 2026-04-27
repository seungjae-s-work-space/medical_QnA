# Design System — 골통주부의 난임&상담톡

## Product Context
- **What this is:** 난임 치료 과정에 있는 사용자가 상담, 백과, 뉴스, 공지, 구독 기능을 한 앱 안에서 이용하는 Flutter 기반 정보/상담 앱.
- **Who it's for:** 난임 치료 중이거나 정보를 찾는 사용자, 그리고 운영자/상담자.
- **Space/industry:** 의료 정보, 여성 건강, 프라이빗 상담형 모바일 앱.
- **Project type:** 모바일 앱 중심의 Flutter product. 이 문서는 `medical_qa_app` UI를 우선 대상으로 한다.

## Aesthetic Direction
- **Direction:** Warm Reassurance
- **Decoration level:** intentional
- **Mood:** 병원처럼 차갑지 않고, 커뮤니티처럼 가볍지도 않다. 신뢰감 있는 정보 앱이면서도 감정적으로는 부드럽고 안심되는 톤을 유지한다.
- **Reference sites:** 별도 외부 레퍼런스보다는 현재 서비스가 이미 갖고 있던 웜 아이보리 무드에 sage green 중심의 안정감을 더해 계승한다.

## Typography
- **Display/Hero:** Platform system sans-serif, bold weight 중심. 별도 커스텀 폰트 없이 성능과 가독성을 우선한다.
- **Body:** Platform system sans-serif. 긴 본문, 의료 정보, 상담 메시지를 읽기 편하게 line-height를 여유 있게 둔다.
- **UI/Labels:** same as body, medium to semibold weights.
- **Data/Tables:** same as body. 숫자와 결제 정보는 필요 시 `monospace`를 보조적으로 사용한다.
- **Code:** `monospace`
- **Loading:** system font only, no remote font dependency
- **Scale:**
  - `displayLarge` 34
  - `displayMedium` 30
  - `headlineLarge` 26
  - `headlineMedium` 22
  - `titleLarge` 20
  - `titleMedium` 17
  - `titleSmall` 15
  - `bodyLarge` 16
  - `bodyMedium` 14
  - `bodySmall` 12
  - `labelLarge` 16
  - `labelMedium` 14
  - `labelSmall` 12

## Color
- **Approach:** balanced
- **Primary:** `#70B789` sage green, 브랜드 강조, CTA, 활성 상태
- **Secondary:** `#D4A853` champagne gold, 프리미엄 상태와 유료 기능 강조
- **Neutrals:** clean white to cocoa
  - `#FFFFFFFF` background
  - `#FFFFFFFF` surface
  - `#FFF7F2EE` muted surface
  - `#FFE7DDD8` border
  - `#FF2F2627` primary text
  - `#FF74666A` secondary text
  - `#FFA39598` tertiary text
- **Semantic:** success `#6FA87B`, warning `#E0A14A`, error `#E57373`, info `#5B8BA8`
- **Dark mode:** 아직 구현하지 않는다. 도입 시에는 배경 명도를 크게 낮추고, accent 채도는 10~15% 줄이며 텍스트 대비를 우선한다.

## Spacing
- **Base unit:** 4px
- **Density:** comfortable
- **Scale:** `xxs(4)` `xs(8)` `sm(12)` `md(16)` `lg(20)` `xl(24)` `2xl(32)` `3xl(40)`

## Layout
- **Approach:** hybrid, mobile-first
- **Grid:** 기본은 single-column. 리스트, 카드, 상세, 바텀시트 중심.
- **Max content width:** 모바일 full width. 태블릿/데스크톱 확장 시 본문 영역은 680~720px 내에서 제어.
- **Border radius:** `sm 12`, `md 16`, `lg 20`, `xl 24`, `pill 999`

## Motion
- **Approach:** minimal-functional
- **Easing:** enter `easeOut`, exit `easeIn`, move `easeInOut`
- **Duration:** micro `80ms`, short `180ms`, medium `280ms`, long `420ms`

## Component Rules
- **App bars:** 흰 배경이나 앱 배경색을 유지하고 그림자는 쓰지 않는다. 제목은 중앙 정렬과 `titleLarge` 계열을 우선한다.
- **Buttons:** 주 행동은 sage green filled button, 보조 행동은 text/outlined button. 버튼 radius는 최소 20 이상.
- **Inputs:** 밝은 웜그레이 배경 fill을 사용한다. 포커스는 primary accent border로만 강조한다.
- **Cards and sheets:** 순백 surface 위에 얇은 border와 큰 radius를 사용한다. 강한 그림자는 피한다.
- **Premium UI:** gold는 프리미엄 상태, 구독, 혜택 안내에만 제한적으로 쓴다.
- **Chat UI:** 사용자 말풍선은 info blue, 상담자 말풍선은 muted surface 계열. 텍스트 대비가 항상 확보되어야 한다.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-27 | Initial Flutter design system created | 기존 앱의 웜 아이보리 + 더스티 로즈 무드를 유지하면서, 전역 토큰과 `ThemeData`로 일관성을 확보하기 위해 정리했다. |
