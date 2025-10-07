#!/bin/bash

# 修复 80 端口占用问题

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 修复 80 端口占用问题${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    echo "sudo $0"
    exit 1
fi

# 1. 查找占用 80 端口的进程
echo -e "${YELLOW}📊 正在检查 80 端口占用情况...${NC}"
echo ""

PORT_80_PROCESS=$(netstat -tlnp 2>/dev/null | grep ':80 ' | awk '{print $7}' | cut -d'/' -f1)

if [ -z "$PORT_80_PROCESS" ]; then
    # 尝试使用 ss 命令
    PORT_80_PROCESS=$(ss -tlnp 2>/dev/null | grep ':80 ' | grep -oP 'pid=\K[0-9]+' | head -1)
fi

if [ -z "$PORT_80_PROCESS" ]; then
    # 尝试使用 lsof
    PORT_80_PROCESS=$(lsof -ti:80 2>/dev/null | head -1)
fi

if [ -n "$PORT_80_PROCESS" ]; then
    echo -e "${YELLOW}发现占用 80 端口的进程：${NC}"
    echo ""
    
    # 显示进程详情
    ps aux | grep "$PORT_80_PROCESS" | grep -v grep
    echo ""
    
    # 显示端口详情
    echo -e "${YELLOW}端口详情：${NC}"
    netstat -tlnp 2>/dev/null | grep ':80 ' || ss -tlnp 2>/dev/null | grep ':80 '
    echo ""
    
    # 询问是否停止进程
    echo -e "${YELLOW}是否停止该进程？(y/n)${NC}"
    read -p "> " KILL_PROCESS
    
    if [ "$KILL_PROCESS" = "y" ]; then
        echo ""
        echo -e "${YELLOW}正在停止进程 $PORT_80_PROCESS...${NC}"
        
        # 尝试优雅地停止
        kill "$PORT_80_PROCESS" 2>/dev/null
        sleep 2
        
        # 检查是否还在运行
        if ps -p "$PORT_80_PROCESS" > /dev/null 2>&1; then
            echo -e "${YELLOW}进程未响应，强制停止...${NC}"
            kill -9 "$PORT_80_PROCESS" 2>/dev/null
            sleep 1
        fi
        
        # 验证端口是否已释放
        if lsof -ti:80 > /dev/null 2>&1 || netstat -tlnp 2>/dev/null | grep ':80 ' > /dev/null; then
            echo -e "${RED}❌ 端口仍被占用${NC}"
            echo ""
            echo "尝试停止所有 Nginx 进程："
            killall nginx 2>/dev/null
            sleep 2
        else
            echo -e "${GREEN}✅ 端口已释放${NC}"
        fi
    fi
else
    echo -e "${GREEN}✅ 80 端口当前未被占用${NC}"
fi

echo ""

# 2. 检查是否有其他 Nginx 进程
echo -e "${YELLOW}📊 检查所有 Nginx 进程...${NC}"
NGINX_PROCESSES=$(ps aux | grep nginx | grep -v grep)

if [ -n "$NGINX_PROCESSES" ]; then
    echo ""
    echo "$NGINX_PROCESSES"
    echo ""
    echo -e "${YELLOW}是否停止所有 Nginx 进程？(y/n)${NC}"
    read -p "> " STOP_NGINX
    
    if [ "$STOP_NGINX" = "y" ]; then
        echo ""
        echo -e "${YELLOW}停止所有 Nginx 进程...${NC}"
        killall nginx 2>/dev/null
        systemctl stop nginx 2>/dev/null
        sleep 2
        echo -e "${GREEN}✅ 已停止${NC}"
    fi
else
    echo "没有运行中的 Nginx 进程"
fi

echo ""

# 3. 检查 Nginx 配置
echo -e "${YELLOW}📋 检查 Nginx 配置...${NC}"
if command -v nginx &> /dev/null; then
    nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx 配置正确${NC}"
    else
        echo -e "${RED}❌ Nginx 配置有错误，请先修复${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 未找到 Nginx 命令${NC}"
    exit 1
fi

echo ""

# 4. 尝试启动 Nginx
echo -e "${YELLOW}🚀 尝试启动 Nginx...${NC}"
echo ""

systemctl start nginx

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx 启动成功！${NC}"
    echo ""
    
    # 显示状态
    echo -e "${YELLOW}Nginx 状态：${NC}"
    systemctl status nginx --no-pager | head -15
    echo ""
    
    # 显示端口监听
    echo -e "${YELLOW}端口监听：${NC}"
    netstat -tlnp 2>/dev/null | grep nginx || ss -tlnp 2>/dev/null | grep nginx
    echo ""
    
    # 测试访问
    echo -e "${YELLOW}测试访问：${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ Web 服务响应正常${NC}"
    else
        echo -e "${YELLOW}⚠️  Web 服务可能未正确配置${NC}"
    fi
    
else
    echo -e "${RED}❌ Nginx 启动失败${NC}"
    echo ""
    echo -e "${YELLOW}错误日志：${NC}"
    journalctl -u nginx --no-pager -n 20
    echo ""
    echo -e "${YELLOW}可能的原因：${NC}"
    echo "1. 配置文件有错误"
    echo "2. 端口仍被占用"
    echo "3. 权限不足"
    echo "4. 缺少必要的文件或目录"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 5. 显示建议
echo -e "${BLUE}💡 后续建议：${NC}"
echo ""
echo "查看实时日志："
echo "  sudo tail -f /var/log/nginx/access.log"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
echo "重启 Nginx："
echo "  sudo systemctl restart nginx"
echo ""
echo "查看状态："
echo "  sudo systemctl status nginx"
echo ""
echo "测试配置："
echo "  sudo nginx -t"
echo ""

