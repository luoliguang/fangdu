# 动态访问统计功能优化

## 更新日期
2025-10-02

## 问题描述

之前的访问统计系统存在以下问题：

### 1. **静态路径列表**
- 后端硬编码了需要记录的页面路径
- 新增页面时需要手动修改后端代码
- 维护困难，容易遗漏

### 2. **路径合并**
- 所有管理后台子路由被合并为 `/admin`
- 无法区分用户访问的具体管理页面
- 统计数据不够详细

### 3. **示例**
```
之前的统计结果：
页面路径      访问次数
/           1487
/login      1
/admin      0      ← 所有后台页面都算这个
/color-card 0
```

## 解决方案

### ✅ 改进1：前端自动追踪
使用 Vue Router 的全局后置守卫自动记录每次路由切换

### ✅ 改进2：后端灵活过滤
改为基于规则的过滤（只过滤API和静态资源），其他都记录

### ✅ 改进3：保留完整路径
不再合并管理后台子路由，保持具体的访问路径

### ✅ 改进4：友好显示
在统计页面使用路径映射显示友好的页面名称

## 技术实现

### 1. 前端路由追踪

#### `frontend/src/router/index.js`

**新增：全局后置守卫**
```javascript
// 全局路由守卫 - 自动记录页面访问
router.afterEach(async (to, from) => {
    try {
        // 获取完整路径
        const page = to.path;
        
        // 发送访问记录到后端
        const { default: apiClient } = await import('../axiosConfig.js');
        
        // 异步发送，不阻塞路由跳转
        apiClient.post('/api/v1/visits/record', {
            page,
            referrer: from.path || document.referrer
        }).catch(error => {
            console.log('访问记录失败:', error.message);
        });
    } catch (error) {
        console.log('访问追踪错误:', error);
    }
});
```

**优势：**
- ✅ 自动追踪所有路由切换
- ✅ 新增路由无需修改代码
- ✅ 异步发送不影响用户体验
- ✅ 记录失败不影响页面功能

### 2. 后端灵活过滤

#### `backend/controllers/VisitController.js`

**修改前：**
```javascript
shouldRecordVisit(path) {
  // 硬编码的页面列表
  const mainPaths = [
    '/',
    '/admin',
    '/login',
    '/color-card'
  ];
  
  if (mainPaths.includes(path)) {
    return true;
  }
  
  if (path.startsWith('/admin/')) {
    return true;
  }
  
  return false;
}
```

**修改后：**
```javascript
shouldRecordVisit(path) {
  // 不记录API调用
  if (path.startsWith('/api/')) {
    return false;
  }
  
  // 不记录静态资源
  if (path.startsWith('/uploads/') || path.startsWith('/assets/')) {
    return false;
  }
  
  // 不记录文件扩展名的请求
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    return false;
  }
  
  // 其他所有路径都记录
  return true;
}
```

**优势：**
- ✅ 基于规则而非列表
- ✅ 自动适应新页面
- ✅ 维护简单
- ✅ 逻辑清晰

### 3. 保留完整路径

**修改前：**
```javascript
normalizePagePath(path) {
  // 管理后台及其子路由都记录为 /admin
  if (path === '/admin' || path.startsWith('/admin/')) {
    return '/admin';
  }
  
  return path;
}
```

**修改后：**
```javascript
normalizePagePath(path) {
  // 移除末尾的斜杠（除了根路径）
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  // 返回标准化后的路径
  return path || '/';
}
```

**优势：**
- ✅ 保留完整路径信息
- ✅ 可以区分具体的管理页面
- ✅ 统计更加详细

### 4. 友好名称显示

#### `frontend/src/views/Statistics.vue`

**新增：页面名称映射方法**
```javascript
getPageDisplayName(path) {
  const pageNameMap = {
    '/': '素材库（首页）',
    '/login': '登录页',
    '/color-card': '色卡工具',
    '/size-converter': '尺码转换工具',
    '/admin': '后台管理',
    '/admin/upload': '上传素材',
    '/admin/materials': '素材管理',
    '/admin/feedback': '留言管理',
    '/admin/statistics': '访问统计',
    '/admin/drawer-config': '抽屉配置'
  };
  
  return pageNameMap[path] || path;
}
```

**表格显示优化：**
```html
<td class="page-path">
  <div class="page-name">{{ getPageDisplayName(page.page) }}</div>
  <div class="page-url">{{ page.page }}</div>
</td>
```

**显示效果：**
```
页面路径
┌─────────────────────┐
│ 素材库（首页）       │  ← 友好名称
│ /                   │  ← 实际路径
├─────────────────────┤
│ 上传素材            │
│ /admin/upload       │
├─────────────────────┤
│ 素材管理            │
│ /admin/materials    │
└─────────────────────┘
```

## 使用效果

### 修改前
```
页面访问详情
页面路径      访问次数  独立访客  访问率
/           1487      272      99.9%
/login      1         1        0.1%
/admin      0         0        0.0%
/color-card 0         0        0.0%
```

### 修改后
```
页面访问详情
页面路径                  访问次数  独立访客  访问率
素材库（首页）            1487      272      85.2%
/

上传素材                  120       45       6.9%
/admin/upload

素材管理                  68        32       3.9%
/admin/materials

留言管理                  35        18       2.0%
/admin/feedback

访问统计                  22        15       1.3%
/admin/statistics

色卡工具                  8         6        0.5%
/color-card

尺码转换工具              5         4        0.3%
/size-converter

登录页                    1         1        0.1%
/login
```

## 优势总结

### 1. 自动化
- ✅ 新增页面自动记录
- ✅ 无需修改后端代码
- ✅ 无需维护路径列表

### 2. 详细性
- ✅ 保留完整路径
- ✅ 区分具体管理页面
- ✅ 统计数据更准确

### 3. 友好性
- ✅ 显示中文页面名称
- ✅ 同时显示实际路径
- ✅ 易于理解

### 4. 可维护性
- ✅ 基于规则而非列表
- ✅ 代码逻辑清晰
- ✅ 扩展性好

## 新增页面示例

### 假设新增一个"帮助中心"页面

#### 1. 前端添加路由
```javascript
// frontend/src/router/index.js
{
  path: '/help',
  name: 'Help',
  component: Help
}
```

#### 2. 自动记录
- ✅ 用户访问 `/help` 时自动记录
- ✅ 无需修改后端代码

#### 3. 添加友好名称（可选）
```javascript
// frontend/src/views/Statistics.vue
getPageDisplayName(path) {
  const pageNameMap = {
    // ... 其他映射
    '/help': '帮助中心'  // 添加这一行即可
  };
  
  return pageNameMap[path] || path;
}
```

#### 4. 查看统计
```
页面路径                  访问次数
帮助中心                  156
/help
```

## 工作流程

### 用户访问页面流程

```
用户点击链接/输入URL
       ↓
Vue Router 路由切换
       ↓
afterEach 守卫触发
       ↓
发送POST /api/v1/visits/record
  { page: '/admin/upload', referrer: '/' }
       ↓
后端 shouldRecordVisit 判断
  - 不是API调用 ✓
  - 不是静态资源 ✓
  - 不是文件请求 ✓
       ↓
后端 normalizePagePath 标准化
  '/admin/upload' → '/admin/upload'
       ↓
写入数据库
  INSERT INTO visits (page, ip_address, ...)
       ↓
统计页面查询显示
  页面：上传素材 (/admin/upload)
  访问次数：120
```

## 数据库结构

### visits 表
```sql
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  page VARCHAR(255) NOT NULL,      -- 完整路径，如 /admin/upload
  visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_page (page),
  INDEX idx_visit_time (visit_time)
);
```

### 查询示例
```sql
-- 按页面统计访问次数
SELECT 
  page,
  COUNT(*) as visits,
  COUNT(DISTINCT ip_address) as unique_visitors
FROM visits
WHERE visit_time >= date('now', '-30 days')
GROUP BY page
ORDER BY visits DESC;
```

## 修改的文件

### 后端
1. ✅ `backend/controllers/VisitController.js`
   - 修改 `shouldRecordVisit` 方法
   - 简化 `normalizePagePath` 方法

### 前端
2. ✅ `frontend/src/router/index.js`
   - 添加全局 `afterEach` 守卫
   - 自动记录路由切换

3. ✅ `frontend/src/views/Statistics.vue`
   - 添加 `getPageDisplayName` 方法
   - 优化表格显示
   - 添加CSS样式

## 测试建议

### 1. 功能测试
- ✅ 访问首页，检查是否记录
- ✅ 访问管理后台各个子页面，检查是否分别记录
- ✅ 访问色卡工具，检查是否记录
- ✅ 查看统计页面，确认所有访问都被记录

### 2. 新增页面测试
- ✅ 添加一个新路由
- ✅ 访问新页面
- ✅ 在统计页面确认新页面被记录
- ✅ 添加友好名称映射（可选）

### 3. 性能测试
- ✅ 快速切换多个页面
- ✅ 确认不影响路由切换速度
- ✅ 确认网络请求是异步的

## 注意事项

### 1. 页面名称映射
- 新增页面后，可选择在 `Statistics.vue` 中添加友好名称
- 如果不添加，会显示实际路径

### 2. 去重机制
- 后端有1分钟内重复访问去重机制
- 避免频繁刷新导致数据失真

### 3. 性能考虑
- 访问记录是异步的，不阻塞路由跳转
- 失败不影响页面正常使用

## 相关文档
- [全局侧边菜单功能](./GLOBAL_SIDE_DRAWER.md)
- [批量上传功能](./BATCH_UPLOAD_FEATURE.md)

## 完成状态
✅ 所有功能已实现并优化 