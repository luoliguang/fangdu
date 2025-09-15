#!/bin/bash

# SQLite数据库部署脚本
# 用于将本地数据库文件部署到服务器

echo "🚀 开始部署SQLite数据库..."

# 配置变量 - 请根据您的服务器情况修改
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
SERVER_PATH="/path/to/your/project/backend"
LOCAL_DB_PATH="./backend/database/my_materials.db"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查本地数据库文件是否存在
if [ ! -f "$LOCAL_DB_PATH" ]; then
    echo -e "${RED}❌ 错误：本地数据库文件不存在: $LOCAL_DB_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 找到本地数据库文件: $LOCAL_DB_PATH${NC}"
echo "文件大小: $(du -h "$LOCAL_DB_PATH" | cut -f1)"

# 1. 在服务器上创建数据库目录
echo -e "${YELLOW}📁 在服务器上创建数据库目录...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_PATH/database"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 服务器数据库目录创建成功${NC}"
else
    echo -e "${RED}❌ 服务器数据库目录创建失败${NC}"
    exit 1
fi

# 2. 备份服务器上的现有数据库（如果存在）
echo -e "${YELLOW}💾 备份服务器上的现有数据库...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "
    if [ -f $SERVER_PATH/database/my_materials.db ]; then
        cp $SERVER_PATH/database/my_materials.db $SERVER_PATH/database/my_materials.db.backup.$(date +%Y%m%d_%H%M%S)
        echo '已备份现有数据库'
    else
        echo '服务器上没有现有数据库文件'
    fi
"

# 3. 上传数据库文件到服务器
echo -e "${YELLOW}📤 上传数据库文件到服务器...${NC}"
scp "$LOCAL_DB_PATH" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/database/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库文件上传成功${NC}"
else
    echo -e "${RED}❌ 数据库文件上传失败${NC}"
    exit 1
fi

# 4. 设置正确的文件权限
echo -e "${YELLOW}🔐 设置数据库文件权限...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "
    chmod 664 $SERVER_PATH/database/my_materials.db
    chown \$(whoami):\$(whoami) $SERVER_PATH/database/my_materials.db
    ls -la $SERVER_PATH/database/my_materials.db
"

# 5. 验证数据库文件
echo -e "${YELLOW}🔍 验证服务器上的数据库文件...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "
    if [ -f $SERVER_PATH/database/my_materials.db ]; then
        echo '✅ 数据库文件存在'
        echo '文件大小:' \$(du -h $SERVER_PATH/database/my_materials.db | cut -f1)
        echo '文件权限:' \$(ls -la $SERVER_PATH/database/my_materials.db | cut -d' ' -f1)
    else
        echo '❌ 数据库文件不存在'
        exit 1
    fi
"

# 6. 测试数据库连接（如果服务器上有Node.js和sqlite3）
echo -e "${YELLOW}🧪 测试数据库连接...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_PATH
    if command -v node &> /dev/null && [ -f check-database.js ]; then
        echo '正在测试数据库连接...'
        node check-database.js
    else
        echo '跳过数据库连接测试（需要Node.js和check-database.js）'
    fi
"

echo -e "${GREEN}🎉 数据库部署完成！${NC}"
echo ""
echo "📋 部署总结:"
echo "- 本地数据库: $LOCAL_DB_PATH"
echo "- 服务器路径: $SERVER_USER@$SERVER_HOST:$SERVER_PATH/database/my_materials.db"
echo "- 文件权限: 664"
echo ""
echo "🔧 接下来的步骤:"
echo "1. 确保服务器上的应用程序配置正确"
echo "2. 重启您的Node.js应用程序"
echo "3. 测试应用程序功能"
echo ""
echo "💡 提示: 如果需要修改服务器配置，请编辑此脚本顶部的变量"