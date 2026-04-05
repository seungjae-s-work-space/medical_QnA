# 난임상담톡톡

난임 시술 관련 의료 상담 앱 (Flutter + Firebase)

- **앱 버전**: 1.0.9+14
- **Bundle ID**: `net.agisungong.nanimtalktalk`
- **App Store**: https://apps.apple.com/us/app/id6759237772
- **Play Store**: https://play.google.com/store/apps/details?id=net.agisungong.nanimtalktalk

## 프로젝트 구조

```
medical_qa_app/          # Flutter 클라이언트 앱 (iOS/Android/Windows)
admin-web/               # React 관리자 웹 (백과/뉴스/구독/영상/공지 관리)
functions/               # Firebase Cloud Functions (푸시 알림)
```

## 주요 기능

### 사용자 앱
- **상담톡**: 관리자(이승주)와 1:1 실시간 채팅 (이미지/동영상/파일 첨부, 구독자 전용)
- **난임백과**: 난임 관련 백과사전 (검색, 페이지네이션, 구독자 전용 개별 글)
- **난임뉴스**: 난임 관련 뉴스 (검색, 페이지네이션, 구독자 전용 개별 글)
- **아기성공TV**: 유튜브 영상 모음 (페이지네이션)
- **공지사항**: 관리자 공지 (전체 공개)
- **구독 시스템**: iOS/Android 인앱결제 (1개월/6개월/12개월)
- **마이페이지**: FAB 버튼으로 접근, 프로필/구독 관리
- **강제 업데이트**: Firebase Remote Config 기반 (none/recommend/force 모드)

### 관리자 웹
- 상담 대화 관리 (실시간 채팅, 파일 첨부, 드래그 앤 드롭)
- 난임백과/뉴스/공지/영상 CRUD (작성자: 이승주)
- 구독 관리 (사용자별 그룹, 이력 조회, 부여/연장/차단)

### 관리자 앱 (Flutter)
- 상담 대화 목록 및 응답
- 뉴스/백과/공지 관리

## 인증 플로우

1. **앱 시작** → Splash 화면 (로고 + 로딩)
2. **Firebase Auth 세션 확인** → `AuthProvider._init()`
3. **강제 업데이트 체크** → `ForceUpdateService` (Remote Config)
4. **라우팅 결정** (`AuthWrapper`):
   - 인증 완료 + 관리자 → `AdminConversationsScreen`
   - 인증 완료 + 일반 유저 → `HomeScreen` + 구독 실시간 리스너 시작
   - 게스트 모드 → `HomeScreen` (제한된 기능)
   - 미인증 → `LoginScreen`

### 로그인 방식
- 이메일/비밀번호 (Firebase Auth)
- 닉네임 로그인 (Firebase 익명 인증 + Firestore 닉네임 저장, 트랜잭션으로 race condition 방지)
- 게스트 모드 (비로그인 둘러보기, 앱 재시작 시 풀림)

## 구독 (인앱결제)

### 상품 ID
| 플랜 | iOS | Android |
|------|-----|---------|
| 1개월 | `subscription_monthly` | `subscription_monthly` |
| 6개월 | `subscription_6months` | `subscription_6months` |
| 12개월 | `subscription_12months` | `subscription_12months` |

### 결제 플로우
1. `buyConsumable(autoConsume: false)` 로 구매 시작
2. 구매 성공 → `saveSubscription()`으로 Firestore 저장
3. 중복 구매 방지: `transactionId`로 기존 구매 확인
4. 기간 누적: 기존 구독 만료일 이후로 추가
5. 저장 완료 후 `completePurchase()` 호출

### 구독 상태 관리
- **실시간 리스너**: `SubscriptionProvider`가 Firestore `subscriptions` 컬렉션을 실시간 감시
- **관리자 부여/연장**: 관리자 웹에서 조작 시 `users` 문서도 동기화 업데이트
- **접근 제어**: 채팅은 구독자만, 백과/뉴스는 목록 공개 + 개별 글 구독자 전용

## 강제 업데이트 (Remote Config)

Firebase Remote Config 파라미터:
| 키 | 값 | 설명 |
|----|-----|------|
| `minimum_version` | `1.0.0` | 최소 허용 버전 |
| `update_mode` | `none` / `recommend` / `force` | 업데이트 모드 |
| `update_message` | 자유 텍스트 | 팝업에 표시할 메시지 |

- **none**: 아무것도 안 뜸
- **recommend**: 닫기 가능한 안내 팝업
- **force**: 닫기 불가 강제 팝업 (스토어 이동만 가능)

## 보안 규칙

### Firestore Rules
- `users`: 본인만 생성/수정, 관리자 전체 접근
- `conversations`: 본인 대화만 생성, 관리자 전체 접근
- `messages`: 본인 대화의 메시지만 생성/수정, 소유자 검증
- `subscriptions`: 본인 구독만 생성(관리자도 생성 가능), 관리자만 수정/삭제
- `encyclopedia/news/notices/videos`: 공개 글 읽기 허용, 생성/수정/삭제 관리자만

### Storage Rules
- 이미지 업로드: jpeg/png/gif/webp만 허용
- 파일 크기 제한: 이미지 10MB, 동영상 100MB, 파일 50MB, 프로필 2MB
- 경로: chat_images, chat_videos, chat_files, profile_images, encyclopedia_images, encyclopedia_thumbnails, news_images, news_thumbnails

## 푸시 알림 (Cloud Functions)

### 카테고리
| 카테고리 | 필드명 | 포함 알림 |
|----------|--------|----------|
| 상담 | `notificationChat` | 채팅 메시지 |
| 콘텐츠 | `notificationContent` | 뉴스/공지/백과/영상 신규 등록 |
| 구독 | `notificationSubscription` | 결제 완료, 만료 임박(3일 전), 만료 |

모두 `users` 문서에 저장. 기본값 `true`. 마스터 스위치 `notificationsEnabled`가 false이면 전체 무시.

### 함수 목록
| 함수 | 트리거 | 카테고리 |
|------|--------|----------|
| `sendMessageNotification` | 새 메시지 생성 | chat |
| `sendNewsNotification` / `sendNewsPublishedNotification` | 뉴스 생성/공개 전환 | content |
| `sendNoticeNotification` / `sendNoticePublishedNotification` | 공지 생성/공개 전환 | content |
| `sendEncyclopediaNotification` / `sendEncyclopediaPublishedNotification` | 백과 생성/공개 전환 | content |
| `sendVideoNotification` / `sendVideoPublishedNotification` | 영상 생성/공개 전환 | content |
| `sendSubscriptionPurchasedNotification` | subscriptions 문서 생성 | subscription |
| `checkSubscriptionExpiringSoon` | 매일 09:00 (KST), 3일 전 | subscription |
| `checkSubscriptionExpired` | 매일 09:10 (KST), 자동 만료 처리 | subscription |

### Android 알림 채널
- `chat_messages` — 상담
- `content` — 뉴스/공지/백과/영상
- `subscription` — 구독

## 모니터링 & 분석

- **Firebase Crashlytics**: 앱 크래시 자동 수집 (Flutter/네이티브/비동기 에러 포함)
- **Firebase Analytics**: 화면 전환, 세션, 첫 실행 등 자동 수집
- **Firestore 백업**: PITR(7일) + 일일/주간 예약 백업 → [BACKUP_MANUAL.md](BACKUP_MANUAL.md) 참고

## 기술 스택

- **Frontend**: Flutter 3.x, Provider (상태관리)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions, Messaging, Remote Config)
- **Admin**: React, Material-UI
- **IAP**: `in_app_purchase` 패키지
- **이미지 캐싱**: `cached_network_image`
- **데스크톱**: Windows 지원 (window_manager, tray_manager, local_notifier)

## 빌드 & 실행

```bash
cd medical_qa_app
flutter pub get
flutter run
```

### iOS 빌드
```bash
flutter build ipa
# Xcode에서 Distribute App으로 배포
```

### Android 빌드
```bash
flutter build appbundle
```

### 앱 아이콘 변경
```bash
# pubspec.yaml의 flutter_launcher_icons 설정 확인 후
# 현재 아이콘: assets/logo/logo4xreal.png
flutter pub run flutter_launcher_icons
```

### Firebase 배포
```bash
# Firestore rules
firebase deploy --only firestore:rules

# Storage rules
firebase deploy --only storage

# Cloud Functions
cd functions && npm run deploy
```

### 관리자 웹 배포
```bash
cd admin-web
npm run deploy   # gh-pages로 배포
```
