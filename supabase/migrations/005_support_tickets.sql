-- 005: 인앱 고객지원 티켓 시스템
-- support_tickets + ticket_messages 테이블

-- 1. 티켓 테이블
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  display_id VARCHAR(8),
  user_email TEXT,
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'payment', 'subscription', 'bug', 'feature', 'account', 'other'
  )),
  subject TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'waiting_user', 'resolved', 'closed'
  )),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'low', 'normal', 'high', 'urgent'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. 티켓 메시지 테이블
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 인덱스
CREATE INDEX idx_tickets_user ON support_tickets (user_id);
CREATE INDEX idx_tickets_status ON support_tickets (status);
CREATE INDEX idx_tickets_created ON support_tickets (created_at DESC);
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages (ticket_id);

-- 4. 메시지 추가 시 티켓 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ticket_timestamp
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamp();

-- 5. 관리자용 티켓 개요 뷰
CREATE OR REPLACE VIEW v_ticket_overview AS
SELECT
  t.id,
  t.display_id,
  t.user_email,
  t.category,
  t.subject,
  t.status,
  t.priority,
  t.created_at,
  t.updated_at,
  t.resolved_at,
  u.linking_key,
  (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count,
  (SELECT tm.message FROM ticket_messages tm
   WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS last_message,
  (SELECT tm.sender_type FROM ticket_messages tm
   WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS last_sender
FROM support_tickets t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY
  CASE t.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    ELSE 4
  END,
  t.updated_at DESC;

-- 6. 관리자 RPC: 티켓 상태 변경
CREATE OR REPLACE FUNCTION admin_update_ticket_status(
  p_ticket_id UUID,
  p_status VARCHAR,
  p_priority VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE support_tickets
  SET
    status = p_status,
    priority = COALESCE(p_priority, priority),
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE resolved_at END,
    updated_at = now()
  WHERE id = p_ticket_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
