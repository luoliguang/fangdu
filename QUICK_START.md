# ⚡ 快速开始

## 📦 文件说明

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `deploy.sh` | Linux/macOS 部署脚本 | 生产环境部署 |
| `deploy.ps1` | Windows 部署脚本 | 生产环境部署 |
| `start.sh` | Linux/macOS 开发启动 | 本地开发 |
| `start.bat` | Windows 开发启动 | 本地开发 |
| `DEPLOY.md` | 详细部署指南 | 参考文档 |
| `CHANGELOG.md` | 版本更新日志 | 了解更新 |

---

## 🚀 部署到服务器（生产环境）

### Linux/macOS 服务器

```bash
# 1. SSH 登录服务器
ssh user@your-server.com

# 2. 克隆代码
git clone https://github.com/luoliguang/fangdu.git
cd fangdu

# 3. 配置环境变量（重要！）
cp backend/env.example backend/.env
nano backend/.env
# 修改：ADMIN_PASSWORD, JWT_SECRET, SECRET_TOKEN

# 4. 一键部署
chmod +x deploy.sh
./deploy.sh

# ✅ 完成！服务已自动启动
```

### Windows 服务器

```powershell
# 1. 远程桌面登录服务器

# 2. 克隆代码
git clone https://github.com/luoliguang/fangdu.git
cd fangdu

# 3. 配置环境变量（重要！）
copy backend\env.example backend\.env
notepad backend\.env
# 修改：ADMIN_PASSWORD, JWT_SECRET, SECRET_TOKEN

# 4. 一键部署
.\deploy.ps1

# ✅ 完成！服务已自动启动
```

---

## 💻 本地开发（开发环境）

### 方式一：快速启动（推荐）

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```
双击 start.bat
```

### 方式二：手动启动

```bash
# 终端1 - 启动后端
cd backend
npm install
node server.js

# 终端2 - 启动前端
cd frontend
npm install
npm run dev
```

---

## 🔄 更新部署

当您推送了新代码后，在服务器上运行：

```bash
# 拉取最新代码
git pull origin main

# 重新部署（会自动备份和迁移数据库）
./deploy.sh      # Linux/macOS
# 或
.\deploy.ps1     # Windows
```

**部署脚本会自动：**
- ✅ 停止旧服务
- ✅ 备份数据库
- ✅ 更新依赖
- ✅ 数据库迁移
- ✅ 构建前端
- ✅ 启动新服务

---

## ⚙️ 环境变量配置

首次部署前，必须修改 `backend/.env`：

```env
# 管理员账号（必须修改！）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_strong_password_123

# 安全密钥（必须修改！）
JWT_SECRET=your_jwt_secret_key_here
SECRET_TOKEN=your_admin_token_here

# 服务器配置
PORT=3002
NODE_ENV=production

# CORS（改为您的域名）
CORS_ORIGIN=https://your-domain.com
```

> 💡 **生成强随机密钥**：
> ```bash
> # Linux/macOS
> openssl rand -base64 32
> 
> # Windows (PowerShell)
> -join ((65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
> ```

---

## 🎯 服务管理

### 使用 PM2（推荐）

```bash
pm2 status                    # 查看状态
pm2 logs fangdu-backend       # 查看日志
pm2 restart fangdu-backend    # 重启
pm2 stop fangdu-backend       # 停止
pm2 delete fangdu-backend     # 删除
```

### 不使用 PM2

```bash
# Linux/macOS
pkill -f "node.*server.js"    # 停止服务
ps aux | grep node            # 查看进程

# Windows
tasklist | findstr node       # 查看进程
taskkill /F /IM node.exe      # 停止所有 Node 进程
```

---

## 🌐 访问地址

**开发环境:**
- 前端：http://localhost:5174
- 后端：http://localhost:3002

**生产环境:**
- 前端：http://your-domain.com
- 后端：http://your-domain.com:3002

> 建议配置 Nginx 反向代理，详见 [DEPLOY.md](./DEPLOY.md)

---

## 📊 访问统计说明

### 新功能（v1.5.1）

- ✅ **会话ID机制**：每个访客有唯一标识
- ✅ **准确统计**：同一网络下的多个用户可正确识别
- ✅ **防刷机制**：2分钟内重复访问不计数
- ✅ **在线统计**：5分钟内有活动算在线

### 数据库变更

部署脚本会**自动**添加 `session_id` 字段，无需手动操作。

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# Linux/macOS
lsof -i :3002
kill -9 <PID>

# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### 2. 权限错误（Linux）

```bash
chmod +x deploy.sh start.sh
```

### 3. 数据库错误

```bash
# 查看备份
ls backend/database/*.backup.*

# 恢复备份（如果需要）
cp backend/database/my_materials.db.backup.20241008 backend/database/my_materials.db
```

### 4. 前端无法连接后端

检查：
1. 后端是否启动：`curl http://localhost:3002/api/v1/materials`
2. CORS 配置：`backend/.env` 中的 `CORS_ORIGIN`
3. 防火墙：确保 3002 端口开放

---

## 📖 更多文档

- 📘 [完整部署指南](./DEPLOY.md)
- 📘 [API 文档](./docs/API.md)
- 📘 [更新日志](./CHANGELOG.md)
- 📘 [安全配置](./SECURITY.md)

---

## 🆘 需要帮助？

- 🐛 [提交问题](https://github.com/luoliguang/fangdu/issues)
- 💬 [讨论区](https://github.com/luoliguang/fangdu/discussions)
- 📧 联系开发者

---

**快速启动模板：**

```bash
# 生产环境（服务器）
git clone https://github.com/luoliguang/fangdu.git && cd fangdu
cp backend/env.example backend/.env && nano backend/.env
chmod +x deploy.sh && ./deploy.sh

# 开发环境（本地）
git clone https://github.com/luoliguang/fangdu.git && cd fangdu
chmod +x start.sh && ./start.sh
```

