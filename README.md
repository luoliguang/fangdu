# Material Hub - 您的专属多媒体素材库

[![Vue.js](https://img.shields.io/badge/Vue.js-3-42b883.svg)](https://vuejs.org/) [![Node.js](https://img.shields.io/badge/Node.js-Express-000000.svg)](https://nodejs.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Material Hub 是一个为服饰行业或任何需要管理视觉素材的创意工作者设计的、私有化部署的多媒体资产管理系统。它提供了一个美观、高效的界面来上传、搜索、筛选和预览图片及视频素材。

![Material Hub预览图](/project-images/image%20copy.png)

## ✨ 核心功能

-   **多媒体支持**: 同时管理图片 (`.jpg`, `.png`) 和视频 (`.mp4`, `.webm`) 素材。
-   **智能搜索**: 支持多关键词模糊搜索，可根据空格分隔的多个词语进行 `AND` 匹配。
-   **标签筛选**: 为每个素材添加多个标签，并可点击标签快速筛选分类。
-   **安全后台**: 基于秘密令牌的登录验证，保护后台管理功能，确保只有您可以操作。
-   **完整的CRUD操作**:
    -   **创建(Create)**: 现代化拖拽/点击上传界面，带实时进度条。
    -   **读取(Read)**: 流畅的瀑布流/网格布局展示，支持无限滚动。
    -   **更新(Update)**: 在后台直接编辑素材的名称和标签。
    -   **删除(Delete)**: 安全删除素材及其对应的服务器文件。
-   **卓越的用户体验**:
    -   使用 `vue-toastification` 提供美观的操作反馈通知。
    -   卡片加载、筛选和搜索时拥有平滑的 `fade` 和 `move` 动画。
    -   图片支持点击放大（Lightbox效果），视频支持点击弹窗播放。
    -   搜索框输入时采用防抖（Debounce）技术，优化性能。

## 🔒 安全提醒

**重要**: 本项目包含敏感配置信息，在部署前请务必阅读 [SECURITY.md](./SECURITY.md) 文件了解安全配置。

- ✅ 所有敏感信息已通过 `.gitignore` 保护
- ✅ 环境变量模板已提供 (`backend/env.example`)
- ✅ 管理员账号密码已移至环境变量配置
- ⚠️ 生产环境部署前请修改所有默认密码和密钥

## 🏗️ 项目架构

本项目采用前后端分离架构，具有清晰的模块化设计：

```
fangdu/
├── frontend/          # Vue 3 前端应用
│   ├── src/
│   │   ├── components/    # 可复用组件
│   │   ├── views/         # 页面组件
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── services/      # API 服务层
│   │   ├── utils/         # 工具函数
│   │   └── router/        # 路由配置
│   └── tests/         # 前端测试
├── backend/           # Node.js 后端服务
│   ├── controllers/   # 控制器层
│   ├── services/      # 业务逻辑层
│   ├── models/        # 数据模型
│   ├── routes/        # 路由定义
│   ├── config/        # 配置文件
│   └── tests/         # 后端测试
├── docs/              # 项目文档
└── .github/           # CI/CD 配置
```

## 🛠️ 技术栈

### 前端技术栈
- **核心框架**: [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- **构建工具**: [Vite 7](https://vitejs.dev/) - 极速开发构建
- **路由管理**: [Vue Router 4](https://router.vuejs.org/)
- **状态管理**: [Pinia 3](https://pinia.vuejs.org/) - Vue 官方推荐
- **HTTP 客户端**: [Axios 1.11](https://axios-http.com/)
- **数据可视化**: [ECharts 6](https://echarts.apache.org/)
- **UI 增强**:
  - [vue-easy-lightbox](https://www.npmjs.com/package/vue-easy-lightbox) - 图片预览
  - [vue-toastification](https://www.npmjs.com/package/vue-toastification) - 消息通知

### 后端技术栈
- **运行环境**: [Node.js](https://nodejs.org/) (≥20.19.0)
- **Web 框架**: [Express.js 4](https://expressjs.com/)
- **数据库**: [SQLite3 5](https://www.sqlite.org/) - 轻量级文件数据库
- **文件上传**: [Multer 2](https://github.com/expressjs/multer)
- **云存储**: [阿里云 OSS](https://www.alibabacloud.com/product/object-storage-service)
- **环境配置**: [Dotenv 17](https://www.npmjs.com/package/dotenv)
- **跨域处理**: [CORS 2](https://www.npmjs.com/package/cors)

### 开发工具
- **代码规范**: ESLint + Prettier
- **Git 钩子**: Husky
- **测试框架**: Jest
- **CI/CD**: GitHub Actions

## 🚀 快速开始

### 📋 系统要求

- **Node.js**: ≥20.19.0 或 ≥22.12.0 ([下载地址](https://nodejs.org/))
- **npm**: ≥8.0.0 (随 Node.js 自动安装)
- **Git**: 最新版本 ([下载地址](https://git-scm.com/))
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 1️⃣ 克隆项目

```bash
# 克隆仓库
git clone https://github.com/luoliguang/fangdu.git
cd fangdu

# 查看项目结构
ls -la  # Linux/macOS
dir     # Windows
```

### 2️⃣ 后端服务配置

```bash
# 进入后端目录
cd backend

# 安装依赖包
npm install

# 创建环境配置文件
cp env.example .env          # Linux/macOS
copy env.example .env        # Windows

# 编辑环境变量 (必须配置)
nano .env                    # Linux
notepad .env                 # Windows
# 或使用您喜欢的编辑器
```

**重要配置项**:
```bash
# 基础配置
NODE_ENV=development
PORT=3002
HOST=localhost

# 数据库配置
DB_DATABASE=fangdu_dev

# 安全配置 (必须修改)
JWT_SECRET=your-jwt-secret-key-here
SECRET_TOKEN=your-access-token-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

# 阿里云 OSS (可选)
ALI_OSS_ACCESS_KEY_ID=your-key-id
ALI_OSS_ACCESS_KEY_SECRET=your-key-secret
ALI_OSS_BUCKET=your-bucket-name
ALI_OSS_REGION=oss-cn-guangzhou
```

```bash
# 启动后端服务
node server.js

# 或者使用 PM2 (生产环境推荐)
npm install -g pm2
pm2 start server.js --name "fangdu-backend"
```

✅ 后端服务运行在: `http://localhost:3002`

### 3️⃣ 前端应用配置

```bash
# 打开新终端，进入前端目录
cd frontend

# 安装依赖包
npm install

# 启动开发服务器
npm run dev

# 构建生产版本 (可选)
npm run build
npm run preview
```

✅ 前端应用运行在: `http://localhost:5174`

### 4️⃣ 验证安装

1. **访问前端**: 打开浏览器访问 `http://localhost:5174`
2. **测试上传**: 点击"上传素材"按钮测试文件上传功能
3. **后台管理**: 访问 `/admin` 页面，使用配置的管理员账号登录
4. **API 测试**: 访问 `http://localhost:3002/api/materials` 查看 API 响应

## ⚙️ 高级配置

### 环境变量说明

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | string | development | 运行环境 (development/production) |
| `PORT` | number | 3002 | 后端服务端口 |
| `HOST` | string | localhost | 服务器主机地址 |
| `DB_DATABASE` | string | fangdu_dev | 数据库名称 |
| `JWT_SECRET` | string | - | JWT 签名密钥 (必须设置) |
| `SECRET_TOKEN` | string | - | API 访问令牌 (必须设置) |
| `ADMIN_USERNAME` | string | admin | 管理员用户名 |
| `ADMIN_PASSWORD` | string | - | 管理员密码 (必须设置) |
| `ALI_OSS_*` | string | - | 阿里云 OSS 配置 (可选) |

### 数据库配置

项目使用 SQLite3 作为默认数据库，数据文件存储在 `backend/database/` 目录下：

- **开发环境**: `fangdu_dev.db`
- **测试环境**: `fangdu_test.db`
- **生产环境**: `fangdu_prod.db`

### 文件存储配置

支持两种存储方式：

1. **本地存储** (默认): 文件存储在 `backend/uploads/` 目录
2. **阿里云 OSS**: 配置相应环境变量后自动启用

## 📚 API 文档

### 认证方式

所有管理接口需要在请求头中包含访问令牌：
```bash
Authorization: Bearer your-secret-token
```

### 核心接口

#### 素材管理
- `GET /api/materials` - 获取素材列表
  - 查询参数: `search`, `tag`, `page`, `limit`
- `POST /api/materials` - 上传新素材 🔒
- `PUT /api/materials/:id` - 更新素材信息 🔒
- `DELETE /api/materials/:id` - 删除素材 🔒

#### 标签管理
- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建新标签 🔒
- `DELETE /api/tags/:id` - 删除标签 🔒

#### 用户反馈
- `GET /api/feedback` - 获取反馈列表 🔒
- `POST /api/feedback` - 提交用户反馈
- `PUT /api/feedback/:id` - 更新反馈状态 🔒

#### 访问统计
- `GET /api/visits/stats` - 获取访问统计 🔒
- `POST /api/visits` - 记录页面访问

#### 用户认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出 🔒

🔒 表示需要认证的接口

> 详细的 API 文档请参考 [docs/API.md](./docs/API.md)

## 🚀 部署指南

### 生产环境部署

1. **服务器要求**
   - Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
   - Node.js ≥20.19.0
   - 至少 2GB RAM, 20GB 存储空间
   - 开放端口: 80, 443, 3002

2. **部署步骤**
   ```bash
   # 1. 克隆代码
   git clone https://github.com/luoliguang/fangdu.git
   cd fangdu
   
   # 2. 安装依赖
   cd backend && npm install --production
   cd ../frontend && npm install && npm run build
   
   # 3. 配置环境变量
   cp backend/env.example backend/.env
   # 编辑 .env 文件，设置生产环境配置
   
   # 4. 使用 PM2 启动服务
   npm install -g pm2
   pm2 start backend/server.js --name "fangdu-backend"
   pm2 startup
   pm2 save
   
   # 5. 配置 Nginx (可选)
   # 参考 docs/DEPLOYMENT.md
   ```

3. **Docker 部署** (推荐)
   ```bash
   # 方式一：使用 Docker Compose (推荐)
   docker-compose up -d
   
   # 方式二：手动构建和运行
   docker build -t fangdu .
   docker run -d -p 3002:3002 \
     -v $(pwd)/backend/uploads:/app/backend/uploads \
     -v $(pwd)/backend/database:/app/backend/database \
     -v $(pwd)/backend/.env:/app/backend/.env \
     --name fangdu-app fangdu
   
   # 查看运行状态
   docker-compose ps
   docker logs fangdu-backend
   ```

## 🛠️ 开发指南

### 开发环境设置

```bash
# 安装开发工具
npm install -g @vue/cli nodemon pm2

# 启用代码检查
npm run lint          # 前端
npm run lint:fix      # 自动修复

# 运行测试
npm test              # 后端测试
npm run test:watch    # 监听模式
```

### 代码规范

- **JavaScript**: 使用 ESLint + Prettier
- **Vue**: 遵循 Vue 3 官方风格指南
- **提交信息**: 遵循 Conventional Commits 规范
- **分支管理**: Git Flow 工作流

### 项目结构说明

```bash
# 添加新功能
1. 创建对应的 Model (backend/models/)
2. 实现 Service 层 (backend/services/)
3. 添加 Controller (backend/controllers/)
4. 配置路由 (backend/routes/)
5. 创建前端页面 (frontend/src/views/)
6. 添加 API 服务 (frontend/src/services/)
```

## 🔮 版本规划

### v2.0.0 (计划中)
- [ ] **多用户系统**: 完整的用户认证和权限管理
- [ ] **高级搜索**: AI 驱动的智能搜索和推荐
- [ ] **批量操作**: 支持批量上传、编辑、删除
- [ ] **API 限流**: 防止恶意请求和 DDoS 攻击

### v1.5.0 (开发中)
- ✅ **访问统计**: 实时访问数据和可视化图表
- ✅ **用户反馈**: 完整的反馈收集和管理系统
- ✅ **云存储**: 阿里云 OSS 集成
- [ ] **数据备份**: 自动备份和恢复功能

### v1.0.0 (已发布)
- ✅ **核心功能**: 素材上传、管理、搜索、预览
- ✅ **标签系统**: 多标签分类和筛选
- ✅ **响应式设计**: 支持桌面和移动设备
- ✅ **安全认证**: 基于 JWT 的用户认证

## 📞 支持与贡献

### 获取帮助

- 📖 **文档**: [docs/](./docs/) 目录包含详细文档
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/luoliguang/fangdu/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/luoliguang/fangdu/discussions)

### 贡献代码

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

### 许可证

本项目采用 [MIT License](./LICENSE) 开源协议。

---

**Material Hub** - 让素材管理变得简单高效 ✨

[![Star History Chart](https://api.star-history.com/svg?repos=luoliguang/fangdu&type=Date)](https://star-history.com/#luoliguang/fangdu&Date)