// Blink API 프록시 클라이언트
// Deno Deploy 프록시를 통해 Blink API 호출 (API 키 서버 보관)
// WebSocket 결제 확인 지원 + HTTP 폴링 fallback

import Constants from 'expo-constants';

export interface LightningInvoice {
  paymentHash: string;
  paymentRequest: string;
  satoshis: number;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED';

// Deno Deploy 프록시 URL
const BLINK_PROXY_URL =
  Constants.expoConfig?.extra?.blinkProxyUrl ||
  process.env.EXPO_PUBLIC_BLINK_PROXY_URL ||
  '';

// WebSocket URL (https → wss)
const BLINK_PROXY_WS_URL = BLINK_PROXY_URL
  ? BLINK_PROXY_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  : '';

// HTTP 호출 헬퍼
async function callBlinkProxy<T>(
  action: string,
  params?: Record<string, unknown>
): Promise<T> {
  if (!BLINK_PROXY_URL) {
    throw new Error('BLINK_PROXY_URL not configured');
  }

  const response = await fetch(BLINK_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    throw new Error(`Blink proxy error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.data;
}

// 지갑 정보 조회
export async function getWalletInfo() {
  return callBlinkProxy<Array<{
    id: string;
    walletCurrency: string;
    balance: number;
  }>>('getWalletInfo');
}

// Lightning Invoice 생성
export async function createLightningInvoice(
  amountSats: number,
  memo?: string
): Promise<LightningInvoice> {
  return callBlinkProxy<LightningInvoice>('createInvoice', {
    amountSats,
    memo,
  });
}

// 결제 상태 확인 (HTTP)
export async function checkPaymentStatus(paymentRequest: string): Promise<PaymentStatus> {
  return callBlinkProxy<PaymentStatus>('checkPaymentStatus', {
    paymentRequest,
  });
}

// WebSocket으로 결제 대기 (즉시 확인)
export function waitForPaymentWs(
  paymentRequest: string,
  onStatusChange?: (status: PaymentStatus) => void,
  maxWaitMs: number = 10 * 60 * 1000,
): Promise<boolean> {
  // WebSocket URL이 없으면 폴링 fallback
  if (!BLINK_PROXY_WS_URL) {
    console.log('[BlinkProxy] WebSocket URL 없음, 폴링 fallback');
    return waitForPayment(paymentRequest, onStatusChange, maxWaitMs);
  }

  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let isResolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      ws = null;
    };

    const resolveOnce = (value: boolean) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(value);
    };

    // 타임아웃
    timeoutId = setTimeout(() => {
      console.log('[BlinkProxy WS] 타임아웃');
      resolveOnce(false);
    }, maxWaitMs);

    try {
      ws = new WebSocket(BLINK_PROXY_WS_URL, 'graphql-transport-ws');

      ws.onopen = () => {
        console.log('[BlinkProxy WS] 연결됨');
        ws?.send(JSON.stringify({
          type: 'connection_init',
          payload: {},
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connection_ack') {
            console.log('[BlinkProxy WS] 인증 완료, subscription 시작');
            ws?.send(JSON.stringify({
              id: '1',
              type: 'subscribe',
              payload: {
                query: `subscription LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
                  lnInvoicePaymentStatus(input: $input) {
                    status
                    errors {
                      message
                    }
                  }
                }`,
                variables: {
                  input: { paymentRequest },
                },
              },
            }));
          }

          if (msg.type === 'next' && msg.payload?.data?.lnInvoicePaymentStatus) {
            const status = msg.payload.data.lnInvoicePaymentStatus.status as PaymentStatus;
            console.log('[BlinkProxy WS] 결제 상태:', status);

            if (onStatusChange) {
              onStatusChange(status);
            }

            if (status === 'PAID') {
              resolveOnce(true);
            } else if (status === 'EXPIRED') {
              resolveOnce(false);
            }
          }

          if (msg.type === 'error') {
            console.error('[BlinkProxy WS] GraphQL 에러:', msg.payload);
            // WebSocket 에러 시 폴링 fallback
            cleanup();
            console.log('[BlinkProxy WS] 폴링 fallback');
            waitForPayment(paymentRequest, onStatusChange, maxWaitMs).then(resolveOnce);
          }
        } catch (error) {
          console.error('[BlinkProxy WS] 메시지 파싱 에러:', error);
        }
      };

      ws.onerror = () => {
        console.error('[BlinkProxy WS] 연결 에러, 폴링 fallback');
        if (!isResolved) {
          cleanup();
          waitForPayment(paymentRequest, onStatusChange, maxWaitMs).then(resolveOnce);
        }
      };

      ws.onclose = () => {
        console.log('[BlinkProxy WS] 연결 종료');
        // 정상 종료가 아니면 (resolve 안 됐으면) 폴링 fallback
        if (!isResolved) {
          console.log('[BlinkProxy WS] 비정상 종료, 폴링 fallback');
          waitForPayment(paymentRequest, onStatusChange, maxWaitMs).then(resolveOnce);
        }
      };
    } catch (error) {
      console.error('[BlinkProxy WS] WebSocket 생성 실패, 폴링 fallback:', error);
      waitForPayment(paymentRequest, onStatusChange, maxWaitMs).then(resolveOnce);
    }
  });
}

// 폴링 방식으로 결제 대기 (fallback)
export async function waitForPayment(
  paymentRequest: string,
  onStatusChange?: (status: PaymentStatus) => void,
  maxWaitMs: number = 10 * 60 * 1000,
  pollIntervalMs: number = 1500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await checkPaymentStatus(paymentRequest);

      if (onStatusChange) {
        onStatusChange(status);
      }

      if (status === 'PAID') {
        return true;
      }

      if (status === 'EXPIRED') {
        return false;
      }
    } catch (error) {
      console.error('[BlinkProxy] 상태 확인 실패:', error);
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}
