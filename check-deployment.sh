#!/bin/bash

# 部署验证脚本 - 检查服务器上的代码版本和功能状态

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  部署验证检查"
echo "=========================================="
echo ""

# 1. 检查 Git 提交版本
echo -e "${BLUE}1. 检查代码版本...${NC}"
if [ -d ".git" ]; then
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    CURRENT_BRANCH=$(git branch --show-current)
    LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%ar)")
    
    echo -e "${GREEN}✅ Git 仓库信息：${NC}"
    echo "   当前分支: $CURRENT_BRANCH"
    echo "   当前提交: $CURRENT_COMMIT"
    echo "   最新提交: $LATEST_COMMIT"
    
    # 检查是否是最新的 v1.5.2
    if git log -1 --pretty=format:"%s" | grep -q "v1.5.2"; then
        echo -e "${GREEN}✅ 代码版本正确 (v1.5.2)${NC}"
    else
        echo -e "${YELLOW}⚠️  代码可能不是最新版本，请运行: git pull origin main${NC}"
    fi
else
    echo -e "${RED}❌ 不是 Git 仓库${NC}"
fi

echo ""

# 2. 检查数据库表结构
echo -e "${BLUE}2. 检查数据库...${NC}"
if [ -f "backend/database/my_materials.db" ]; then
    echo -e "${GREEN}✅ 数据库文件存在${NC}"
    
    # 检查 online_sessions 表
    if sqlite3 backend/database/my_materials.db "SELECT name FROM sqlite_master WHERE type='table' AND name='online_sessions';" 2>/dev/null | grep -q "online_sessions"; then
        echo -e "${GREEN}✅ online_sessions 表已创建${NC}"
        
        # 查看表结构
        echo -e "${YELLOW}   表结构：${NC}"
        sqlite3 backend/database/my_materials.db "PRAGMA table_info(online_sessions);" 2>/dev/null | while read line; do
            echo "      $line"
        done
        
        # 查看当前在线会话数
        ONLINE_COUNT=$(sqlite3 backend/database/my_materials.db "SELECT COUNT(*) FROM online_sessions WHERE last_heartbeat >= datetime('now', '-1 minute');" 2>/dev/null)
        echo -e "${YELLOW}   当前在线会话: ${GREEN}${ONLINE_COUNT}${NC}"
        
        # 显示最近的心跳
        echo -e "${YELLOW}   最近的心跳记录：${NC}"
        sqlite3 backend/database/my_materials.db "SELECT session_id, datetime(last_heartbeat, 'localtime') as last_beat FROM online_sessions ORDER BY last_heartbeat DESC LIMIT 3;" 2>/dev/null | while read line; do
            echo "      $line"
        done
    else
        echo -e "${RED}❌ online_sessions 表不存在${NC}"
        echo -e "${YELLOW}   请运行: node backend/scripts/migrate-add-online-sessions.js${NC}"
    fi
    
    # 检查 session_id 字段
    if sqlite3 backend/database/my_materials.db "PRAGMA table_info(visits);" 2>/dev/null | grep -q "session_id"; then
        echo -e "${GREEN}✅ visits 表已包含 session_id 字段${NC}"
    else
        echo -e "${RED}❌ visits 表缺少 session_id 字段${NC}"
    fi
else
    echo -e "${RED}❌ 数据库文件不存在${NC}"
fi

echo ""

# 3. 检查后端服务
echo -e "${BLUE}3. 检查后端服务...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "fangdu-backend"; then
        STATUS=$(pm2 list | grep "fangdu-backend" | awk '{print $10}')
        echo -e "${GREEN}✅ PM2 服务正在运行 (状态: $STATUS)${NC}"
        
        echo -e "${YELLOW}   最近的日志：${NC}"
        pm2 logs fangdu-backend --lines 5 --nostream 2>/dev/null | tail -10 | while read line; do
            echo "      $line"
        done
    else
        echo -e "${RED}❌ PM2 未找到 fangdu-backend 服务${NC}"
    fi
else
    # 检查 Node.js 进程
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${GREEN}✅ Node.js 服务正在运行${NC}"
        echo "   进程列表："
        ps aux | grep "node.*server.js" | grep -v grep | while read line; do
            echo "      $line"
        done
    else
        echo -e "${RED}❌ 未找到运行的 Node.js 服务${NC}"
    fi
fi

echo ""

# 4. 测试 API 接口
echo -e "${BLUE}4. 测试 API 接口...${NC}"

# 测试在线人数接口
if command -v curl &> /dev/null; then
    ONLINE_API=$(curl -s http://localhost:3002/api/v1/visits/online)
    if echo "$ONLINE_API" | grep -q "success"; then
        ONLINE_NUM=$(echo "$ONLINE_API" | grep -o '"onlineCount":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}✅ 在线人数 API 正常工作${NC}"
        echo -e "   当前在线: ${GREEN}${ONLINE_NUM}${NC} 人"
    else
        echo -e "${RED}❌ 在线人数 API 异常${NC}"
    fi
    
    # 测试心跳接口
    TEST_SESSION="test_check_$(date +%s)"
    HEARTBEAT_RESULT=$(curl -s -X POST http://localhost:3002/api/v1/visits/heartbeat \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"$TEST_SESSION\"}")
    
    if echo "$HEARTBEAT_RESULT" | grep -q "success"; then
        echo -e "${GREEN}✅ 心跳 API 正常工作${NC}"
        
        # 验证心跳是否记录到数据库
        if [ -f "backend/database/my_materials.db" ]; then
            sleep 1
            if sqlite3 backend/database/my_materials.db "SELECT * FROM online_sessions WHERE session_id='$TEST_SESSION';" 2>/dev/null | grep -q "$TEST_SESSION"; then
                echo -e "${GREEN}✅ 心跳已成功记录到数据库${NC}"
                # 清理测试数据
                sqlite3 backend/database/my_materials.db "DELETE FROM online_sessions WHERE session_id='$TEST_SESSION';" 2>/dev/null
            else
                echo -e "${RED}❌ 心跳未记录到数据库${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ 心跳 API 异常${NC}"
        echo "   响应: $HEARTBEAT_RESULT"
    fi
else
    echo -e "${YELLOW}⚠️  未安装 curl，跳过 API 测试${NC}"
fi

echo ""

# 5. 检查前端文件
echo -e "${BLUE}5. 检查前端代码...${NC}"
if [ -f "frontend/src/router/index.js" ]; then
    if grep -q "sendHeartbeat" frontend/src/router/index.js; then
        echo -e "${GREEN}✅ 前端包含心跳机制代码${NC}"
    else
        echo -e "${RED}❌ 前端缺少心跳机制代码${NC}"
    fi
    
    if grep -q "initHeartbeat" frontend/src/router/index.js; then
        echo -e "${GREEN}✅ 前端包含心跳初始化代码${NC}"
    else
        echo -e "${RED}❌ 前端缺少心跳初始化代码${NC}"
    fi
else
    echo -e "${RED}❌ 前端路由文件不存在${NC}"
fi

echo ""

# 6. 检查部署脚本
echo -e "${BLUE}6. 检查部署配置...${NC}"
if [ -f "deploy.sh" ]; then
    echo -e "${GREEN}✅ deploy.sh 存在${NC}"
    if grep -q "online_sessions" deploy.sh; then
        echo -e "${GREEN}✅ deploy.sh 包含数据库迁移逻辑${NC}"
    fi
fi

if [ -f "backend/scripts/migrate-add-online-sessions.js" ]; then
    echo -e "${GREEN}✅ 数据库迁移脚本存在${NC}"
else
    echo -e "${RED}❌ 数据库迁移脚本不存在${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}检查完成！${NC}"
echo "=========================================="
echo ""

# 提供建议
echo -e "${YELLOW}📋 建议操作：${NC}"
echo ""

if ! git log -1 --pretty=format:"%s" | grep -q "v1.5.2"; then
    echo -e "${YELLOW}1. 更新代码：${NC}"
    echo "   git pull origin main"
    echo ""
fi

if ! sqlite3 backend/database/my_materials.db "SELECT name FROM sqlite_master WHERE type='table' AND name='online_sessions';" 2>/dev/null | grep -q "online_sessions"; then
    echo -e "${YELLOW}2. 运行数据库迁移：${NC}"
    echo "   node backend/scripts/migrate-add-online-sessions.js"
    echo ""
fi

if ! pm2 list | grep -q "fangdu-backend"; then
    echo -e "${YELLOW}3. 启动服务：${NC}"
    echo "   pm2 start backend/server.js --name fangdu-backend"
    echo "   pm2 save"
    echo ""
fi

echo -e "${BLUE}4. 查看实时日志：${NC}"
echo "   pm2 logs fangdu-backend"
echo ""

echo -e "${BLUE}5. 前端测试：${NC}"
echo "   打开浏览器访问网站"
echo "   按 F12 打开开发者工具"
echo "   在 Network 标签查看是否有 heartbeat 请求"
echo ""

