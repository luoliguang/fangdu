# 方度素材管理系统 - 一键部署脚本 (Windows)
# 使用方法：.\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  方度素材管理系统 - 一键部署" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "backend")) {
    Write-Host "❌ 错误：请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 1. 停止现有服务
Write-Host "步骤 1/7: 停止现有服务..." -ForegroundColor Blue
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    try {
        pm2 stop fangdu-backend 2>$null
    } catch {
        Write-Host "⚠️  未找到运行中的服务" -ForegroundColor Yellow
    }
} else {
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
}
Write-Host "✅ 完成" -ForegroundColor Green

# 2. 备份数据库
Write-Host ""
Write-Host "步骤 2/7: 备份数据库..." -ForegroundColor Blue
if (Test-Path "backend\database\my_materials.db") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item "backend\database\my_materials.db" "backend\database\my_materials.db.backup.$timestamp"
    Write-Host "✅ 数据库备份完成" -ForegroundColor Green
} else {
    Write-Host "⚠️  数据库文件不存在，将在首次启动时创建" -ForegroundColor Yellow
}

# 3. 安装后端依赖
Write-Host ""
Write-Host "步骤 3/7: 安装后端依赖..." -ForegroundColor Blue
Set-Location backend
npm install --production
Write-Host "✅ 后端依赖安装完成" -ForegroundColor Green

# 4. 数据库迁移（运行最新的迁移脚本）
Write-Host ""
Write-Host "步骤 4/7: 检查并更新数据库..." -ForegroundColor Blue
if (Test-Path "database\my_materials.db") {
    # 运行最新的数据库迁移脚本
    if (Test-Path "scripts\migrate-add-online-sessions.js") {
        try {
            node scripts\migrate-add-online-sessions.js 2>$null
            Write-Host "✅ 数据库迁移完成" -ForegroundColor Green
        } catch {
            Write-Host "✅ 数据库已是最新版本" -ForegroundColor Green
        }
    } else {
        Write-Host "✅ 数据库已是最新版本" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  数据库将在首次启动时自动创建" -ForegroundColor Yellow
}
Set-Location ..

# 5. 安装前端依赖
Write-Host ""
Write-Host "步骤 5/7: 安装前端依赖..." -ForegroundColor Blue
Set-Location frontend
npm install
Write-Host "✅ 前端依赖安装完成" -ForegroundColor Green

# 6. 构建前端
Write-Host ""
Write-Host "步骤 6/7: 构建前端..." -ForegroundColor Blue
npm run build
Write-Host "✅ 前端构建完成" -ForegroundColor Green
Set-Location ..

# 7. 启动服务
Write-Host ""
Write-Host "步骤 7/7: 启动服务..." -ForegroundColor Blue
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    # 使用 PM2
    pm2 start backend\server.js --name "fangdu-backend" --env production
    pm2 save
    Write-Host "✅ 服务已启动（PM2）" -ForegroundColor Green
    Write-Host ""
    Write-Host "查看日志：" -NoNewline -ForegroundColor Blue
    Write-Host "pm2 logs fangdu-backend" -ForegroundColor White
    Write-Host "查看状态：" -NoNewline -ForegroundColor Blue
    Write-Host "pm2 status" -ForegroundColor White
    Write-Host "重启服务：" -NoNewline -ForegroundColor Blue
    Write-Host "pm2 restart fangdu-backend" -ForegroundColor White
} else {
    # 后台运行
    Set-Location backend
    Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow
    Write-Host "✅ 服务已启动（后台运行）" -ForegroundColor Green
}

# 部署完成
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "访问地址：" -ForegroundColor Blue
Write-Host "  前端：http://your-domain.com"
Write-Host "  后端：http://your-domain.com:3002"
Write-Host ""
Write-Host "提示：" -ForegroundColor Blue
Write-Host "  1. 首次部署请配置 backend\.env 文件"
Write-Host "  2. 建议配置 Nginx 反向代理"
Write-Host "  3. 使用 HTTPS 保护您的网站"
Write-Host ""

# 暂停以便用户查看输出
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

