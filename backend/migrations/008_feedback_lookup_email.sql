-- 只将主动填写查询邮箱的新需求纳入邮箱汇总；旧反馈不会自动公开。
ALTER TABLE feedbacks ADD COLUMN lookup_email TEXT;
CREATE INDEX IF NOT EXISTS idx_feedbacks_lookup_email_created ON feedbacks(lookup_email, created_at DESC);
