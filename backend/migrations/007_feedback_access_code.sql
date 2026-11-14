-- 新提交的找图需求可凭一次发放的查询码在其他设备查看；只保存查询码的 SHA-256 哈希。
ALTER TABLE feedbacks ADD COLUMN access_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_access_token_hash ON feedbacks(access_token_hash);
