const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MigrationService = require('../services/MigrationService');

// 自动清理配置（默认关闭）。管理员可改为 true 启用按天自动清理旧 visits。
const AUTO_CLEAN_VISITS = false;

class DatabaseConfig {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'database', 'my_materials.db');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[数据库日志] 正在尝试连接数据库，完整路径: ${this.dbPath}`);
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
          reject(err);
        } else {
          console.log('成功连接到多媒体数据库.');
          resolve(this.db);
        }
      });
    });
  }

  async insertTestData() {
    return new Promise((resolve) => {
      this.db.get('SELECT COUNT(*) as count FROM materials', [], (err, row) => {
        if (err || row.count > 0) {
          resolve();
          return;
        }

        console.log('数据库为空，正在插入测试数据...');
        const materialsToInsert = [
          { name: '130克小方格速干', path: '/uploads/sample1.jpg', tags: '面料,速干,130克', type: 'image' },
          { name: '珠地棉细节展示', path: '/uploads/sample_video.mp4', tags: '面料,棉,视频', type: 'video' },
          { name: '圆领基础款T恤', path: '/uploads/sample3.jpg', tags: '款式,T恤,圆领', type: 'image' },
          { name: '拉链连帽卫衣', path: '/uploads/sample4.jpg', tags: '款式,卫衣,拉链', type: 'image' }
        ];

        const insertSql = `INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)`;
        materialsToInsert.forEach((m) => {
          this.db.run(insertSql, [m.name, m.path, m.tags, m.type]);
        });

        resolve();
      });
    });
  }

  setupCleanupTask() {
    const cleanupOldVisits = () => {
      this.db.run(`DELETE FROM visits WHERE visit_time < datetime('now', '-30 days')`, function (err) {
        if (err) console.error('清理过期访问记录失败:', err.message);
        else console.log(`cleanupOldVisits deleted ${this.changes} rows`);
      });
    };

    const cleanupExpiredSessions = () => {
      this.db.run(
        `DELETE FROM online_sessions WHERE last_heartbeat < datetime('now', '-2 minutes')`,
        (err) => { if (err) console.error('清理过期在线会话失败:', err.message); }
      );
    };

    if (AUTO_CLEAN_VISITS) {
      setInterval(cleanupOldVisits, 24 * 60 * 60 * 1000);
      cleanupOldVisits();
    }
    setInterval(cleanupExpiredSessions, 60 * 1000);
    cleanupExpiredSessions();
  }

  async initialize() {
    try {
      await this.connect();

      // 执行所有待运行的 SQL 迁移文件
      const migrationService = new MigrationService(this.db);
      await migrationService.run();

      await this.insertTestData();
      this.setupCleanupTask();
      console.log('✅ 数据库初始化完成');
      return this.db;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  getDatabase() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) console.error('关闭数据库连接失败:', err.message);
        else console.log('数据库连接已关闭.');
      });
    }
  }
}

module.exports = DatabaseConfig;
