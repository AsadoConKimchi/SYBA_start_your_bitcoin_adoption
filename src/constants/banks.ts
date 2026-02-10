import i18n from '../i18n';
import { getCurrentRegion } from '../regions';

// Legacy Korean bank list (kept for backward compatibility)
export const BANKS = [
  { id: 'kb', name: 'KB국민은행' },
  { id: 'shinhan', name: '신한은행' },
  { id: 'woori', name: '우리은행' },
  { id: 'hana', name: '하나은행' },
  { id: 'nh', name: 'NH농협은행' },
  { id: 'ibk', name: 'IBK기업은행' },
  { id: 'sc', name: 'SC제일은행' },
  { id: 'citi', name: '한국씨티은행' },
  { id: 'kdb', name: 'KDB산업은행' },
  { id: 'suhyup', name: '수협은행' },
  { id: 'kfcc', name: '새마을금고' },
  { id: 'cu', name: '신협' },
  { id: 'post', name: '우체국' },
  { id: 'kakao', name: '카카오뱅크' },
  { id: 'toss', name: '토스뱅크' },
  { id: 'kbank', name: '케이뱅크' },
  { id: 'etc', name: '기타' },
] as const;

export type BankId = string;

export function getBankById(id: string) {
  const region = getCurrentRegion();
  return region.banks.find((b) => b.id === id);
}

export function getBankName(id: string): string {
  return i18n.t(`banks.${id}`, { defaultValue: id });
}
