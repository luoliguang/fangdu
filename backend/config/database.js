const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * 数据库配置和连接管理
 */
class DatabaseConfig {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'database', 'my_materials.db');
  }

  /**
   * 初始化数据库连接
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[数据库日志] 正在尝试连接数据库，完整路径: ${this.dbPath}`);
      
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("数据库连接失败:", err.message);
          reject(err);
        } else {
          console.log('成功连接到多媒体数据库.');
          resolve(this.db);
        }
      });
    });
  }

  /**
   * 创建所有必要的表
   */
  async createTables() {
    const tables = [
      {
        name: 'materials',
        sql: `CREATE TABLE IF NOT EXISTS materials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          tags TEXT,
          media_type TEXT NOT NULL,
          cover_image_path TEXT 
        )`
      },
      {
        name: 'feedbacks',
        sql: `CREATE TABLE IF NOT EXISTS feedbacks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT
        )`
      },
      {
        name: 'visits',
        sql: `CREATE TABLE IF NOT EXISTS visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_address TEXT NOT NULL,
          session_id TEXT,
          visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          page TEXT,
          user_agent TEXT,
          referrer TEXT
        )`
      },
      {
        name: 'online_sessions',
        sql: `CREATE TABLE IF NOT EXISTS online_sessions (
          session_id TEXT PRIMARY KEY,
          ip_address TEXT NOT NULL,
          user_agent TEXT,
          last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      }
    ];

    for (const table of tables) {
      await this.createTable(table.name, table.sql);
    }

    // 创建索引
    await this.createIndexes();
    
    // 添加缺失的列
    await this.addMissingColumns();
    
    // 插入测试数据
    await this.insertTestData();
  }

  /**
   * 创建单个表
   */
  createTable(name, sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.error(`创建${name}表失败:`, err.message);
          reject(err);
        } else {
          console.log(`${name}表已创建或已存在.`);
          resolve();
        }
      });
    });
  }

  /**
   * 创建索引
   */
  async createIndexes() {
    const indexes = [
      {
        name: 'idx_visits_ip_time',
        sql: 'CREATE INDEX IF NOT EXISTS idx_visits_ip_time ON visits(ip_address, visit_time)'
      }
    ];

    for (const index of indexes) {
      await new Promise((resolve, reject) => {
        this.db.run(index.sql, (err) => {
          if (err) {
            console.error(`创建${index.name}索引失败:`, err.message);
            reject(err);
          } else {
            console.log(`${index.name}索引已创建或已存在.`);
            resolve();
          }
        });
      });
    }
  }

  /**
   * 添加缺失的列
   */
  async addMissingColumns() {
    const columns = [
      {
        table: 'materials',
        column: 'cover_image_path',
        sql: 'ALTER TABLE materials ADD COLUMN cover_image_path TEXT'
      },
      {
        table: 'feedbacks',
        column: 'user_id',
        sql: 'ALTER TABLE feedbacks ADD COLUMN user_id TEXT'
      }
    ];

    for (const col of columns) {
      await new Promise((resolve) => {
        this.db.run(col.sql, (err) => {
          if (err && !err.message.includes("duplicate column name")) {
            console.error(`添加 ${col.column} 列失败:`, err);
          } else if (err && err.message.includes("duplicate column name")) {
            console.log(`列 ${col.column} 已存在，跳过添加。`);
          } else {
            console.log(`列 ${col.column} 添加成功或已存在。`);
          }
          resolve();
        });
      });
    }
  }

  /**
   * 插入测试数据
   */
  async insertTestData() {
    return new Promise((resolve) => {
      const checkSql = "SELECT COUNT(*) as count FROM materials";
      this.db.get(checkSql, [], (err, row) => {
        if (err || row.count > 0) {
          resolve();
          return;
        }

        console.log("数据库为空，正在插入测试数据...");
        const materialsToInsert = [
          { name: "130克小方格速干", path: "/uploads/sample1.jpg", tags: "面料,速干,130克", type: "image" },
          { name: "珠地棉细节展示", path: "/uploads/sample_video.mp4", tags: "面料,棉,视频", type: "video" },
          { name: "圆领基础款T恤", path: "/uploads/sample3.jpg", tags: "款式,T恤,圆领", type: "image" },
          { name: "拉链连帽卫衣", path: "/uploads/sample4.jpg", tags: "款式,卫衣,拉链", type: "image" }
        ];
        
        const insertSql = `INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)`;
        materialsToInsert.forEach(m => {
          this.db.run(insertSql, [m.name, m.path, m.tags, m.type]);
        });
        
        resolve();
      });
    });
  }

  /**
   * 定期清理过期访问记录和在线会话
   */
  setupCleanupTask() {
    const cleanupOldVisits = () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      this.db.run(`DELETE FROM visits WHERE visit_time < ?`, [thirtyDaysAgo], function(err) {
        if (err) {
          console.error('清理过期访问记录失败:', err.message);
        }
        // 成功清理（静默）
      });
    };

    const cleanupExpiredSessions = () => {
      // 清理2分钟内没有心跳的会话
      this.db.run(`DELETE FROM online_sessions WHERE last_heartbeat < datetime('now', '-2 minutes')`, function(err) {
        if (err) {
          console.error('清理过期在线会话失败:', err.message);
        }
        // 成功清理（静默）
      });
    };

    // 每24小时执行一次访问记录清理
    setInterval(cleanupOldVisits, 24 * 60 * 60 * 1000);
    // 每分钟执行一次在线会话清理
    setInterval(cleanupExpiredSessions, 60 * 1000);
    // 启动时执行一次清理
    cleanupOldVisits();
    cleanupExpiredSessions();
  }

  /**
   * 初始化数据库（整合所有初始化步骤）
   */
  async initialize() {
    try {
      await this.connect();
      await this.createTables();
      await this.createIndexes();
      await this.addMissingColumns();
      await this.insertTestData();
      this.setupCleanupTask();
      console.log('✅ 数据库初始化完成');
      return this.db;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库实例
   */
  getDatabase() {
    return this.db;
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err.message);
        } else {
          console.log('数据库连接已关闭.');
        }
      });
    }
  }
}

module.exports = DatabaseConfig;