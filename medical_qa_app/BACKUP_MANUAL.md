# Firestore 백업 & 복구 매뉴얼

## 1. 백업 구성 현황

| 항목 | 설정 |
|------|------|
| PITR (point-in-time recovery) | 활성 (7일 이내 시점 복구) |
| 일일 백업 | 매일 자동, 7일 보관 |
| 주간 백업 | 매주 자동, 4주 보관 |
| 프로젝트 | medicalQA (medicalqa-e5313) |
| 데이터베이스 | (default) |

---

## 2. 상황별 복구 방법

### 상황 A: 특정 문서/컬렉션을 실수로 삭제한 경우

**PITR(시점 복구)을 사용합니다.**

1. Firebase Console → Firestore → **재해 복구** 탭
2. PITR 섹션에서 **"복구"** 클릭
3. 복구할 시점 선택 (삭제 전 시간)
4. **새 데이터베이스**에 복원됨 (기존 DB를 덮어쓰지 않음)
5. 복원된 DB에서 필요한 문서만 확인 후 기존 DB에 수동으로 옮기기

> 주의: PITR은 최대 7일 이내만 가능합니다.

### 상황 B: 전체 데이터베이스 복구가 필요한 경우

**예약 백업을 사용합니다.**

1. Firebase Console → Firestore → **재해 복구** 탭
2. **"전체 백업 보기"** 클릭 → Google Cloud Console로 이동
3. 원하는 백업 선택 → **"복원"** 클릭
4. 새 데이터베이스 이름 입력 (예: `restored-20260404`)
5. 복원 완료 후 데이터 확인
6. 필요 시 기존 DB와 교체

### 상황 C: 특정 컬렉션만 내보내기/가져오기

**수동 내보내기를 사용합니다.**

1. Firebase Console → Firestore → **재해 복구** 탭 → **"Google Cloud에서 보기"**
2. 또는 터미널에서:

```bash
# 전체 내보내기
gcloud firestore export gs://medicalqa-e5313.appspot.com/backups/manual-$(date +%Y%m%d)

# 특정 컬렉션만 내보내기
gcloud firestore export gs://medicalqa-e5313.appspot.com/backups/manual-$(date +%Y%m%d) \
  --collection-ids=users,subscriptions,conversations

# 가져오기 (새 DB 또는 기존 DB에)
gcloud firestore import gs://medicalqa-e5313.appspot.com/backups/manual-20260404
```

---

## 3. 긴급 상황 체크리스트

### 데이터 삭제 사고 발생 시

- [ ] 1. **즉시 관리자 웹/앱에서 추가 작업 중단**
- [ ] 2. 삭제된 데이터 범위 파악 (어떤 컬렉션, 몇 건)
- [ ] 3. 삭제 시점 확인 (정확한 시간)
- [ ] 4. PITR로 해당 시점 직전으로 복구 시도
- [ ] 5. 복원된 DB에서 데이터 확인
- [ ] 6. 기존 DB에 누락된 데이터 복원
- [ ] 7. 정상 동작 확인

### 서비스 장애 발생 시

- [ ] 1. Firebase 상태 확인: https://status.firebase.google.com
- [ ] 2. Crashlytics에서 에러 로그 확인
- [ ] 3. Firestore 사용량 확인 (할당량 초과 여부)
- [ ] 4. 필요 시 백업에서 새 DB로 복원 후 앱 연결 변경

---

## 4. 주요 컬렉션 목록

복구 우선순위 순:

| 컬렉션 | 설명 | 중요도 |
|--------|------|--------|
| `users` | 사용자 계정 정보 | 최상 |
| `subscriptions` | 구독/결제 정보 | 최상 |
| `conversations` | 상담 대화방 | 높음 |
| `conversations/*/messages` | 상담 메시지 | 높음 |
| `encyclopedia` | 난임백과 콘텐츠 | 중간 |
| `news` | 뉴스 콘텐츠 | 중간 |
| `notices` | 공지사항 | 중간 |
| `videos` | 영상 콘텐츠 | 중간 |

---

## 5. 비용 참고

| 항목 | 비용 |
|------|------|
| PITR | 저장된 데이터 GB당 약 $0.20/월 |
| 예약 백업 스토리지 | Cloud Storage 요금 적용 |
| 수동 내보내기 | 읽기 작업 + Storage 요금 |

현재 데이터 규모가 작으면 월 $1 미만으로 예상됩니다.

---

## 6. 정기 점검 (월 1회 권장)

- [ ] Firebase Console에서 백업이 정상 생성되고 있는지 확인
- [ ] PITR이 활성 상태인지 확인
- [ ] Firestore 사용량/비용 확인
- [ ] 테스트 복구 1회 실시 (새 DB에 복원 후 삭제)
