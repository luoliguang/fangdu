/**
 * 本地测试数据生成器
 * 用于生成测试数据，不影响生产环境
 * 使用方法：node test-data-generator.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库路径
const dbPath = path.join(__dirname, 'database', 'materials.db');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("数据库连接失败:", err.message);
        process.exit(1);
    }
    console.log('成功连接到测试数据库.');
});

// 测试素材数据
const testMaterials = [
    // 面料类
    { name: "130克小方格速干面料", path: "/uploads/fabric1.jpg", tags: "面料,速干,130克,小方格", type: "image" },
    { name: "珠地棉细节展示", path: "/uploads/fabric2.jpg", tags: "面料,棉,珠地棉", type: "image" },
    { name: "涤纶混纺面料", path: "/uploads/fabric3.jpg", tags: "面料,涤纶,混纺", type: "image" },
    { name: "纯棉面料质感", path: "/uploads/fabric4.jpg", tags: "面料,纯棉,质感", type: "image" },
    { name: "弹力面料拉伸测试", path: "/uploads/fabric_test.mp4", tags: "面料,弹力,测试,视频", type: "video" },
    
    // 服装款式类
    { name: "圆领短袖T恤", path: "/uploads/tshirt1.jpg", tags: "T恤,圆领,短袖,基础款", type: "image" },
    { name: "V领长袖衬衫", path: "/uploads/shirt1.jpg", tags: "衬衫,V领,长袖,商务", type: "image" },
    { name: "连帽卫衣", path: "/uploads/hoodie1.jpg", tags: "卫衣,连帽,休闲", type: "image" },
    { name: "插肩袖设计", path: "/uploads/raglan1.jpg", tags: "插肩,袖型,设计", type: "image" },
    { name: "立领夹克", path: "/uploads/jacket1.jpg", tags: "夹克,立领,外套", type: "image" },
    
    // 工艺细节类
    { name: "双针车线工艺", path: "/uploads/stitch1.jpg", tags: "工艺,车线,双针", type: "image" },
    { name: "包边处理细节", path: "/uploads/edge1.jpg", tags: "工艺,包边,细节", type: "image" },
    { name: "拉链安装过程", path: "/uploads/zipper_install.mp4", tags: "工艺,拉链,安装,视频", type: "video" },
    { name: "纽扣缝制工艺", path: "/uploads/button1.jpg", tags: "工艺,纽扣,缝制", type: "image" },
    { name: "袖口收边处理", path: "/uploads/cuff1.jpg", tags: "工艺,袖口,收边", type: "image" },
    
    // 颜色系列
    { name: "基础白色款", path: "/uploads/white1.jpg", tags: "颜色,白色,基础款", type: "image" },
    { name: "经典黑色款", path: "/uploads/black1.jpg", tags: "颜色,黑色,经典", type: "image" },
    { name: "海军蓝款式", path: "/uploads/navy1.jpg", tags: "颜色,海军蓝,深色", type: "image" },
    { name: "灰色调展示", path: "/uploads/gray1.jpg", tags: "颜色,灰色,中性", type: "image" },
    { name: "彩色系列对比", path: "/uploads/colors.mp4", tags: "颜色,彩色,对比,视频", type: "video" },
    
    // 尺码规格类
    { name: "S码版型展示", path: "/uploads/size_s.jpg", tags: "尺码,S码,版型", type: "image" },
    { name: "M码标准版型", path: "/uploads/size_m.jpg", tags: "尺码,M码,标准", type: "image" },
    { name: "L码宽松版型", path: "/uploads/size_l.jpg", tags: "尺码,L码,宽松", type: "image" },
    { name: "XL码加大版型", path: "/uploads/size_xl.jpg", tags: "尺码,XL码,加大", type: "image" },
    { name: "尺码对比展示", path: "/uploads/size_compare.mp4", tags: "尺码,对比,展示,视频", type: "video" },
    
    // 季节系列
    { name: "春季薄款T恤", path: "/uploads/spring1.jpg", tags: "季节,春季,薄款,T恤", type: "image" },
    { name: "夏季透气款", path: "/uploads/summer1.jpg", tags: "季节,夏季,透气", type: "image" },
    { name: "秋季长袖款", path: "/uploads/autumn1.jpg", tags: "季节,秋季,长袖", type: "image" },
    { name: "冬季保暖款", path: "/uploads/winter1.jpg", tags: "季节,冬季,保暖", type: "image" },
    
    // 特殊功能类
    { name: "防水涂层测试", path: "/uploads/waterproof.mp4", tags: "功能,防水,涂层,测试,视频", type: "video" },
    { name: "抗菌面料展示", path: "/uploads/antibacterial.jpg", tags: "功能,抗菌,面料", type: "image" },
    { name: "UV防护功能", path: "/uploads/uv_protection.jpg", tags: "功能,UV,防护", type: "image" },
    { name: "速干效果测试", path: "/uploads/quick_dry.mp4", tags: "功能,速干,测试,视频", type: "video" },
    
    // 印花图案类
    { name: "简约条纹图案", path: "/uploads/stripe1.jpg", tags: "图案,条纹,简约", type: "image" },
    { name: "几何印花设计", path: "/uploads/geometric1.jpg", tags: "图案,几何,印花", type: "image" },
    { name: "文字标语印刷", path: "/uploads/text1.jpg", tags: "图案,文字,标语", type: "image" },
    { name: "渐变色彩效果", path: "/uploads/gradient1.jpg", tags: "图案,渐变,色彩", type: "image" },
];

// 测试反馈数据
const testFeedbacks = [
    { message: "希望能增加更多面料选择", status: "pending" },
    { message: "网站加载速度很快，体验不错", status: "resolved" },
    { message: "建议添加面料成分说明", status: "pending" },
    { message: "图片质量很高，很清晰", status: "resolved" },
    { message: "希望能按价格筛选", status: "pending" },
];

// 生成访问记录数据
function generateVisitData() {
    const visits = [];
    const ips = ['192.168.1.100', '192.168.1.101', '10.0.0.50', '172.16.0.10', '127.0.0.1'];
    const pages = ['/', '/statistics', '/admin', '/upload', '/materials'];
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    
    // 生成过去30天的访问记录
    for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        // 每天生成5-20条访问记录
        const dailyVisits = Math.floor(Math.random() * 16) + 5;
        
        for (let i = 0; i < dailyVisits; i++) {
            const visitTime = new Date(date);
            visitTime.setHours(Math.floor(Math.random() * 24));
            visitTime.setMinutes(Math.floor(Math.random() * 60));
            
            visits.push({
                ip: ips[Math.floor(Math.random() * ips.length)],
                visited_at: visitTime.toISOString(),
                page: pages[Math.floor(Math.random() * pages.length)],
                user_agent: userAgents[Math.floor(Math.random() * userAgents.length)]
            });
        }
    }
    
    return visits;
}

// 清空现有数据并插入测试数据
function insertTestData() {
    console.log('开始插入测试数据...');
    
    // 清空现有数据
    db.serialize(() => {
        db.run('DELETE FROM materials');
        db.run('DELETE FROM feedbacks');
        db.run('DELETE FROM visits');
        
        console.log('已清空现有数据');
        
        // 插入测试素材
        const materialStmt = db.prepare('INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)');
        testMaterials.forEach(material => {
            materialStmt.run(material.name, material.path, material.tags, material.type);
        });
        materialStmt.finalize();
        console.log(`已插入 ${testMaterials.length} 条素材数据`);
        
        // 插入测试反馈
        const feedbackStmt = db.prepare('INSERT INTO feedbacks (message, status, created_at) VALUES (?, ?, ?)');
        testFeedbacks.forEach(feedback => {
            const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
            feedbackStmt.run(feedback.message, feedback.status, createdAt);
        });
        feedbackStmt.finalize();
        console.log(`已插入 ${testFeedbacks.length} 条反馈数据`);
        
        // 插入访问记录
        const visits = generateVisitData();
        const visitStmt = db.prepare('INSERT INTO visits (ip, visited_at, page, user_agent) VALUES (?, ?, ?, ?)');
        visits.forEach(visit => {
            visitStmt.run(visit.ip, visit.visited_at, visit.page, visit.user_agent);
        });
        visitStmt.finalize();
        console.log(`已插入 ${visits.length} 条访问记录`);
        
        console.log('\n✅ 测试数据生成完成！');
        console.log('现在您可以启动服务器测试功能了：');
        console.log('1. 启动后端：node server.js');
        console.log('2. 启动前端：npm run dev');
        
        db.close((err) => {
            if (err) {
                console.error('关闭数据库连接失败:', err.message);
            } else {
                console.log('数据库连接已关闭');
            }
            process.exit(0);
        });
    });
}

// 创建表格（如果不存在）
db.serialize(() => {
    // 创建 materials 表
    db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        tags TEXT,
        media_type TEXT NOT NULL,
        cover_image_path TEXT 
    )`, (err) => {
        if (err) {
            console.error("创建materials表失败:", err);
        } else {
            console.log('materials表已创建或已存在');
        }
    });
    
    // 创建 feedbacks 表
    db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT
    )`, (err) => {
        if (err) {
            console.error("创建feedbacks表失败:", err);
        } else {
            console.log('feedbacks表已创建或已存在');
        }
    });
    
    // 创建 visits 表
    db.run(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        page TEXT,
        user_agent TEXT
    )`, (err) => {
        if (err) {
            console.error("创建visits表失败:", err);
        } else {
            console.log('visits表已创建或已存在');
            
            // 创建索引
            db.run(`CREATE INDEX IF NOT EXISTS idx_visits_ip_time ON visits(ip, visited_at)`, (err) => {
                if (err) {
                    console.error("创建visits索引失败:", err);
                } else {
                    console.log('visits表索引已创建或已存在');
                    // 表格创建完成后插入测试数据
                    insertTestData();
                }
            });
        }
    });
});

// 错误处理
process.on('SIGINT', () => {
    console.log('\n正在关闭数据库连接...');
    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err.message);
        } else {
            console.log('数据库连接已关闭');
        }
        process.exit(0);
    });
});