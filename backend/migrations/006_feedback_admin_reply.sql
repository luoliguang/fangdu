-- 已有 feedbacks 由 001 创建；增加管理员回复字段，保留全部历史留言。
ALTER TABLE feedbacks ADD COLUMN admin_reply TEXT;
