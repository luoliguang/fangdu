#!/bin/bash

# 快速更新脚本 - 服务器端使用
# 在服务器上运行: bash quick-update.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo -e "  ${BLUE}服务器快速更新脚本${NC}"
echo "=========================================="
echo ""

# 检查是否在项目目录
if [ ! -f "backend/server.js" ]; then
    echo -e "${RED}❌ 错误：当前不在项目根目录${NC}"
    echo "请先运行: cd /path/to/fangdu"
    exit 1
fi

# 1. 备份数据库
echo -e "${BLUE}步骤 1/7: 备份数据库...${NC}"
if [ -f "backend/database/my_materials.db" ]; then
    BACKUP_FILE="backend/database/my_materials.db.backup_$(date +%Y%m%d_%H%M%S)"
    cp backend/database/my_materials.db "$BACKUP_FILE"
    echo -e "${GREEN}✅ 数据库已备份到: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  数据库文件不存在${NC}"
fi

# 2. 拉取最新代码
echo ""
echo -e "${BLUE}步骤 2/7: 拉取最新代码...${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo -e "${GREEN}✅ 代码已是最新版本${NC}"
else
    echo -e "${YELLOW}正在更新代码...${NC}"
    git pull origin main
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 代码更新成功${NC}"
    else
        echo -e "${RED}❌ 代码更新失败${NC}"
        echo "尝试强制更新..."
        git reset --hard origin/main
    fi
fi

# 3. 检查新文件
echo ""
echo -e "${BLUE}步骤 3/7: 检查新文件...${NC}"
if [ -f "deploy.sh" ]; then
    echo -e "${GREEN}✅ deploy.sh 存在${NC}"
else
    echo -e "${RED}❌ deploy.sh 不存在（可能更新失败）${NC}"
fi

if [ -f "backend/scripts/migrate-add-online-sessions.js" ]; then
    echo -e "${GREEN}✅ 迁移脚本存在${NC}"
else
    echo -e "${RED}❌ 迁移脚本不存在${NC}"
fi

# 4. 运行数据库迁移
echo ""
echo -e "${BLUE}步骤 4/7: 运行数据库迁移...${NC}"
if [ -f "backend/scripts/migrate-add-online-sessions.js" ]; then
    node backend/scripts/migrate-add-online-sessions.js
else
    echo -e "${YELLOW}⚠️  迁移脚本不存在，跳过${NC}"
fi

# 5. 安装后端依赖
echo ""
echo -e "${BLUE}步骤 5/7: 安装后端依赖...${NC}"
cd backend
npm install --production
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
cd ..

# 6. 构建前端
echo ""
echo -e "${BLUE}步骤 6/7: 构建前端...${NC}"
cd frontend
npm install
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"
cd ..

# 7. 重启服务
echo ""
echo -e "${BLUE}步骤 7/7: 重启服务...${NC}"

# 检查是否使用 PM2
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "fangdu-backend"; then
        pm2 restart fangdu-backend
        echo -e "${GREEN}✅ PM2 服务已重启${NC}"
        echo ""
        echo "查看日志: pm2 logs fangdu-backend"
    else
        echo -e "${YELLOW}⚠️  未找到 fangdu-backend PM2 进程${NC}"
        echo "请手动启动: pm2 start backend/server.js --name fangdu-backend"
    fi
else
    # 尝试杀死现有 Node.js 进程
    echo -e "${YELLOW}未安装 PM2，尝试重启 Node.js 进程...${NC}"
    pkill -f "node.*server.js"
    sleep 2
    
    # 后台启动
    cd backend
    nohup node server.js > ../server.log 2>&1 &
    echo -e "${GREEN}✅ 服务已重启（后台运行）${NC}"
    cd ..
fi

# 验证
echo ""
echo "=========================================="
echo -e "${GREEN}更新完成！${NC}"
echo "=========================================="
echo ""

# 测试 API
echo -e "${BLUE}正在测试心跳 API...${NC}"
sleep 2

HEARTBEAT_TEST=$(curl -s -X POST http://localhost:3002/api/v1/visits/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"sessionId": "test_update_script"}' 2>/dev/null)

if echo "$HEARTBEAT_TEST" | grep -q "success"; then
    echo -e "${GREEN}✅ 心跳 API 测试成功！${NC}"
    
    # 清理测试数据
    sqlite3 backend/database/my_materials.db "DELETE FROM online_sessions WHERE session_id='test_update_script';" 2>/dev/null
else
    echo -e "${RED}❌ 心跳 API 测试失败${NC}"
    echo "响应: $HEARTBEAT_TEST"
fi

echo ""
echo -e "${YELLOW}📋 下一步：${NC}"
echo "1. 打开网站"
echo "2. 按 F12 打开开发者工具"
echo "3. 切换到 Network 标签"
echo "4. 刷新页面"
echo "5. 查找 'heartbeat' 请求（每30秒一次）"
echo ""

if command -v pm2 &> /dev/null; then
    echo "查看日志: pm2 logs fangdu-backend"
else
    echo "查看日志: tail -f server.log"
fi

echo ""

