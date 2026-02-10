import i18n from '../i18n';
import { getCurrentRegion } from '../regions';

// Legacy Korean card companies (kept for type backward compatibility)
export const CARD_COMPANIES = [
  { id: 'samsung', name: '삼성카드', color: '#1428A0' },
  { id: 'shinhan', name: '신한카드', color: '#E60012' },
  { id: 'kb', name: 'KB국민카드', color: '#FFBC00' },
  { id: 'hyundai', name: '현대카드', color: '#000000' },
  { id: 'lotte', name: '롯데카드', color: '#E60012' },
  { id: 'woori', name: '우리카드', color: '#0066B3' },
  { id: 'hana', name: '하나카드', color: '#009490' },
  { id: 'nh', name: 'NH농협카드', color: '#00A651' },
  { id: 'bc', name: 'BC카드', color: '#F15A22' },
  { id: 'kakao', name: '카카오뱅크', color: '#FFCD00' },
  { id: 'toss', name: '토스뱅크', color: '#0064FF' },
  { id: 'kbank', name: '케이뱅크', color: '#3182F6' },
  { id: 'etc', name: '기타', color: '#9CA3AF' },
] as const;

export type CardCompanyId = string;

export function getCardCompanyById(id: string) {
  // Search in current region first, then fall back to all regions
  const region = getCurrentRegion();
  return region.cardCompanies.find(c => c.id === id);
}

export function getCardCompanyColor(id: string): string {
  const region = getCurrentRegion();
  const found = region.cardCompanies.find(c => c.id === id);
  if (found) return found.color;
  // Fallback: search legacy Korean data
  const legacy = CARD_COMPANIES.find(c => c.id === id);
  return legacy?.color ?? '#9CA3AF';
}

export function getCardCompanyName(id: string): string {
  return i18n.t(`cardCompanies.${id}`, { defaultValue: id });
}
