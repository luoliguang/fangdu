// --- 1. 引入工具 ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();

// --- 2. 初始化 ---
const app = express();
const PORT = 3001;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

// 增加一个健壮性检查，如果忘记在.env里设置，程序会报错退出，防止安全漏洞
if (!SECRET_TOKEN) {
    console.error("严重错误：未在 .env 文件中定义 SECRET_TOKEN！");
    process.exit(1);
}

// --- 3. 连接数据库 ---
const db = new sqlite3.Database('./database/my_materials.db', (err) => {
  if (err) { console.error(err.message); }
  console.log('成功连接到多媒体数据库.');

  // 重新创建表格，增加一个 media_type 字段
  db.run(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      tags TEXT,
      media_type TEXT NOT NULL 
  )`, (err) => {
      if (err) {
          console.error("创建表格失败:", err);
      } else {
          // 插入一些更丰富的测试数据, 包括视频
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
  });
});

// 新增：配置 Multer 用于文件上传
// 新增：配置 Multer 用于文件上传 (升级版)
const multer = require('multer');

const fileFilter = (req, file, cb) => {
    // 允许的MIME类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // 接受文件
    } else {
        cb(new Error('不支持的文件类型!'), false); // 拒绝文件
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// 将 fileFilter 应用到 multer
const upload = multer({ storage: storage, fileFilter: fileFilter });

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
app.get('/api/materials', (req, res) => {
  // 1. 获取原始的搜索字符串和标签
  const rawSearchTerm = req.query.search || '';
  const filterTag = req.query.tag || '';

  // 2. 将搜索字符串按空格分割成关键词数组
  //    并使用 .filter(k => k) 清除因多个空格产生的空字符串
  const keywords = rawSearchTerm.split(' ').filter(k => k);

  // 3. 动态构建 SQL 查询
  //    我们使用 `WHERE 1=1` 是一个小技巧，方便后续无脑拼接 `AND` 条件
  let sql = `SELECT * FROM materials WHERE 1=1`;
  const params = [];

  // 4. 遍历关键词数组，为每个关键词动态添加一个 AND name LIKE ? 条件
  keywords.forEach(keyword => {
      sql += ` AND name LIKE ?`;
      params.push(`%${keyword}%`);
  });

  // 5. 处理标签过滤，这个逻辑保持不变，继续拼接在后面
  if (filterTag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%${filterTag}%`);
  }

  // 6. 执行最终构建好的SQL查询
  db.all(sql, params, (err, rows) => {
      if (err) { 
          console.error("多关键词搜索失败:", err);
          return res.status(500).json({ "error": err.message }); 
      }
      res.json({ "message": "success", "data": rows });
  });
});

// 新增接口3: 处理素材上传
// upload.single('imageFile') 表示处理表单中名为 'imageFile' 的单个文件
// 修改上传接口，增加媒体类型判断
app.post('/api/materials', authenticateToken, upload.single('imageFile'), (req, res) => {
  const { name, tags } = req.body;
  const filePath = '/uploads/' + req.file.filename;
  // 从文件的mimetype判断是图片还是视频
  const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';

  if (!name || !tags || !req.file) {
      return res.status(400).json({ error: '缺少必要信息！' });
  }

  const sql = `INSERT INTO materials (name, file_path, tags, media_type) VALUES (?, ?, ?, ?)`;
  const params = [name, filePath, tags, mediaType];

  db.run(sql, params, function(err) {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json({
          message: '上传成功!',
          id: this.lastID
      });
  });
});

// 接口4: 删除素材
app.delete('/api/materials/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  
  // 1. 先从数据库找到文件路径，以便删除文件
  db.get('SELECT file_path FROM materials WHERE id = ?', [id], (err, row) => {
      if (err) {
          console.error("数据库查询失败:", err);
          return res.status(500).json({ error: '数据库查询失败' });
      }
      if (!row) {
          return res.status(404).json({ error: '未在数据库中找到该素材' });
      }
      
      // __dirname 指向当前文件(server.js)所在的目录
      // 我们需要拼接出文件的绝对路径
      const filePath = path.join(__dirname, row.file_path);

      // 2. 从数据库删除条目
      db.run('DELETE FROM materials WHERE id = ?', id, function (err) {
          if (err) {
              console.error("数据库删除失败:", err);
              return res.status(500).json({ error: err.message });
          }
          
          // 3. 从服务器硬盘删除文件 (确保文件存在再删除)
          if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (fsErr) => {
                  if (fsErr) {
                      // 即使文件删除失败，也应该告诉前端数据库操作成功了
                      // 这是一个非关键性错误，可以在后台记录日志
                      console.error("删除服务器文件失败:", fsErr);
                  }
              });
          } else {
              console.warn("文件不存在，无法删除:", filePath);
          }
          
          res.json({ message: '删除成功' });
      });
  });
});

// 接口5: 修改素材信息
// 请确保这里是 app.put, 路径是 '/api/materials/:id', 并且有 authenticateToken
app.put('/api/materials/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const { name, tags } = req.body;

  // 增加一个检查，确保name和tags存在
  if (!name || !tags) {
      return res.status(400).json({ error: '名称和标签不能为空！' });
  }

  const sql = 'UPDATE materials SET name = ?, tags = ? WHERE id = ?';
  db.run(sql, [name, tags, id], function (err) {
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