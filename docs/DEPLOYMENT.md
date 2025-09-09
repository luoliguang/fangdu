# 部署文档

## 概述

本文档介绍房屋租赁管理系统的部署流程，包括开发环境搭建、生产环境部署和运维管理。

## 系统要求

### 基础环境

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
- **数据库**: MySQL >= 8.0 或 PostgreSQL >= 12
- **Redis**: >= 6.0 (可选，用于缓存)
- **操作系统**: Linux (推荐 Ubuntu 20.04+) / Windows 10+ / macOS 10.15+

### 服务器配置

#### 最小配置
- **CPU**: 2核
- **内存**: 4GB
- **存储**: 20GB SSD
- **带宽**: 5Mbps

#### 推荐配置
- **CPU**: 4核
- **内存**: 8GB
- **存储**: 50GB SSD
- **带宽**: 10Mbps

## 开发环境搭建

### 1. 克隆项目

```bash
git clone https://github.com/your-username/fangdu.git
cd fangdu
```

### 2. 安装依赖

#### 后端依赖

```bash
cd backend
npm install
```

#### 前端依赖

```bash
cd frontend
npm install
```

### 3. 环境配置

#### 后端环境变量

复制并配置环境变量文件：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 应用配置
NODE_ENV=development
APP_NAME=房屋租赁管理系统
APP_VERSION=1.0.0
APP_PORT=3000
APP_HOST=localhost

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fangdu_dev
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_PATH=uploads

# 阿里云OSS配置（可选）
ALI_OSS_ACCESS_KEY_ID=your_access_key_id
ALI_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALI_OSS_BUCKET=your_bucket_name
ALI_OSS_REGION=oss-cn-hangzhou
```

#### 前端环境变量

```bash
cd frontend
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# 应用配置
VITE_APP_TITLE=房屋租赁管理系统
VITE_APP_VERSION=1.0.0

# API配置
VITE_API_BASE_URL=http://localhost:3000/api
VITE_UPLOAD_URL=http://localhost:3000/api/upload

# 开发配置
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=debug
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_HMR=true
```

### 4. 数据库初始化

#### 创建数据库

```sql
CREATE DATABASE fangdu_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 运行迁移脚本

```bash
cd backend
npm run migrate
```

#### 填充测试数据（可选）

```bash
npm run seed
```

### 5. 启动开发服务器

#### 启动后端服务

```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:3000` 启动

#### 启动前端服务

```bash
cd frontend
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

## 生产环境部署

### 方式一：传统部署

#### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y

# 安装MySQL
sudo apt install mysql-server -y
```

#### 2. 部署后端

```bash
# 克隆代码
git clone https://github.com/your-username/fangdu.git
cd fangdu/backend

# 安装依赖
npm ci --production

# 配置环境变量
cp .env.production .env
# 编辑 .env 文件，设置生产环境配置

# 启动应用
pm2 start ecosystem.config.js --env production
```

#### 3. 部署前端

```bash
cd ../frontend

# 安装依赖
npm ci

# 构建生产版本
npm run build

# 复制构建文件到Nginx目录
sudo cp -r dist/* /var/www/html/
```

#### 4. 配置Nginx

创建Nginx配置文件 `/etc/nginx/sites-available/fangdu`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 文件上传
    location /uploads {
        alias /path/to/your/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/fangdu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 方式二：Docker部署

#### 1. 创建Dockerfile

**后端Dockerfile** (`backend/Dockerfile`)：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

**前端Dockerfile** (`frontend/Dockerfile`)：

```dockerfile
# 构建阶段
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  # 数据库
  mysql:
    image: mysql:8.0
    container_name: fangdu-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    networks:
      - fangdu-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: fangdu-redis
    ports:
      - "6379:6379"
    networks:
      - fangdu-network

  # 后端API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fangdu-backend
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads
    networks:
      - fangdu-network

  # 前端应用
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fangdu-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - fangdu-network

volumes:
  mysql_data:

networks:
  fangdu-network:
    driver: bridge
```

#### 3. 部署命令

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式三：云平台部署

#### Vercel部署（前端）

1. 连接GitHub仓库
2. 配置构建设置：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. 配置环境变量
4. 部署

#### Railway部署（后端）

1. 连接GitHub仓库
2. 选择后端目录
3. 配置环境变量
4. 添加数据库服务
5. 部署

## SSL证书配置

### 使用Let's Encrypt

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
0 12 * * * /usr/bin/certbot renew --quiet
```

## 监控和日志

### PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 监控面板
pm2 monit

# 重启应用
pm2 restart all
```

### 日志管理

#### 后端日志配置

```javascript
// backend/src/config/logger.js
const winston = require('winston')
const path = require('path')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

module.exports = logger
```

### 性能监控

#### 使用PM2 Plus

```bash
# 连接PM2 Plus
pm2 link <secret_key> <public_key>

# 启用监控
pm2 install pm2-server-monit
```

## 备份策略

### 数据库备份

```bash
#!/bin/bash
# backup.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backup/mysql"
DB_NAME="fangdu_prod"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u root -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### 文件备份

```bash
#!/bin/bash
# file_backup.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backup/files"
UPLOAD_DIR="/app/uploads"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# 删除30天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "File backup completed: uploads_$DATE.tar.gz"
```

### 自动备份

```bash
# 添加到crontab
crontab -e

# 每天凌晨2点备份数据库
0 2 * * * /path/to/backup.sh

# 每周日凌晨3点备份文件
0 3 * * 0 /path/to/file_backup.sh
```

## 故障排除

### 常见问题

#### 1. 端口占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000

# 杀死进程
sudo kill -9 <PID>
```

#### 2. 数据库连接失败

```bash
# 检查MySQL状态
sudo systemctl status mysql

# 重启MySQL
sudo systemctl restart mysql

# 检查连接
mysql -u root -p -e "SELECT 1"
```

#### 3. 内存不足

```bash
# 查看内存使用
free -h

# 查看进程内存使用
top -o %MEM

# 重启PM2应用
pm2 restart all
```

#### 4. 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理日志文件
sudo journalctl --vacuum-time=7d

# 清理Docker
docker system prune -a
```

### 日志分析

#### 应用日志

```bash
# PM2日志
pm2 logs --lines 100

# Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

## 安全配置

### 防火墙设置

```bash
# 启用UFW
sudo ufw enable

# 允许SSH
sudo ufw allow ssh

# 允许HTTP和HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 查看状态
sudo ufw status
```

### 安全更新

```bash
# 自动安全更新
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 应用安全

1. **环境变量保护**：不要在代码中硬编码敏感信息
2. **HTTPS强制**：生产环境必须使用HTTPS
3. **输入验证**：严格验证所有用户输入
4. **SQL注入防护**：使用参数化查询
5. **XSS防护**：对输出进行适当转义
6. **CSRF防护**：实现CSRF令牌验证

## 性能优化

### 前端优化

1. **代码分割**：使用动态导入分割代码
2. **资源压缩**：启用Gzip压缩
3. **缓存策略**：设置适当的缓存头
4. **CDN加速**：使用CDN分发静态资源

### 后端优化

1. **数据库索引**：为查询字段添加索引
2. **连接池**：使用数据库连接池
3. **缓存**：使用Redis缓存热点数据
4. **负载均衡**：使用Nginx负载均衡

### 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_materials_user_id ON materials(user_id);
CREATE INDEX idx_materials_created_at ON materials(created_at);
CREATE INDEX idx_feedback_material_id ON feedback(material_id);

-- 查询优化
EXPLAIN SELECT * FROM materials WHERE user_id = 1;
```

## 更新日志

### v1.0.0 (2024-01-01)
- 初始部署文档
- 支持传统部署和Docker部署
- 添加监控和备份策略
- 完善安全配置指南