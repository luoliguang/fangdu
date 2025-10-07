# 🚀 部署指南

## 快速部署

### Linux/macOS

```bash
# 1. 克隆代码
git clone https://github.com/luoliguang/fangdu.git
cd fangdu

# 2. 配置环境变量（首次部署）
cp backend/env.example backend/.env
nano backend/.env  # 修改配置

# 3. 一键部署
chmod +x deploy.sh
./deploy.sh
```

### Windows

```powershell
# 1. 克隆代码
git clone https://github.com/luoliguang/fangdu.git
cd fangdu

# 2. 配置环境变量（首次部署）
copy backend\env.example backend\.env
notepad backend\.env  # 修改配置

# 3. 一键部署
.\deploy.ps1
```

---

## 必需配置

首次部署前，请在 `backend/.env` 中修改以下配置：

```env
# 管理员账号（必须修改！）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# 安全密钥（必须修改！）
JWT_SECRET=your-jwt-secret-key
SECRET_TOKEN=your-admin-token

# 服务器配置
PORT=3002
NODE_ENV=production

# CORS（修改为您的域名）
CORS_ORIGIN=https://your-domain.com
```

---

## 部署脚本说明

部署脚本会自动执行：

1. ✅ 停止现有服务
2. ✅ 备份数据库
3. ✅ 安装后端依赖
4. ✅ 数据库迁移（自动添加新字段）
5. ✅ 安装前端依赖
6. ✅ 构建前端代码
7. ✅ 启动服务

---

## 更新部署

当有新功能更新时：

```bash
# 拉取最新代码
git pull origin main

# 重新部署（会自动备份和迁移）
./deploy.sh      # Linux/macOS
# 或
.\deploy.ps1     # Windows
```

---

## 服务管理

### 使用 PM2（推荐）

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs fangdu-backend

# 重启服务
pm2 restart fangdu-backend

# 停止服务
pm2 stop fangdu-backend
```

### 不使用 PM2

```bash
# Linux/macOS
pkill -f "node.*server.js"    # 停止
tail -f server.log             # 查看日志

# Windows
Get-Process -Name node | Stop-Process  # 停止
```

---

## Nginx 配置（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /path/to/fangdu/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 文件
    location /uploads {
        proxy_pass http://localhost:3002;
    }
}
```

---

## HTTPS 配置（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 故障排查

### 1. 端口被占用

```bash
# Linux/macOS
lsof -i :3002
kill -9 <PID>

# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### 2. 数据库错误

```bash
# 检查数据库文件
ls -la backend/database/

# 如果损坏，恢复备份
cp backend/database/my_materials.db.backup.* backend/database/my_materials.db
```

### 3. 前端无法访问后端

检查 `backend/.env` 中的 `CORS_ORIGIN` 配置是否正确。

---

## 回滚

如果部署出现问题：

```bash
# 1. 恢复数据库
cp backend/database/my_materials.db.backup.* backend/database/my_materials.db

# 2. 回退代码
git checkout <上一个版本>

# 3. 重新部署
./deploy.sh
```

---

## 性能优化

### 1. 启用 Gzip

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. 启用缓存

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. PM2 集群模式

```bash
pm2 start backend/server.js -i max --name "fangdu-backend"
```

---

## 监控

### PM2 监控

```bash
# 安装 PM2 Plus（免费）
pm2 plus

# 查看实时监控
pm2 monit
```

### 日志管理

```bash
# PM2 日志轮转
pm2 install pm2-logrotate

# 手动查看
pm2 logs fangdu-backend --lines 100
```

---

## 数据备份

建议定期备份：

```bash
#!/bin/bash
# backup.sh - 添加到 crontab

DATE=$(date +%Y%m%d)
cp backend/database/my_materials.db backups/my_materials_$DATE.db
find backups/ -name "*.db" -mtime +30 -delete  # 删除30天前的备份

# 添加到 crontab
# crontab -e
# 0 2 * * * /path/to/backup.sh
```

---

## 更多帮助

- 📖 [完整文档](./docs/)
- 🐛 [提交问题](https://github.com/luoliguang/fangdu/issues)
- 💬 [讨论区](https://github.com/luoliguang/fangdu/discussions)

