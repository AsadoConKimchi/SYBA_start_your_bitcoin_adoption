// 최소한의 분석 이벤트 추적
// 프라이버시 우선: PII 미포함, 5개 이벤트만, opt-out 가능

import { supabase } from './supabase';

type EventType =
  | 'app_open'
  | 'subscription_view'
  | 'payment_start'
  | 'payment_complete'
  | 'ticket_created';

interface PendingEvent {
  event_type: EventType;
  user_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

let eventQueue: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let analyticsEnabled = true;

const FLUSH_INTERVAL_MS = 30_000; // 30초
const MAX_QUEUE_SIZE = 20;

/** 분석 활성화/비활성화 */
export function setAnalyticsEnabled(enabled: boolean): void {
  analyticsEnabled = enabled;
  if (!enabled) {
    eventQueue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
}

/** 이벤트 추적 (fire and forget) */
export function trackEvent(
  eventType: EventType,
  userId?: string,
  metadata?: Record<string, unknown>,
): void {
  if (!analyticsEnabled || !supabase) return;

  eventQueue.push({
    event_type: eventType,
    user_id: userId,
    metadata,
    created_at: new Date().toISOString(),
  });

  // 큐가 가득 차면 즉시 전송
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
    return;
  }

  // 타이머 설정
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL_MS);
  }
}

/** 큐에 쌓인 이벤트 일괄 전송 */
export async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!supabase || eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  try {
    await supabase.from('app_events').insert(batch);
  } catch {
    // 전송 실패 시 무시 (분석은 best-effort)
  }
}
