# 기능 추가 계획 (3건)

## 현재 상태 분석 결과

### 기능 1: 계좌이체 / 잔고 연동
| 기능 | 상태 | 비고 |
|------|------|------|
| 계좌→계좌 이체 | ✅ 구현됨 | `add-transfer.tsx` + `ledgerStore.addTransfer()` |
| 계좌→선불카드 충전 | ✅ 구현됨 | add-transfer.tsx 탭 전환 |
| 선불카드 지출 시 잔액 차감 | ✅ 구현됨 | `add-expense.tsx` 에서 balance 차감 |
| **체크카드 지출 시 연결계좌 차감** | ❌ 누락 | `linkedAccountId` 저장만 하고 사용 안 함 |
| 신용카드 결제일 계좌 차감 | ⚠️ 미구현 | 설계 결정 필요 (기능 2와 연계) |

**핵심 문제**: 체크카드 등록 시 `linkedAccountId`를 설정할 수 있지만, 실제 지출 시 해당 계좌 잔액이 차감되지 않음.
- `ledgerStore.addExpense()`는 `paymentMethod === 'bank' | 'lightning' | 'onchain'` 일 때만 자산 차감
- `paymentMethod === 'card'`일 때는 선불카드 잔액만 차감하고, 체크카드 연결계좌는 무시

### 기능 2: 고정비용 (반복 지출)
- ❌ **완전 미구현**
- 할부(installment)와 대출(loan)은 있지만, 보험료/구독료 같은 반복 지출 시스템은 없음

### 기능 3: 카드 편집
- `cardStore.updateCard(id, updates)` 메서드는 존재
- ❌ **편집 UI 화면이 없음** — `card-list.tsx`에서는 삭제/기본카드 설정만 가능

---

## 구현 계획

### 기능 1: 체크카드 연결계좌 자동 차감

**변경 파일:**
- `src/stores/ledgerStore.ts` — `addExpense()` 수정
- `app/(modals)/add-expense.tsx` — UI에 체크카드 연결계좌 안내 추가

**구현 내용:**

1. `ledgerStore.addExpense()`에서 카드 결제 시 체크카드 감지 로직 추가:
```
카드 결제 && 체크카드 (card.type === 'debit') && linkedAccountId 존재
→ assetStore.adjustAssetBalance(linkedAccountId, -amount) 자동 호출
→ expense.linkedAssetId = card.linkedAccountId 자동 설정
```

2. `add-expense.tsx`에서 체크카드 선택 시 연결계좌 정보 표시:
   - "카카오뱅크 계좌에서 자동 차감됩니다" 안내 문구

3. `edit-record.tsx`에서 체크카드 지출 수정/삭제 시에도 연결계좌 잔액 역보정 (이미 `updateRecord`/`deleteRecord`의 기존 자산 역복원 로직이 `linkedAssetId`로 동작하므로, 체크카드 지출의 `linkedAssetId`만 제대로 설정하면 자동 처리됨)

**신용카드 결제일 차감은 이번 범위에서 제외** — 신용카드는 매월 결제일에 한꺼번에 청구되는 구조이므로 기능 2(고정비용)와 함께 설계하는 것이 적절.

---

### 기능 2: 고정비용 (반복 지출) 시스템

**신규 파일:**
- `src/types/recurring.ts` — RecurringExpense 타입 정의
- `src/stores/recurringStore.ts` — 반복 지출 스토어
- `app/(modals)/add-recurring.tsx` — 고정비용 등록 화면
- `app/(modals)/edit-recurring.tsx` — 고정비용 편집 화면
- `app/(modals)/recurring-list.tsx` — 고정비용 목록 화면

**변경 파일:**
- `app/(modals)/_layout.tsx` — 새 화면 등록
- `app/(tabs)/settings.tsx` — 설정에서 고정비용 관리 진입점 추가
- `src/utils/storage.ts` — `FILE_PATHS`에 `RECURRING` 추가
- `src/i18n/locales/ko.json` (+ en, ja, es) — 번역 추가
- `app/(tabs)/index.tsx` (홈) — 이번 달 고정비용 요약 표시 (선택)

**RecurringExpense 타입:**
```typescript
interface RecurringExpense {
  id: string;
  name: string;              // "삼성화재 보험료"
  amount: number;            // 150,000
  currency: 'KRW' | 'SATS';
  category: string;          // "금융", "구독료" 등

  // 반복 주기
  frequency: 'monthly' | 'yearly';
  dayOfMonth: number;        // 매월 N일 (1-28)
  monthOfYear?: number;      // yearly일 때 몇 월 (1-12)

  // 결제 수단
  paymentMethod: 'card' | 'bank' | 'cash';
  cardId?: string;           // 카드 결제 시
  linkedAssetId?: string;    // 계좌 차감 시

  // 상태
  isActive: boolean;
  startDate: string;         // 시작일 (YYYY-MM-DD)
  endDate?: string;          // 종료일 (선택)
  lastExecutedDate?: string; // 마지막 자동 실행일

  memo?: string;
  createdAt: string;
  updatedAt: string;
}
```

**자동 실행 로직:**
- 앱 시작 시 (`app/(tabs)/index.tsx` 또는 `_layout.tsx`) `recurringStore.executeOverdueRecurrings()` 호출
- 오늘 날짜 기준으로 `lastExecutedDate` 이후 실행되지 않은 건 감지
- 해당 건에 대해 `ledgerStore.addExpense()` 자동 호출
- 실행 후 `lastExecutedDate` 업데이트
- 밀린 기간 처리: 앱을 오래 안 열었을 경우 빠진 월 단위로 각각 기록 생성

**UI 화면:**
- `add-recurring.tsx`: 이름, 금액, 카테고리, 반복주기(월/연), 결제일, 결제수단(카드/계좌/현금), 시작일, 메모
- `recurring-list.tsx`: 활성/비활성 고정비용 목록, 이번 달 합계 표시
- `edit-recurring.tsx`: 기존 고정비용 편집 (add-recurring과 유사 구조)
- 설정 탭에서 "고정비용 관리" 메뉴 추가

---

### 기능 3: 카드 편집 화면

**신규 파일:**
- `app/(modals)/edit-card.tsx` — 카드 편집 화면

**변경 파일:**
- `app/(modals)/_layout.tsx` — `edit-card` 화면 등록
- `app/(modals)/card-list.tsx` — 편집 모드에서 편집 버튼 추가
- `src/i18n/locales/ko.json` (+ en, ja, es) — 번역 추가

**구현 내용:**
- `add-card.tsx`와 동일한 폼 구조, 기존 카드 데이터로 프리필
- URL 파라미터로 `cardId` 전달: `router.push({ pathname: '/(modals)/edit-card', params: { cardId } })`
- 편집 가능 필드: 카드 이름, 결제일, 결제계좌, 체크카드 연결계좌, 카드 색상
- **편집 불가 필드**: 카드사, 카드 종류 (credit/debit/prepaid) — 이 값들은 다른 기록과 연결되어 있으므로 변경 시 데이터 정합성 문제
- 저장 시 `cardStore.updateCard(id, updates)` 호출

**card-list.tsx 수정:**
- 편집 모드에서 각 카드에 편집 아이콘(연필) 추가
- 탭 시 edit-card 화면으로 이동

---

## 구현 순서 (의존성 기준)

1. **기능 3 — 카드 편집** (독립적, 가장 간단)
2. **기능 1 — 체크카드 연결계좌 차감** (기존 코드 수정)
3. **기능 2 — 고정비용 시스템** (가장 큰 작업, 새 타입/스토어/화면 생성)

---

## 확인 사항 (사용자 결정 필요)

1. **신용카드 결제일 자동 차감**: 이번에 구현할지, 아니면 향후 별도로 할지?
   - 구현 시: 매월 결제일에 해당 청구기간의 신용카드 지출 합계를 `linkedAssetId` 계좌에서 차감
   - 복잡도가 높음 (결제일/산정기간 계산, 할부 분할 등)

2. **고정비용 알림**: 결제일 전날 알림을 보낼지?
   - 이미 대출/할부 알림 시스템이 있으므로 같은 구조로 추가 가능

3. **카드 편집에서 카드사/카드종류 변경 허용**:
   - 허용 시: 기존 기록과의 정합성 체크 필요
   - 비허용 추천: 카드 삭제 후 새로 등록하도록 안내
