/**
 * 앱 설정 서비스
 * Supabase에서 동적 설정값을 가져옴
 */

import { supabase } from './supabase';
import { CONFIG } from '../constants/config';

// 캐시 (앱 실행 중 반복 요청 방지)
let cachedSubscriptionPrice: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5분

/**
 * 구독 가격 조회 (Supabase에서 가져오고, 실패 시 기본값 사용)
 */
export async function getSubscriptionPriceSats(): Promise<number> {
  // 캐시 확인
  if (cachedSubscriptionPrice && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedSubscriptionPrice;
  }

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'subscription_price_sats')
      .single();

    if (error || !data) {
      console.log('[AppConfig] Supabase 조회 실패, 기본값 사용:', error?.message);
      return CONFIG.SUBSCRIPTION_PRICE_SATS; // 폴백
    }

    const price = parseInt(data.value, 10);
    if (isNaN(price) || price <= 0) {
      console.log('[AppConfig] 잘못된 가격 값, 기본값 사용');
      return CONFIG.SUBSCRIPTION_PRICE_SATS; // 폴백
    }

    // 캐시 업데이트
    cachedSubscriptionPrice = price;
    cacheTimestamp = Date.now();

    console.log('[AppConfig] 구독 가격:', price, 'sats');
    return price;
  } catch (error) {
    console.error('[AppConfig] 에러:', error);
    return CONFIG.SUBSCRIPTION_PRICE_SATS; // 폴백
  }
}

/**
 * 캐시 초기화 (설정 변경 후 즉시 반영 필요 시)
 */
export function clearConfigCache(): void {
  cachedSubscriptionPrice = null;
  cacheTimestamp = 0;
}
