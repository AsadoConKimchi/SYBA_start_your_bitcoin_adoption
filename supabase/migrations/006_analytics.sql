-- 006: 기본 분석 이벤트 테이블
-- 최소한의 이벤트만 추적 (프라이버시 우선)

CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type_date ON app_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON app_events (user_id) WHERE user_id IS NOT NULL;

-- DAU 뷰
CREATE OR REPLACE VIEW v_daily_active_users AS
SELECT
  created_at::date AS day,
  COUNT(DISTINCT user_id) AS dau
FROM app_events
WHERE event_type = 'app_open' AND user_id IS NOT NULL
GROUP BY created_at::date
ORDER BY day DESC;

-- 전환 퍼널 뷰 (최근 30일)
CREATE OR REPLACE VIEW v_conversion_funnel AS
SELECT
  COUNT(*) FILTER (WHERE event_type = 'subscription_view') AS viewed_subscription,
  COUNT(*) FILTER (WHERE event_type = 'payment_start') AS started_payment,
  COUNT(*) FILTER (WHERE event_type = 'payment_complete') AS completed_payment
FROM app_events
WHERE created_at >= now() - interval '30 days';
