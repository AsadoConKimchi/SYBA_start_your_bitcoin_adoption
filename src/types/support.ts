// 고객지원 티켓 타입 정의

export type TicketCategory = 'payment' | 'subscription' | 'bug' | 'feature' | 'account' | 'other';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  user_id: string;
  display_id: string | null;
  user_email: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  message_count?: number;
  last_message?: string;
  last_sender?: 'user' | 'admin';
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export const TICKET_CATEGORIES: TicketCategory[] = [
  'payment', 'subscription', 'bug', 'feature', 'account', 'other',
];
