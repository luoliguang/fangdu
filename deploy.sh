#!/bin/bash

# 方度素材管理系统 - 一键部署脚本
# 适用于：Linux/macOS 服务器
# 使用方法：./deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  方度素材管理系统 - 一键部署${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo -e "${RED}❌ 错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 停止现有服务
echo -e "${BLUE}步骤 1/7: 停止现有服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop fangdu-backend 2>/dev/null || echo -e "${YELLOW}⚠️  未找到运行中的服务${NC}"
else
    pkill -f "node.*server.js" 2>/dev/null || echo -e "${YELLOW}⚠️  未找到运行中的服务${NC}"
fi
echo -e "${GREEN}✅ 完成${NC}"

# 2. 备份数据库
echo ""
echo -e "${BLUE}步骤 2/7: 备份数据库...${NC}"
if [ -f "backend/database/my_materials.db" ]; then
    cp backend/database/my_materials.db backend/database/my_materials.db.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ 数据库备份完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据库文件不存在，将在首次启动时创建${NC}"
fi

# 3. 安装后端依赖
echo ""
echo -e "${BLUE}步骤 3/7: 安装后端依赖...${NC}"
cd backend
npm install --production
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"

# 4. 数据库迁移（自动添加字段和表）
echo ""
echo -e "${BLUE}步骤 4/7: 检查并更新数据库...${NC}"
if [ -f "database/my_materials.db" ]; then
    # 检查 session_id 字段是否存在
    HAS_SESSION_ID=$(sqlite3 database/my_materials.db "PRAGMA table_info(visits);" 2>/dev/null | grep -c "session_id" || echo "0")
    
    if [ "$HAS_SESSION_ID" -eq 0 ]; then
        echo -e "${YELLOW}📝 添加 session_id 字段...${NC}"
        sqlite3 database/my_materials.db "ALTER TABLE visits ADD COLUMN session_id TEXT;" 2>/dev/null || echo -e "${YELLOW}⚠️  字段可能已存在${NC}"
        sqlite3 database/my_materials.db "CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id);" 2>/dev/null
        echo -e "${GREEN}✅ session_id 字段添加完成${NC}"
    fi
    
    # 检查 online_sessions 表是否存在
    HAS_ONLINE_SESSIONS=$(sqlite3 database/my_materials.db "SELECT name FROM sqlite_master WHERE type='table' AND name='online_sessions';" 2>/dev/null | wc -l)
    
    if [ "$HAS_ONLINE_SESSIONS" -eq 0 ]; then
        echo -e "${YELLOW}📝 创建 online_sessions 表（用于准确的在线人数统计）...${NC}"
        sqlite3 database/my_materials.db "CREATE TABLE IF NOT EXISTS online_sessions (
            session_id TEXT PRIMARY KEY,
            ip_address TEXT NOT NULL,
            user_agent TEXT,
            last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        );" 2>/dev/null
        sqlite3 database/my_materials.db "CREATE INDEX IF NOT EXISTS idx_online_sessions_heartbeat ON online_sessions(last_heartbeat);" 2>/dev/null
        echo -e "${GREEN}✅ online_sessions 表创建完成${NC}"
    fi
    
    echo -e "${GREEN}✅ 数据库已是最新版本${NC}"
else
    echo -e "${YELLOW}⚠️  数据库将在首次启动时自动创建${NC}"
fi
cd ..

# 5. 安装前端依赖
echo ""
echo -e "${BLUE}步骤 5/7: 安装前端依赖...${NC}"
cd frontend
npm install
echo -e "${GREEN}✅ 前端依赖安装完成${NC}"

# 6. 构建前端
echo ""
echo -e "${BLUE}步骤 6/7: 构建前端...${NC}"
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"
cd ..

# 7. 启动服务
echo ""
echo -e "${BLUE}步骤 7/7: 启动服务...${NC}"
if command -v pm2 &> /dev/null; then
    # 使用 PM2
    pm2 start backend/server.js --name "fangdu-backend" --env production
    pm2 save
    echo -e "${GREEN}✅ 服务已启动（PM2）${NC}"
    echo ""
    echo -e "${BLUE}查看日志：${NC}pm2 logs fangdu-backend"
    echo -e "${BLUE}查看状态：${NC}pm2 status"
    echo -e "${BLUE}重启服务：${NC}pm2 restart fangdu-backend"
else
    # 后台运行
    cd backend
    nohup node server.js > ../server.log 2>&1 &
    echo -e "${GREEN}✅ 服务已启动（后台运行）${NC}"
    echo ""
    echo -e "${BLUE}查看日志：${NC}tail -f server.log"
    echo -e "${BLUE}停止服务：${NC}pkill -f 'node.*server.js'"
fi

# 部署完成
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${BLUE}访问地址：${NC}"
echo -e "  前端：http://your-domain.com"
echo -e "  后端：http://your-domain.com:3002"
echo ""
echo -e "${BLUE}提示：${NC}"
echo -e "  1. 首次部署请配置 backend/.env 文件"
echo -e "  2. 建议配置 Nginx 反向代理"
echo -e "  3. 使用 HTTPS 保护您的网站"
echo ""

