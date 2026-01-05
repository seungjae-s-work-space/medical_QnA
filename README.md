# 의료 Q&A 앱 - 완성!

의료 전문가와 일반 사용자 간 1:1 Q&A 채팅 시스템

## 프로젝트 구조

```
gukitso/
├── SETUP_GUIDE.md              # Firebase 설정 가이드
├── medical_qa_app/             # Flutter 앱 (사용자 + 관리자)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/             # User, Conversation, Message 모델
│   │   ├── services/           # Firebase Auth, Firestore, Storage
│   │   ├── providers/          # AuthProvider (상태관리)
│   │   ├── screens/
│   │   │   ├── auth/           # 로그인, 회원가입
│   │   │   ├── user/           # 사용자 채팅 화면
│   │   │   └── admin/          # 관리자 질문 목록 + 채팅
│   │   └── widgets/            # MessageBubble, ConversationTile
│   ├── pubspec.yaml
│   └── firestore.rules         # Firestore 보안 규칙
│
└── admin-web/                  # React 웹 (관리자 전용)
    ├── src/
    │   ├── App.jsx
    │   ├── firebase.js
    │   └── components/
    │       ├── Login.jsx
    │       ├── ConversationList.jsx
    │       └── ChatWindow.jsx
    └── package.json
```

## 주요 기능

### Flutter 앱
- ✅ **일반 사용자**: 의료 전문가와 1:1 채팅
- ✅ **관리자**: 모든 질문 목록 확인 및 응답
- ✅ 실시간 메시지 전송/수신
- ✅ 이미지 첨부 기능
- ✅ 읽지 않은 메시지 카운트
- ✅ role 기반 UI 자동 전환 (user/admin)

### 관리자 웹
- ✅ 관리자 로그인
- ✅ 질문 목록 (미읽음 뱃지)
- ✅ 실시간 채팅
- ✅ 반응형 디자인

## 시작하기

### 1. Firebase 설정 (필수!)

[SETUP_GUIDE.md](./SETUP_GUIDE.md)를 참고하여 Firebase 프로젝트를 생성하고 설정하세요.

### 2. Flutter 앱 실행

```bash
cd medical_qa_app

# Flutter 프로젝트와 Firebase 연결
flutterfire configure

# 패키지 설치
flutter pub get

# 실행
flutter run
```

### 3. 관리자 웹 실행

```bash
cd admin-web

# 패키지 설치
npm install

# src/firebase.js 파일에 Firebase 설정 입력

# 개발 서버 실행
npm start
```

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
  user_{userId}  # conversationId
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
        - senderName: string
        - text: string
        - imageUrl: string | null
        - isRead: boolean
        - createdAt: Timestamp
```

## 보안 규칙

Firestore Security Rules:
- ✅ 사용자는 자신의 대화방만 접근 가능
- ✅ 관리자는 모든 대화방 접근 가능
- ✅ 메시지는 해당 대화방 참여자만 읽기 가능

## 첫 관리자 계정 생성

### 방법 1: Firebase Console
1. Authentication → 사용자 → 사용자 추가
2. 이메일/비밀번호 입력
3. Firestore Database → users → 문서 추가:
   ```
   {
     "userId": "{생성된 UID}",
     "role": "admin",
     "name": "관리자",
     "email": "admin@example.com",
     "createdAt": {현재 시간}
   }
   ```

### 방법 2: 앱에서 회원가입 후
1. 앱에서 일반 회원가입
2. Firestore에서 해당 user의 `role`을 `admin`으로 변경
3. 앱 재시작 → 자동으로 관리자 화면 표시

## 비용 예상 (일 1000건)

- Firestore 읽기: ~$5/월
- Storage: ~$2/월
- Authentication: 무료
- Hosting (웹): 무료
- **총: ~$7/월**

## 배포

### Android APK 빌드
```bash
cd medical_qa_app
flutter build apk --release
```

### iOS 빌드 (Mac 필요)
```bash
flutter build ios --release
```

### 웹 배포 (Firebase Hosting)
```bash
cd admin-web
npm run build
firebase init hosting
firebase deploy --only hosting
```

## 기술 스택

### Flutter 앱
- Flutter 3.0+
- Firebase (Core, Auth, Firestore, Storage, Messaging)
- Provider (상태관리)
- cached_network_image
- image_picker

### 관리자 웹
- React 18
- Firebase JS SDK
- Material-UI (MUI)
- React Router

## 문제 해결

### "FirebaseOptions cannot be null"
```bash
flutterfire configure
```

### Android 빌드 실패
```gradle
// android/app/build.gradle
minSdk = 23
```

### 웹에서 Firebase 연결 안됨
`admin-web/src/firebase.js` 파일에 Firebase 설정 정보를 올바르게 입력했는지 확인

## 다음 단계

### 추가 기능 아이디어
- [ ] 푸시 알림 (FCM)
- [ ] 프로필 이미지 업로드
- [ ] 통계 대시보드 (일일/주간 질문 수)
- [ ] 대화방 검색 기능
- [ ] 메시지 삭제/수정
- [ ] 다국어 지원

## 라이선스

이 프로젝트는 학습 및 개인 사용을 위한 샘플 코드입니다.

---

**제작**: 의료 Q&A 앱
**문의**: Firebase 설정은 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고
