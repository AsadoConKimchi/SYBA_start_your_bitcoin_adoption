import { AutoLockTime } from '../constants/config';

export interface PriceCache {
  btcKrw: number;
  btcUsdt: number;
  usdKrw: number;
  kimchiPremium: number;
  updatedAt: string;
}

export type DisplayUnit = 'BTC' | 'KRW';

export interface AppSettings {
  autoLockTime: AutoLockTime;
  biometricEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm"
  paymentReminderEnabled: boolean;
  monthlyReportEnabled: boolean;
  subscriptionNotificationEnabled: boolean; // 구독 만료 알림
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en' | 'es';
  lastPriceCache: PriceCache | null;
  userName: string | null;
  displayUnit: DisplayUnit; // 기본 표시 단위 (BTC=sats 메인, KRW=원화 메인)
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockTime: '5min',
  biometricEnabled: false,
  dailyReminderEnabled: true,
  dailyReminderTime: '21:00',
  paymentReminderEnabled: true,
  monthlyReportEnabled: true,
  subscriptionNotificationEnabled: true,
  theme: 'light',
  language: 'ko',
  lastPriceCache: null,
  userName: null,
  displayUnit: 'BTC', // 기본값: sats 메인 표시
};
