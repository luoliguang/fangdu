const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'my_materials.db');
const db = new sqlite3.Database(dbPath);

const statements = [
  'ALTER TABLE materials ADD COLUMN view_count INTEGER DEFAULT 0',
  'ALTER TABLE visits ADD COLUMN referrer_source TEXT',
  `CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    page TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_search_logs_keyword_time ON search_logs(keyword, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_search_logs_session_time ON search_logs(session_id, created_at)'
];

function runStatement(index = 0) {
  if (index >= statements.length) {
    verify();
    return;
  }

  const sql = statements[index];
  db.run(sql, (err) => {
    if (err) {
      if (/duplicate column name/i.test(err.message)) {
        console.log(`skip duplicate: ${sql}`);
      } else {
        console.error(`failed: ${sql} => ${err.message}`);
      }
    } else {
      console.log(`ok: ${sql}`);
    }

    runStatement(index + 1);
  });
}

function verify() {
  db.all('PRAGMA table_info(materials)', [], (e1, mcols = []) => {
    db.all('PRAGMA table_info(visits)', [], (e2, vcols = []) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='search_logs'", [], (e3, tables = []) => {
        db.all("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_search_logs_keyword_time','idx_search_logs_session_time')", [], (e4, indexes = []) => {
          const result = {
            dbPath,
            materials_has_view_count: mcols.some(c => c.name === 'view_count'),
            visits_has_referrer_source: vcols.some(c => c.name === 'referrer_source'),
            search_logs_table_exists: tables.length > 0,
            indexes: indexes.map(i => i.name),
            errors: [e1?.message, e2?.message, e3?.message, e4?.message].filter(Boolean)
          };

          console.log(JSON.stringify(result, null, 2));
          db.close();
        });
      });
    });
  });
}

runStatement();
