<div align="center">

# 🎨 方度素材管理系统

*一个为服饰行业打造的专业多媒体素材管理平台*

[![Vue.js](https://img.shields.io/badge/Vue.js-3.5-42b883?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.19-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术栈](#-技术栈) • [部署指南](./DEPLOY.md) • [快速参考](./QUICK_START.md)

![项目预览](/project-images/image%20copy.png)

</div>

---

## 📖 项目简介

方度素材管理系统是一个专为**服饰行业**设计的私有化部署多媒体资产管理平台。它提供了完整的素材生命周期管理能力，从上传、分类、搜索到预览，让团队协作更高效。

### 🎯 适用场景

- 🏢 **服装企业**：管理产品图片、设计稿、宣传视频
- 👔 **设计工作室**：整理面料、色卡、款式参考
- 📸 **电商团队**：统一管理商品图片和营销素材
- 🎨 **创意团队**：集中存储灵感图库和项目文件

---

## ✨ 功能特性

### 核心功能

<table>
  <tr>
    <td width="50%">
      
**📦 素材管理**
- ✅ 支持图片（JPG, PNG）和视频（MP4, WebM）
- ✅ 拖拽上传 + 实时进度显示
- ✅ 批量标签管理
- ✅ 智能多关键词搜索
- ✅ 瀑布流/网格双布局
- ✅ 点击预览（图片灯箱 + 视频弹窗）

</td>
<td width="50%">

**🎨 专业工具**
- ✅ **打色卡工具**：HEX/RGB/CMYK/Lab 色值转换
- ✅ **尺码转换器**：智能换码标生成
- ✅ 透明度调节 + 实时预览
- ✅ 一键复制色值和尺码对照

</td>
  </tr>
  <tr>
    <td>

**📊 数据洞察**
- ✅ 实时访问统计（防刷流量机制）
- ✅ 可视化数据图表（ECharts）
- ✅ 页面访问趋势分析
- ✅ 在线人数监控
- ✅ 访问时段分布

</td>
<td>

**💬 用户体验**
- ✅ 全局侧边反馈抽屉
- ✅ 留言管理后台
- ✅ 美观的消息通知
- ✅ 响应式设计（移动端适配）
- ✅ 平滑动画过渡

</td>
  </tr>
</table>

### 高级特性

- 🔐 **安全认证**：JWT 令牌 + 密码加密
- ☁️ **云存储**：支持阿里云 OSS（可选本地存储）
- 🚀 **性能优化**：防抖搜索 + 懒加载 + 虚拟滚动
- 📱 **跨平台**：PWA 支持，可安装到桌面
- 🌍 **SEO 友好**：服务端渲染支持

---

## 🏗️ 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Vue 3)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Gallery │  │  Admin   │  │ColorCard │  │SizeTools │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│         │              │              │             │     │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Vue Router + Pinia + Axios              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│                    后端层 (Express.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Controller│→ │ Service  │→ │  Model   │→ │ Database │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│         │                                          │      │
│  ┌──────────────┐                         ┌──────────┐  │
│  │   文件上传    │                         │  SQLite  │  │
│  │  (Multer)    │                         │  数据库   │  │
│  └──────────────┘                         └──────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────────┐                 ┌─────────┐
        │本地存储  │                 │阿里云OSS │
        │ /uploads│                 │ (可选)  │
        └─────────┘                 └─────────┘
```

### 项目结构

```
fangdu/
├── 📱 frontend/              # 前端应用
│   ├── src/
│   │   ├── components/       # 通用组件
│   │   │   ├── common/       # 基础组件（表单、表格、分页等）
│   │   │   ├── SideDrawer.vue      # 全局反馈抽屉
│   │   │   ├── VideoModal.vue      # 视频播放器
│   │   │   └── TutorialGuide.vue   # 新手引导
│   │   ├── views/            # 页面组件
│   │   │   ├── Gallery.vue          # 素材画廊
│   │   │   ├── ColorCard.vue        # 打色卡工具
│   │   │   ├── SizeConverter.vue    # 尺码转换
│   │   │   ├── Statistics.vue       # 数据统计
│   │   │   ├── Admin.vue            # 管理后台
│   │   │   └── admin/               # 后台子页面
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── services/         # API 服务层
│   │   ├── composables/      # 组合式函数
│   │   ├── utils/            # 工具函数
│   │   └── router/           # 路由配置
│   └── tests/                # 单元测试
│
├── 🔧 backend/               # 后端服务
│   ├── controllers/          # 控制器（处理HTTP请求）
│   │   ├── MaterialController.js
│   │   ├── FeedbackController.js
│   │   ├── VisitController.js
│   │   └── DrawerConfigController.js
│   ├── services/             # 业务逻辑层
│   ├── models/               # 数据模型
│   ├── routes/               # 路由定义
│   ├── config/               # 配置文件
│   │   ├── server.js         # 服务器配置
│   │   ├── database.js       # 数据库配置
│   │   └── sequelize.js      # ORM 配置
│   ├── database/             # SQLite 数据库文件
│   ├── uploads/              # 本地文件存储
│   └── tests/                # 集成测试
│
├── 📚 docs/                  # 项目文档
│   ├── API.md                # API 接口文档
│   ├── DEPLOYMENT.md         # 部署指南
│   ├── SECURITY.md           # 安全配置
│   └── ...
│
├── 🐳 docker-compose.yml     # Docker 编排
├── 📄 Dockerfile             # Docker 镜像
└── 📖 README.md              # 项目说明
```

---

## 🛠️ 技术栈

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| [Vue 3](https://vuejs.org/) | ^3.5 | 渐进式前端框架 |
| [Vite](https://vitejs.dev/) | ^7.0 | 下一代前端构建工具 |
| [Vue Router](https://router.vuejs.org/) | ^4.0 | 官方路由管理器 |
| [Pinia](https://pinia.vuejs.org/) | ^3.0 | 轻量级状态管理 |
| [Axios](https://axios-http.com/) | ^1.11 | HTTP 客户端 |
| [ECharts](https://echarts.apache.org/) | ^6.0 | 数据可视化图表库 |
| [Element Plus](https://element-plus.org/) | ^2.9 | Vue 3 UI 组件库 |
| [Chroma.js](https://gka.github.io/chroma.js/) | ^3.1 | 色彩处理库 |
| [vue-easy-lightbox](https://www.npmjs.com/package/vue-easy-lightbox) | ^1.19 | 图片预览组件 |
| [vue-toastification](https://www.npmjs.com/package/vue-toastification) | ^2.0 | 通知提示组件 |

### 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| [Node.js](https://nodejs.org/) | ≥20.19 | JavaScript 运行环境 |
| [Express](https://expressjs.com/) | ^4.21 | Web 应用框架 |
| [SQLite3](https://www.sqlite.org/) | ^5.1 | 嵌入式数据库 |
| [Sequelize](https://sequelize.org/) | ^6.37 | ORM 框架 |
| [Multer](https://github.com/expressjs/multer) | ^2.0 | 文件上传中间件 |
| [Ali OSS](https://www.alibabacloud.com/product/object-storage-service) | ^6.21 | 阿里云对象存储 |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | ^5.1 | 密码加密 |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | ^9.0 | JWT 令牌生成 |
| [dotenv](https://www.npmjs.com/package/dotenv) | ^17.0 | 环境变量管理 |
| [cors](https://www.npmjs.com/package/cors) | ^2.8 | 跨域资源共享 |

### 开发工具

- **代码规范**：ESLint + Prettier
- **测试框架**：Jest + Testing Library
- **版本控制**：Git + GitHub
- **CI/CD**：GitHub Actions
- **容器化**：Docker + Docker Compose

---

## 🚀 快速开始

### 📋 前置要求

- ✅ **Node.js** ≥20.19.0 ([下载](https://nodejs.org/))
- ✅ **npm** ≥8.0.0 (随 Node.js 安装)
- ✅ **Git** ([下载](https://git-scm.com/))

### ⚡ 一键部署

**Linux/macOS:**
```bash
git clone https://github.com/luoliguang/fangdu.git
cd fangdu
cp backend/env.example backend/.env  # 配置环境变量
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```powershell
git clone https://github.com/luoliguang/fangdu.git
cd fangdu
copy backend\env.example backend\.env  # 配置环境变量
.\deploy.ps1
```

> 📖 **详细部署文档**: [DEPLOY.md](./DEPLOY.md)

<details>
<summary><b>手动部署步骤（可选）</b></summary>

### 📦 一、克隆项目

```bash
# 克隆仓库
git clone https://github.com/luoliguang/fangdu.git

# 进入项目目录
cd fangdu

# 查看项目结构
tree -L 2  # Linux/macOS
# 或
dir /s     # Windows
```

### ⚙️ 二、后端配置

#### 1. 安装依赖

```bash
cd backend
npm install
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env          # Linux/macOS
copy env.example .env        # Windows

# 使用编辑器打开 .env
nano .env                    # Linux/macOS
notepad .env                 # Windows
```

#### 3. 必填配置项

```env
# ========== 基础配置 ==========
NODE_ENV=development          # 运行环境：development | production
PORT=3002                     # 后端服务端口
HOST=localhost                # 主机地址

# ========== 数据库配置 ==========
DB_DATABASE=fangdu_dev        # 数据库名称
DB_HOST=localhost             # 数据库主机
DB_PORT=3306                  # 数据库端口（如使用 MySQL）

# ========== 安全配置（必须修改！）==========
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SECRET_TOKEN=your-admin-access-token-change-this-now
ADMIN_USERNAME=admin          # 管理员用户名
ADMIN_PASSWORD=your-strong-password-here

# ========== 阿里云 OSS（可选）==========
ALI_OSS_ACCESS_KEY_ID=your-oss-access-key-id
ALI_OSS_ACCESS_KEY_SECRET=your-oss-access-key-secret
ALI_OSS_BUCKET=your-bucket-name
ALI_OSS_REGION=oss-cn-guangzhou
ALI_OSS_ENDPOINT=https://oss-cn-guangzhou.aliyuncs.com

# ========== CORS 配置 ==========
CORS_ORIGIN=http://localhost:5174
```

> ⚠️ **安全提示**：生产环境部署前，请务必修改所有默认密码和密钥！详见 [SECURITY.md](./SECURITY.md)

#### 4. 启动后端服务

```bash
# 开发模式（热重载）
npm run dev

# 或生产模式
node server.js

# 或使用 PM2（推荐生产环境）
npm install -g pm2
pm2 start server.js --name "fangdu-backend"
pm2 startup
pm2 save
```

✅ **后端服务成功启动**：`http://localhost:3002`

<details>
<summary><b>验证后端服务</b></summary>

```bash
# 测试 API 连接
curl http://localhost:3002/api/v1/materials

# 应返回 JSON 格式的素材列表
```

</details>

### 🎨 三、前端配置

#### 1. 安装依赖

```bash
# 在新终端窗口中
cd frontend
npm install
```

#### 2. 配置前端环境（可选）

前端环境变量已在 `src/config/env.js` 中配置，默认连接本地后端。如需修改：

```javascript
// frontend/src/config/env.js
export const getApiBaseURL = () => {
  return import.meta.env.DEV 
    ? 'http://localhost:3002'  // 开发环境
    : 'https://your-domain.com'; // 生产环境
}
```

#### 3. 启动开发服务器

```bash
# 启动 Vite 开发服务器
npm run dev

# 服务器将在 http://localhost:5174 启动
```

#### 4. 构建生产版本（可选）

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

✅ **前端应用成功启动**：`http://localhost:5174`

### 🎉 四、开始使用

1. **访问主页**：打开浏览器访问 `http://localhost:5174`
2. **浏览素材**：在画廊页面浏览已有素材
3. **使用工具**：
   - 点击「打色卡」使用色值转换工具
   - 点击「尺码工具」使用换码标生成器
4. **管理后台**：
   - 访问 `http://localhost:5174/login`
   - 使用 `.env` 中配置的管理员账号登录
   - 进入后台管理素材、查看统计数据

</details>

---

## 📚 核心功能使用

### 🖼️ 素材管理

#### 上传素材

1. 登录管理后台
2. 点击「上传素材」菜单
3. 拖拽文件或点击选择
4. 填写标题、描述、标签
5. 点击上传，等待进度完成

#### 搜索与筛选

```
# 多关键词搜索（空格分隔）
冬季 外套 男装

# 标签筛选
点击任意标签快速筛选相关素材
```

### 🎨 打色卡工具

1. 选择色值输入方式（HEX/RGB/CMYK/Lab）
2. 输入或使用取色器选择颜色
3. 调节透明度
4. 查看实时预览
5. 点击复制按钮获取色值

### 📏 尺码转换器

1. 选择起始和结束尺码
2. 设置降码数量
3. 查看转换结果
4. 点击复制单个结果或全部复制

### 📊 访问统计

- **实时在线**：查看当前在线人数
- **今日访问**：查看今日访问量和唯一访客
- **趋势分析**：7天/30天访问趋势图表
- **热门页面**：访问量最高的页面排行
- **时段分布**：24小时访问量分布图

---

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 1. 确保已安装 Docker 和 Docker Compose
docker --version
docker-compose --version

# 2. 配置环境变量
cp backend/env.example backend/.env
# 编辑 .env 文件

# 3. 启动所有服务
docker-compose up -d

# 4. 查看运行状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f backend

# 6. 停止服务
docker-compose down
```

### 手动 Docker 部署

```bash
# 1. 构建镜像
docker build -t fangdu:latest .

# 2. 运行容器
docker run -d \
  -p 3002:3002 \
  -v $(pwd)/backend/uploads:/app/backend/uploads \
  -v $(pwd)/backend/database:/app/backend/database \
  -v $(pwd)/backend/.env:/app/backend/.env \
  --name fangdu-app \
  fangdu:latest

# 3. 查看日志
docker logs -f fangdu-app

# 4. 停止容器
docker stop fangdu-app
docker rm fangdu-app
```

---

## 🌐 生产环境部署

### 服务器要求

- **操作系统**：Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **硬件配置**：
  - CPU：2 核心以上
  - 内存：2GB RAM（推荐 4GB）
  - 存储：20GB 可用空间
- **网络环境**：
  - 开放端口：80 (HTTP)、443 (HTTPS)、3002 (API)
  - 固定公网 IP 或域名

### 部署步骤

#### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx（可选，用于反向代理）
sudo apt install -y nginx
```

#### 2. 部署代码

   ```bash
# 克隆代码
   git clone https://github.com/luoliguang/fangdu.git
   cd fangdu
   
# 安装后端依赖
cd backend
npm install --production

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build
```

#### 3. 配置环境变量

```bash
cd ../backend
cp env.example .env
nano .env  # 修改为生产环境配置

# 重要：修改以下配置
NODE_ENV=production
PORT=3002
JWT_SECRET=<生成强随机密钥>
SECRET_TOKEN=<生成强随机令牌>
ADMIN_PASSWORD=<设置强密码>
```

#### 4. 启动服务

```bash
# 使用 PM2 启动后端
pm2 start server.js --name "fangdu-backend" --env production

# 设置开机自启
   pm2 startup
   pm2 save
   
# 查看运行状态
pm2 status
pm2 logs fangdu-backend
```

#### 5. 配置 Nginx（可选）

```nginx
# /etc/nginx/sites-available/fangdu

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/fangdu/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件代理
    location /uploads {
        proxy_pass http://localhost:3002;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/fangdu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 监控与维护

   ```bash
# 查看 PM2 进程
pm2 list
pm2 monit

# 查看日志
pm2 logs fangdu-backend --lines 100

# 重启服务
pm2 restart fangdu-backend

# 更新代码
cd /path/to/fangdu
git pull
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart fangdu-backend
```

---

## 🔧 开发指南

### 开发环境设置

```bash
# 安装全局开发工具
npm install -g @vue/cli nodemon pm2

# 启用代码检查（前端）
cd frontend
npm run lint          # 检查代码
npm run lint:fix      # 自动修复

# 运行测试
cd backend
npm test              # 运行所有测试
npm run test:watch    # 监听模式
```

### 添加新功能

**1. 后端开发流程**

```bash
# 1. 创建数据模型
backend/models/YourModel.js

# 2. 实现业务逻辑
backend/services/YourService.js

# 3. 添加控制器
backend/controllers/YourController.js

# 4. 配置路由
backend/routes/yourRoutes.js

# 5. 更新主路由
backend/routes/index.js
```

**2. 前端开发流程**

```bash
# 1. 创建 API 服务
frontend/src/services/yourService.js

# 2. 创建状态管理（如需要）
frontend/src/stores/yourStore.js

# 3. 创建页面组件
frontend/src/views/YourView.vue

# 4. 添加路由
frontend/src/router/index.js
```

### 代码规范

- ✅ 使用 ESLint + Prettier 格式化代码
- ✅ 提交信息遵循 Conventional Commits
- ✅ 组件命名使用 PascalCase
- ✅ 文件命名使用 kebab-case
- ✅ 函数命名使用 camelCase

### Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并提交
git add .
git commit -m "feat: add your feature"

# 3. 推送到远程
git push origin feature/your-feature-name

# 4. 创建 Pull Request
# 在 GitHub 上创建 PR，等待代码审查
```

---

## 📖 API 文档

### 认证方式

所有需要认证的接口需要在请求头中包含 JWT 令牌：

```http
Authorization: Bearer <your-jwt-token>
```

### 主要接口

#### 素材管理 API

```http
# 获取素材列表
GET /api/v1/materials?page=1&limit=20&search=关键词&tag=标签

# 上传素材 🔒
POST /api/v1/materials
Content-Type: multipart/form-data

# 更新素材 🔒
PUT /api/v1/materials/:id

# 删除素材 🔒
DELETE /api/v1/materials/:id
```

#### 用户反馈 API

```http
# 提交反馈
POST /api/v1/feedbacks

# 获取反馈列表 🔒
GET /api/v1/feedbacks

# 更新反馈状态 🔒
PUT /api/v1/feedbacks/:id
```

#### 访问统计 API

```http
# 记录访问
POST /api/v1/visits/record

# 获取统计概览 🔒
GET /api/v1/visits/overview

# 获取访问趋势 🔒
GET /api/v1/visits/trends?days=7
```

#### 用户认证 API

```http
# 管理员登录
POST /api/v1/auth/login

# 登出 🔒
POST /api/v1/auth/logout
```

🔒 = 需要管理员权限

> 📘 **完整 API 文档**：请查看 [docs/API.md](./docs/API.md)

---

## 🔐 安全配置

### 必须修改的配置

在生产环境部署前，**必须**修改以下配置：

```env
# ⚠️ 生成强随机密钥
JWT_SECRET=$(openssl rand -base64 32)
SECRET_TOKEN=$(openssl rand -base64 32)

# ⚠️ 设置强密码（至少12位，包含大小写字母、数字、特殊字符）
ADMIN_PASSWORD=YourStr0ng!P@ssw0rd

# ⚠️ 限制 CORS 源
CORS_ORIGIN=https://your-domain.com
```

### 安全最佳实践

- ✅ 使用 HTTPS 加密传输
- ✅ 定期更新依赖包
- ✅ 启用防火墙，只开放必要端口
- ✅ 定期备份数据库
- ✅ 使用强密码策略
- ✅ 启用访问日志监控

> 📘 **详细安全指南**：请查看 [SECURITY.md](./SECURITY.md)

---

## 🐛 故障排查

### 常见问题

<details>
<summary><b>1. 后端启动失败：端口被占用</b></summary>

```bash
# 查找占用端口的进程
lsof -i :3002  # Linux/macOS
netstat -ano | findstr :3002  # Windows

# 结束进程
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows

# 或修改 .env 中的 PORT 配置
```

</details>

<details>
<summary><b>2. 数据库连接失败</b></summary>

```bash
# 检查数据库文件是否存在
ls -la backend/database/

# 确保数据库目录有写权限
chmod 755 backend/database/

# 删除并重新初始化数据库
rm backend/database/*.db
node backend/server.js  # 会自动创建
```

</details>

<details>
<summary><b>3. 文件上传失败</b></summary>

```bash
# 检查 uploads 目录权限
ls -la backend/uploads/
chmod 755 backend/uploads/

# 检查文件大小限制（默认 100MB）
# 修改 backend/config/server.js 中的 maxFileSize

# 如使用 OSS，检查配置是否正确
# 查看 .env 中的 ALI_OSS_* 配置
```

</details>

<details>
<summary><b>4. 前端访问后端 CORS 错误</b></summary>

```bash
# 检查后端 CORS 配置
# backend/.env
CORS_ORIGIN=http://localhost:5174

# 或修改 backend/config/server.js
# 允许所有源（仅开发环境）
origin: '*'
```

</details>

<details>
<summary><b>5. 访问统计不准确</b></summary>

检查以下内容：
- 确保前端路由守卫正常工作
- 查看后端日志中的访问记录消息
- 确认管理员路径被正确过滤（/admin, /login）
- 检查会话去重机制（5分钟内同一IP只计1次）

</details>

### 获取帮助

- 📖 查看 [docs/](./docs/) 目录中的详细文档
- 🐛 提交 [GitHub Issue](https://github.com/luoliguang/fangdu/issues)
- 💬 加入 [讨论区](https://github.com/luoliguang/fangdu/discussions)

---

## 🗺️ 版本规划

### v1.5.0（当前版本）

- ✅ 完整的访问统计系统（带防刷机制）
- ✅ 用户反馈收集与管理
- ✅ 打色卡工具（支持多色彩空间）
- ✅ 尺码转换器
- ✅ 阿里云 OSS 集成
- ✅ 全局侧边反馈抽屉
- ✅ 响应式布局优化

### v2.0.0（规划中）

- [ ] **多用户系统**：完整的用户注册、登录、权限管理
- [ ] **高级搜索**：AI 驱动的语义搜索和智能推荐
- [ ] **批量操作**：批量上传、编辑、删除、导出
- [ ] **工作流管理**：素材审核流程、版本控制
- [ ] **数据分析**：更深入的用户行为分析和报表
- [ ] **API 限流**：防止滥用和 DDoS 攻击
- [ ] **多语言支持**：国际化 (i18n)
- [ ] **主题定制**：暗色模式、自定义主题

### 未来展望

- 🤖 AI 智能标签自动生成
- 🎨 在线图片编辑器
- 📱 移动端 App（React Native）
- 🔌 第三方集成（Slack、企业微信）
- 📊 高级数据分析与报表导出

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'feat: add some amazing feature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **提交 Pull Request**

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链更新
```

### 代码审查

- ✅ 代码符合项目规范
- ✅ 包含必要的测试
- ✅ 文档已更新
- ✅ 通过 CI/CD 检查

---

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源许可证。

```
MIT License

Copyright (c) 2024 方度素材管理系统

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[完整许可证文本...]
```

---

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

### 核心贡献者

- [@luoliguang](https://github.com/luoliguang) - 项目创建者

### 特别鸣谢

- [Vue.js](https://vuejs.org/) - 优秀的前端框架
- [Express.js](https://expressjs.com/) - 简洁的 Node.js 框架
- [Element Plus](https://element-plus.org/) - 精美的 Vue 3 组件库
- [ECharts](https://echarts.apache.org/) - 强大的数据可视化库

---

## 📞 联系方式

- 📧 **Email**: [项目邮箱]
- 🐛 **Issues**: [GitHub Issues](https://github.com/luoliguang/fangdu/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/luoliguang/fangdu/discussions)

---

<div align="center">

### ⭐ 如果这个项目对您有帮助，请给我们一个 Star！

[![Star History Chart](https://api.star-history.com/svg?repos=luoliguang/fangdu&type=Date)](https://star-history.com/#luoliguang/fangdu&Date)

**方度素材管理系统** - 让素材管理更简单、更高效 ✨

Made with ❤️ by [luoliguang](https://github.com/luoliguang)

</div>
