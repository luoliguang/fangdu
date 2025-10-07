# Windows PowerShell 版本 - 远程服务器诊断脚本
# 用于从本地 Windows 连接到云服务器进行诊断

param(
    [Parameter(Mandatory=$false)]
    [string]$ServerIP = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "root",
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 22
)

Write-Host "========================================" -ForegroundColor Red
Write-Host "🚨 云服务器远程诊断脚本 (Windows)" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 检查是否安装了必要的工具
function Test-SSHAvailable {
    try {
        $null = Get-Command ssh -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-SSHAvailable)) {
    Write-Host "❌ 未检测到 SSH 客户端！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请安装 OpenSSH 客户端：" -ForegroundColor Yellow
    Write-Host "1. 打开 '设置' -> '应用' -> '可选功能'"
    Write-Host "2. 添加功能 -> 搜索 'OpenSSH 客户端' -> 安装"
    Write-Host ""
    Write-Host "或者使用 PuTTY、Xshell 等工具手动连接服务器"
    exit 1
}

# 获取服务器信息
if ($ServerIP -eq "") {
    Write-Host "请输入云服务器 IP 地址：" -ForegroundColor Yellow
    $ServerIP = Read-Host "IP"
}

if ($ServerIP -eq "") {
    Write-Host "❌ 未提供服务器 IP" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "连接信息：" -ForegroundColor Cyan
Write-Host "  服务器: $ServerIP" -ForegroundColor White
Write-Host "  用户名: $Username" -ForegroundColor White
Write-Host "  端口: $Port" -ForegroundColor White
Write-Host ""

# 测试连接
Write-Host "🔍 测试服务器连接..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $ServerIP -Count 2 -Quiet

if (-not $pingResult) {
    Write-Host "❌ 无法 ping 通服务器！" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. 服务器已关机或死机"
    Write-Host "2. 云服务器安全组未开放 ICMP"
    Write-Host "3. 网络连接问题"
    Write-Host ""
    Write-Host "建议操作：" -ForegroundColor Cyan
    Write-Host "1. 登录云服务器控制台检查服务器状态"
    Write-Host "2. 检查服务器监控数据（CPU、内存、磁盘）"
    Write-Host "3. 如果服务器死机，可能需要强制重启"
    Write-Host ""
    
    $continue = Read-Host "是否继续尝试 SSH 连接？(y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "✅ 服务器可以 ping 通" -ForegroundColor Green
Write-Host ""

# 创建诊断脚本
$diagnosticScript = @'
#!/bin/bash
echo "=========================================="
echo "📊 快速诊断报告"
echo "=========================================="
echo ""

echo "🖥️  系统信息："
uname -a
echo ""

echo "⏰ 系统运行时间："
uptime
echo ""

echo "💾 内存使用："
free -h
echo ""

echo "💿 磁盘使用："
df -h
echo ""

echo "🔄 SWAP状态："
swapon --show
echo ""

echo "📊 前5个最占内存的进程："
ps aux --sort=-%mem | head -6
echo ""

echo "🔍 端口监听："
sudo netstat -tlnp 2>/dev/null | grep -E ":(80|443|3000|3002)" || sudo ss -tlnp | grep -E ":(80|443|3000|3002)"
echo ""

echo "🐳 Docker状态："
docker ps -a 2>/dev/null || echo "Docker 未运行或未安装"
echo ""

echo "⚙️  Nginx状态："
sudo systemctl status nginx --no-pager 2>/dev/null || echo "Nginx 未运行"
echo ""

echo "📝 PM2状态："
pm2 status 2>/dev/null || echo "PM2 未运行或未安装"
echo ""

echo "=========================================="
echo "✅ 诊断完成"
echo "=========================================="
'@

# 将诊断脚本保存到临时文件
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$diagnosticScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "🔌 正在连接服务器并执行诊断..." -ForegroundColor Yellow
Write-Host ""

try {
    # 上传并执行诊断脚本
    scp -P $Port $tempScript "${Username}@${ServerIP}:/tmp/diagnostic.sh"
    ssh -p $Port "${Username}@${ServerIP}" "chmod +x /tmp/diagnostic.sh && /tmp/diagnostic.sh && rm /tmp/diagnostic.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 诊断完成" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  诊断执行出现问题" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 连接或执行失败：$_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请尝试手动连接：" -ForegroundColor Yellow
    Write-Host "ssh -p $Port ${Username}@${ServerIP}" -ForegroundColor White
} finally {
    # 清理临时文件
    Remove-Item -Path $tempScript -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "💡 常见问题解决方案" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "如果服务器完全无响应：" -ForegroundColor Yellow
Write-Host "1. 登录云服务器控制台（阿里云/腾讯云/AWS等）"
Write-Host "2. 查看监控图表，确认是否 CPU 100% 或内存用尽"
Write-Host "3. 尝试通过控制台的 VNC/远程连接功能登录"
Write-Host "4. 如果必要，执行强制重启（数据可能丢失）"
Write-Host ""

Write-Host "如果是 SWAP 导致的问题：" -ForegroundColor Yellow
Write-Host "1. SSH 登录后执行: free -h (查看内存)"
Write-Host "2. 执行: swapon --show (查看 SWAP 状态)"
Write-Host "3. 如果 SWAP 满了: sudo swapoff -a && sudo swapon -a"
Write-Host "4. 如果没有 SWAP: 运行本目录的 emergency-fix.sh 创建"
Write-Host ""

Write-Host "如果服务未启动：" -ForegroundColor Yellow
Write-Host "1. 重启 Nginx: sudo systemctl restart nginx"
Write-Host "2. 重启后端: pm2 restart all"
Write-Host "3. 重启 Docker: docker-compose restart"
Write-Host ""

Write-Host "预防措施：" -ForegroundColor Yellow
Write-Host "1. 确保服务器至少有 2GB 内存 + 4GB SWAP"
Write-Host "2. 在本地构建前端，避免在服务器上执行 npm run build"
Write-Host "3. 设置监控告警，及时发现问题"
Write-Host "4. 定期重启服务释放内存"
Write-Host ""

Write-Host "需要手动连接？运行：" -ForegroundColor Cyan
Write-Host "ssh -p $Port ${Username}@${ServerIP}" -ForegroundColor White
Write-Host ""

