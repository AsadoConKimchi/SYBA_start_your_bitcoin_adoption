-- 어드민 대시보드 토큰 기반 자동 로그인용 테이블
CREATE TABLE admin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL UNIQUE,
  linking_key VARCHAR(66) NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '5 minutes'
);

CREATE INDEX idx_admin_tokens_token ON admin_tokens(token);

-- 만료된 토큰 자동 정리용 (선택적 — cron job 또는 수동 실행)
-- DELETE FROM admin_tokens WHERE expires_at < now() - INTERVAL '1 day';
