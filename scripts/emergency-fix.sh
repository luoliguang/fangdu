#!/bin/bash

# 紧急服务器修复脚本
# 用于解决服务器无响应、内存不足等问题

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}========================================${NC}"
echo -e "${RED}🚨 紧急服务器修复脚本${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# 1. 检查系统基本状态
echo -e "${BLUE}📊 第一步：检查系统状态${NC}"
echo ""

echo -e "${YELLOW}内存使用情况：${NC}"
free -h
echo ""

echo -e "${YELLOW}磁盘使用情况：${NC}"
df -h
echo ""

echo -e "${YELLOW}SWAP状态：${NC}"
swapon --show
echo ""

echo -e "${YELLOW}CPU负载：${NC}"
uptime
echo ""

# 2. 检查最占内存的进程
echo -e "${BLUE}📊 第二步：检查内存占用${NC}"
echo ""
echo "前10个最占内存的进程："
ps aux --sort=-%mem | head -11
echo ""

# 3. 检查服务状态
echo -e "${BLUE}📊 第三步：检查服务状态${NC}"
echo ""

# 检查 Nginx
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx状态：${NC}"
    sudo systemctl status nginx --no-pager | head -10
    echo ""
fi

# 检查 PM2
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2状态：${NC}"
    pm2 status
    echo ""
fi

# 检查 Docker
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker容器状态：${NC}"
    docker ps -a
    echo ""
fi

# 4. 检查 SWAP 问题
echo -e "${BLUE}🔍 第四步：诊断SWAP问题${NC}"
echo ""

SWAP_TOTAL=$(free -m | awk 'NR==3{print $2}')
SWAP_USED=$(free -m | awk 'NR==3{print $3}')

if [ "$SWAP_TOTAL" -eq 0 ]; then
    echo -e "${RED}❌ 未检测到SWAP空间！${NC}"
    echo ""
    echo -e "${YELLOW}是否立即创建4GB SWAP？(y/n)${NC}"
    read -p "> " CREATE_SWAP
    
    if [ "$CREATE_SWAP" = "y" ]; then
        echo -e "${YELLOW}正在创建SWAP...${NC}"
        
        # 检查是否有足够的磁盘空间
        DISK_FREE_GB=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
        if [ "$DISK_FREE_GB" -lt 5 ]; then
            echo -e "${RED}⚠️  磁盘空间不足5GB，将创建2GB SWAP${NC}"
            SWAP_SIZE=2048
        else
            SWAP_SIZE=4096
        fi
        
        sudo swapoff -a 2>/dev/null
        sudo rm -f /swapfile
        
        echo "创建 ${SWAP_SIZE}MB SWAP文件..."
        sudo dd if=/dev/zero of=/swapfile bs=1M count=$SWAP_SIZE status=progress
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # 永久启用
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
        fi
        
        # 优化SWAP使用
        sudo sysctl vm.swappiness=10
        echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
        
        echo -e "${GREEN}✅ SWAP创建成功！${NC}"
        swapon --show
        echo ""
    fi
elif [ "$SWAP_USED" -gt $(($SWAP_TOTAL * 80 / 100)) ]; then
    echo -e "${RED}⚠️  SWAP使用率超过80%！系统可能很慢${NC}"
    echo "SWAP使用: ${SWAP_USED}MB / ${SWAP_TOTAL}MB"
    echo ""
fi

# 5. 清理内存和缓存
echo -e "${BLUE}🧹 第五步：清理系统${NC}"
echo ""

echo -e "${YELLOW}是否清理系统缓存和日志？(y/n)${NC}"
read -p "> " CLEAN_SYSTEM

if [ "$CLEAN_SYSTEM" = "y" ]; then
    echo "清理中..."
    
    # 清理系统缓存
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
    
    # 清理日志
    sudo journalctl --vacuum-time=7d
    
    # 清理 npm 缓存
    npm cache clean --force 2>/dev/null
    
    # 清理 Docker
    if command -v docker &> /dev/null; then
        docker system prune -f
    fi
    
    echo -e "${GREEN}✅ 清理完成${NC}"
    echo ""
fi

# 6. 重启服务
echo -e "${BLUE}🔄 第六步：重启服务${NC}"
echo ""

echo -e "${YELLOW}选择要重启的服务：${NC}"
echo "1) 重启 Nginx"
echo "2) 重启 PM2 应用"
echo "3) 重启 Docker 容器"
echo "4) 全部重启"
echo "5) 跳过"
read -p "请选择 [1-5]: " SERVICE_OPTION

case $SERVICE_OPTION in
    1)
        echo "重启 Nginx..."
        sudo systemctl restart nginx
        sudo systemctl status nginx --no-pager | head -5
        ;;
    2)
        echo "重启 PM2..."
        pm2 restart all
        pm2 status
        ;;
    3)
        echo "重启 Docker..."
        docker-compose down
        docker-compose up -d
        docker ps
        ;;
    4)
        echo "重启所有服务..."
        sudo systemctl restart nginx 2>/dev/null
        pm2 restart all 2>/dev/null
        docker-compose restart 2>/dev/null
        echo -e "${GREEN}✅ 所有服务已重启${NC}"
        ;;
    5)
        echo "跳过服务重启"
        ;;
esac

echo ""

# 7. 检查端口
echo -e "${BLUE}🔍 第七步：检查端口占用${NC}"
echo ""

echo "检查常用端口："
sudo netstat -tlnp | grep -E ":(80|443|3000|3002|3306)" || echo "netstat未安装，尝试使用 ss..."
sudo ss -tlnp | grep -E ":(80|443|3000|3002|3306)"
echo ""

# 8. 测试连接
echo -e "${BLUE}🧪 第八步：测试服务${NC}"
echo ""

if command -v curl &> /dev/null; then
    echo "测试后端 API..."
    curl -s http://localhost:3002/api/materials > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 后端 API 响应正常${NC}"
    else
        echo -e "${RED}❌ 后端 API 无响应${NC}"
    fi
    
    echo ""
    echo "测试前端..."
    curl -s http://localhost > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 前端服务响应正常${NC}"
    else
        echo -e "${RED}❌ 前端服务无响应${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 诊断完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 9. 给出建议
echo -e "${YELLOW}💡 建议：${NC}"
echo ""

MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
if [ "$MEM_TOTAL" -lt 2000 ]; then
    echo "❗ 您的服务器内存小于2GB，强烈建议："
    echo "   1. 升级到至少2GB内存"
    echo "   2. 确保SWAP空间至少4GB"
    echo "   3. 考虑在本地构建前端，只上传dist目录"
    echo ""
fi

if [ "$SWAP_TOTAL" -eq 0 ]; then
    echo "❗ 没有SWAP空间，必须创建！"
    echo "   运行: sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
    echo ""
fi

DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "❗ 磁盘使用率超过80%，需要清理："
    echo "   1. 清理日志: sudo journalctl --vacuum-time=7d"
    echo "   2. 清理Docker: docker system prune -a"
    echo "   3. 清理旧的备份文件"
    echo ""
fi

echo -e "${BLUE}📝 查看详细日志：${NC}"
echo "   后端日志: pm2 logs"
echo "   Nginx错误: sudo tail -f /var/log/nginx/error.log"
echo "   系统日志: sudo journalctl -xe"
echo ""

echo -e "${YELLOW}如果问题仍然存在，可能需要：${NC}"
echo "   1. 检查防火墙设置"
echo "   2. 检查云服务器安全组规则"
echo "   3. 查看云服务器控制台是否有告警"
echo "   4. 考虑重启服务器（最后手段）"
echo ""

