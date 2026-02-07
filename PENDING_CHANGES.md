# 다음 빌드 대기 중인 변경사항

**현재 배포 버전:** v0.1.4
**다음 예정 버전:** v0.1.5

---

## 코드 변경 완료 (빌드 대기)

### 1. QR코드 LNURL 형식 수정 ✅ (코드 수정 완료)
- **파일**: `app/(modals)/subscription.tsx:359`
- **수정 내용**: `<QRCode value={authLnurl} .../>` → `<QRCode value={authLnurlEncoded} .../>`
- **이유**: LNURL 표준은 QR에 bech32 인코딩(`LNURL1...`) 필수. raw URL은 Lightning 지갑에서 인식 못 함.
- **상태**: 코드 이미 수정됨, 빌드만 하면 됨

### 2. 로딩 화면 홍보 문구 로테이션 (미구현)
- **파일**: `app/_layout.tsx:28-34` — `if (authLoading)` 블록
- **현재 코드**: `<ActivityIndicator>` 스피너만 표시
- **수정 방법**:
  1. 파일 상단에 문구 배열 상수 정의
  2. `useMemo` 또는 `useState`로 랜덤 문구 1개 선택
  3. `<ActivityIndicator>` 아래에 `<Text>` 추가하여 선택된 문구 표시
- **문구 8개**:
  - "AES-256 암호화로 당신의 데이터를 보호합니다"
  - "모든 데이터는 당신의 기기에만 저장됩니다"
  - "비밀번호 없이는 누구도 열람할 수 없습니다"
  - "당신의 데이터는 당신만의 것입니다"
  - "기록하지 않으면 관리할 수 없습니다"
  - "작은 기록이 큰 변화를 만듭니다"
  - "오늘의 지출을 sats로 환산해보세요"
  - "소비 습관을 아는 것이 절약의 시작입니다"

### 3. 백업 화면 암호화 안내 문구 (미구현)
- **파일**: `app/(tabs)/settings.tsx:614-630` — "데이터 백업" 버튼 영역
- **수정 방법**: 백업 버튼 아래 또는 백업 섹션 상단에 안내 `<Text>` 추가
- **문구**: "AES-256 암호화로 보호됩니다. 비밀번호 없이는 누구도 열람할 수 없습니다."
- **스타일**: 작은 폰트(12px), 회색(#9CA3AF), 패딩 적용

### 4. 백업 파일 공유 방식 수정 (미구현)
- **파일**: `app/(tabs)/settings.tsx:143-148` — `handleBackup()` 함수 내부
- **현재 코드**:
  ```typescript
  await Share.share({
    url: path,        // ← iOS 전용, Android에서 무시됨
    title: filename,
    message: `SYBA 백업 파일: ${filename}`,
  });
  ```
- **수정 방법**:
  1. `npx expo install expo-sharing` 실행
  2. `import * as Sharing from 'expo-sharing';` 추가
  3. `Share.share(...)` 부분을 `await Sharing.shareAsync(path)` 로 교체
  4. `expo-sharing`은 Android/iOS 모두 파일 공유 지원
- **기존 import 제거**: `import { Share } from 'react-native';`에서 `Share` 제거 (다른 곳에서 안 쓰면)

---

## 대시보드 변경 완료 (빌드 불필요)

- [x] Supabase `payments` 테이블 SELECT 정책 추가 — 인보이스 생성 실패 해결
- [x] Supabase `blink-proxy` Edge Function 코드 배포 — CORS + Rate Limiting 적용
- [x] Supabase `lnurl-auth` Edge Function callback URL 수정 — 환경변수 방식
- [x] Supabase RLS 정책 전체 수정 — 테이블별 최소 권한 적용

---

## 버그 리포트

| 날짜 | 증상 | 원인 | 상태 |
|------|------|------|------|
| 2026-02-07 | QR 스캔 시 "지원하지 않는 형식" | QR에 raw URL 대신 bech32 필요 | 코드 수정 완료, 빌드 대기 |
| 2026-02-07 | 인보이스 생성 실패 | payments 테이블 SELECT 정책 누락 | ✅ 해결 |

---

## 빌드 체크리스트

빌드 전 확인:
- [ ] 모든 코드 변경 완료
- [ ] 테스트 완료
- [ ] 버전 번호 업데이트 (app.json)
- [ ] 커밋 & 푸시
- [ ] GitHub Release 생성
