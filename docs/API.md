# API 文档

## 概述

房屋租赁管理系统后端API提供了用户认证、素材管理、反馈管理等功能。

### 基础信息

- **基础URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": []
  }
}
```

### 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 认证接口

### 用户登录

**POST** `/auth/login`

#### 请求参数

```json
{
  "token": "string" // 用户token
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  },
  "message": "登录成功"
}
```

### 用户登出

**POST** `/auth/logout`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "message": "登出成功"
}
```

### 获取用户信息

**GET** `/auth/me`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 素材管理接口

### 获取素材列表

**GET** `/materials`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| search | string | 否 | 搜索关键词 |
| tag | string | 否 | 标签筛选 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "id": 1,
        "title": "素材标题",
        "description": "素材描述",
        "imageUrl": "https://example.com/image.jpg",
        "tags": ["标签1", "标签2"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

### 获取单个素材

**GET** `/materials/:id`

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 素材ID |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "素材标题",
    "description": "素材描述",
    "imageUrl": "https://example.com/image.jpg",
    "tags": ["标签1", "标签2"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 上传素材

**POST** `/materials/upload`

#### 请求头
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件 |
| title | string | 是 | 素材标题 |
| description | string | 否 | 素材描述 |
| tags | string | 否 | 标签，逗号分隔 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "素材标题",
    "description": "素材描述",
    "imageUrl": "https://example.com/image.jpg",
    "tags": ["标签1", "标签2"]
  },
  "message": "上传成功"
}
```

### 删除素材

**DELETE** `/materials/:id`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 素材ID |

#### 响应示例

```json
{
  "success": true,
  "message": "删除成功"
}
```

## 反馈管理接口

### 提交反馈

**POST** `/feedback`

#### 请求参数

```json
{
  "materialId": 1,
  "userId": "example_user_id",
  "message": "反馈内容"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "materialId": 1,
    "userId": "example_user_id",
    "message": "反馈内容",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "反馈提交成功"
}
```

### 获取反馈列表

**GET** `/feedback`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| materialId | number | 否 | 素材ID筛选 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": 1,
        "materialId": 1,
        "userId": "example_user_id",
        "message": "反馈内容",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| VALIDATION_ERROR | 请求参数验证失败 |
| AUTHENTICATION_ERROR | 身份验证失败 |
| AUTHORIZATION_ERROR | 权限不足 |
| NOT_FOUND_ERROR | 资源不存在 |
| CONFLICT_ERROR | 资源冲突 |
| RATE_LIMIT_ERROR | 请求过于频繁 |
| INTERNAL_ERROR | 服务器内部错误 |

## 使用示例

### JavaScript (Axios)

```javascript
import axios from 'axios'

// 创建API实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
})

// 添加请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 登录
const login = async (token) => {
  try {
    const response = await api.post('/auth/login', { token })
    return response.data
  } catch (error) {
    console.error('登录失败:', error.response.data)
    throw error
  }
}

// 获取素材列表
const getMaterials = async (params = {}) => {
  try {
    const response = await api.get('/materials', { params })
    return response.data
  } catch (error) {
    console.error('获取素材失败:', error.response.data)
    throw error
  }
}

// 上传素材
const uploadMaterial = async (formData) => {
  try {
    const response = await api.post('/materials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    console.error('上传失败:', error.response.data)
    throw error
  }
}
```

### cURL 示例

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'

# 获取素材列表
curl -X GET "http://localhost:3000/api/materials?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"

# 上传素材
curl -X POST http://localhost:3000/api/materials/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@/path/to/image.jpg" \
  -F "title=素材标题" \
  -F "description=素材描述"
```

## 版本更新

### v1.0.0 (2024-01-01)
- 初始版本发布
- 实现用户认证功能
- 实现素材管理功能
- 实现反馈管理功能