@echo off
REM 快速启动脚本 - 仅用于开发环境

echo ============================================
echo   方度素材管理系统 - 快速启动
echo ============================================
echo.

echo 启动后端服务...
cd backend
start "后端服务" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo 启动前端服务...
cd ..\frontend
start "前端服务" cmd /k "npm run dev"

echo.
echo ============================================
echo   服务已启动！
echo ============================================
echo.
echo 访问地址：
echo   前端: http://localhost:5174
echo   后端: http://localhost:3002
echo.
echo 提示：关闭对应的命令行窗口可停止服务
echo.

pause

