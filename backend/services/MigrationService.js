const fs = require('fs');
const path = require('path');

class MigrationService {
  constructor(db) {
    this.db = db;
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
  }

  async run() {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    const files = this.getMigrationFiles();

    let count = 0;
    for (const file of files) {
      if (!applied.includes(file)) {
        await this.runMigration(file);
        count++;
      }
    }

    if (count > 0) {
      console.log(`✅ 数据库迁移完成，共执行 ${count} 个迁移文件`);
    } else {
      console.log('✅ 数据库已是最新版本，无需迁移');
    }
  }

  async ensureMigrationsTable() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL UNIQUE,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async getAppliedMigrations() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT filename FROM schema_migrations ORDER BY filename',
        [],
        (err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.filename)))
      );
    });
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }
    return fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  }

  async runMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filepath, 'utf8');

    console.log(`📝 执行迁移: ${filename}`);

    const statements = sql
      .split(';')
      .map((s) =>
        // 去掉每条语句内的行注释，再整体 trim
        s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim()
      )
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await this.runStatement(statement, filename);
    }

    await new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [filename],
        (err) => (err ? reject(err) : resolve())
      );
    });

    console.log(`  ✓ ${filename}`);
  }

  async runStatement(statement, filename) {
    return new Promise((resolve, reject) => {
      this.db.run(statement, (err) => {
        if (err) {
          // 幂等性错误：目标状态已存在，视为成功
          if (
            err.message.includes('duplicate column name') ||
            err.message.includes('already exists')
          ) {
            console.log(`  ⚠️  跳过（已存在）: ${statement.substring(0, 60)}`);
            resolve();
          } else {
            reject(new Error(`迁移 ${filename} 执行失败: ${err.message}\nSQL: ${statement}`));
          }
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = MigrationService;
