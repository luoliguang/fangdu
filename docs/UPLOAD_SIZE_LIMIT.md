# 文件上传大小限制修改说明

## 修改日期
2025-10-02

## 修改内容

将视频/图片上传大小限制从 **10MB** 提升到 **50MB**。

## 修改的文件

### 1. 后端配置文件

#### ✅ `backend/config/server.js`
```javascript
// 修改前
maxFileSize: process.env.MAX_FILE_SIZE || '10MB',

// 修改后
maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
```

同时添加了更多支持的视频格式：
- `video/quicktime` - MOV格式
- `video/x-msvideo` - AVI格式

#### ✅ `backend/controllers/MaterialController.js`
```javascript
// parseFileSize 方法的默认值
// 修改前
return 10 * 1024 * 1024; // 默认10MB

// 修改后
return 50 * 1024 * 1024; // 默认50MB
```

#### ✅ `backend/env.example`
```bash
# 修改前
MAX_FILE_SIZE=10485760  # 10MB

# 修改后
MAX_FILE_SIZE=52428800  # 50MB
```

#### ✅ `backend/.env`（实际环境配置文件）
```bash
# 已修改
MAX_FILE_SIZE=52428800  # 50MB（字节）
```

### 2. 前端配置文件

#### ✅ `frontend/src/config/env.js`
```javascript
// 修改前
upload: {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}

// 修改后
upload: {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/avi', 'video/quicktime'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov']
}
```

## 文件大小对照表

| 大小 | 字节数 | 说明 |
|------|--------|------|
| 10MB | 10485760 | 原限制 |
| 20MB | 20971520 | - |
| 50MB | 52428800 | **新限制** |
| 100MB | 104857600 | - |

## 支持的文件类型

### 图片格式
- ✅ JPEG/JPG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ GIF (`.gif`)
- ✅ WebP (`.webp`)
- ✅ SVG (`.svg`)

### 视频格式
- ✅ MP4 (`.mp4`)
- ✅ AVI (`.avi`)
- ✅ MOV (`.mov`) - QuickTime格式

## 应用更改

### 后端服务器
修改完成后需要**重启后端服务器**：

```bash
# 停止当前运行的服务器（Ctrl+C）
# 然后重新启动
cd backend
node server.js
```

### 前端应用
如果前端正在运行，建议**刷新浏览器**或**重启开发服务器**：

```bash
# 停止当前运行的服务器（Ctrl+C）
# 然后重新启动
cd frontend
npm run dev
```

## 验证方法

### 1. 检查后端配置
启动后端服务器，查看控制台输出的配置信息。

### 2. 测试上传
1. 准备一个20-50MB的视频文件
2. 在前端上传页面尝试上传
3. 应该能够成功上传

### 3. 测试边界值
- ✅ 49MB 文件 - 应该成功
- ✅ 50MB 文件 - 应该成功
- ❌ 51MB 文件 - 应该被拒绝

## 注意事项

### 服务器资源
- 上传大文件会占用更多内存和带宽
- 确保服务器有足够的内存处理大文件上传

### OSS存储
- 阿里云OSS按存储空间和流量计费
- 50MB视频会增加存储成本和流量费用
- 建议定期清理不需要的大文件

### 网络环境
- 大文件上传可能需要更长时间
- 建议在上传页面添加进度提示
- 网络不稳定可能导致上传失败

### 超时设置
如果上传大文件时出现超时，可能需要调整：

**前端（如果使用axios）：**
```javascript
// axiosConfig.js
timeout: 300000 // 5分钟
```

**后端（Express）：**
```javascript
// server.js
server.setTimeout(300000); // 5分钟
```

### Nginx配置（如果使用）
如果前面有Nginx代理，需要修改：

```nginx
# nginx.conf
client_max_body_size 50M;
client_body_timeout 300s;
```

## 未来优化建议

### 1. 分片上传
对于超大文件（>50MB），建议实施分片上传：
- 将大文件切分成多个小块
- 分别上传每个块
- 服务器端合并
- 支持断点续传

### 2. 压缩优化
- 前端上传前压缩视频
- 使用FFmpeg转码为更小的格式
- 降低视频分辨率和比特率

### 3. CDN加速
- 使用OSS的CDN加速服务
- 减少下载流量费用
- 提升访问速度

## 故障排查

### 问题：上传还是失败
1. **检查浏览器控制台** - 查看具体错误信息
2. **检查后端日志** - 查看服务器端错误
3. **验证.env文件** - 确认MAX_FILE_SIZE已修改
4. **重启服务器** - 确保配置已加载

### 问题：上传很慢
1. **检查网络速度** - 可能是网络问题
2. **检查服务器带宽** - 云服务器可能有带宽限制
3. **考虑使用OSS直传** - 前端直接上传到OSS

### 问题：内存溢出
如果上传导致服务器内存不足：
1. 增加服务器内存
2. 使用流式上传（stream）
3. 实施文件大小限制
4. 使用OSS直传避免文件经过服务器

## 相关文档
- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)
- [Multer文档](https://github.com/expressjs/multer)
- [视频封面修复文档](./VIDEO_POSTER_FIX.md) 