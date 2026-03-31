# OSS 费用优化方案

> 文档创建时间：2026-04-01
> 状态：已完成基础优化 + 跨域修复

## 问题背景

项目使用阿里云 OSS 存储媒体文件（图片、视频），GET 请求次数较多导致费用偏高。

## 已完成的优化

### 1. 缓存头配置

**文件**: `backend/services/MaterialService.js`

```javascript
// 上传时设置缓存头
const uploadOptions = {
  headers: {
    'Content-Type': file.mimetype,
    'Content-Disposition': 'inline',
    'Cache-Control': 'public, max-age=2592000' // 30天缓存
  }
};
```

**效果**: 浏览器会缓存这些文件 30 天，重复访问不产生 OSS 请求。

### 2. 代理缓存配置

**文件**: `backend/routes/proxyRoutes.js`

- `/api/proxy/media` 添加默认 30 天缓存头
- `/api/proxy/download` 添加缓存头

### 3. 缩略图自动生成

**文件**: `backend/services/MaterialService.js`

新增 `generateThumbnailUrl()` 方法，自动为图片生成缩略图 URL：

```javascript
// 原图 URL
https://material-hub-assets.oss-cn-guangzhou.aliyuncs.com/image.jpg

// 缩略图 URL (自动添加)
https://material-hub-assets.oss-cn-guangzhou.aliyuncs.com/image.jpg?x-oss-process=image/resize,m_fill,w_300,quality,q_80
```

- 宽度: 300px
- 模式: m_fill (固定宽高，自动裁剪)
- 质量: 80%

**效果**:
- 列表页展示缩略图 (~30KB) 而非原图 (2-5MB)
- 流量节省约 **98%**
- 缩略图是按需生成，不占用额外存储

### 4. 跨域问题修复（2026-04-01）

**问题**: OSS 图片 URL 直接在前端使用时会被浏览器 CORS 策略阻止，导致：
- 缩略图无法显示
- 点击图片无法放大

**解决方案**: 
1. 缩略图通过后端代理 `/api/proxy/media` 访问
2. 灯箱预览（lightbox）的图片也通过代理访问

**修改文件**:
- `backend/services/MaterialService.js` - `generateThumbnailUrl()` 返回代理 URL
- `frontend/src/views/Gallery.vue` - `imageSources` computed 属性对跨域 URL 进行代理转换

## 费用节省预估

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 每日 GET 请求 | ~20000 | 首日20000，后续接近0 |
| 单张图片流量 | 2-5MB | ~30KB |
| 月度流量 | 高 | 降低 90%+ |

## 待完成优化（后续任务）

### 优先级：高

1. **CDN 加速**
   - 配置阿里云 CDN 回源到 OSS
   - 进一步减少回源请求
   - 全球节点加速访问速度

2. **本地缓存/代理方案**
   - 部署 Redis 缓存热门资源
   - 使用 Nginx 缓存静态资源
   - 实现 "首次访问从 OSS，后续从缓存" 的策略

### 优先级：中

3. **图片格式优化**
   - 上传时自动转换为 WebP 格式
   - 根据客户端支持情况返回最优格式

4. **视频分片加载**
   - 使用 HLS/DASH 协议
   - 只加载用户观看的部分

## 配置检查

运行以下命令验证优化生效：

```bash
# 启动后端
cd backend && node server.js

# 测试 API
curl "http://localhost:3002/api/v1/materials?limit=2"

# 验证返回的 thumbnail_url 包含缩略图参数
```

## 相关文件

- `backend/services/MaterialService.js` - 素材业务逻辑
- `backend/routes/proxyRoutes.js` - 代理路由
- `backend/config/server.js` - OSS 配置
- `backend/.env` - 环境变量（包含 OSS 凭证）

## 注意事项

1. **缩略图按需生成**：OSS 会为每个缩略图请求计算费用，但比原图请求便宜很多
2. **缓存一致性**：如果更新了 OSS 中的原图，缓存可能返回旧图，需要通过 URL 参数或手动清除缓存
3. **CDN 费用**：引入 CDN 会有额外费用，需要评估性价比
