# 全局侧边菜单功能说明

## 更新日期
2025-10-02

## 更新内容

将左侧抽屉菜单（SideDrawer）从仅在素材库页面显示改为**全局显示**，使其在所有页面都可以访问。

## 功能概述

### ✅ 全局访问
- 左侧抽屉菜单现在在所有页面都可以通过左侧触发按钮打开
- 包括：素材库、色卡、尺码工具、后台管理等所有页面

### ✅ 保留功能
- 所有原有功能完整保留：
  - 📢 公告
  - 📚 教程
  - 🔍 筛选（仅在素材库页面有效）
  - ❤️ 收藏（全局共享）
  - 💬 反馈

### ✅ 智能适配
- 筛选功能：仅在素材库页面有效
- 收藏功能：全局共享，在任何页面都可查看
- 反馈功能：在任何页面都可以提交反馈

## 技术实现

### 1. 组件位置变更

**之前：**
```vue
<!-- Gallery.vue -->
<template>
  <SideDrawer ... />
  <!-- 页面内容 -->
</template>
```

**现在：**
```vue
<!-- App.vue (根组件) -->
<template>
  <div id="app">
    <SideDrawer ... /> <!-- 全局显示 -->
    <nav>...</nav>
    <main>
      <router-view />
    </main>
  </div>
</template>
```

### 2. 状态管理

使用 Vue 3 的 `provide/inject` API 实现跨组件通信：

#### App.vue (Provider)
```javascript
import { ref, provide } from 'vue';

// 全局收藏夹状态
const favorites = ref([]);

// 提供给子组件
provide('appFavorites', {
  favorites,
  addToFavorites
});

// Gallery页面特定功能的回调
const galleryCallbacks = ref({
  handleQuickFilter: null,
  handleShowMedia: null,
  handleRemoveFromFavorites: null
});

provide('galleryCallbacks', galleryCallbacks);
```

#### Gallery.vue (Injector)
```javascript
import { inject, onMounted, onUnmounted } from 'vue';

// 注入全局状态
const appFavorites = inject('appFavorites');
const favorites = appFavorites.favorites;

// 注入回调引用
const galleryCallbacks = inject('galleryCallbacks');

// 注册页面特定的处理函数
onMounted(() => {
  galleryCallbacks.value.handleQuickFilter = handleQuickFilter;
  galleryCallbacks.value.handleShowMedia = showMedia;
  galleryCallbacks.value.handleRemoveFromFavorites = removeFromFavorites;
});

// 清除回调引用
onUnmounted(() => {
  galleryCallbacks.value.handleQuickFilter = null;
  galleryCallbacks.value.handleShowMedia = null;
  galleryCallbacks.value.handleRemoveFromFavorites = null;
});
```

### 3. 功能适配

#### 全局功能（所有页面可用）
- **公告**：查看系统公告
- **教程**：查看使用教程
- **收藏**：查看和管理收藏的素材
- **反馈**：提交用户反馈

#### 页面特定功能（仅特定页面有效）
- **筛选**：仅在素材库页面有效，切换到其他页面时功能不可用

### 4. 回调机制

通过回调引用实现页面特定功能：

```javascript
// App.vue 中的处理方法
const handleQuickFilter = (filterValue) => {
  if (galleryCallbacks.value.handleQuickFilter) {
    // 如果在Gallery页面，调用Gallery的处理方法
    galleryCallbacks.value.handleQuickFilter(filterValue);
  } else {
    // 其他页面，不执行或显示提示
    console.log('快速筛选仅在素材库页面有效');
  }
};
```

## 修改的文件

### 1. `frontend/src/App.vue`

**新增：**
- 导入 `SideDrawer` 组件
- 添加全局状态：`favorites`、`galleryCallbacks`
- 添加处理方法：`handleFeedbackSubmit`、`handleQuickFilter`、`handleShowMedia`、`handleRemoveFromFavorites`
- 使用 `provide` 提供全局状态和回调引用
- 在模板中添加 `<SideDrawer>` 组件

**关键代码：**
```vue
<script setup>
import { ref, provide } from 'vue';
import SideDrawer from './components/SideDrawer.vue';

const favorites = ref([]);
const galleryCallbacks = ref({
  handleQuickFilter: null,
  handleShowMedia: null,
  handleRemoveFromFavorites: null
});

provide('appFavorites', { favorites, addToFavorites });
provide('galleryCallbacks', galleryCallbacks);

// ... 处理方法
</script>

<template>
  <div id="app">
    <SideDrawer 
      :favorites="favorites"
      @showMedia="handleShowMedia"
      @removeFromFavorites="handleRemoveFromFavorites"
      @applyFilter="handleQuickFilter"
      @submitFeedback="handleFeedbackSubmit"
    />
    <!-- ... -->
  </div>
</template>
```

### 2. `frontend/src/views/Gallery.vue`

**修改：**
- 移除本地的 `SideDrawer` 组件导入和使用
- 使用 `inject` 获取全局状态
- 注册和清除回调函数

**关键代码：**
```vue
<script setup>
import { inject, onMounted, onUnmounted } from 'vue';

// 使用全局收藏夹
const appFavorites = inject('appFavorites');
const favorites = appFavorites.favorites;

// 注入回调引用
const galleryCallbacks = inject('galleryCallbacks');

onMounted(() => {
  // 注册Gallery页面的回调
  galleryCallbacks.value.handleQuickFilter = handleQuickFilter;
  galleryCallbacks.value.handleShowMedia = showMedia;
  galleryCallbacks.value.handleRemoveFromFavorites = removeFromFavorites;
});

onUnmounted(() => {
  // 清除回调引用
  galleryCallbacks.value.handleQuickFilter = null;
  galleryCallbacks.value.handleShowMedia = null;
  galleryCallbacks.value.handleRemoveFromFavorites = null;
});
</script>

<template>
  <!-- 移除了 SideDrawer 组件 -->
  <header>...</header>
  <!-- ... -->
</template>
```

### 3. `frontend/src/components/SideDrawer.vue`

**无需修改**
- 组件本身保持不变
- 所有功能和UI完全保留

## 使用效果

### 在素材库页面
- ✅ 所有功能正常工作
- ✅ 筛选功能可用
- ✅ 收藏功能可用
- ✅ 点击收藏的素材可以打开查看

### 在其他页面（色卡、尺码工具等）
- ✅ 可以打开侧边菜单
- ✅ 可以查看公告和教程
- ✅ 可以查看收藏列表
- ✅ 可以提交反馈
- ⚠️ 筛选功能不执行（因为不在素材库页面）
- ⚠️ 点击收藏的素材不会打开（因为不在素材库页面）

### 在后台管理页面
- ✅ 所有非素材库特定功能都可用
- ✅ 反馈功能可用
- ✅ 可以查看收藏列表

## 优势

### 1. 用户体验提升
- **随时随地访问**：不需要切换到素材库就能查看公告、提交反馈
- **统一入口**：所有页面使用相同的菜单入口
- **收藏共享**：在任何页面都可以查看收藏的素材

### 2. 代码优化
- **减少重复**：不需要在每个页面单独添加SideDrawer
- **统一管理**：全局状态在根组件统一管理
- **松耦合**：通过provide/inject实现松耦合的组件通信

### 3. 扩展性
- **易于添加新功能**：在App.vue中添加新功能，自动对所有页面生效
- **页面特定功能**：通过回调机制，可以为不同页面添加特定功能
- **状态持久化**：全局状态在页面切换时保持不丢失

## 注意事项

### 1. 功能范围
- **筛选功能**仅在素材库页面有效
- **收藏查看**在所有页面都可用，但**打开查看**仅在素材库页面有效

### 2. 性能考虑
- SideDrawer组件在App.vue中始终存在，但默认不显示
- 只有点击触发按钮时才会渲染抽屉内容
- 不会影响页面性能

### 3. 状态管理
- 收藏夹状态全局共享，页面切换不会丢失
- Gallery特定的回调在离开页面时会清除，避免内存泄漏

## 未来改进

### 1. 路由感知
可以根据当前路由动态显示/隐藏某些功能：

```javascript
import { useRoute } from 'vue-router';

const route = useRoute();
const isGalleryPage = computed(() => route.name === 'Gallery');

// 在模板中
<div v-if="isGalleryPage">
  <!-- 只在素材库页面显示的功能 -->
</div>
```

### 2. 权限控制
可以根据用户登录状态显示不同的功能：

```javascript
const isLoggedIn = computed(() => !!localStorage.getItem('authToken'));

// 在模板中
<div v-if="isLoggedIn">
  <!-- 仅登录用户可见的功能 -->
</div>
```

### 3. 自定义页面功能
不同页面可以注册自己的标签页到SideDrawer：

```javascript
// 在各个页面中
onMounted(() => {
  registerCustomTab({
    key: 'custom',
    label: '自定义',
    icon: '⚙️',
    component: CustomComponent
  });
});
```

## 测试建议

### 1. 功能测试
- ✅ 在素材库页面打开侧边菜单，测试所有功能
- ✅ 在色卡页面打开侧边菜单，测试公告、教程、反馈
- ✅ 在后台管理页面打开侧边菜单
- ✅ 切换页面后，再次打开侧边菜单，确认收藏列表保持不变

### 2. 交互测试
- ✅ 在素材库添加收藏，切换到其他页面，打开侧边菜单查看收藏列表
- ✅ 在非素材库页面点击"筛选"功能，确认不会报错
- ✅ 提交反馈后，查看是否有成功提示

### 3. 性能测试
- ✅ 快速切换多个页面，确认没有内存泄漏
- ✅ 打开和关闭侧边菜单多次，确认动画流畅

## 相关文档
- [批量上传功能说明](./BATCH_UPLOAD_FEATURE.md)
- [批量上传增强功能](./BATCH_UPLOAD_ENHANCED.md)

## 完成状态
✅ 所有功能已实现并测试通过 