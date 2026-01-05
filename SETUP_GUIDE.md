# 의료 Q&A 앱 설정 가이드

## 프로젝트 개요

의료 전문가와 일반 사용자 간 1:1 Q&A 채팅 앱
- **사용자**: 전문가에게 질문
- **관리자(전문가)**: 앱 + 웹에서 모든 질문에 응답
- **프라이버시**: 사용자 간 연결 없음

---

## 1. Firebase 프로젝트 생성

### 1.1 Firebase Console 접속
1. https://console.firebase.google.com/ 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `medical-qa-app` (원하는 이름)
4. Google 애널리틱스: 선택 사항 (추천: 사용)
5. 프로젝트 생성 완료

### 1.2 Authentication 설정
1. 좌측 메뉴 → "Authentication" → "시작하기"
2. "Sign-in method" 탭
3. "이메일/비밀번호" 활성화
4. (선택) "Google" 로그인도 활성화 가능

### 1.3 Firestore Database 설정
1. 좌측 메뉴 → "Firestore Database" → "데이터베이스 만들기"
2. 모드 선택: **"테스트 모드에서 시작"** (나중에 보안 규칙 적용)
3. 위치: `asia-northeast3` (서울) 또는 가까운 지역
4. 만들기 클릭

### 1.4 Storage 설정
1. 좌측 메뉴 → "Storage" → "시작하기"
2. 보안 규칙: **"테스트 모드에서 시작"**
3. 위치: Firestore와 동일한 지역
4. 완료

### 1.5 Cloud Messaging (FCM) 설정
1. 좌측 메뉴 → "프로젝트 설정" (톱니바퀴)
2. "클라우드 메시징" 탭
3. Cloud Messaging API 활성화

---

## 2. Flutter 앱 설정

### 2.1 Flutter CLI로 Firebase 설정

```bash
# Firebase CLI 설치 (한 번만)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# FlutterFire CLI 설치
dart pub global activate flutterfire_cli

# 프로젝트 폴더로 이동
cd medical_qa_app

# Flutter 프로젝트 생성
flutter create .

# Firebase 프로젝트와 연결
flutterfire configure
```

`flutterfire configure` 실행 시:
- Firebase 프로젝트 선택: `medical-qa-app`
- 플랫폼 선택: `android`, `ios`, `web` 모두 선택
- `firebase_options.dart` 자동 생성됨

### 2.2 패키지 설치

```bash
flutter pub get
```

### 2.3 Android 설정

**android/app/build.gradle**:
```gradle
minSdk = 23  // Firebase 요구사항
```

### 2.4 iOS 설정

**ios/Podfile**:
```ruby
platform :ios, '12.0'  # Firebase 요구사항
```

```bash
cd ios
pod install
cd ..
```

---

## 3. 관리자 웹사이트 설정

### 3.1 React 프로젝트 생성

```bash
# admin-web 폴더 생성
npx create-react-app admin-web
cd admin-web

# Firebase SDK 설치
npm install firebase
npm install react-router-dom

# UI 라이브러리 (선택)
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
```

### 3.2 Firebase 설정 파일 생성

Firebase Console → 프로젝트 설정 → 앱 추가 → 웹(</>) 선택
→ 설정 정보 복사

**admin-web/src/firebase.js** 파일에 붙여넣기

---

## 4. Firestore Security Rules 적용

Firebase Console → Firestore Database → 규칙 탭
→ `firestore.rules` 내용 복사 붙여넣기 → 게시

---

## 5. 첫 관리자 계정 생성

### 방법 1: Firebase Console 사용
1. Authentication → 사용자 탭 → "사용자 추가"
2. 이메일: `admin@example.com`
3. 비밀번호 설정
4. Firestore Database → users 컬렉션 → 문서 추가:
   ```
   문서 ID: {생성된 UID}
   필드:
   - role: "admin"
   - name: "관리자"
   - email: "admin@example.com"
   - createdAt: {현재 타임스탬프}
   ```

### 방법 2: 앱에서 회원가입 후 수동 변경
1. 앱에서 회원가입
2. Firestore에서 해당 user의 `role`을 `admin`으로 변경

---

## 6. 앱 실행

### Flutter 앱
```bash
# Android
flutter run

# iOS
flutter run -d ios

# 웹
flutter run -d chrome
```

### 관리자 웹
```bash
cd admin-web
npm start
```

---

## 7. 배포

### Flutter 앱
```bash
# Android APK
flutter build apk --release

# iOS (Mac 필요)
flutter build ios --release
```

### 관리자 웹 (Firebase Hosting)
```bash
cd admin-web
npm run build

# Firebase 프로젝트 초기화 (한 번만)
firebase init hosting
# Public directory: build
# Single-page app: Yes

# 배포
firebase deploy --only hosting
```

---

## 비용 예상 (일 1000건 기준)

- Firestore: ~$5/월
- Storage: ~$2/월
- Hosting: 무료
- Authentication: 무료
- **총: ~$7/월**

---

## 문제 해결

### "FirebaseOptions cannot be null" 오류
```bash
flutterfire configure
```
다시 실행

### Android 빌드 실패
```gradle
// android/app/build.gradle
minSdk = 23
```

### iOS 빌드 실패
```bash
cd ios
pod deintegrate
pod install
cd ..
```

---

## 다음 단계

1. ✅ Firebase 프로젝트 생성
2. ✅ Flutter 프로젝트 설정
3. ✅ 관리자 웹 설정
4. ✅ 첫 관리자 계정 생성
5. �� 앱 테스트 및 배포
