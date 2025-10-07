#!/bin/bash

# 设置服务器监控和自动优化

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}⚙️  设置服务器监控${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 创建监控脚本
cat > /root/auto-monitor.sh << 'EOF'
#!/bin/bash

# 自动监控和优化脚本
LOG_FILE="/var/log/server-monitor.log"

# 获取当前资源使用情况
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f"), $3/$2 * 100}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
SWAP_USAGE=$(free | grep Swap | awk '{if($2>0) printf("%.0f"), $3/$2 * 100; else print 0}')

# 阈值设置
CPU_THRESHOLD=80
MEM_THRESHOLD=85
DISK_THRESHOLD=85
SWAP_THRESHOLD=75

# 记录日志
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# CPU 过高处理
if [ $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc) -eq 1 ]; then
    log_message "⚠️  CPU 使用率过高: ${CPU_USAGE}%"
    
    # 找出占用 CPU 最高的进程
    TOP_CPU_PROCESS=$(ps aux --sort=-%cpu | head -2 | tail -1)
    log_message "占用最高的进程: $TOP_CPU_PROCESS"
    
    # 可以在这里添加自动重启逻辑（谨慎使用）
    # pm2 restart all
fi

# 内存过高处理
if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
    log_message "⚠️  内存使用率过高: ${MEM_USAGE}%"
    
    # 清理系统缓存
    sync
    echo 3 > /proc/sys/vm/drop_caches
    log_message "已清理系统缓存"
fi

# SWAP 过高处理
if [ "$SWAP_USAGE" -gt "$SWAP_THRESHOLD" ]; then
    log_message "⚠️  SWAP 使用率过高: ${SWAP_USAGE}%"
    
    # 清理 SWAP
    swapoff -a 2>/dev/null
    swapon -a 2>/dev/null
    log_message "已清理 SWAP"
fi

# 磁盘空间过高处理
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    log_message "⚠️  磁盘使用率过高: ${DISK_USAGE}%"
    
    # 自动清理日志
    journalctl --vacuum-time=7d 2>/dev/null
    docker system prune -f 2>/dev/null
    log_message "已清理磁盘空间"
fi

# 保持日志文件大小在 10MB 以内
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
    if [ "$LOG_SIZE" -gt 10485760 ]; then
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
fi
EOF

chmod +x /root/auto-monitor.sh

# 创建每日清理脚本
cat > /root/daily-cleanup.sh << 'EOF'
#!/bin/bash

# 每日自动清理脚本
LOG_FILE="/var/log/daily-cleanup.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') - 开始每日清理" >> $LOG_FILE

# 清理系统日志（保留7天）
journalctl --vacuum-time=7d >> $LOG_FILE 2>&1

# 清理临时文件
find /tmp -type f -atime +3 -delete 2>/dev/null
find /var/tmp -type f -atime +7 -delete 2>/dev/null

# 清理 npm 缓存
npm cache clean --force >> $LOG_FILE 2>&1

# 清理 PM2 日志
if command -v pm2 &> /dev/null; then
    pm2 flush >> $LOG_FILE 2>&1
fi

# 清理 Docker（每周日执行）
if [ $(date +%u) -eq 7 ]; then
    if command -v docker &> /dev/null; then
        docker system prune -f >> $LOG_FILE 2>&1
    fi
fi

# 清理系统缓存
sync
echo 3 > /proc/sys/vm/drop_caches

echo "$(date '+%Y-%m-%d %H:%M:%S') - 清理完成" >> $LOG_FILE
EOF

chmod +x /root/daily-cleanup.sh

# 设置 crontab
echo ""
echo -e "${YELLOW}设置自动任务...${NC}"

# 备份现有的 crontab
crontab -l > /tmp/crontab.backup 2>/dev/null

# 创建新的 crontab
cat > /tmp/crontab.new << 'EOF'
# 服务器监控和清理任务

# 每 5 分钟检查一次资源使用情况
*/5 * * * * /root/auto-monitor.sh

# 每天凌晨 2 点执行清理
0 2 * * * /root/daily-cleanup.sh

# 每周日凌晨 3 点清理 SWAP
0 3 * * 0 swapoff -a && swapon -a

# 每月 1 号清理旧的日志文件
0 1 1 * * find /var/log -type f -name "*.log.*" -mtime +30 -delete
EOF

# 合并现有的 crontab（去重）
if [ -f /tmp/crontab.backup ]; then
    cat /tmp/crontab.backup >> /tmp/crontab.new
fi

# 安装新的 crontab
crontab /tmp/crontab.new

echo -e "${GREEN}✅ 自动任务设置完成${NC}"
echo ""

# 创建查看监控日志的脚本
cat > /root/view-monitor.sh << 'EOF'
#!/bin/bash

echo "========================================="
echo "服务器监控日志"
echo "========================================="
echo ""

if [ -f /var/log/server-monitor.log ]; then
    echo "最近的告警："
    tail -n 50 /var/log/server-monitor.log
else
    echo "还没有监控日志"
fi

echo ""
echo "========================================="
echo "每日清理日志"
echo "========================================="
echo ""

if [ -f /var/log/daily-cleanup.log ]; then
    echo "最近的清理记录："
    tail -n 30 /var/log/daily-cleanup.log
else
    echo "还没有清理日志"
fi
EOF

chmod +x /root/view-monitor.sh

# 显示设置信息
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 监控系统设置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}已创建以下自动任务：${NC}"
echo ""
echo "1. 每 5 分钟自动检查资源使用情况"
echo "   - CPU > 80% 时记录日志"
echo "   - 内存 > 85% 时自动清理缓存"
echo "   - SWAP > 75% 时自动清理"
echo "   - 磁盘 > 85% 时自动清理日志"
echo ""
echo "2. 每天凌晨 2 点自动清理："
echo "   - 系统日志（保留7天）"
echo "   - 临时文件"
echo "   - npm 缓存"
echo "   - PM2 日志"
echo ""
echo "3. 每周日凌晨 3 点清理 SWAP"
echo ""
echo "4. 每月 1 号清理旧日志文件"
echo ""

echo -e "${BLUE}管理命令：${NC}"
echo ""
echo "查看监控日志："
echo "  /root/view-monitor.sh"
echo "  或 tail -f /var/log/server-monitor.log"
echo ""
echo "手动执行清理："
echo "  /root/daily-cleanup.sh"
echo ""
echo "查看定时任务："
echo "  crontab -l"
echo ""
echo "停止监控："
echo "  crontab -e  # 然后删除相关行"
echo ""

# 询问是否立即测试
echo -e "${YELLOW}是否立即测试监控脚本？(y/n)${NC}"
read -p "> " TEST

if [ "$TEST" = "y" ]; then
    echo ""
    echo -e "${YELLOW}执行测试...${NC}"
    /root/auto-monitor.sh
    echo ""
    echo "查看监控日志："
    tail -n 20 /var/log/server-monitor.log
fi

echo ""
echo -e "${GREEN}完成！监控系统已在后台运行${NC}"
echo ""

