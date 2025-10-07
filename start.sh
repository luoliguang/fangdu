#!/bin/bash

# 快速启动脚本 - 仅用于开发环境

echo "🚀 启动方度素材管理系统..."
echo ""

# 启动后端
cd backend
echo "📡 启动后端服务 (端口 3002)..."
node server.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
cd ../frontend
echo "🎨 启动前端服务 (端口 5174)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动！"
echo ""
echo "访问地址："
echo "  前端: http://localhost:5174"
echo "  后端: http://localhost:3002"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待信号
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM

wait

