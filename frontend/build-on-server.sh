#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 开始优化构建...${NC}"

# 检查是否有足够的内存
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
echo -e "${YELLOW}📊 服务器总内存: ${TOTAL_MEM}MB${NC}"

if [ $TOTAL_MEM -lt 2000 ]; then
    echo -e "${RED}⚠️  警告：内存小于2GB，建议添加SWAP空间${NC}"
    
    # 检查是否已有swap
    if [ $(swapon --show | wc -l) -eq 0 ]; then
        echo -e "${YELLOW}💾 正在创建2GB SWAP空间...${NC}"
        sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo -e "${GREEN}✅ SWAP空间创建成功${NC}"
    else
        echo -e "${GREEN}✅ SWAP已启用${NC}"
    fi
fi

# 清理缓存
echo -e "${YELLOW}🧹 清理npm缓存...${NC}"
npm cache clean --force

# 清理node_modules（可选）
# rm -rf node_modules
# npm install

# 设置Node.js内存限制并构建
echo -e "${YELLOW}📦 开始构建（限制内存使用）...${NC}"

# 使用多种优化策略
export NODE_OPTIONS="--max-old-space-size=1536 --max-semi-space-size=64"
export NODE_ENV=production

# 开始构建
npm run build

# 检查构建结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功！${NC}"
    
    # 显示构建文件大小
    if [ -d "dist" ]; then
        echo -e "${GREEN}📊 构建文件大小：${NC}"
        du -sh dist/
        
        echo -e "${YELLOW}📁 构建文件列表：${NC}"
        ls -lh dist/
    fi
    
    echo -e "${GREEN}🎉 构建完成！可以部署到Nginx了${NC}"
    echo -e "${YELLOW}💡 运行以下命令部署：${NC}"
    echo -e "   sudo rm -rf /var/www/html/*"
    echo -e "   sudo cp -r dist/* /var/www/html/"
    echo -e "   sudo chown -R nginx:nginx /var/www/html/"
    echo -e "   sudo systemctl reload nginx"
else
    echo -e "${RED}❌ 构建失败！${NC}"
    echo -e "${YELLOW}💡 建议：${NC}"
    echo -e "   1. 在本地Windows上构建，然后上传dist目录"
    echo -e "   2. 增加服务器内存或SWAP空间"
    echo -e "   3. 检查错误日志：npm run build > build.log 2>&1"
    exit 1
fi 