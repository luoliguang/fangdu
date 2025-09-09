@echo off
echo ========================================
echo 方度素材库 - 测试数据生成器
echo ========================================
echo.
echo 正在生成测试数据...
echo.

node test-data-generator.js

echo.
echo ========================================
echo 测试数据生成完成！
echo ========================================
echo.
echo 接下来您可以：
echo 1. 启动后端服务器：node server.js
echo 2. 启动前端服务器：npm run dev
echo 3. 访问 http://localhost:5173 查看效果
echo.
pause