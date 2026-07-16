CREATE TABLE IF NOT EXISTS ip_locations (
  ip      TEXT PRIMARY KEY,
  country TEXT DEFAULT '',
  region  TEXT DEFAULT '',
  city    TEXT DEFAULT '',
  isp     TEXT DEFAULT '',
  queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ip_locations_ip ON ip_locations(ip);
