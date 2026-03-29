# 골통주부의 난임&상담톡

난임 시술 관련 의료 Q&A 앱 (Flutter + Firebase)

## 프로젝트 구조

```
medical_qa_app/          # Flutter 클라이언트 앱 (iOS/Android/Windows)
admin-web/               # React 관리자 웹 (백과/뉴스/구독 관리)
functions/               # Firebase Cloud Functions (알림 등)
```

## 주요 기능

### 사용자 앱
- **상담톡**: 관리자와 1:1 실시간 채팅 (이미지/동영상/파일 첨부)
- **난임백과**: 난임 관련 백과사전 (검색, 구독자 전용 개별 글)
- **난임뉴스**: 난임 관련 뉴스 (검색, 구독자 전용 개별 글)
- **아기성공TV**: 유튜브 영상 모음
- **공지사항**: 관리자 공지
- **구독 시스템**: iOS/Android 인앱결제 (1개월/6개월/12개월)

### 관리자 웹
- 상담 대화 관리
- 난임백과/뉴스 CRUD
- 구독 관리 (사용자별 그룹, 이력 조회)

## 인증 플로우

1. **앱 시작** → Splash 화면 (로고 + 로딩)
2. **Firebase Auth 세션 확인** → `AuthProvider._init()`
3. **라우팅 결정** (`AuthWrapper`):
   - 인증 완료 + 관리자 → `AdminConversationsScreen`
   - 인증 완료 + 일반 유저 → `HomeScreen`
   - 게스트 모드 → `HomeScreen` (제한된 기능)
   - 미인증 → `LoginScreen`

### 로그인 방식
- 이메일/비밀번호 (Firebase Auth)
- 닉네임 로그인 (Firebase 익명 인증 + Firestore 닉네임 저장)
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

## 보안 규칙

### Firestore Rules
- `users`: 본인만 생성/수정, 관리자 전체 접근
- `conversations`: 본인 대화만 생성, 관리자 전체 접근
- `messages`: 본인 대화의 메시지만 생성/수정
- `subscriptions`: 본인 구독만 생성, 관리자만 수정/삭제
- `encyclopedia/news/notices/videos`: 공개 글 읽기 허용, 생성/수정/삭제 관리자만

### Storage Rules
- 이미지 업로드: jpeg/png/gif/webp만 허용
- 파일 크기 제한: 이미지 10MB, 동영상 100MB, 파일 50MB, 프로필 2MB

## 기술 스택

- **Frontend**: Flutter 3.x, Provider (상태관리)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions, Messaging)
- **Admin**: React, Material-UI
- **IAP**: `in_app_purchase` 패키지

## 빌드 & 실행

```bash
cd medical_qa_app
flutter pub get
flutter run
```

### 앱 아이콘 변경
```bash
# pubspec.yaml의 flutter_launcher_icons 설정 확인 후
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
