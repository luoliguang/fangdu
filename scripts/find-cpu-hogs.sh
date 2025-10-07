#!/bin/bash

# 查找并分析 CPU 占用高的进程

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 CPU 使用分析工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 显示系统负载
echo -e "${YELLOW}⏰ 系统负载：${NC}"
uptime
echo ""

# 显示 CPU 使用率
echo -e "${YELLOW}📊 CPU 使用情况：${NC}"
mpstat 2>/dev/null || top -bn1 | grep "Cpu(s)"
echo ""

# 显示前 10 个最占 CPU 的进程
echo -e "${YELLOW}🔥 CPU 占用 TOP 10：${NC}"
echo ""
ps aux --sort=-%cpu | head -11
echo ""

# 检查是否有异常进程
echo -e "${YELLOW}🔍 检查异常进程...${NC}"
echo ""

# 检查 node 进程
NODE_PROCESSES=$(ps aux | grep node | grep -v grep)
if [ -n "$NODE_PROCESSES" ]; then
    echo -e "${BLUE}Node.js 进程：${NC}"
    echo "$NODE_PROCESSES"
    echo ""
fi

# 检查 nginx 进程
NGINX_PROCESSES=$(ps aux | grep nginx | grep -v grep)
if [ -n "$NGINX_PROCESSES" ]; then
    echo -e "${BLUE}Nginx 进程：${NC}"
    echo "$NGINX_PROCESSES"
    echo ""
fi

# 检查 docker 进程
if command -v docker &> /dev/null; then
    DOCKER_STATS=$(docker stats --no-stream 2>/dev/null)
    if [ -n "$DOCKER_STATS" ]; then
        echo -e "${BLUE}Docker 容器资源使用：${NC}"
        echo "$DOCKER_STATS"
        echo ""
    fi
fi

# 检查是否有僵尸进程
ZOMBIE_COUNT=$(ps aux | awk '{if($8=="Z") print}' | wc -l)
if [ $ZOMBIE_COUNT -gt 0 ]; then
    echo -e "${RED}⚠️  发现 $ZOMBIE_COUNT 个僵尸进程！${NC}"
    ps aux | awk '{if($8=="Z") print}'
    echo ""
fi

# 显示 PM2 进程
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}PM2 进程状态：${NC}"
    pm2 status
    echo ""
    
    echo -e "${BLUE}PM2 进程资源使用：${NC}"
    pm2 monit --no-interaction &
    sleep 3
    killall pm2 2>/dev/null
    echo ""
fi

# 建议
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}💡 CPU 优化建议${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo "如果某个进程 CPU 占用过高："
echo ""
echo "1. 重启该进程："
echo "   pm2 restart <app-name>   # PM2 应用"
echo "   systemctl restart nginx   # Nginx"
echo "   docker restart <container>  # Docker 容器"
echo ""
echo "2. 限制进程 CPU 使用："
echo "   # PM2 配置"
echo "   pm2 start app.js --max-memory-restart 300M"
echo "   "
echo "   # Docker 配置"
echo "   docker update --cpus='.5' <container>"
echo ""
echo "3. 查看进程详细信息："
echo "   top -p <PID>"
echo "   htop -p <PID>  # 需要安装 htop"
echo ""
echo "4. 持续监控 CPU："
echo "   watch -n 2 'ps aux --sort=-%cpu | head -10'"
echo ""

# 询问是否要停止高 CPU 进程
echo -e "${YELLOW}是否要查看实时 CPU 监控？(y/n)${NC}"
read -p "> " MONITOR

if [ "$MONITOR" = "y" ]; then
    echo ""
    echo "按 q 退出监控"
    sleep 2
    top
fi

