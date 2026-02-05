export interface FiatAsset {
  id: string;
  type: 'fiat';
  name: string;
  balance: number;
  currency: 'KRW';
  // 마이너스통장 관련
  isOverdraft?: boolean;           // 마이너스통장 여부
  creditLimit?: number;            // 한도 (양수로 저장, 예: 10000000)
  interestRate?: number;           // 연이자율 (%, 예: 10.5)
  estimatedInterest?: number;      // 사용자가 수정한 예상 이자 (null이면 자동 계산)
  updatedAt: string;
  createdAt: string;
}

export interface BitcoinAsset {
  id: string;
  type: 'bitcoin';
  name: string;
  balance: number; // sats
  walletType: 'onchain' | 'lightning';
  updatedAt: string;
  createdAt: string;
}

export type Asset = FiatAsset | BitcoinAsset;

export function isFiatAsset(asset: Asset): asset is FiatAsset {
  return asset.type === 'fiat';
}

export function isBitcoinAsset(asset: Asset): asset is BitcoinAsset {
  return asset.type === 'bitcoin';
}
