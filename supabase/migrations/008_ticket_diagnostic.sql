-- 티켓에 진단 데이터 첨부 기능 추가
ALTER TABLE support_tickets ADD COLUMN diagnostic_data JSONB;
