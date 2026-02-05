export interface MonthlySnapshot {
  id: string;
  yearMonth: string; // 'YYYY-MM' 형식

  // 자산
  totalFiat: number; // 원화 자산 총합
  totalBtcSats: number; // BTC sats 총합

  // 부채
  totalDebt: number; // 총 부채 (할부 + 대출)
  totalInstallments: number; // 할부 잔액
  totalLoans: number; // 대출 잔액

  // 시세 정보
  btcKrw: number | null; // 당시 BTC/KRW 시세

  // 계산된 값
  totalAssetKrw: number; // 총 자산 (원화 환산)
  netWorthKrw: number; // 순자산 (자산 - 부채)
  netWorthBtc: number; // 순자산 (BTC 환산, sats)

  // 메타
  createdAt: string;
}
