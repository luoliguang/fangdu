# 部署验证脚本 - Windows PowerShell 版本

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  部署验证检查" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. 检查 Git 版本
Write-Host "1. 检查代码版本..." -ForegroundColor Blue
if (Test-Path ".git") {
    $currentCommit = git rev-parse --short HEAD
    $currentBranch = git branch --show-current
    $latestCommit = git log -1 --pretty=format:"%h - %s (%ar)"
    
    Write-Host "✅ Git 仓库信息：" -ForegroundColor Green
    Write-Host "   当前分支: $currentBranch" -ForegroundColor White
    Write-Host "   当前提交: $currentCommit" -ForegroundColor White
    Write-Host "   最新提交: $latestCommit" -ForegroundColor White
    
    $lastCommitMsg = git log -1 --pretty=format:"%s"
    if ($lastCommitMsg -match "v1.5.2") {
        Write-Host "✅ 代码版本正确 (v1.5.2)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  代码可能不是最新版本" -ForegroundColor Yellow
        Write-Host "   请运行: git pull origin main" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 不是 Git 仓库" -ForegroundColor Red
}

Write-Host ""

# 2. 检查数据库
Write-Host "2. 检查数据库..." -ForegroundColor Blue
if (Test-Path "backend\database\my_materials.db") {
    Write-Host "✅ 数据库文件存在" -ForegroundColor Green
    
    # 检查 online_sessions 表（需要 sqlite3 命令）
    try {
        $tables = sqlite3 backend\database\my_materials.db "SELECT name FROM sqlite_master WHERE type='table';" 2>$null
        
        if ($tables -match "online_sessions") {
            Write-Host "✅ online_sessions 表已创建" -ForegroundColor Green
            
            # 查看在线会话数
            $onlineCount = sqlite3 backend\database\my_materials.db "SELECT COUNT(*) FROM online_sessions WHERE last_heartbeat >= datetime('now', '-1 minute');" 2>$null
            Write-Host "   当前在线会话: $onlineCount" -ForegroundColor Yellow
            
            # 显示最近的心跳
            Write-Host "   最近的心跳记录：" -ForegroundColor Yellow
            $recentBeats = sqlite3 backend\database\my_materials.db "SELECT session_id, datetime(last_heartbeat, 'localtime') FROM online_sessions ORDER BY last_heartbeat DESC LIMIT 3;" 2>$null
            $recentBeats | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
        } else {
            Write-Host "❌ online_sessions 表不存在" -ForegroundColor Red
            Write-Host "   请运行: node backend\scripts\migrate-add-online-sessions.js" -ForegroundColor Yellow
        }
        
        if ($tables -match "visits") {
            $visitsSchema = sqlite3 backend\database\my_materials.db "PRAGMA table_info(visits);" 2>$null
            if ($visitsSchema -match "session_id") {
                Write-Host "✅ visits 表已包含 session_id 字段" -ForegroundColor Green
            } else {
                Write-Host "❌ visits 表缺少 session_id 字段" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "⚠️  需要安装 sqlite3 命令行工具才能检查数据库" -ForegroundColor Yellow
        Write-Host "   或者使用 DB Browser for SQLite 手动检查" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 数据库文件不存在" -ForegroundColor Red
}

Write-Host ""

# 3. 检查后端服务
Write-Host "3. 检查后端服务..." -ForegroundColor Blue
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✅ Node.js 服务正在运行" -ForegroundColor Green
    Write-Host "   进程数: $($nodeProcesses.Count)" -ForegroundColor White
    $nodeProcesses | ForEach-Object {
        Write-Host "   PID: $($_.Id) | CPU: $($_.CPU) | Memory: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ 未找到运行的 Node.js 服务" -ForegroundColor Red
}

Write-Host ""

# 4. 测试 API 接口
Write-Host "4. 测试 API 接口..." -ForegroundColor Blue
try {
    # 测试在线人数接口
    $onlineApi = Invoke-RestMethod -Uri "http://localhost:3002/api/v1/visits/online" -Method Get -ErrorAction Stop
    if ($onlineApi.success) {
        Write-Host "✅ 在线人数 API 正常工作" -ForegroundColor Green
        Write-Host "   当前在线: $($onlineApi.data.onlineCount) 人" -ForegroundColor Green
    }
    
    # 测试心跳接口
    $testSession = "test_check_$(Get-Date -Format 'yyyyMMddHHmmss')"
    $heartbeatBody = @{ sessionId = $testSession } | ConvertTo-Json
    $heartbeatResult = Invoke-RestMethod -Uri "http://localhost:3002/api/v1/visits/heartbeat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $heartbeatBody `
        -ErrorAction Stop
    
    if ($heartbeatResult.success) {
        Write-Host "✅ 心跳 API 正常工作" -ForegroundColor Green
        
        # 验证心跳是否记录
        Start-Sleep -Seconds 1
        try {
            $checkRecord = sqlite3 backend\database\my_materials.db "SELECT COUNT(*) FROM online_sessions WHERE session_id='$testSession';" 2>$null
            if ($checkRecord -gt 0) {
                Write-Host "✅ 心跳已成功记录到数据库" -ForegroundColor Green
                # 清理测试数据
                sqlite3 backend\database\my_materials.db "DELETE FROM online_sessions WHERE session_id='$testSession';" 2>$null
            }
        } catch {
            # 忽略清理错误
        }
    }
} catch {
    Write-Host "❌ API 测试失败" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   请确保后端服务正在运行在端口 3002" -ForegroundColor Yellow
}

Write-Host ""

# 5. 检查前端代码
Write-Host "5. 检查前端代码..." -ForegroundColor Blue
if (Test-Path "frontend\src\router\index.js") {
    $routerContent = Get-Content "frontend\src\router\index.js" -Raw
    
    if ($routerContent -match "sendHeartbeat") {
        Write-Host "✅ 前端包含心跳机制代码" -ForegroundColor Green
    } else {
        Write-Host "❌ 前端缺少心跳机制代码" -ForegroundColor Red
    }
    
    if ($routerContent -match "initHeartbeat") {
        Write-Host "✅ 前端包含心跳初始化代码" -ForegroundColor Green
    } else {
        Write-Host "❌ 前端缺少心跳初始化代码" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 前端路由文件不存在" -ForegroundColor Red
}

Write-Host ""

# 6. 检查部署脚本
Write-Host "6. 检查部署配置..." -ForegroundColor Blue
if (Test-Path "deploy.ps1") {
    Write-Host "✅ deploy.ps1 存在" -ForegroundColor Green
}

if (Test-Path "backend\scripts\migrate-add-online-sessions.js") {
    Write-Host "✅ 数据库迁移脚本存在" -ForegroundColor Green
} else {
    Write-Host "❌ 数据库迁移脚本不存在" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "检查完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 提供建议
Write-Host "📋 建议操作：" -ForegroundColor Yellow
Write-Host ""

$lastCommitMsg = git log -1 --pretty=format:"%s" 2>$null
if ($lastCommitMsg -notmatch "v1.5.2") {
    Write-Host "1. 更新代码：" -ForegroundColor Yellow
    Write-Host "   git pull origin main" -ForegroundColor White
    Write-Host ""
}

Write-Host "2. 如果数据库表缺失，运行迁移：" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   node scripts\migrate-add-online-sessions.js" -ForegroundColor White
Write-Host "   cd .." -ForegroundColor White
Write-Host ""

Write-Host "3. 重启后端服务：" -ForegroundColor Yellow
Write-Host "   Stop-Process -Name node -Force" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor White
Write-Host ""

Write-Host "4. 前端测试方法：" -ForegroundColor Yellow
Write-Host "   • 打开浏览器访问网站" -ForegroundColor White
Write-Host "   • 按 F12 打开开发者工具" -ForegroundColor White
Write-Host "   • 切换到 Network 标签" -ForegroundColor White
Write-Host "   • 查找 'heartbeat' 请求（每30秒一次）" -ForegroundColor White
Write-Host "   • 查找 'offline' 请求（关闭浏览器时）" -ForegroundColor White
Write-Host ""

Write-Host "5. 查看在线人数：" -ForegroundColor Yellow
Write-Host "   访问管理后台 -> 统计页面" -ForegroundColor White
Write-Host ""

