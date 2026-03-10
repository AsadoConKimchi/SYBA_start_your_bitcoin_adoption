// 대출 상환 기록 (사전 생성 스케줄 + 실제 납부 기록)
export interface RepaymentRecord {
  id: string;
  loanId: string;
  month: number;           // 회차 (1-based)
  date: string;            // YYYY-MM-DD (예정일)
  principal: number;       // 원금 상환액
  interest: number;        // 이자
  total: number;           // 총 납부액
  remainingPrincipal: number; // 잔여 원금
  status: 'paid' | 'scheduled' | 'overdue';
  paidAt?: string;         // 실제 납부 시각 (ISO)
}
