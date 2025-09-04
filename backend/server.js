// --- 1. 引入工具 ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();
const OSS = require('ali-oss'); // <--- 1. 引入 ali-oss

// --- 2. 初始化 ---
const app = express();
const PORT = 3001;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

// 增加一个健壮性检查，如果忘记在.env里设置，程序会报错退出，防止安全漏洞
if (!SECRET_TOKEN) {
    console.error("严重错误：未在 .env 文件中定义 SECRET_TOKEN！");
    process.exit(1);
}

// 2. 初始化 OSS 客户端
const client = new OSS({
  region: process.env.ALI_OSS_REGION,
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALI_OSS_BUCKET,
});

// --- 3. 连接数据库 ---
// --- 3. 连接数据库 (使用绝对路径的修正版) ---
// __dirname 会获取当前文件(server.js)所在的文件夹的绝对路径
// path.join 会智能地将路径拼接起来，避免了跨系统（Windows/Linux）的路径问题
const dbPath = path.join(__dirname, 'database', 'my_materials.db'); // <--- 关键修改1：创建绝对路径

// 增加一条日志，方便我们以后调试
console.log(`[数据库日志] 正在尝试连接数据库，完整路径: ${dbPath}`);

// 使用这个绝对路径来连接数据库
const db = new sqlite3.Database(dbPath, (err) => { // <--- 关键修改2：使用新路径
    if (err) {
        console.error("数据库连接失败:", err.message);
        // 在关键错误时退出进程，PM2会自动重启它
        process.exit(1);
    }
    console.log('成功连接到多媒体数据库.');

    // 下面的建表和插入测试数据逻辑保持不变
    db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        tags TEXT,
        media_type TEXT NOT NULL,
        cover_image_path TEXT 
    )`, (err) => {
        if (err) {
            console.error("创建表格失败:", err);
        } else {
            // 插入一些更丰富的测试数据, 包括视频(生成环境)
            const checkSql = "SELECT COUNT(*) as count FROM materials";
            db.get(checkSql, [], (err, row) => {
                if (row.count === 0) {
                    console.log("数据库为空，正在插入测试数据...");
                    const materialsToInsert = [
                        { name: "130克小方格速干", path: "/uploads/sample1.jpg", tags: "面料,速干,130克", type: "image" },
                        { name: "珠地棉细节展示", path: "/uploads/sample_video.mp4", tags: "面料,棉,视频", type: "video" },
                        { name: "圆领基础款T恤", path: "/uploads/sample3.jpg", tags: "款式,T恤,圆领", type: "image" },
                        { name: "拉链连帽卫衣", path: "/uploads/sample4.jpg", tags: "款式,卫衣,拉链", type: "image" }
                    ];
                    // 注意：SQL语句也更新了
                    const insertSql = `INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)`;
                    materialsToInsert.forEach(m => db.run(insertSql, [m.name, m.path, m.tags, m.type]));
                }
            });
        }

      /*生成虚假数据用于测试(开发环境)*/
      // } else {
      //   // --- 数据填充 (Data Seeding) ---
      //   const checkSql = "SELECT COUNT(*) as count FROM materials";
      //   db.get(checkSql, [], (err, row) => {
      //       // 改为 < 10 来判断是否需要填充，这样您手动上传的少量图片不会影响填充
      //       if (row.count < 20) {
      //           console.log("数据库素材较少，正在为您生成大量测试数据...");
                
      //           // --- 1. 定义数据源 ---
      //           const fabricTypes = ["棉", "麻", "丝", "涤纶", "氨纶", "速干", "珠地", "莱卡"];
      //           const styles = ["T恤", "卫衣", "Polo衫", "夹克", "运动裤", "瑜伽裤"];
      //           const features = ["透气", "弹力", "防水", "抗皱", "印花", "纯色", "条纹"];
                
      //           // --- 2. 设定要生成的数量 ---
      //           const numberOfItems = 300; // 在这里修改您想要的数量，比如 100 或 500

      //           const insertSql = `INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)`;
                
      //           // --- 3. 循环生成数据 ---
      //           for (let i = 0; i < numberOfItems; i++) {
      //               // 从数据源随机取样
      //               const randomFabric = fabricTypes[Math.floor(Math.random() * fabricTypes.length)];
      //               const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      //               const randomFeature = features[Math.floor(Math.random() * features.length)];

      //               // 组合成随机的名称和标签
      //               const name = `${randomFabric}${randomStyle} (${randomFeature})`;
      //               const tags = `${randomFabric},${randomStyle},${randomFeature}`;
                    
      //               // --- 核心：使用 placeholder 图片服务 ---
      //               // picsum.photos 会提供一个随机的图片, 尺寸250x300
      //               // ?random=${i} 是为了防止图片URL重复
      //               const imagePath = `https://picsum.photos/250/300?random=${i}`;

      //               // 插入数据库
      //               db.run(insertSql, [name, imagePath, tags, "image"]);
      //           }
      //           console.log(`成功生成 ${numberOfItems} 条测试数据！`);
      //       }
      //   });
      // }

    });
});

// 新增：创建 feedbacks 表
db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) {
        console.error("创建 feedbacks 表失败:", err);
    } else {
        console.log("表 feedbacks 创建成功或已存在。");
    }
});

// 新增：如果 materials 表格不存在 cover_image_path 字段，则添加它
db.run("ALTER TABLE materials ADD COLUMN cover_image_path TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    // 如果不是重复列名的错误，说明是其他错误
    console.error("添加 cover_image_path 列失败:", err);
  } else if (err && err.message.includes("duplicate column name")) {
    console.log("列 cover_image_path 已存在，跳过添加。");
  } else {
    console.log("列 cover_image_path 添加成功或已存在。");
  }
});

// 新增：为 feedbacks 表添加 user_id 字段
db.run("ALTER TABLE feedbacks ADD COLUMN user_id TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("添加 user_id 列失败:", err);
  } else if (err && err.message.includes("duplicate column name")) {
    console.log("列 user_id 已存在，跳过添加。");
  } else {
    console.log("列 user_id 添加成功或已存在。");
  }
});

// 新增：配置 Multer 用于文件上传
// 新增：配置 Multer 用于文件上传 (升级版)
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// 将 fileFilter 应用到 multer
// const upload = multer({ storage: storage, fileFilter: fileFilter });
const upload = multer({ storage: multer.memoryStorage() }); // 使用内存存储，不保存文件到硬盘

// 新增：“保安”中间件，用于验证令牌
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 格式: Bearer YOUR_TOKEN

  if (token == null) {
      return res.sendStatus(401); // 未提供令牌，拒绝访问
  }
  if (token !== SECRET_TOKEN) {
      return res.sendStatus(403); // 令牌错误，禁止访问
  }
  next(); // 令牌正确，放行
};


// --- 4. 中间件 ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 5. API 接口 ---

// 接口1: 获取所有唯一的标签
app.get('/api/tags', (req, res) => {
    const sql = "SELECT tags FROM materials";
    db.all(sql, [], (err, rows) => {
        if (err) { return res.status(500).json({ "error": err.message }); }

        // 将所有标签字符串收集起来，切割，去重
        const allTags = rows
            .map(row => row.tags ? row.tags.split(',') : [])
            .flat() // [[a,b],[c]] -> [a,b,c]
            .map(tag => tag.trim()) // 去掉可能存在的空格
            .filter(tag => tag); // 去掉空标签

        const uniqueTags = [...new Set(allTags)]; // 使用Set去重
        res.json({ data: uniqueTags });
    });
});


// 接口2: 获取素材列表 (支持多关键词搜索和标签过滤的终极版)
// 支持分页
app.get('/api/materials', (req, res) => {
  // 1. 获取分页、搜索和标签参数
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20; // 每页默认20条
  const offset = (page - 1) * limit;
  const rawSearchTerm = req.query.search || '';
  const filterTag = req.query.tag || '';

  // 2. 构建查询条件
  const keywords = rawSearchTerm.split(' ').filter(k => k);
  let whereClause = ` WHERE 1=1`;
  const params = [];
  keywords.forEach(keyword => {
      whereClause += ` AND name LIKE ?`;
      params.push(`%${keyword}%`);
  });
  if (filterTag) {
      whereClause += ` AND tags LIKE ?`;
      params.push(`%${filterTag}%`);
  }

  // 3. 先查询总数
  const countSql = `SELECT COUNT(*) as total FROM materials` + whereClause;
  db.get(countSql, params, (err, row) => {
      if (err) {
          return res.status(500).json({ "error": err.message });
      }
      const total = row.total;

      // 4. 再查询分页后的数据
      const dataSql = `SELECT id, name, file_path, tags, media_type, cover_image_path FROM materials` + whereClause + ` ORDER BY id DESC LIMIT ? OFFSET ?`;
      db.all(dataSql, [...params, limit, offset], (err, rows) => {
          if (err) {
              return res.status(500).json({ "error": err.message });
          }
          // --- 新增: 为图片类型素材生成缩略图URL，为视频素材使用封面图URL作为缩略图URL ---
          const processedRows = rows.map(row => {
            let thumbnailUrl = null;
            if (row.media_type === 'image') {
                thumbnailUrl = `${row.file_path}?x-oss-process=image/resize,w_200`;
            } else if (row.media_type === 'video' && row.cover_image_path) {
                thumbnailUrl = row.cover_image_path;
            }
            return { ...row, thumbnail_url: thumbnailUrl };
          });
          // 5. 返回包含分页信息的数据结构
          res.json({
              message: "success",
              data: processedRows, // <--- 使用处理后的数据
              meta: {
                  total: total,
                  page: page,
                  limit: limit,
                  totalPages: Math.ceil(total / limit)
              }
          });
      });
  });
});

// 上传接口（OSS版本）
app.post('/api/materials', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { name, tags } = req.body;
    // --- 新增：标签处理逻辑 ---
    console.log(`[日志] 原始标签 (上传): ${req.body.tags}`); // 添加日志
    // --- 新增：标签处理逻辑 ---
    let formattedTags = '';
    if (req.body.tags && req.body.tags.trim()) {
        formattedTags = req.body.tags
            .trim() // 1. 去掉首尾空格
            .replace(/\s+/g, ',') // 2. 将一个或多个连续的空格替换为单个逗号
            .replace(/,+/g, ',') // 3. 将多个连续的逗号合并为一个
            .split(',') // 4. 按逗号分割成数组
            .filter(Boolean) // 5. 去掉可能产生的空字符串
            .join(','); // 6. 重新用单个逗号拼接成最终的字符串
    }

    if (!name || !req.file) {
      return res.status(400).json({ error: '缺少必要信息！' });
    }

    console.log(`[${new Date().toISOString()}] - [日志] 开始处理上传: ${req.file.originalname}, 大小: ${(req.file.size / 1024).toFixed(2)} KB`);

    const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
    const folder = mediaType === 'image' ? 'images/' : 'videos/';
    const fileName = folder + Date.now() + '-' + req.file.originalname;

    console.log(`[${new Date().toISOString()}] - [日志] 准备上传到OSS，目标文件名: ${fileName}`);

    const result = await client.put(fileName, req.file.buffer);
    
    console.log(`[${new Date().toISOString()}] - [日志] 成功上传到OSS: ${result.url}`);

    let fileUrl = result.url;

    // --- 关键修复：确保URL是HTTPS ---
    if (fileUrl.startsWith('http://')) {
        fileUrl = fileUrl.replace('http://', 'https://');
      }

    let coverImageUrl = null; // 初始化封面图URL
    if (mediaType === 'video') {
        // 使用 OSS 视频截帧功能生成封面图URL
        // 例如：在视频第 1 秒截取一帧，输出 JPG 格式，宽高自适应
        coverImageUrl = `${fileUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_0,h_0,m_fast`;
        console.log(`[${new Date().toISOString()}] - [日志] 生成视频封面URL: ${coverImageUrl}`);
    }

    // 将这个安全的HTTPS地址和封面图地址存入数据库
    const sql = `INSERT INTO materials (name, file_path, tags, media_type, cover_image_path) VALUES (?, ?, ?, ?, ?)`;
    const params = [name, fileUrl, formattedTags, mediaType, coverImageUrl];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("数据库写入失败:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`[${new Date().toISOString()}] - [日志] 数据库写入成功，ID: ${this.lastID}。准备向客户端发送成功响应。`);
        res.status(201).json({ message: '上传成功!', id: this.lastID });
    });
  } catch (error) {
    console.error("上传到OSS或处理请求失败:", error);
    res.status(500).json({ error: '上传失败，请检查服务器日志' });
  }
});


// 删除接口（OSS版本）
app.delete('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;

    // 1. 从数据库找到文件的完整URL
    db.get('SELECT file_path FROM materials WHERE id = ?', [id], async (err, row) => {
      if (err || !row) { return res.status(404).send('未找到素材'); }

      const fileUrl = row.file_path;

      // 2. 从数据库删除条目 (无论OSS删除是否成功，都先执行)
      db.run('DELETE FROM materials WHERE id = ?', id, async function (dbErr) {
        if (dbErr) { return res.status(500).send(dbErr.message); }

        try {
          // 3. 从URL中解析出OSS上的对象名 (例如: images/1678886400000-cat.jpg)
          const objectName = new URL(fileUrl).pathname.substring(1);
          // 4. 从OSS删除该对象
          await client.delete(objectName);
        } catch (ossErr) {
          // 如果OSS删除失败，仅在后台记录日志，因为数据库条目已删除，不影响用户
          console.error("从OSS删除文件失败，但数据库条目已移除:", ossErr);
        }

        res.json({ message: '删除成功' });
      });
    });
  } catch (error) {
    console.error("处理删除请求失败:", error);
    res.status(500).json({ error: '删除失败，请检查服务器日志' });
  }
});

// 新增：接口7: 提交用户留言
app.post('/api/feedback', (req, res) => {
  const { message, user_id } = req.body;
  if (!message) {
    return res.status(400).json({ error: '留言内容不能为空' });
  }
  const sql = `INSERT INTO feedbacks (message, user_id) VALUES (?, ?)`;
  db.run(sql, [message, user_id], function(err) {
    if (err) {
      console.error("保存留言失败:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: '留言成功', id: this.lastID });
  });
});

// 新增：接口8: 获取所有留言 (需要认证)
app.get('/api/feedbacks', authenticateToken, (req, res) => {
  const sql = "SELECT id, message, status, created_at FROM feedbacks ORDER BY created_at DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("获取留言失败:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// 新增：接口9: 更新留言状态 (需要认证)
app.put('/api/feedbacks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // status 可以是 'pending' 或 'resolved'

  if (!status || !['pending', 'resolved'].includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }

  const sql = `UPDATE feedbacks SET status = ? WHERE id = ?`;
  db.run(sql, [status, id], function(err) {
    if (err) {
      console.error("更新留言状态失败:", err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: '未找到留言' });
    }
    res.json({ message: '留言状态更新成功' });
  });
});

// 新增：接口10: 删除留言 (需要认证)
app.delete('/api/feedbacks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM feedbacks WHERE id = ?`;
  db.run(sql, [id], function(err) {
    if (err) {
      console.error("删除留言失败:", err);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: '未找到留言' });
    }
    res.json({ message: '留言删除成功' });
  });
});

// 新增：接口11: 获取未处理留言的数量 (需要认证)
app.get('/api/feedbacks/pending/count', authenticateToken, (req, res) => {
  const sql = "SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'";
  db.get(sql, [], (err, row) => {
    if (err) {
      console.error("获取未处理留言数量失败:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: row.count });
  });
});

// 新增：接口12: 根据 user_id 获取用户的留言列表
app.get('/api/feedbacks/user/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }

  const sql = "SELECT id, message, status, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC";
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error("获取用户留言失败:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// 新增接口6: 验证令牌的有效性
app.post('/api/auth/validate', (req, res) => {
  const { token } = req.body; // 从请求体中获取前端发来的令牌

  if (!token) {
      return res.status(400).json({ message: '未输入密码' });
  }

  // 将前端发来的令牌与服务器环境变量中的令牌进行比对
  if (token === process.env.SECRET_TOKEN) {
      // 如果一致，返回成功
      res.status(200).json({ message: '恭喜恭喜😄' });
  } else {
      // 如果不一致，返回未授权错误
      res.status(401).json({ message: '别来这里，要密码的🙄' });
  }
});

// 接口5: 修改素材信息
// 请确保这里是 app.put, 路径是 '/api/materials/:id', 并且有 authenticateToken
app.put('/api/materials/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  console.log(`[日志] 原始标签 (上传): ${req.body.tags}`); // 添加日志
// --- 新增：标签处理逻辑 (与上传接口完全相同) ---
    const formattedTags = req.body.tags
    .trim()
    .replace(/\s+/g, ',')
    .replace(/,+/g, ',')
    .split(',')
    .filter(Boolean)
    .join(',');

    if (!name || !formattedTags) {
    return res.status(400).json({ error: '名称和标签不能为空！' });
    }

    const sql = 'UPDATE materials SET name = ?, tags = ? WHERE id = ?';
    db.run(sql, [name, formattedTags, id], function (err) { // <-- 注意这里使用格式化后的 formattedTags
    if (err) { 
      console.error("数据库更新失败:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '修改成功' });
    });
});

// --- 6. 启动服务器 ---
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});