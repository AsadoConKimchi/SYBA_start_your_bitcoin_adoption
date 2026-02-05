import * as Notifications from 'expo-notifications';
import { Loan, Installment } from '../types/debt';
import { LedgerRecord } from '../types/ledger';
import { generateRepaymentSchedule } from '../utils/debtCalculator';

// 알림 식별자
const LOAN_NOTIFICATION_PREFIX = 'loan_repayment_';
const INSTALLMENT_NOTIFICATION_PREFIX = 'installment_payment_';

/**
 * 대출 상환 알림 스케줄링
 */
export async function scheduleLoanRepaymentNotifications(loans: Loan[]): Promise<void> {
  // 기존 대출 알림 취소
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(LOAN_NOTIFICATION_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  for (const loan of loans) {
    if (loan.status !== 'active') continue;

    // 상환 스케줄에서 다음 상환일 찾기
    const schedule = generateRepaymentSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.repaymentType,
      loan.startDate
    );

    // 아직 상환 안 된 다음 회차
    const nextPayment = schedule.find((s) => s.month === loan.paidMonths + 1);
    if (!nextPayment) continue;

    const paymentDate = new Date(nextPayment.date);

    // 이번 달 또는 다음 달 상환 예정인 경우에만 알림
    if (
      paymentDate.getFullYear() > thisYear + 1 ||
      (paymentDate.getFullYear() === thisYear && paymentDate.getMonth() > thisMonth + 1)
    ) {
      continue;
    }

    // 상환일 하루 전 알림
    const notificationDate = new Date(paymentDate);
    notificationDate.setDate(notificationDate.getDate() - 1);
    notificationDate.setHours(10, 0, 0, 0);

    if (notificationDate > today) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LOAN_NOTIFICATION_PREFIX}${loan.id}`,
        content: {
          title: '대출 상환일 알림',
          body: `내일 "${loan.name}" 상환금 ${formatKrw(nextPayment.total)}이 예정되어 있습니다.`,
          data: { type: 'loan_repayment', loanId: loan.id },
        },
        trigger: { type: 'date', date: notificationDate } as Notifications.DateTriggerInput,
      });
    }

    // 상환일 당일 알림
    const sameDayNotification = new Date(paymentDate);
    sameDayNotification.setHours(9, 0, 0, 0);

    if (sameDayNotification > today) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LOAN_NOTIFICATION_PREFIX}${loan.id}_today`,
        content: {
          title: '오늘 대출 상환일입니다',
          body: `"${loan.name}" 상환금 ${formatKrw(nextPayment.total)}을 확인해주세요.`,
          data: { type: 'loan_repayment', loanId: loan.id },
        },
        trigger: { type: 'date', date: sameDayNotification } as Notifications.DateTriggerInput,
      });
    }
  }
}

/**
 * 할부 결제 알림 스케줄링
 */
export async function scheduleInstallmentPaymentNotifications(
  installments: Installment[],
  cardPaymentDays: Map<string, number> // cardId -> paymentDay
): Promise<void> {
  // 기존 할부 알림 취소
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(INSTALLMENT_NOTIFICATION_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // 카드별로 할부 그룹화
  const installmentsByCard = new Map<string, Installment[]>();
  for (const inst of installments) {
    if (inst.status !== 'active') continue;
    const list = installmentsByCard.get(inst.cardId) || [];
    list.push(inst);
    installmentsByCard.set(inst.cardId, list);
  }

  for (const [cardId, cardInstallments] of installmentsByCard) {
    const paymentDay = cardPaymentDays.get(cardId);
    if (!paymentDay) continue;

    // 이번 달 결제일
    let paymentDate = new Date(thisYear, thisMonth, paymentDay);
    if (paymentDate <= today) {
      // 이미 지났으면 다음 달
      paymentDate = new Date(thisYear, thisMonth + 1, paymentDay);
    }

    const totalPayment = cardInstallments.reduce((sum, i) => sum + i.monthlyPayment, 0);

    // 결제일 하루 전 알림
    const notificationDate = new Date(paymentDate);
    notificationDate.setDate(notificationDate.getDate() - 1);
    notificationDate.setHours(10, 0, 0, 0);

    if (notificationDate > today) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${INSTALLMENT_NOTIFICATION_PREFIX}${cardId}`,
        content: {
          title: '할부 결제일 알림',
          body: `내일 할부 ${cardInstallments.length}건, ${formatKrw(totalPayment)} 결제 예정입니다.`,
          data: { type: 'installment_payment', cardId },
        },
        trigger: { type: 'date', date: notificationDate } as Notifications.DateTriggerInput,
      });
    }
  }
}

/**
 * 대출 상환 자동 기록용 데이터 생성
 * @returns 생성에 필요한 지출 기록 데이터 (사용자가 확인/수정 가능)
 */
export function createLoanRepaymentRecordData(loan: Loan): {
  amount: number;
  category: string;
  date: string;
  paymentMethod: 'bank';
  memo: string;
  isAutoGenerated: boolean;
  linkedLoanId: string;
  paymentNumber: number;
  totalPayments: number;
  principal: number;
  interest: number;
} | null {
  if (loan.status !== 'active') return null;

  const schedule = generateRepaymentSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.repaymentType,
    loan.startDate
  );

  const nextPayment = schedule.find((s) => s.month === loan.paidMonths + 1);
  if (!nextPayment) return null;

  return {
    amount: nextPayment.total,
    category: '금융',
    date: nextPayment.date,
    paymentMethod: 'bank',
    memo: `${loan.name} 상환 (${nextPayment.month}/${loan.termMonths}회차)\n원금 ${formatKrw(nextPayment.principal)} + 이자 ${formatKrw(nextPayment.interest)}`,
    isAutoGenerated: true,
    linkedLoanId: loan.id,
    paymentNumber: nextPayment.month,
    totalPayments: loan.termMonths,
    principal: nextPayment.principal,
    interest: nextPayment.interest,
  };
}

/**
 * 오늘 상환 예정인 대출 목록
 */
export function getTodayLoanRepayments(loans: Loan[]): Loan[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return loans.filter((loan) => {
    if (loan.status !== 'active') return false;

    const schedule = generateRepaymentSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.repaymentType,
      loan.startDate
    );

    const nextPayment = schedule.find((s) => s.month === loan.paidMonths + 1);
    return nextPayment?.date === todayStr;
  });
}

/**
 * 이번 달 상환 예정인 대출 목록과 금액
 */
export function getThisMonthLoanRepayments(loans: Loan[]): { loan: Loan; payment: number; date: string }[] {
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  const result: { loan: Loan; payment: number; date: string }[] = [];

  for (const loan of loans) {
    if (loan.status !== 'active') continue;

    const schedule = generateRepaymentSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.repaymentType,
      loan.startDate
    );

    const nextPayment = schedule.find((s) => s.month === loan.paidMonths + 1);
    if (!nextPayment) continue;

    const paymentDate = new Date(nextPayment.date);
    if (paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear) {
      result.push({
        loan,
        payment: nextPayment.total,
        date: nextPayment.date,
      });
    }
  }

  return result;
}

// 헬퍼 함수
function formatKrw(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`;
  } else if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}
