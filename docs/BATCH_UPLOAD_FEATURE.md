# 批量上传功能说明

## 修改日期
2025-10-02

## 功能概述

新增了批量上传功能，支持一次性上传多个图片/视频文件，大大提高了素材管理的效率。

## 功能特点

### ✅ 双模式上传
- **单个上传**：传统的单文件上传模式，需要填写素材名称和标签
- **批量上传**：一次性上传多个文件，所有文件共享相同的标签，文件名自动作为素材名称

### ✅ 用户友好
- 支持拖拽上传
- 实时文件列表预览
- 文件大小显示
- 单独移除文件
- 批量清空文件
- 上传进度提示

### ✅ 技术特性
- 最多同时上传20个文件
- 每个文件最大50MB
- 支持图片和视频格式
- 并发上传控制
- 详细的成功/失败反馈

## 修改的文件

### 后端文件

#### 1. `backend/controllers/MaterialController.js`

**修改Multer配置**
```javascript
// 添加文件数量限制
limits: {
  fileSize: this.parseFileSize(serverConf.upload.maxFileSize),
  files: 20 // 最多同时上传20个文件
}
```

**新增批量上传方法**
```javascript
async uploadMaterialsBatch(req, res) {
  // 处理多个文件
  const files = req.files;
  const { tags } = req.body;
  
  // 逐个上传并记录结果
  const results = { success: [], failed: [] };
  
  // 返回详细结果
  res.status(200).json({
    success: true,
    data: {
      total: files.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    }
  });
}
```

#### 2. `backend/routes/materialRoutes.js`

**新增批量上传路由**
```javascript
// 批量上传素材
router.post('/batch/upload',
  materialController.upload.array('files', 20), // 最多20个文件
  materialController.uploadMaterialsBatch.bind(materialController)
);
```

### 前端文件

#### 3. `frontend/src/stores/material.js`

**新增批量上传方法**
```javascript
const uploadMaterialsBatch = async (formData, onUploadProgress) => {
  const response = await apiClient.post('/api/v1/materials/batch/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    },
    onUploadProgress
  });
  
  const result = response.data;
  if (result.success) {
    toast.success(result.message);
    await refresh();
  }
  return result;
}
```

#### 4. `frontend/src/views/UploadMaterial.vue`

**完整重写，添加：**
- 上传模式切换（单个/批量）
- 批量文件选择和预览
- 文件列表管理
- 批量上传表单
- 响应式UI组件

## 使用方法

### 单个上传（原有功能）

1. 点击"单个上传"按钮
2. 填写素材名称
3. 填写标签（用逗号分隔）
4. 选择或拖拽一个文件
5. 点击"上传素材"按钮

### 批量上传（新功能）

1. 点击"批量上传"按钮
2. 填写标签（所有文件共享，用逗号分隔）
3. 选择或拖拽多个文件（最多20个）
4. 查看文件列表，可以移除不需要的文件
5. 点击"批量上传"按钮

**文件命名规则：**
- 批量上传时，文件名（去除扩展名）会自动作为素材名称
- 例如：`产品图1.jpg` → 素材名称：`产品图1`

## 界面展示

### 模式切换
```
┌────────────────────────────────┐
│  [单个上传] [批量上传]          │
└────────────────────────────────┘
```

### 批量上传表单
```
┌────────────────────────────────┐
│ 标签: [面料,夏季,新款_______]  │
│                                │
│  ┌──────────────────────────┐  │
│  │  📁                      │  │
│  │  拖放多个文件到这里或     │  │
│  │  [选择多个文件]          │  │
│  │  最多可同时上传20个文件   │  │
│  └──────────────────────────┘  │
│                                │
│  已选择 3 个文件  [清空所有]   │
│  ┌──────────────────────────┐  │
│  │ 🖼️ 图片1.jpg  2.5 MB  [×]│  │
│  │ 🎬 视频1.mp4  45.2 MB [×]│  │
│  │ 🖼️ 图片2.png  1.8 MB  [×]│  │
│  └──────────────────────────┘  │
│                                │
│  [批量上传 (3 个文件)]         │
└────────────────────────────────┘
```

## API接口

### 批量上传接口

**请求：**
```
POST /api/v1/materials/batch/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- files: [File, File, File, ...]  // 文件数组
- tags: "面料,夏季,新款"            // 共享标签
```

**响应：**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successCount": 2,
    "failedCount": 1,
    "results": {
      "success": [
        {
          "name": "图片1.jpg",
          "message": "上传成功",
          "data": { /* 素材数据 */ }
        },
        {
          "name": "图片2.png",
          "message": "上传成功",
          "data": { /* 素材数据 */ }
        }
      ],
      "failed": [
        {
          "name": "视频1.mp4",
          "message": "文件大小超过限制"
        }
      ]
    }
  },
  "message": "成功上传 2 个文件，失败 1 个"
}
```

## 限制说明

### 文件数量
- 单次最多上传：**20个文件**
- 可多次批量上传

### 文件大小
- 单个文件最大：**50MB**
- 如果某个文件超限，会单独标记为失败，不影响其他文件

### 支持格式
- **图片**：JPEG, PNG, GIF, WebP, SVG
- **视频**：MP4, AVI, MOV

## 错误处理

### 1. 部分文件上传失败
系统会显示详细的成功/失败信息：
- 成功的文件会正常保存
- 失败的文件会单独提示错误原因
- 页面会显示：`成功上传 2 个文件，失败 1 个`

### 2. 全部文件上传失败
显示错误消息，提示用户检查：
- 文件大小是否超限
- 文件格式是否支持
- 网络连接是否正常

### 3. 常见错误
| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| 文件大小超过限制 | 文件>50MB | 压缩文件或分批上传 |
| 不支持的文件类型 | 格式不在允许列表 | 转换文件格式 |
| 请选择至少一个文件 | 未选择文件 | 添加文件后再上传 |
| 标签不能为空 | 未填写标签 | 填写标签信息 |
| 上传失败 | 网络/服务器问题 | 重试或联系管理员 |

## 性能优化

### 1. 串行上传
批量上传采用串行方式（逐个上传），避免：
- 服务器负载过高
- 内存溢出
- OSS并发限制

### 2. 进度反馈
显示整体上传进度，让用户了解上传状态

### 3. 文件预览
上传前显示文件列表，让用户确认：
- 文件名称
- 文件大小
- 文件类型

## 未来优化建议

### 1. 并行上传
实现多文件并行上传，提高速度：
- 控制并发数量（如3-5个）
- 避免服务器过载

### 2. 断点续传
支持大文件断点续传：
- 文件分片上传
- 保存上传进度
- 网络中断后可继续

### 3. 预处理
上传前的文件处理：
- 图片压缩
- 视频转码
- 格式转换

### 4. 拖拽优化
改进拖拽体验：
- 拖拽区域高亮
- 拖拽动画效果
- 拖拽排序

### 5. 元数据编辑
批量上传时支持：
- 为每个文件单独设置名称
- 为不同文件设置不同标签
- 批量编辑元数据

## 测试建议

### 1. 基础功能测试
- ✅ 单个文件上传
- ✅ 多个文件批量上传
- ✅ 拖拽上传
- ✅ 文件移除
- ✅ 切换上传模式

### 2. 边界测试
- ✅ 上传1个文件
- ✅ 上传20个文件
- ❌ 上传21个文件（应显示错误）
- ✅ 上传49MB文件
- ❌ 上传51MB文件（应显示错误）

### 3. 异常测试
- ✅ 网络中断后重试
- ✅ 部分文件失败的处理
- ✅ 全部文件失败的提示
- ✅ 不支持的文件格式

### 4. 用户体验测试
- ✅ 上传进度显示
- ✅ 成功/失败提示
- ✅ 响应式布局（移动端）
- ✅ 操作便捷性

## 相关文档
- [文件上传大小限制修改](./UPLOAD_SIZE_LIMIT.md)
- [视频封面修复文档](./VIDEO_POSTER_FIX.md)
- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)

## 修复完成
✅ 所有功能已实现并测试通过 