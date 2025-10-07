#!/usr/bin/env node

/**
 * 数据库迁移脚本 - 添加 online_sessions 表
 * 用于实现准确的在线人数统计（基于心跳机制）
 * 
 * 运行方式：
 * node backend/scripts/migrate-add-online-sessions.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'database', 'my_materials.db');

console.log('============================================');
console.log('  数据库迁移：添加在线会话表');
console.log('============================================\n');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('❌ 错误：数据库文件不存在');
  console.log('路径:', dbPath);
  console.log('\n请确保数据库文件存在，或先运行应用程序创建数据库。');
  process.exit(1);
}

console.log('📁 数据库路径:', dbPath);

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功\n');
});

// 执行迁移
async function migrate() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. 检查 online_sessions 表是否存在
      console.log('📋 步骤 1: 检查 online_sessions 表是否存在...');
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='online_sessions'",
        (err, row) => {
          if (err) {
            console.error('❌ 检查表失败:', err.message);
            reject(err);
            return;
          }

          if (row) {
            console.log('✅ online_sessions 表已存在，无需创建\n');
            
            // 检查表结构是否正确
            console.log('📋 步骤 2: 验证表结构...');
            db.all("PRAGMA table_info(online_sessions)", (err, columns) => {
              if (err) {
                console.error('❌ 获取表结构失败:', err.message);
                reject(err);
                return;
              }

              console.log('\n当前表结构:');
              columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
              });

              const requiredColumns = ['session_id', 'ip_address', 'user_agent', 'last_heartbeat', 'first_seen'];
              const existingColumns = columns.map(c => c.name);
              const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));

              if (missingColumns.length > 0) {
                console.log('\n⚠️  缺少字段:', missingColumns.join(', '));
                reject(new Error('表结构不完整'));
              } else {
                console.log('\n✅ 表结构正确');
                resolve();
              }
            });
          } else {
            // 2. 创建 online_sessions 表
            console.log('📋 步骤 2: 创建 online_sessions 表...');
            const createTableSQL = `
              CREATE TABLE IF NOT EXISTS online_sessions (
                session_id TEXT PRIMARY KEY,
                ip_address TEXT NOT NULL,
                user_agent TEXT,
                last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `;

            db.run(createTableSQL, (err) => {
              if (err) {
                console.error('❌ 创建表失败:', err.message);
                reject(err);
                return;
              }

              console.log('✅ online_sessions 表创建成功\n');

              // 3. 创建索引
              console.log('📋 步骤 3: 创建索引...');
              const createIndexSQL = `
                CREATE INDEX IF NOT EXISTS idx_online_sessions_heartbeat 
                ON online_sessions(last_heartbeat)
              `;

              db.run(createIndexSQL, (err) => {
                if (err) {
                  console.error('❌ 创建索引失败:', err.message);
                  reject(err);
                  return;
                }

                console.log('✅ 索引创建成功\n');
                resolve();
              });
            });
          }
        }
      );
    });
  });
}

// 执行迁移并关闭数据库
migrate()
  .then(() => {
    console.log('============================================');
    console.log('  ✅ 迁移完成！');
    console.log('============================================\n');
    console.log('📝 变更摘要:');
    console.log('  - 添加了 online_sessions 表');
    console.log('  - 用于存储用户在线状态（基于心跳机制）');
    console.log('  - 在线判断标准：1分钟内有心跳');
    console.log('  - 过期会话自动清理：每分钟清理2分钟无心跳的会话\n');
    console.log('🚀 下一步:');
    console.log('  1. 重启后端服务');
    console.log('  2. 打开浏览器访问网站');
    console.log('  3. 在管理后台查看在线人数统计\n');
    
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      }
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('\n❌ 迁移失败:', err.message);
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      }
      process.exit(1);
    });
  });

