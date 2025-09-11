const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'database', 'my_materials.db');

console.log('正在修复数据库表结构...');
console.log('数据库路径:', dbPath);

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("数据库连接失败:", err.message);
        process.exit(1);
    }
    console.log('成功连接到数据库.');
});

db.serialize(() => {
    // 1. 检查visits表的当前结构
    db.all("PRAGMA table_info(visits)", (err, columns) => {
        if (err) {
            console.error('获取表结构失败:', err.message);
            return;
        }
        
        console.log('\n当前visits表结构:');
        columns.forEach(col => {
            console.log(`- ${col.name}: ${col.type}`);
        });
        
        // 检查是否存在ip_address列
        const hasIpAddress = columns.some(col => col.name === 'ip_address');
        const hasIp = columns.some(col => col.name === 'ip');
        
        if (hasIpAddress) {
            console.log('\n✅ ip_address列已存在，无需修复');
            closeDatabase();
            return;
        }
        
        if (hasIp && !hasIpAddress) {
            console.log('\n🔧 发现ip列，需要重命名为ip_address');
            
            // 重命名列：SQLite不支持直接重命名列，需要重建表
            db.run(`CREATE TABLE visits_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT NOT NULL,
                visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                page TEXT,
                user_agent TEXT,
                referrer TEXT
            )`, (err) => {
                if (err) {
                    console.error('创建新表失败:', err.message);
                    return;
                }
                
                console.log('✅ 创建新表结构成功');
                
                // 复制数据
                db.run(`INSERT INTO visits_new (id, ip_address, visit_time, page, user_agent)
                        SELECT id, ip, visited_at, page, user_agent FROM visits`, (err) => {
                    if (err) {
                        console.error('复制数据失败:', err.message);
                        return;
                    }
                    
                    console.log('✅ 数据复制成功');
                    
                    // 删除旧表
                    db.run('DROP TABLE visits', (err) => {
                        if (err) {
                            console.error('删除旧表失败:', err.message);
                            return;
                        }
                        
                        console.log('✅ 删除旧表成功');
                        
                        // 重命名新表
                        db.run('ALTER TABLE visits_new RENAME TO visits', (err) => {
                            if (err) {
                                console.error('重命名表失败:', err.message);
                                return;
                            }
                            
                            console.log('✅ 表重命名成功');
                            
                            // 创建索引
                            db.run('CREATE INDEX IF NOT EXISTS idx_visits_ip_time ON visits(ip_address, visit_time)', (err) => {
                                if (err) {
                                    console.error('创建索引失败:', err.message);
                                } else {
                                    console.log('✅ 索引创建成功');
                                }
                                
                                console.log('\n🎉 数据库修复完成！');
                                closeDatabase();
                            });
                        });
                    });
                });
            });
        } else {
            console.log('\n🔧 创建visits表（不存在ip或ip_address列）');
            
            // 创建正确的表结构
            db.run(`CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT NOT NULL,
                visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                page TEXT,
                user_agent TEXT,
                referrer TEXT
            )`, (err) => {
                if (err) {
                    console.error('创建visits表失败:', err.message);
                } else {
                    console.log('✅ visits表创建成功');
                    
                    // 创建索引
                    db.run('CREATE INDEX IF NOT EXISTS idx_visits_ip_time ON visits(ip_address, visit_time)', (err) => {
                        if (err) {
                            console.error('创建索引失败:', err.message);
                        } else {
                            console.log('✅ 索引创建成功');
                        }
                        
                        console.log('\n🎉 数据库修复完成！');
                        closeDatabase();
                    });
                }
            });
        }
    });
});

function closeDatabase() {
    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err.message);
        } else {
            console.log('\n数据库连接已关闭');
        }
        process.exit(0);
    });
}

// 错误处理
process.on('SIGINT', () => {
    console.log('\n正在关闭数据库连接...');
    closeDatabase();
});

process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    closeDatabase();
});