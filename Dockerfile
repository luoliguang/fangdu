# 使用官方 Node.js 运行时作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 文件
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装后端依赖
WORKDIR /app/backend
RUN npm ci --only=production

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ .
RUN npm run build

# 复制后端源代码
WORKDIR /app
COPY backend/ ./backend/

# 创建必要的目录
RUN mkdir -p /app/backend/uploads /app/backend/database

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3002

# 暴露端口
EXPOSE 3002

# 切换到后端目录
WORKDIR /app/backend

# 启动应用
CMD ["npm", "start"]