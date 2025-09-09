# API服务层使用指南

## 概述

为了更好地管理项目中的API调用，我们将所有API请求统一封装在 `apiService.js` 中。这样做的好处包括：

- 🔧 **统一管理**: 所有API调用集中在一个文件中
- 🔄 **易于维护**: 修改API路径或参数只需在一处修改
- 📝 **代码复用**: 避免在多个组件中重复写相同的API调用
- 🛡️ **类型安全**: 统一的参数格式和错误处理

## 使用方法

### 1. 导入API服务

```javascript
// 导入整个API服务
import apiService from '@/services/apiService.js';

// 或者按需导入特定模块
import { materialAPI, feedbackAPI } from '@/services/apiService.js';
```

### 2. 在组件中使用

#### 原来的写法 ❌
```javascript
// 在组件中直接调用
const response = await apiClient.get('/api/materials', {
  params: { search: searchTerm.value, page: 1, limit: 20 }
});
```

#### 现在的写法 ✅
```javascript
// 使用API服务
const response = await apiService.material.getMaterials({
  search: searchTerm.value,
  page: 1,
  limit: 20
});
```

## API模块说明

### 🔐 认证模块 (authAPI)
- `validateToken(token)` - 验证登录令牌

### 📁 素材模块 (materialAPI)
- `getMaterials(params)` - 获取素材列表
- `uploadMaterial(formData, onUploadProgress)` - 上传素材
- `updateMaterial(id, data, token)` - 更新素材
- `deleteMaterial(id, token)` - 删除素材

### 🏷️ 标签模块 (tagAPI)
- `getTags()` - 获取所有标签

### 💬 留言模块 (feedbackAPI)
- `submitFeedback(message, userId)` - 提交留言
- `getAllFeedbacks(token)` - 获取所有留言
- `getUserFeedbacks(userId)` - 获取用户留言
- `getPendingFeedbacksCount(token)` - 获取未处理留言数量
- `updateFeedbackStatus(id, status, token)` - 更新留言状态
- `deleteFeedback(id, token)` - 删除留言

### 📊 统计模块 (statsAPI)
- `getOnlineStats()` - 获取在线用户数
- `getPageStats()` - 获取页面访问统计
- `getTrendStats(range)` - 获取访问趋势

### 🛠️ 工具函数 (apiUtils)
- `getAuthToken()` - 获取认证令牌
- `setAuthToken(token)` - 设置认证令牌
- `clearAuthToken()` - 清除认证令牌
- `isAuthenticated()` - 检查是否已认证

## 实际使用示例

### Gallery.vue 中的留言提交
```javascript
import { feedbackAPI } from '@/services/apiService.js';

const submitFeedback = async () => {
  try {
    await feedbackAPI.submitFeedback(feedbackMessage.value, userId);
    toast.success('留言成功，感谢您的反馈！');
  } catch (error) {
    toast.error('提交留言失败，请稍后再试。');
  }
};
```

### MaterialManagement.vue 中的素材管理
```javascript
import { materialAPI, apiUtils } from '@/services/apiService.js';

const updateMaterial = async () => {
  try {
    const token = apiUtils.getAuthToken();
    await materialAPI.updateMaterial(
      editingMaterial.value.id,
      {
        name: editingMaterial.value.name,
        tags: editingMaterial.value.tags
      },
      token
    );
    toast.success('素材更新成功');
  } catch (error) {
    toast.error('更新失败');
  }
};
```

### Statistics.vue 中的统计数据
```javascript
import { statsAPI } from '@/services/apiService.js';

const fetchStats = async () => {
  try {
    const [onlineData, pageData, trendData] = await Promise.all([
      statsAPI.getOnlineStats(),
      statsAPI.getPageStats(),
      statsAPI.getTrendStats('7d')
    ]);
    // 处理数据...
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};
```

## 迁移指南

如果你想将现有组件迁移到使用API服务层，请按以下步骤：

1. **导入API服务**
   ```javascript
   import apiService from '@/services/apiService.js';
   ```

2. **替换API调用**
   - 找到组件中的 `apiClient.get/post/put/delete` 调用
   - 替换为对应的API服务方法

3. **简化认证处理**
   - 使用 `apiUtils.getAuthToken()` 获取令牌
   - 使用 `apiUtils.isAuthenticated()` 检查认证状态

4. **测试功能**
   - 确保所有功能正常工作
   - 检查错误处理是否正确

## 注意事项

- 📌 所有API路径都已包含 `/api` 前缀
- 🔒 需要认证的接口会自动处理Authorization头
- ⚡ 支持上传进度回调
- 🎯 统一的错误处理机制

使用API服务层可以让你的代码更加整洁和易于维护！