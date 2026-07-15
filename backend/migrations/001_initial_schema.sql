-- 初始完整 schema（新环境一次性建表）
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  tags TEXT,
  media_type TEXT NOT NULL,
  cover_image_path TEXT,
  view_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  session_id TEXT,
  visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  page TEXT,
  user_agent TEXT,
  referrer TEXT
);

CREATE TABLE IF NOT EXISTS online_sessions (
  session_id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  page TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_ip_time ON visits(ip_address, visit_time);
CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_online_sessions_heartbeat ON online_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword_time ON search_logs(keyword, created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_session_time ON search_logs(session_id, created_at);
