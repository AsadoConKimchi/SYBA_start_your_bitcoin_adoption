import { RepaymentType, RepaymentSchedule } from '../types/debt';

/**
 * 할부 월 납부액 계산
 * @param totalAmount 총 결제 금액
 * @param months 할부 개월 수
 * @param isInterestFree 무이자 여부
 * @param annualRate 연 이자율 (%, 유이자인 경우)
 */
export function calculateInstallmentPayment(
  totalAmount: number,
  months: number,
  isInterestFree: boolean,
  annualRate: number = 0
): { monthlyPayment: number; totalInterest: number } {
  if (isInterestFree || annualRate === 0) {
    // 무이자: 정확한 나눗셈 (반올림으로 오차 최소화)
    const monthlyPayment = Math.round(totalAmount / months);
    return {
      monthlyPayment,
      totalInterest: 0,
    };
  }

  // 유이자 할부: 원리금균등 방식으로 계산
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment =
    totalAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - totalAmount;

  return {
    monthlyPayment: Math.ceil(monthlyPayment),
    totalInterest: Math.ceil(totalInterest),
  };
}

/**
 * 대출 월 상환금 계산
 * @param principal 대출 원금
 * @param annualRate 연 이자율 (%)
 * @param months 대출 기간 (개월)
 * @param type 상환 방식
 */
export function calculateLoanPayment(
  principal: number,
  annualRate: number,
  months: number,
  type: RepaymentType
): { monthlyPayment: number; totalInterest: number } {
  const monthlyRate = annualRate / 100 / 12;

  switch (type) {
    case 'bullet': {
      // 만기일시상환: 매월 이자만 납부
      const monthlyInterest = Math.ceil(principal * monthlyRate);
      const totalInterest = monthlyInterest * months;
      return {
        monthlyPayment: monthlyInterest,
        totalInterest,
      };
    }

    case 'equalPrincipalAndInterest': {
      // 원리금균등상환: 매월 동일 금액
      if (monthlyRate === 0) {
        return {
          monthlyPayment: Math.ceil(principal / months),
          totalInterest: 0,
        };
      }

      const monthlyPayment =
        principal *
        (monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

      const totalPayment = monthlyPayment * months;
      const totalInterest = totalPayment - principal;

      return {
        monthlyPayment: Math.ceil(monthlyPayment),
        totalInterest: Math.ceil(totalInterest),
      };
    }

    case 'equalPrincipal': {
      // 원금균등상환: 첫 달 기준 (실제는 매월 감소)
      const monthlyPrincipal = principal / months;
      const firstMonthInterest = principal * monthlyRate;
      const firstMonthPayment = monthlyPrincipal + firstMonthInterest;

      // 총 이자 계산 (잔액 * 월이자율의 합)
      let totalInterest = 0;
      let remaining = principal;
      for (let i = 0; i < months; i++) {
        totalInterest += remaining * monthlyRate;
        remaining -= monthlyPrincipal;
      }

      return {
        monthlyPayment: Math.ceil(firstMonthPayment), // 첫 달 금액 (참고용)
        totalInterest: Math.ceil(totalInterest),
      };
    }

    default:
      return { monthlyPayment: 0, totalInterest: 0 };
  }
}

/**
 * 대출 상환 스케줄 생성
 */
export function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  months: number,
  type: RepaymentType,
  startDate: string
): RepaymentSchedule[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: RepaymentSchedule[] = [];
  let remaining = principal;
  const start = new Date(startDate);

  switch (type) {
    case 'bullet': {
      const monthlyInterest = Math.ceil(principal * monthlyRate);
      for (let i = 1; i <= months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);

        const isLastMonth = i === months;
        schedule.push({
          month: i,
          date: date.toISOString().split('T')[0],
          principal: isLastMonth ? principal : 0,
          interest: monthlyInterest,
          total: isLastMonth ? principal + monthlyInterest : monthlyInterest,
          remainingPrincipal: isLastMonth ? 0 : principal,
        });
      }
      break;
    }

    case 'equalPrincipalAndInterest': {
      const monthlyPayment =
        monthlyRate === 0
          ? principal / months
          : principal *
            (monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1);

      for (let i = 1; i <= months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);

        const interest = remaining * monthlyRate;
        const principalPayment = monthlyPayment - interest;
        remaining -= principalPayment;

        schedule.push({
          month: i,
          date: date.toISOString().split('T')[0],
          principal: Math.ceil(principalPayment),
          interest: Math.ceil(interest),
          total: Math.ceil(monthlyPayment),
          remainingPrincipal: Math.max(0, Math.ceil(remaining)),
        });
      }
      break;
    }

    case 'equalPrincipal': {
      const monthlyPrincipal = principal / months;

      for (let i = 1; i <= months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);

        const interest = remaining * monthlyRate;
        remaining -= monthlyPrincipal;

        schedule.push({
          month: i,
          date: date.toISOString().split('T')[0],
          principal: Math.ceil(monthlyPrincipal),
          interest: Math.ceil(interest),
          total: Math.ceil(monthlyPrincipal + interest),
          remainingPrincipal: Math.max(0, Math.ceil(remaining)),
        });
      }
      break;
    }
  }

  return schedule;
}

/**
 * 할부/대출 종료일 계산
 */
export function calculateEndDate(startDate: string, months: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

/**
 * 시작일 기준 납부한 개월 수 자동 계산
 */
export function calculatePaidMonths(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();

  const yearDiff = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();

  const totalMonths = yearDiff * 12 + monthDiff;
  return Math.max(0, totalMonths);
}

/**
 * 이번 달 납부 예정인지 확인
 */
export function isDueThisMonth(startDate: string, paidMonths: number): boolean {
  const start = new Date(startDate);
  const nextPaymentDate = new Date(start);
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + paidMonths + 1);

  const now = new Date();
  return (
    nextPaymentDate.getFullYear() === now.getFullYear() &&
    nextPaymentDate.getMonth() === now.getMonth()
  );
}
