# SYBA 앱 보안 평가 보고서

**평가일:** 2026-02-06
**버전:** v0.1.1
**평가자:** Claude Opus 4.5

---

## 1. 전체 요약

| 영역 | 상태 | 위험도 |
|------|------|--------|
| 암호화 | ✅ 양호 | 낮음 |
| API 키 관리 | ✅ 양호 | 낮음 |
| Blink 프록시 | ⚠️ 개선 필요 | 중간 |
| 로컬 데이터 | ✅ 양호 | 낮음 |
| 로그 출력 | ✅ 양호 | 낮음 |
| Rate Limiting | ❌ 없음 | 중간 |
| Supabase RLS | ⚠️ 확인 필요 | - |

---

## 2. 상세 분석

### ✅ 잘 된 부분

#### 암호화 구현 (`src/utils/encryption.ts`)
- **알고리즘:** AES-256-CBC + 랜덤 IV
- **키 파생:** PBKDF2 100,000 iterations (업계 표준 충족)
- **키 저장:** expo-secure-store 사용 (OS 레벨 보안)
- **IV 생성:** expo-crypto로 암호학적 안전한 랜덤 생성

```typescript
// 현재 구현 - 양호
CryptoJS.PBKDF2(password, salt, {
  keySize: 256 / 32,
  iterations: 100000,  // OWASP 권장: 최소 100,000
});
```

#### API 키 분리
- `service_role` 키: 클라이언트에 **없음** ✅
- Blink API 키: Edge Function 서버에만 존재 ✅
- 클라이언트: 공개용 `anon` 키만 포함 ✅

#### 로그 출력
- 민감한 값(비밀번호, 키) 직접 출력 안 함
- 존재 여부만 로깅 (`'있음' : '없음'`)

```typescript
// 현재 구현 - 양호
console.log('[DEBUG] encryptionKey:', encryptionKey ? '있음' : '없음');
```

---

### ⚠️ 개선 필요 사항

#### 1. Blink 프록시 CORS (중간 위험)

**파일:** `supabase/functions/blink-proxy/index.ts`

```typescript
// 현재 코드 - 문제
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 모든 도메인 허용
  ...
};
```

**위험:**
- 악의적 웹사이트에서 프록시를 통해 인보이스 생성 가능
- API 남용으로 인한 비용 발생 가능

**권장 수정:**
```typescript
// 권장 - 특정 도메인만 허용
const ALLOWED_ORIGINS = [
  'https://your-app-domain.com',
  'exp://localhost:8081',  // Expo 개발용
];

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
  ...
};
```

또는 JWT 인증 추가.

---

#### 2. Rate Limiting 없음 (중간 위험)

**현재 상태:**
- 로그인 시도 횟수 제한 없음
- Blink 프록시 호출 제한 없음

**위험:**
- 비밀번호 무차별 대입 공격 가능
- API 남용 가능

**권장 수정:**

로그인 시도 제한 (클라이언트):
```typescript
// authStore.ts에 추가
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15분

if (failedAttempts >= MAX_ATTEMPTS) {
  const remaining = lockoutEnd - Date.now();
  throw new Error(`${Math.ceil(remaining / 60000)}분 후 다시 시도하세요`);
}
```

Edge Function rate limit (서버):
```typescript
// Supabase Edge Function에 추가
import { RateLimiter } from 'some-rate-limiter';
const limiter = new RateLimiter({ maxRequests: 10, window: '1m' });
```

---

#### 3. Supabase RLS 정책 확인 필요

**확인 필요 테이블:**
- `lnurl_auth_sessions`
- `users`

**Supabase 대시보드에서 확인할 사항:**
1. `anon` 역할이 다른 사용자 데이터에 접근 불가한지
2. `SELECT`, `INSERT`, `UPDATE`, `DELETE` 정책이 적절한지
3. 민감한 컬럼에 대한 접근 제한

---

## 3. 악의적 사용자 공격 시나리오

| 공격 유형 | 가능 여부 | 현재 대응 | 추가 조치 |
|----------|----------|----------|----------|
| APK 디컴파일 → API 키 추출 | ⚠️ 가능 | anon 키만 노출, RLS로 보호 | 없음 (설계상 허용) |
| Blink 프록시 남용 | ⚠️ 가능 | 없음 | CORS 제한, Rate Limit |
| 로컬 파일 탈취 → 데이터 해독 | ❌ 불가 | AES-256 암호화 | - |
| 비밀번호 무차별 대입 | ⚠️ 가능 | PBKDF2 100K iterations | 시도 횟수 제한 |
| MITM 공격 | ❌ 불가 | HTTPS 강제 | - |
| 오픈소스 코드 분석 | ⚠️ 가능 | - | 지속적 보안 점검 |

---

## 4. 권장 조치 (우선순위)

### 높음 (즉시 조치)
1. [ ] Blink 프록시 CORS 제한 적용
2. [ ] Supabase RLS 정책 점검 및 문서화

### 중간 (1주 내)
3. [ ] 로그인 시도 횟수 제한 구현 (5회 실패 → 15분 잠금)
4. [ ] Edge Function rate limiting 추가

### 낮음 (릴리즈 전)
5. [ ] 프로덕션 빌드에서 `console.log` 제거 또는 레벨 조정
6. [ ] 보안 감사 자동화 (CI/CD에 통합)

---

## 5. 참고: 현재 보안 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자 기기                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 암호화된    │    │ SecureStore │    │    APK      │     │
│  │ 로컬 파일   │    │ (키 저장)   │    │ (anon키만) │     │
│  │ (AES-256)  │    │ (OS 보안)   │    │            │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase 서버                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Database   │    │ Edge Func   │    │   Auth      │     │
│  │  (RLS)      │    │ (Blink키)   │    │ (LNURL)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-06 | v0.1.1 | 최초 보안 평가 |

---

*이 문서는 정기적으로 업데이트되어야 합니다.*
