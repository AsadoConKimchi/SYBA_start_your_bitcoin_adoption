// 고객지원 티켓 서비스
// Supabase Edge Function 'support-tickets'를 통해 접근

import { SUPABASE_CONFIG } from '../constants/supabase';
import { captureError } from './errorReporting';
import type { SupportTicket, TicketMessage, TicketCategory } from '../types/support';

const EDGE_FUNCTION_URL = SUPABASE_CONFIG.URL
  ? `${SUPABASE_CONFIG.URL}/functions/v1/support-tickets`
  : '';

/** Edge Function 호출 헬퍼 */
async function callSupportApi<T>(
  action: string,
  params: Record<string, unknown>,
): Promise<T | null> {
  if (!EDGE_FUNCTION_URL || !SUPABASE_CONFIG.ANON_KEY) {
    return null;
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
      },
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Support API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown support API error');
    }

    return data.data as T;
  } catch (error) {
    captureError(error, { context: `support-tickets/${action}` });
    return null;
  }
}

/** 티켓 생성 */
export async function createTicket(
  userId: string,
  category: TicketCategory,
  subject: string,
  message: string,
): Promise<SupportTicket | null> {
  return callSupportApi<SupportTicket>('create_ticket', {
    userId,
    category,
    subject,
    message,
  });
}

/** 내 티켓 목록 조회 */
export async function getMyTickets(userId: string): Promise<SupportTicket[]> {
  const result = await callSupportApi<SupportTicket[]>('list_tickets', { userId });
  return result ?? [];
}

/** 티켓 메시지 조회 */
export async function getTicketMessages(
  userId: string,
  ticketId: string,
): Promise<TicketMessage[]> {
  const result = await callSupportApi<TicketMessage[]>('get_ticket', {
    userId,
    ticketId,
  });
  return result ?? [];
}

/** 메시지 추가 */
export async function addTicketMessage(
  userId: string,
  ticketId: string,
  message: string,
): Promise<TicketMessage | null> {
  return callSupportApi<TicketMessage>('add_message', {
    userId,
    ticketId,
    message,
  });
}
