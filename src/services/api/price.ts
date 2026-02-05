import { fetchCurrentBtcKrw } from './upbit';
import { fetchBtcUsdt } from './okx';
import { fetchUsdKrw } from './exchangeRate';
import { calculateKimchiPremium } from '../../utils/calculations';
import { PriceCache } from '../../types/settings';

// 모든 시세 한 번에 조회
export async function fetchAllPrices(): Promise<PriceCache> {
  const [btcKrw, btcUsdt, usdKrw] = await Promise.all([
    fetchCurrentBtcKrw(),
    fetchBtcUsdt(),
    fetchUsdKrw(),
  ]);

  const kimchiPremium = calculateKimchiPremium(btcKrw, btcUsdt, usdKrw);

  return {
    btcKrw,
    btcUsdt,
    usdKrw,
    kimchiPremium,
    updatedAt: new Date().toISOString(),
  };
}
