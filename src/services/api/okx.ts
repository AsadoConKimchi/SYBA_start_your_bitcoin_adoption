const OKX_BASE_URL = 'https://www.okx.com/api/v5';

interface OkxResponse {
  code: string;
  data: { instId: string; last: string }[];
}

// BTC/USDT 시세
export async function fetchBtcUsdt(): Promise<number> {
  const response = await fetch(
    `${OKX_BASE_URL}/market/ticker?instId=BTC-USDT`
  );

  if (!response.ok) {
    throw new Error('OKX API 오류');
  }

  const data: OkxResponse = await response.json();

  if (data.code !== '0' || data.data.length === 0) {
    throw new Error('OKX 데이터 없음');
  }

  return parseFloat(data.data[0].last);
}
