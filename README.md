# 난임상담톡톡 (gukitso)

난임 전문가와 일반 사용자 간 1:1 상담 채팅 서비스

## 프로젝트 구조

```
gukitso/
├── SETUP_GUIDE.md              # Firebase 설정 가이드
├── medical_qa_app/             # Flutter 앱 (사용자 + 관리자)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/             # User, Message, News, Encyclopedia 모델
│   │   ├── services/           # Firebase Auth, Firestore, Storage, News, Encyclopedia
│   │   ├── providers/          # AuthProvider
│   │   ├── screens/
│   │   │   ├── auth/           # 로그인, 회원가입
│   │   │   ├── user/           # 채팅, 뉴스, 백과, 공지
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
│   │       ├── UserManagement.jsx
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
- ✅ **1:1 채팅** - 로그인 사용자와 난임 전문가 간 실시간 상담
- ✅ **난임뉴스** - 목록 및 상세 글 공개
- ✅ **난임백과** - 목록 및 상세 글 공개
- ✅ **공지사항** - 전체 공개
- ✅ **게스트 모드** - 로그인 없이 일부 기능 이용
- ✅ **이미지 첨부** - 채팅 내 이미지/파일 전송

### Flutter 앱 (관리자)
- ✅ 상담 목록 확인 및 응답
- ✅ 뉴스/백과/공지 콘텐츠 관리

### 관리자 웹
- ✅ 사용자 관리 (가입 사용자 목록 조회)
- ✅ 뉴스 / 백과 / 공지 / 영상 콘텐츠 관리
- ✅ 실시간 채팅

## 접근 정책

| 기능 | 비로그인 | 로그인 |
|------|----------|--------|
| 채팅 | 로그인 필요 | ✅ |
| 뉴스 목록/상세 | ✅ | ✅ |
| 백과 목록/상세 | ✅ | ✅ |
| 공지사항 | ✅ | ✅ |
| 영상 | ✅ | ✅ |

## 데이터베이스 구조

### Firestore Collections

```
users/
  {userId}
    - role: "user" | "admin"
    - name: string
    - email: string
    - createdAt: Timestamp

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
