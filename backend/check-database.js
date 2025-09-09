const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'database', 'materials.db');

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("数据库连接失败:", err.message);
        process.exit(1);
    }
    console.log('成功连接到数据库.');
});

// 查询数据库信息
db.serialize(() => {
    // 查询材料总数
    db.get('SELECT COUNT(*) as count FROM materials', (err, row) => {
        if (err) {
            console.error('查询材料总数失败:', err.message);
        } else {
            console.log(`材料总数: ${row.count}`);
        }
    });
    
    // 查询前5条材料记录
    db.all('SELECT id, name, tags, media_type FROM materials LIMIT 5', (err, rows) => {
        if (err) {
            console.error('查询材料记录失败:', err.message);
        } else {
            console.log('\n前5条材料记录:');
            rows.forEach(row => {
                console.log(`ID: ${row.id}, 名称: ${row.name}, 标签: ${row.tags}, 类型: ${row.media_type}`);
            });
        }
    });
    
    // 查询反馈总数
    db.get('SELECT COUNT(*) as count FROM feedbacks', (err, row) => {
        if (err) {
            console.error('查询反馈总数失败:', err.message);
        } else {
            console.log(`\n反馈总数: ${row.count}`);
        }
    });
    
    // 查询访问记录总数
    db.get('SELECT COUNT(*) as count FROM visits', (err, row) => {
        if (err) {
            console.error('查询访问记录总数失败:', err.message);
        } else {
            console.log(`访问记录总数: ${row.count}`);
            
            // 关闭数据库连接
            db.close((err) => {
                if (err) {
                    console.error('关闭数据库连接失败:', err.message);
                } else {
                    console.log('\n数据库连接已关闭');
                }
                process.exit(0);
            });
        }
    });
});