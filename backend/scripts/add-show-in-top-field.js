const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 获取数据库路径
const databaseDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(databaseDir, 'drawer_config.db');

console.log('🔍 数据库迁移脚本：添加 show_in_top 字段');
console.log('📁 数据库目录:', databaseDir);
console.log('📄 数据库文件:', dbPath);
console.log('');

// 检查数据库目录是否存在
if (!fs.existsSync(databaseDir)) {
  try {
    fs.mkdirSync(databaseDir, { recursive: true });
    console.log('✅ 已创建数据库目录:', databaseDir);
  } catch (error) {
    console.error('❌ 无法创建数据库目录:', error.message);
    process.exit(1);
  }
}

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.warn('⚠️  数据库文件不存在，将在首次连接时创建');
}

console.log('开始添加 show_in_top 字段到 announcements 表...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    console.error('💡 提示: 请检查数据库文件路径和权限');
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
});

db.serialize(() => {
  // 首先检查表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='announcements'", (err, row) => {
    if (err) {
      console.error('❌ 查询表信息失败:', err.message);
      db.close();
      process.exit(1);
    }

    if (!row) {
      console.error('❌ 表 announcements 不存在');
      console.log('💡 提示: 请确保数据库已初始化，或者先启动服务器让 Sequelize 创建表结构');
      db.close();
      process.exit(1);
    }

    // 检查字段是否已存在
    db.all("PRAGMA table_info(announcements)", (err, columns) => {
      if (err) {
        console.error('❌ 查询表结构失败:', err.message);
        db.close();
        process.exit(1);
      }

      const hasShowInTop = columns.some(col => col.name === 'show_in_top');
      
      if (hasShowInTop) {
        console.log('✅ show_in_top 字段已存在，无需添加');
        db.close();
        console.log('\n✅ 迁移完成（无需操作）');
        process.exit(0);
      }

      console.log('📋 当前字段列表:', columns.map(col => col.name).join(', '));
      console.log('🔧 开始添加 show_in_top 字段...');

      // 添加 show_in_top 字段
      db.run("ALTER TABLE announcements ADD COLUMN show_in_top BOOLEAN DEFAULT 0", (err) => {
        if (err) {
          console.error('❌ 添加字段失败:', err.message);
          console.error('💡 提示: 请检查数据库文件权限，确保有写入权限');
          db.close();
          process.exit(1);
        }
        
        console.log('✅ show_in_top 字段添加成功');
        
        // 验证字段是否添加成功
        db.all("PRAGMA table_info(announcements)", (err, newColumns) => {
          if (err) {
            console.warn('⚠️  无法验证字段，但添加操作似乎成功了');
            db.close();
            console.log('\n✅ 迁移完成');
            process.exit(0);
          }

          const hasField = newColumns.some(col => col.name === 'show_in_top');
          if (hasField) {
            console.log('✅ 字段验证成功，show_in_top 已添加到表中');
          } else {
            console.warn('⚠️  字段验证失败，但添加操作似乎成功了');
          }

          db.close();
          console.log('\n✅ 迁移完成！');
          console.log('💡 提示: 请重启服务器以使更改生效');
          process.exit(0);
        });
      });
    });
  });
});

