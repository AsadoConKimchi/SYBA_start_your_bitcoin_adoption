export interface Installment {
  id: string;
  cardId: string;
  storeName: string;
  totalAmount: number;
  months: number;
  interestRate: number; // 0.00 ~ 1.00
  monthlyPayment: number;
  startDate: string; // YYYY-MM-DD
  paidMonths: number;
  isAutoPaidMonths: boolean;
  isCompleted: boolean;
  registeredAt: string;
  initialPaidMonths: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentRate {
  months: number;
  rate: number;
}

export interface InstallmentRateData {
  rates: Record<string, InstallmentRate[]>;
  updatedAt?: string;
}
