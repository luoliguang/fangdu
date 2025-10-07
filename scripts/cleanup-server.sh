#!/bin/bash

# 服务器清理脚本 - 清除无用文件和缓存

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🧹 服务器清理工具${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    echo "sudo $0"
    exit 1
fi

# 显示清理前的系统状态
echo -e "${BLUE}📊 清理前系统状态：${NC}"
echo ""

echo -e "${YELLOW}磁盘使用：${NC}"
df -h / | awk 'NR==1 || NR==2'
DISK_BEFORE=$(df / | awk 'NR==2{print $3}')
echo ""

echo -e "${YELLOW}内存使用：${NC}"
free -h | head -2
echo ""

echo -e "${YELLOW}最大的目录（前10）：${NC}"
du -sh /var/log /var/cache /tmp /root/.npm /root/.cache 2>/dev/null | sort -hr | head -10
echo ""

# 询问用户要执行哪些清理
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}请选择要清理的项目：${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo "1. 系统日志文件"
echo "2. APT/YUM 缓存"
echo "3. npm/yarn 缓存"
echo "4. Docker 垃圾"
echo "5. 临时文件"
echo "6. 旧的内核文件"
echo "7. PM2 日志"
echo "8. Nginx 日志"
echo "9. 系统缓存"
echo "10. 全部清理（推荐）"
echo ""

read -p "请输入选项 [1-10]: " CHOICE

echo ""
echo -e "${YELLOW}开始清理...${NC}"
echo ""

# 记录清理的文件大小
CLEANED_SIZE=0

# 函数：清理系统日志
cleanup_system_logs() {
    echo -e "${BLUE}🗑️  清理系统日志...${NC}"
    
    # 清理 journalctl 日志（保留最近7天）
    journalctl --vacuum-time=7d
    
    # 清理旧的日志文件
    find /var/log -type f -name "*.log.*" -mtime +7 -delete 2>/dev/null
    find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null
    find /var/log -type f -name "*.1" -mtime +7 -delete 2>/dev/null
    
    # 清空一些大的日志文件（而不是删除）
    for log in /var/log/syslog /var/log/messages /var/log/debug /var/log/kern.log; do
        if [ -f "$log" ]; then
            echo "清空 $log"
            > "$log"
        fi
    done
    
    echo -e "${GREEN}✅ 系统日志清理完成${NC}"
    echo ""
}

# 函数：清理包管理器缓存
cleanup_package_cache() {
    echo -e "${BLUE}🗑️  清理包管理器缓存...${NC}"
    
    # 清理 APT 缓存（Ubuntu/Debian）
    if command -v apt &> /dev/null; then
        apt clean
        apt autoclean
        apt autoremove -y
        rm -rf /var/lib/apt/lists/* 2>/dev/null
        echo -e "${GREEN}✅ APT 缓存清理完成${NC}"
    fi
    
    # 清理 YUM 缓存（CentOS/RHEL）
    if command -v yum &> /dev/null; then
        yum clean all
        echo -e "${GREEN}✅ YUM 缓存清理完成${NC}"
    fi
    
    echo ""
}

# 函数：清理 npm/yarn 缓存
cleanup_npm_cache() {
    echo -e "${BLUE}🗑️  清理 npm/yarn 缓存...${NC}"
    
    # 清理 npm 缓存
    if command -v npm &> /dev/null; then
        npm cache clean --force
        rm -rf /root/.npm/_cacache 2>/dev/null
        rm -rf /root/.npm/_logs 2>/dev/null
        rm -rf /home/*/.npm/_cacache 2>/dev/null
        rm -rf /home/*/.npm/_logs 2>/dev/null
        echo -e "${GREEN}✅ npm 缓存清理完成${NC}"
    fi
    
    # 清理 yarn 缓存
    if command -v yarn &> /dev/null; then
        yarn cache clean
        echo -e "${GREEN}✅ yarn 缓存清理完成${NC}"
    fi
    
    echo ""
}

# 函数：清理 Docker
cleanup_docker() {
    echo -e "${BLUE}🗑️  清理 Docker 垃圾...${NC}"
    
    if command -v docker &> /dev/null; then
        # 清理未使用的镜像、容器、网络、卷
        docker system prune -a -f --volumes
        
        # 显示清理后的状态
        echo ""
        echo "Docker 磁盘使用："
        docker system df
        
        echo -e "${GREEN}✅ Docker 清理完成${NC}"
    else
        echo "Docker 未安装，跳过"
    fi
    
    echo ""
}

# 函数：清理临时文件
cleanup_temp_files() {
    echo -e "${BLUE}🗑️  清理临时文件...${NC}"
    
    # 清理 /tmp 目录（保留最近3天的文件）
    find /tmp -type f -atime +3 -delete 2>/dev/null
    find /tmp -type d -empty -delete 2>/dev/null
    
    # 清理 /var/tmp
    find /var/tmp -type f -atime +7 -delete 2>/dev/null
    
    # 清理用户临时文件
    rm -rf /root/.cache/* 2>/dev/null
    rm -rf /home/*/.cache/* 2>/dev/null
    
    # 清理 Thumbnail 缓存
    rm -rf /root/.thumbnails/* 2>/dev/null
    rm -rf /home/*/.thumbnails/* 2>/dev/null
    
    echo -e "${GREEN}✅ 临时文件清理完成${NC}"
    echo ""
}

# 函数：清理旧内核
cleanup_old_kernels() {
    echo -e "${BLUE}🗑️  清理旧的内核文件...${NC}"
    
    if command -v apt &> /dev/null; then
        # 保留当前内核和最新的一个内核
        CURRENT_KERNEL=$(uname -r)
        echo "当前内核: $CURRENT_KERNEL"
        
        # 列出旧内核
        OLD_KERNELS=$(dpkg --list | grep linux-image | awk '{print $2}' | grep -v "$CURRENT_KERNEL" | grep -v "linux-image-generic")
        
        if [ -n "$OLD_KERNELS" ]; then
            echo "发现旧内核："
            echo "$OLD_KERNELS"
            echo ""
            read -p "是否删除这些旧内核？(y/n) " REMOVE_KERNELS
            
            if [ "$REMOVE_KERNELS" = "y" ]; then
                apt purge -y $OLD_KERNELS
                apt autoremove -y
                echo -e "${GREEN}✅ 旧内核清理完成${NC}"
            else
                echo "跳过内核清理"
            fi
        else
            echo "没有发现旧内核"
        fi
    else
        echo "仅支持 Ubuntu/Debian 系统，跳过"
    fi
    
    echo ""
}

# 函数：清理 PM2 日志
cleanup_pm2_logs() {
    echo -e "${BLUE}🗑️  清理 PM2 日志...${NC}"
    
    if command -v pm2 &> /dev/null; then
        # 清空所有 PM2 日志
        pm2 flush
        
        # 删除旧的日志文件
        rm -rf /root/.pm2/logs/*.log 2>/dev/null
        rm -rf /home/*/.pm2/logs/*.log 2>/dev/null
        
        echo -e "${GREEN}✅ PM2 日志清理完成${NC}"
    else
        echo "PM2 未安装，跳过"
    fi
    
    echo ""
}

# 函数：清理 Nginx 日志
cleanup_nginx_logs() {
    echo -e "${BLUE}🗑️  清理 Nginx 日志...${NC}"
    
    if command -v nginx &> /dev/null; then
        # 清空日志文件（保留文件本身）
        > /var/log/nginx/access.log 2>/dev/null
        > /var/log/nginx/error.log 2>/dev/null
        
        # 删除压缩的旧日志
        rm -f /var/log/nginx/*.gz 2>/dev/null
        rm -f /var/log/nginx/*.1 2>/dev/null
        
        # 重新加载 Nginx
        systemctl reload nginx 2>/dev/null
        
        echo -e "${GREEN}✅ Nginx 日志清理完成${NC}"
    else
        echo "Nginx 未安装，跳过"
    fi
    
    echo ""
}

# 函数：清理系统缓存
cleanup_system_cache() {
    echo -e "${BLUE}🗑️  清理系统缓存...${NC}"
    
    # 同步文件系统
    sync
    
    # 清理页缓存、目录项和inode
    echo 3 > /proc/sys/vm/drop_caches
    
    echo -e "${GREEN}✅ 系统缓存清理完成${NC}"
    echo ""
}

# 执行选择的清理任务
case $CHOICE in
    1)
        cleanup_system_logs
        ;;
    2)
        cleanup_package_cache
        ;;
    3)
        cleanup_npm_cache
        ;;
    4)
        cleanup_docker
        ;;
    5)
        cleanup_temp_files
        ;;
    6)
        cleanup_old_kernels
        ;;
    7)
        cleanup_pm2_logs
        ;;
    8)
        cleanup_nginx_logs
        ;;
    9)
        cleanup_system_cache
        ;;
    10)
        echo -e "${YELLOW}执行全面清理...${NC}"
        echo ""
        cleanup_system_logs
        cleanup_package_cache
        cleanup_npm_cache
        cleanup_docker
        cleanup_temp_files
        cleanup_pm2_logs
        cleanup_nginx_logs
        cleanup_system_cache
        echo -e "${YELLOW}是否清理旧内核？${NC}"
        cleanup_old_kernels
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

# 显示清理后的系统状态
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}📊 清理后系统状态：${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}磁盘使用：${NC}"
df -h / | awk 'NR==1 || NR==2'
DISK_AFTER=$(df / | awk 'NR==2{print $3}')
echo ""

echo -e "${YELLOW}内存使用：${NC}"
free -h | head -2
echo ""

# 计算释放的空间
FREED_SPACE=$((DISK_BEFORE - DISK_AFTER))
if [ $FREED_SPACE -gt 0 ]; then
    echo -e "${GREEN}✅ 释放了约 ${FREED_SPACE}KB 的磁盘空间${NC}"
else
    echo -e "${YELLOW}磁盘空间变化较小${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 清理完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 建议
echo -e "${BLUE}💡 建议：${NC}"
echo ""
echo "1. 定期运行此脚本（每周一次）："
echo "   sudo /path/to/cleanup-server.sh"
echo ""
echo "2. 设置自动清理 crontab："
echo "   0 2 * * 0 /path/to/cleanup-server.sh"
echo ""
echo "3. 监控磁盘使用："
echo "   df -h"
echo "   du -sh /var/* | sort -hr | head -10"
echo ""
echo "4. 查看大文件："
echo "   find / -type f -size +100M -exec ls -lh {} \\; 2>/dev/null"
echo ""

