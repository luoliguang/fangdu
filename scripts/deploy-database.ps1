# SQLite数据库部署脚本 (PowerShell版本)
# 用于将本地数据库文件部署到服务器

Write-Host "🚀 开始部署SQLite数据库..." -ForegroundColor Green

# 配置变量 - 请根据您的服务器情况修改
$SERVER_USER = "your-username"
$SERVER_HOST = "your-server-ip"
$SERVER_PATH = "/path/to/your/project/backend"
$LOCAL_DB_PATH = ".\backend\database\my_materials.db"

# 检查本地数据库文件是否存在
if (-not (Test-Path $LOCAL_DB_PATH)) {
    Write-Host "❌ 错误：本地数据库文件不存在: $LOCAL_DB_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 找到本地数据库文件: $LOCAL_DB_PATH" -ForegroundColor Green
$fileSize = (Get-Item $LOCAL_DB_PATH).Length
Write-Host "文件大小: $([math]::Round($fileSize/1KB, 2)) KB"

# 获取文件信息
$dbFile = Get-Item $LOCAL_DB_PATH
Write-Host "最后修改时间: $($dbFile.LastWriteTime)" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 部署步骤说明:" -ForegroundColor Yellow
Write-Host "1. 在服务器上创建数据库目录"
Write-Host "2. 备份服务器上的现有数据库（如果存在）"
Write-Host "3. 上传数据库文件到服务器"
Write-Host "4. 设置正确的文件权限"
Write-Host "5. 验证数据库文件"
Write-Host ""

# 提供手动部署命令
Write-Host "🔧 手动部署命令:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# 1. 在服务器上创建目录" -ForegroundColor Gray
Write-Host "ssh $SERVER_USER@$SERVER_HOST `"mkdir -p $SERVER_PATH/database`""
Write-Host ""
Write-Host "# 2. 上传数据库文件" -ForegroundColor Gray
Write-Host "scp `"$LOCAL_DB_PATH`" $SERVER_USER@${SERVER_HOST}:$SERVER_PATH/database/"
Write-Host ""
Write-Host "# 3. 设置文件权限" -ForegroundColor Gray
Write-Host "ssh $SERVER_USER@$SERVER_HOST `"chmod 664 $SERVER_PATH/database/my_materials.db`""
Write-Host ""
Write-Host "# 4. 验证部署" -ForegroundColor Gray
Write-Host "ssh $SERVER_USER@$SERVER_HOST `"ls -la $SERVER_PATH/database/my_materials.db`""
Write-Host ""

# 如果是Windows环境，提供WinSCP或其他工具的建议
Write-Host "💡 Windows用户建议:" -ForegroundColor Yellow
Write-Host "- 使用 WinSCP 或 FileZilla 上传文件"
Write-Host "- 使用 PuTTY 连接服务器执行命令"
Write-Host "- 或者安装 WSL 使用上面的 Linux 命令"
Write-Host ""

Write-Host "🔍 部署后验证步骤:" -ForegroundColor Magenta
Write-Host "1. 登录服务器检查文件是否存在"
Write-Host "2. 运行: node check-database.js"
Write-Host "3. 重启您的Node.js应用程序"
Write-Host "4. 测试应用程序功能"
Write-Host ""

Write-Host "📁 本地数据库路径: $((Get-Item $LOCAL_DB_PATH).FullName)" -ForegroundColor Green
Write-Host "🎯 目标服务器路径: $SERVER_USER@${SERVER_HOST}:$SERVER_PATH/database/my_materials.db" -ForegroundColor Green