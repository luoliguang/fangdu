const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'drawer_config.db');

console.log('开始添加 show_in_top 字段到 announcements 表...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功');
});

db.serialize(() => {
  // 检查字段是否已存在
  db.all("PRAGMA table_info(announcements)", (err, columns) => {
    if (err) {
      console.error('❌ 查询表结构失败:', err.message);
      db.close();
      process.exit(1);
    }

    const hasShowInTop = columns.some(col => col.name === 'show_in_top');
    
    if (hasShowInTop) {
      console.log('✅ show_in_top 字段已存在，跳过添加');
      db.close();
      process.exit(0);
    }

    // 添加 show_in_top 字段
    db.run("ALTER TABLE announcements ADD COLUMN show_in_top BOOLEAN DEFAULT 0", (err) => {
      if (err) {
        console.error('❌ 添加字段失败:', err.message);
        db.close();
        process.exit(1);
      }
      
      console.log('✅ show_in_top 字段添加成功');
      db.close();
      console.log('✅ 迁移完成');
    });
  });
});

