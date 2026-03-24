# 난임상담톡톡 (gukitso)

난임 전문가와 일반 사용자 간 1:1 상담 채팅 서비스

## 프로젝트 구조

```
gukitso/
├── SETUP_GUIDE.md              # Firebase 설정 가이드
├── medical_qa_app/             # Flutter 앱 (사용자 + 관리자)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/             # User, Subscription, Message, News, Encyclopedia 모델
│   │   ├── services/           # Firebase Auth, Firestore, Storage, IAP, News, Encyclopedia
│   │   ├── providers/          # AuthProvider, SubscriptionProvider
│   │   ├── screens/
│   │   │   ├── auth/           # 로그인, 회원가입
│   │   │   ├── user/           # 채팅, 구독, 뉴스, 백과, 공지
│   │   │   └── admin/          # 관리자 채팅, 뉴스/백과/공지 관리
│   │   └── widgets/
│   ├── pubspec.yaml
│   └── firestore.rules
│
├── admin-web/                  # React 웹 (관리자 전용)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   └── components/
│   │       ├── Login.jsx
│   │       ├── ConversationList.jsx
│   │       ├── ChatWindow.jsx
│   │       ├── SubscriptionManager.jsx
│   │       ├── NewsManager.jsx
│   │       ├── EncyclopediaManager.jsx
│   │       ├── NoticeManager.jsx
│   │       └── VideoManager.jsx
│   └── package.json
│
└── functions/                  # Firebase Cloud Functions
```

## 주요 기능

### Flutter 앱 (사용자)
- ✅ **1:1 채팅** - 난임 전문가와 실시간 상담 (구독 필요)
- ✅ **인앱결제 (IAP)** - iOS App Store / Android Google Play
  - 월간 이용권 (1개월), 6개월 이용권, 12개월 이용권
  - 구독 기간 누적 (잔여 기간 + 새 기간)
- ✅ **난임뉴스** - 목록 무료 공개, 개별 글 구독 필요
- ✅ **난임백과** - 목록 무료 공개, 개별 글 구독 필요
- ✅ **공지사항** - 전체 공개
- ✅ **게스트 모드** - 로그인 없이 일부 기능 이용
- ✅ **이미지 첨부** - 채팅 내 이미지/파일 전송

### Flutter 앱 (관리자)
- ✅ 상담 목록 확인 및 응답
- ✅ 뉴스/백과/공지 콘텐츠 관리

### 관리자 웹
- ✅ 구독자 관리 (사용자별 그룹화, 히스토리 조회)
- ✅ 구독 부여/연장/만료 처리
- ✅ 미구독 사용자 목록 및 구독 부여
- ✅ 뉴스 / 백과 / 공지 / 영상 콘텐츠 관리
- ✅ 실시간 채팅

## 인앱결제 상품 ID

| 플랜 | iOS (App Store) | Android (Google Play) |
|------|----------------|----------------------|
| 월간 | `net.agisungong.nanimtalktalk.monthly` | `subscription_monthly` |
| 6개월 | `net.agisungong.nanimtalktalk.6months` | `subscription_6months` |
| 12개월 | `net.agisungong.nanimtalktalk.12months` | `subscription_12months` |

- iOS: 소모품(Consumable) 타입
- Android: 일회성 제품(One-time product) 타입

## 구독 접근 제어

| 기능 | 비구독 | 구독 |
|------|-------|------|
| 채팅 | 메시지 전송 불가 | ✅ |
| 뉴스 목록 | ✅ | ✅ |
| 뉴스 상세 | 구독 유도 | ✅ |
| 백과 목록 | ✅ | ✅ |
| 백과 상세 | 구독 유도 | ✅ |
| 공지사항 | ✅ | ✅ |

## 데이터베이스 구조

### Firestore Collections

```
users/
  {userId}
    - role: "user" | "admin"
    - name: string
    - email: string
    - subscriptionId: string
    - subscriptionStatus: "free" | "active" | "expired" | "cancelled"
    - subscriptionEndDate: Timestamp
    - createdAt: Timestamp

subscriptions/
  {subscriptionId}
    - userId: string
    - planId: "plan_monthly" | "plan_6months" | "plan_12months" | "admin_grant"
    - status: "active" | "expired" | "cancelled"
    - platform: "ios" | "android" | "admin"
    - platformProductId: string
    - transactionId: string
    - startDate: Timestamp
    - endDate: Timestamp
    - createdAt: Timestamp
    - updatedAt: Timestamp

conversations/
  user_{userId}
    - userId: string
    - userName: string
    - lastMessage: string
    - lastMessageAt: Timestamp
    - unreadByAdmin: number
    - unreadByUser: number

    messages/
      {messageId}
        - senderId: string
        - senderRole: "user" | "admin"
        - text: string
        - attachments: []
        - isRead: boolean
        - createdAt: Timestamp

news/
  {newsId}
    - title: string
    - content: string (HTML)
    - authorName: string
    - imageUrl: string | null
    - sourceUrl: string | null
    - isPublished: boolean
    - createdAt: Timestamp

encyclopedia/
  {articleId}
    - title: string
    - content: string (HTML)
    - authorName: string
    - imageUrl: string | null
    - references: string | null
    - sourceUrl: string | null
    - viewCount: number
    - isPublished: boolean
    - createdAt: Timestamp
```

## 시작하기

### 1. Firebase 설정
[SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고

### 2. Flutter 앱 실행
```bash
cd medical_qa_app
flutter pub get
flutter run
```

### 3. 관리자 웹 실행
```bash
cd admin-web
npm install
npm start
```

## 기술 스택

### Flutter 앱
- Flutter 3.0+
- Firebase (Core, Auth, Firestore, Storage)
- in_app_purchase (iOS/Android IAP)
- Provider (상태관리)
- flutter_html, cached_network_image

### 관리자 웹
- React 18
- Firebase JS SDK
- Material-UI (MUI)

### Backend
- Firebase Cloud Functions
- Firestore
- Firebase Storage

## 배포

### Android
```bash
cd medical_qa_app
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

### 관리자 웹 (Firebase Hosting)
```bash
cd admin-web
npm run build
firebase deploy --only hosting
```
