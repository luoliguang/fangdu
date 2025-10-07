# Windows PowerShell - 远程清理服务器脚本

param(
    [Parameter(Mandatory=$false)]
    [string]$ServerIP = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "root",
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 22
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧹 远程服务器清理工具 (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取服务器信息
if ($ServerIP -eq "") {
    Write-Host "请输入服务器 IP 地址：" -ForegroundColor Yellow
    $ServerIP = Read-Host "IP"
}

if ($ServerIP -eq "") {
    Write-Host "❌ 未提供服务器 IP" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "连接到服务器: $ServerIP" -ForegroundColor Green
Write-Host ""

# 创建远程清理脚本
$cleanupScript = @'
#!/bin/bash

echo "=========================================="
echo "🧹 开始清理服务器..."
echo "=========================================="
echo ""

# 显示清理前状态
echo "📊 清理前状态："
echo ""
echo "磁盘使用："
df -h / | awk 'NR==1 || NR==2'
echo ""
echo "内存使用："
free -h | head -2
echo ""

# 1. 清理系统日志
echo "🗑️  清理系统日志..."
journalctl --vacuum-time=7d
find /var/log -type f -name "*.log.*" -mtime +7 -delete 2>/dev/null
find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null
echo "✅ 完成"
echo ""

# 2. 清理包缓存
echo "🗑️  清理包管理器缓存..."
if command -v apt &> /dev/null; then
    apt clean
    apt autoclean
    apt autoremove -y
fi
if command -v yum &> /dev/null; then
    yum clean all
fi
echo "✅ 完成"
echo ""

# 3. 清理 npm 缓存
echo "🗑️  清理 npm 缓存..."
if command -v npm &> /dev/null; then
    npm cache clean --force
    rm -rf /root/.npm/_cacache 2>/dev/null
    rm -rf /root/.npm/_logs 2>/dev/null
fi
echo "✅ 完成"
echo ""

# 4. 清理 Docker
echo "🗑️  清理 Docker..."
if command -v docker &> /dev/null; then
    docker system prune -a -f --volumes
fi
echo "✅ 完成"
echo ""

# 5. 清理临时文件
echo "🗑️  清理临时文件..."
find /tmp -type f -atime +3 -delete 2>/dev/null
find /var/tmp -type f -atime +7 -delete 2>/dev/null
rm -rf /root/.cache/* 2>/dev/null
echo "✅ 完成"
echo ""

# 6. 清理 PM2 日志
echo "🗑️  清理 PM2 日志..."
if command -v pm2 &> /dev/null; then
    pm2 flush
    rm -rf /root/.pm2/logs/*.log 2>/dev/null
fi
echo "✅ 完成"
echo ""

# 7. 清理 Nginx 日志
echo "🗑️  清理 Nginx 日志..."
if [ -f /var/log/nginx/access.log ]; then
    > /var/log/nginx/access.log
fi
if [ -f /var/log/nginx/error.log ]; then
    > /var/log/nginx/error.log
fi
rm -f /var/log/nginx/*.gz 2>/dev/null
echo "✅ 完成"
echo ""

# 8. 清理系统缓存
echo "🗑️  清理系统缓存..."
sync
echo 3 > /proc/sys/vm/drop_caches
echo "✅ 完成"
echo ""

# 9. 清理 SWAP
echo "🗑️  清理 SWAP..."
swapoff -a 2>/dev/null
swapon -a 2>/dev/null
echo "✅ 完成"
echo ""

# 显示清理后状态
echo "=========================================="
echo "📊 清理后状态："
echo "=========================================="
echo ""
echo "磁盘使用："
df -h / | awk 'NR==1 || NR==2'
echo ""
echo "内存使用："
free -h | head -2
echo ""
echo "SWAP 状态："
swapon --show
echo ""

echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
'@

# 保存到临时文件
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$cleanupScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "🔌 正在连接服务器并执行清理..." -ForegroundColor Yellow
Write-Host ""

try {
    # 上传脚本
    Write-Host "📤 上传清理脚本..." -ForegroundColor Cyan
    scp -P $Port $tempScript "${Username}@${ServerIP}:/tmp/cleanup.sh"
    
    if ($LASTEXITCODE -ne 0) {
        throw "上传脚本失败"
    }
    
    Write-Host "✅ 上传成功" -ForegroundColor Green
    Write-Host ""
    
    # 执行清理
    Write-Host "🧹 开始清理..." -ForegroundColor Cyan
    Write-Host ""
    
    ssh -p $Port "${Username}@${ServerIP}" "chmod +x /tmp/cleanup.sh && sudo /tmp/cleanup.sh && rm /tmp/cleanup.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ 清理完成！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        # 显示建议
        Write-Host "💡 后续建议：" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. 设置自动清理（在服务器上运行）："
        Write-Host "   cd /path/to/fangdu/scripts" -ForegroundColor White
        Write-Host "   sudo ./setup-monitoring.sh" -ForegroundColor White
        Write-Host ""
        Write-Host "2. 定期运行此脚本（每周一次）"
        Write-Host ""
        Write-Host "3. 监控服务器资源使用："
        Write-Host "   ssh ${Username}@${ServerIP} 'free -h && df -h'" -ForegroundColor White
        Write-Host ""
        
    } else {
        throw "清理执行失败"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ 错误：$_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 建议：" -ForegroundColor Yellow
    Write-Host "1. 确认可以 SSH 连接到服务器"
    Write-Host "2. 检查服务器 IP 地址是否正确"
    Write-Host "3. 确认有 root 权限"
    Write-Host ""
    Write-Host "手动连接命令：" -ForegroundColor Cyan
    Write-Host "ssh -p $Port ${Username}@${ServerIP}" -ForegroundColor White
    exit 1
} finally {
    # 清理临时文件
    Remove-Item -Path $tempScript -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

