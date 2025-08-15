# Material Hub - 您的专属多媒体素材库

[![Vue.js](https://img.shields.io/badge/Vue.js-3-42b883.svg)](https://vuejs.org/) [![Node.js](https://img.shields.io/badge/Node.js-Express-000000.svg)](https://nodejs.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Material Hub 是一个为服饰行业或任何需要管理视觉素材的创意工作者设计的、私有化部署的多媒体资产管理系统。它提供了一个美观、高效的界面来上传、搜索、筛选和预览图片及视频素材。

![Material Hub预览图](/project-images/image.png)

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

## 🛠️ 技术栈

**前端 (Frontend)**
-   **框架**: [Vue 3](https://vuejs.org/) (使用 Composition API 和 `<script setup>`)
-   **构建工具**: [Vite](https://vitejs.dev/)
-   **路由**: [Vue Router](https://router.vuejs.org/)
-   **HTTP客户端**: [Axios](https://axios-http.com/)
-   **UI组件与插件**:
    -   图片放大: [vue-easy-lightbox](https://www.npmjs.com/package/vue-easy-lightbox)
    -   消息通知: [vue-toastification](https://www.npmjs.com/package/vue-toastification)

**后端 (Backend)**
-   **环境**: [Node.js](https://nodejs.org/)
-   **框架**: [Express.js](https://expressjs.com/)
-   **数据库**: [SQLite3](https://www.sqlite.org/index.html) (轻量级文件数据库)
-   **文件上传**: [Multer](https://github.com/expressjs/multer)
-   **环境变量**: [Dotenv](https://www.npmjs.com/package/dotenv)
-   **中间件**: [CORS](https://www.npmjs.com/package/cors)

## 🚀 快速开始

请确保您的系统已安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本) 和 [Git](https://git-scm.com/)。

### 1. 克隆仓库

```bash
git clone [https://github.com/luoliguang/fangdu.git](https://github.com/luoliguang/fangdu.git)
cd fangdu
```

### 2. 配置并运行后端

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# (重要!) 从模板创建您的环境变量文件
# Windows 使用 copy, Mac/Linux 使用 cp
copy env.example .env

# 编辑 .env 文件，设置你自己的秘密令牌
# SECRET_TOKEN="your-super-secret-password-12345"

# 启动后端服务
npm start
```
> **提示**: 为了方便使用 `npm start`，请在 `backend/package.json` 的 `scripts` 中添加 `"start": "node server.js"`。

后端服务将默认运行在 `http://localhost:3001`。

### 3. 配置并运行前端

```bash
# (在另一个终端中) 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动前端开发服务
npm run dev
```
前端应用将默认运行在 `http://localhost:5173` 或其他可用端口。打开浏览器访问该地址即可开始使用！

## ⚙️ 配置

本项目通过环境变量进行安全配置。所有敏感信息都存储在后端的 `.env` 文件中，该文件已被 `.gitignore` 排除，不会上传到版本库。

-   `SECRET_TOKEN`: 访问后台管理页面的秘密令牌（“暗号”）。请务必设置为一个难以猜测的复杂字符串。

## 📝 API 端点 (简要)

-   `GET /api/materials`: 获取素材列表，支持 `?search=` 和 `?tag=` 查询。
-   `GET /api/tags`: 获取所有唯一的标签列表。
-   `POST /api/materials`: 上传新素材（受令牌保护）。
-   `PUT /api/materials/:id`: 更新指定ID的素材信息（受令牌保护）。
-   `DELETE /api/materials/:id`: 删除指定ID的素材（受令牌保护）。

## 🔮 未来规划

-   [ ] **用户系统**: 引入完整的用户认证和多角色权限管理。
-   [ ] **分页加载**: 当素材量巨大时，实现后端分页，优化性能。
-   [ ] **云存储**: 支持将文件上传到 AWS S3, 阿里云 OSS 等对象存储服务。
-   [ ] **数据备份**: 增加一键备份 SQLite 数据库和上传文件的功能。

---

感谢您使用 Material Hub！