/**
 * 업비트 WebSocket 실시간 시세 서비스
 *
 * 사용법:
 * - connectWebSocket(callback): 연결 시작, 가격 업데이트 시 callback 호출
 * - disconnectWebSocket(): 연결 해제
 * - isConnected(): 연결 상태 확인
 */

const UPBIT_WS_URL = 'wss://api.upbit.com/websocket/v1';

type PriceCallback = (price: number) => void;

let ws: WebSocket | null = null;
let priceCallback: PriceCallback | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let isManualDisconnect = false;

// 연결 상태 확인
export function isWebSocketConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

// WebSocket 연결
export function connectWebSocket(onPriceUpdate: PriceCallback): void {
  // 이미 연결 중이면 콜백만 업데이트
  if (isWebSocketConnected()) {
    priceCallback = onPriceUpdate;
    return;
  }

  // 이전 연결 정리
  cleanupConnection();

  isManualDisconnect = false;
  priceCallback = onPriceUpdate;

  try {
    ws = new WebSocket(UPBIT_WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('[Upbit WS] 연결됨');

      // BTC/KRW 구독 요청
      const subscribeMessage = JSON.stringify([
        { ticket: `syba-${Date.now()}` },
        { type: 'ticker', codes: ['KRW-BTC'] },
      ]);

      ws?.send(subscribeMessage);
    };

    ws.onmessage = (event: WebSocketMessageEvent) => {
      try {
        let data: any;

        // React Native에서는 ArrayBuffer로 올 수 있음
        if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(event.data);
          data = JSON.parse(text);
        } else if (typeof event.data === 'string') {
          data = JSON.parse(event.data);
        } else if (typeof event.data === 'object') {
          // 이미 객체인 경우
          data = event.data;
        } else {
          return;
        }

        // ticker 타입만 처리
        if (data.type === 'ticker' && data.code === 'KRW-BTC') {
          const price = data.trade_price;
          if (price && priceCallback) {
            priceCallback(price);
          }
        }
      } catch (error) {
        // 파싱 에러는 무시 (status 메시지 등)
      }
    };

    ws.onerror = (error) => {
      console.error('[Upbit WS] 에러:', error);
    };

    ws.onclose = (event) => {
      console.log('[Upbit WS] 연결 종료:', event.code, event.reason);
      ws = null;

      // 수동 종료가 아니면 재연결 시도
      if (!isManualDisconnect) {
        scheduleReconnect();
      }
    };
  } catch (error) {
    console.error('[Upbit WS] 연결 실패:', error);
    scheduleReconnect();
  }
}

// WebSocket 연결 해제
export function disconnectWebSocket(): void {
  isManualDisconnect = true;
  cleanupConnection();
  console.log('[Upbit WS] 수동 연결 해제');
}

// 연결 정리
function cleanupConnection(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }

  priceCallback = null;
}

// 재연결 스케줄
function scheduleReconnect(): void {
  if (isManualDisconnect || reconnectTimeout) {
    return;
  }

  console.log('[Upbit WS] 5초 후 재연결 시도...');

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    if (!isManualDisconnect && priceCallback) {
      connectWebSocket(priceCallback);
    }
  }, 5000);
}
