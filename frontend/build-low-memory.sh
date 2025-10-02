#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 低内存优化构建脚本${NC}"
echo ""

# 检查内存
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
SWAP_SIZE=$(free -m | awk 'NR==3{print $2}')
echo -e "${YELLOW}📊 系统信息：${NC}"
echo "   物理内存: ${TOTAL_MEM}MB"
echo "   SWAP空间: ${SWAP_SIZE}MB"
echo "   总可用: $((TOTAL_MEM + SWAP_SIZE))MB"
echo ""

# 检查磁盘空间
DISK_FREE=$(df -h . | awk 'NR==2{print $4}')
echo "   磁盘可用: ${DISK_FREE}"
echo ""

# 清理缓存
echo -e "${YELLOW}🧹 清理缓存...${NC}"
npm cache clean --force 2>/dev/null
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 强制垃圾回收
echo -e "${YELLOW}🗑️ 强制内存回收...${NC}"
sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1
sleep 2
echo -e "${GREEN}✅ 内存已回收${NC}"
echo ""

# 查看当前内存
echo -e "${YELLOW}📊 当前内存状态：${NC}"
free -h
echo ""

# 设置环境变量
echo -e "${YELLOW}⚙️ 设置构建参数...${NC}"

# 极限内存优化
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=3072 --max-semi-space-size=64 --max-heap-size=3072"
export VITE_CJS_TRACE=true

# 禁用一些不必要的功能
export CI=true
export SKIP_SOURCEMAP=true

echo "   NODE_OPTIONS=${NODE_OPTIONS}"
echo ""

# 开始构建
echo -e "${YELLOW}📦 开始构建（这可能需要10-15分钟）...${NC}"
echo ""

# 使用nice降低优先级，避免系统卡死
nice -n 10 npm run build 2>&1 | tee build.log

# 检查结果
if [ ${PIPESTATUS[0]} -eq 0 ] && [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 构建成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # 显示构建信息
    echo -e "${YELLOW}📊 构建结果：${NC}"
    du -sh dist/
    echo ""
    echo "文件列表："
    ls -lh dist/ | head -15
    echo ""
    
    # 显示chunk信息
    if [ -d "dist/js" ]; then
        echo "JavaScript文件："
        ls -lh dist/js/*.js | head -10
    fi
    echo ""
    
    echo -e "${GREEN}🎉 构建完成！现在可以部署到Nginx${NC}"
    echo ""
    echo -e "${YELLOW}💡 执行以下命令部署：${NC}"
    echo "   sudo rm -rf /var/www/html/*"
    echo "   sudo cp -r dist/* /var/www/html/"
    echo "   sudo chown -R nginx:nginx /var/www/html/"
    echo "   sudo chmod -R 755 /var/www/html/"
    echo "   sudo systemctl reload nginx"
    
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ 构建失败！${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    
    # 分析失败原因
    echo -e "${YELLOW}🔍 错误分析：${NC}"
    
    if grep -q "Killed" build.log; then
        echo "   ⚠️  进程被系统杀死（内存不足）"
        echo ""
        echo -e "${YELLOW}建议：${NC}"
        echo "   1. 增加SWAP到6GB："
        echo "      sudo swapoff /swapfile"
        echo "      sudo rm /swapfile"
        echo "      sudo dd if=/dev/zero of=/swapfile bs=1M count=6144"
        echo "      sudo chmod 600 /swapfile"
        echo "      sudo mkswap /swapfile"
        echo "      sudo swapon /swapfile"
        echo ""
        echo "   2. 或者在本地Windows构建后上传"
    elif grep -q "ENOSPC" build.log; then
        echo "   ⚠️  磁盘空间不足"
        echo ""
        echo "清理磁盘："
        echo "   sudo journalctl --vacuum-time=7d"
        echo "   docker system prune -a"
    else
        echo "   查看详细错误日志: cat build.log"
    fi
    
    echo ""
    echo -e "${YELLOW}📋 系统状态：${NC}"
    free -h
    echo ""
    df -h
    
    exit 1
fi 