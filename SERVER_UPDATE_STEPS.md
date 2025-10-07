# 🚀 服务器更新步骤（必读）

## ⚠️ 问题现象

- ❌ 浏览器 Network 中没有 heartbeat 请求
- ❌ 服务器上没有 deploy.sh 文件
- ❌ 很多新文件都不在服务器上

**原因**：服务器代码还是旧版本，需要从 GitHub 拉取最新代码

---

## ✅ 解决方案（按顺序执行）

### 第 1 步：SSH 登录服务器

```bash
# 替换为您的服务器信息
ssh root@your-server-ip
# 或
ssh username@your-server-domain.com
```

---

### 第 2 步：进入项目目录

```bash
# 替换为您的实际项目路径
cd /www/wwwroot/fangdu
# 或
cd /home/username/fangdu
# 或您实际的路径
```

---

### 第 3 步：检查当前版本

```bash
# 查看当前提交
git log -1 --oneline
```

**如果显示的不是：**
```
bd24fb7 feat: 优化在线统计系统并清理项目 (v1.5.2)
```

**那就需要继续下面的步骤！**

---

### 第 4 步：备份当前数据库（重要！）

```bash
# 备份数据库文件
cp backend/database/my_materials.db backend/database/my_materials.db.backup_$(date +%Y%m%d_%H%M%S)

# 确认备份成功
ls -lh backend/database/my_materials.db*
```

---

### 第 5 步：拉取最新代码

```bash
# 拉取最新代码
git pull origin main
```

**可能遇到的问题：**

#### 问题 A：提示有本地修改
```
error: Your local changes to the following files would be overwritten by merge
```

**解决方法：**
```bash
# 保存本地修改
git stash

# 再次拉取
git pull origin main

# 如果需要恢复本地修改
git stash pop
```

#### 问题 B：提示冲突
```
CONFLICT (content): Merge conflict in ...
```

**解决方法：**
```bash
# 使用远程版本覆盖
git fetch origin
git reset --hard origin/main
```

---

### 第 6 步：确认新文件存在

```bash
# 检查关键文件
ls -lh deploy.sh
ls -lh CHANGELOG.md
ls -lh backend/scripts/migrate-add-online-sessions.js
```

**应该看到：**
```
-rwxr-xr-x 1 user user 4.2K Oct  8 10:30 deploy.sh
-rw-r--r-- 1 user user 8.1K Oct  8 10:30 CHANGELOG.md
-rw-r--r-- 1 user user 5.5K Oct  8 10:30 backend/scripts/migrate-add-online-sessions.js
```

✅ 如果看到这些文件，说明代码已经更新成功！

---

### 第 7 步：运行数据库迁移

```bash
# 进入后端目录
cd backend

# 运行迁移脚本
node scripts/migrate-add-online-sessions.js

# 返回项目根目录
cd ..
```

**应该看到：**
```
============================================
  数据库迁移：添加在线会话表
============================================

✅ 数据库连接成功
✅ online_sessions 表创建成功
✅ 索引创建成功

============================================
  ✅ 迁移完成！
============================================
```

---

### 第 8 步：安装后端依赖

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install --production

# 返回根目录
cd ..
```

---

### 第 9 步：构建前端

```bash
# 进入前端目录
cd frontend

# 安装依赖（如果有新的）
npm install

# 构建
npm run build

# 返回根目录
cd ..
```

---

### 第 10 步：重启服务

#### 如果使用 PM2：
```bash
# 重启服务
pm2 restart fangdu-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs fangdu-backend --lines 20
```

#### 如果使用 systemd：
```bash
sudo systemctl restart fangdu-backend
sudo systemctl status fangdu-backend
```

#### 如果直接运行 Node.js：
```bash
# 找到进程
ps aux | grep node

# 杀死进程（替换 PID）
kill -9 [PID]

# 重新启动
cd backend
nohup node server.js > ../server.log 2>&1 &
```

---

### 第 11 步：验证部署

#### 方法 1：测试心跳 API
```bash
curl -X POST http://localhost:3002/api/v1/visits/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test123"}'
```

**应该返回：**
```json
{"success":true,"message":"心跳更新成功"}
```

#### 方法 2：检查数据库表
```bash
cd backend/database
sqlite3 my_materials.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**应该看到：**
```
materials
feedbacks
visits
online_sessions  ← 新表！
```

#### 方法 3：浏览器测试
1. 打开网站
2. 按 F12
3. 切换到 Network 标签
4. 刷新页面
5. 筛选 `heartbeat`
6. **应该看到每 30 秒发送一次的请求！**

---

## 🎯 快速命令汇总（复制粘贴）

```bash
# 1. 进入项目目录（修改为您的路径）
cd /www/wwwroot/fangdu

# 2. 备份数据库
cp backend/database/my_materials.db backend/database/my_materials.db.backup_$(date +%Y%m%d_%H%M%S)

# 3. 拉取最新代码
git pull origin main

# 4. 运行数据库迁移
node backend/scripts/migrate-add-online-sessions.js

# 5. 安装后端依赖
cd backend && npm install --production && cd ..

# 6. 构建前端
cd frontend && npm run build && cd ..

# 7. 重启服务（PM2）
pm2 restart fangdu-backend

# 8. 查看日志
pm2 logs fangdu-backend --lines 20

# 9. 测试心跳 API
curl -X POST http://localhost:3002/api/v1/visits/heartbeat -H "Content-Type: application/json" -d '{"sessionId":"test123"}'
```

---

## 🚨 常见问题

### Q1: git pull 提示 "Already up to date"

**说明**：您的服务器已经是最新代码了，但可能服务没有重启

**解决**：
```bash
pm2 restart fangdu-backend
```

---

### Q2: npm install 失败

**可能原因**：网络问题或 Node.js 版本过低

**解决**：
```bash
# 使用淘宝镜像
npm install --registry=https://registry.npmmirror.com

# 或者检查 Node.js 版本
node -v  # 应该是 v16+ 或更高
```

---

### Q3: 前端构建失败

**可能原因**：内存不足或依赖问题

**解决**：
```bash
# 清理缓存
cd frontend
rm -rf node_modules
npm install
npm run build
```

---

### Q4: pm2 命令不存在

**说明**：需要安装 PM2

**解决**：
```bash
npm install -g pm2

# 启动服务
cd /path/to/fangdu
pm2 start backend/server.js --name fangdu-backend
pm2 save
pm2 startup
```

---

## ✅ 成功标志

更新完成后，您应该能够：

1. ✅ 在浏览器 F12 → Network 中看到 `heartbeat` 请求（每 30 秒一次）
2. ✅ 在管理后台看到准确的在线人数
3. ✅ 多个浏览器打开时，在线人数增加
4. ✅ 关闭浏览器后 1-2 分钟，在线人数减少

---

## 📞 获取帮助

如果遇到问题，请提供以下信息：

```bash
# 1. 当前提交
git log -1 --oneline

# 2. 数据库表
sqlite3 backend/database/my_materials.db "SELECT name FROM sqlite_master WHERE type='table';"

# 3. PM2 状态
pm2 status

# 4. 最近日志
pm2 logs fangdu-backend --lines 50 --nostream

# 5. 心跳测试结果
curl -X POST http://localhost:3002/api/v1/visits/heartbeat -H "Content-Type: application/json" -d '{"sessionId":"test123"}'
```

---

**准备好了吗？开始更新吧！** 🚀

