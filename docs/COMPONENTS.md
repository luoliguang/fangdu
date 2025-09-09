# 组件文档

## 概述

本文档介绍房屋租赁管理系统前端项目中的可复用组件。所有组件都基于Vue 3 Composition API开发，支持TypeScript类型提示。

## 通用组件

### LoadingSpinner 加载动画

用于显示加载状态的旋转动画组件。

#### 使用方法

```vue
<template>
  <LoadingSpinner 
    :size="'large'" 
    :color="'#3b82f6'" 
    :text="'加载中...'" 
  />
</template>

<script setup>
import LoadingSpinner from '@/components/LoadingSpinner.vue'
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | String | 'medium' | 尺寸：'small', 'medium', 'large' |
| color | String | '#3b82f6' | 颜色值 |
| text | String | '' | 加载文本 |
| overlay | Boolean | false | 是否显示遮罩层 |

#### 示例

```vue
<!-- 基础用法 -->
<LoadingSpinner />

<!-- 大尺寸带文本 -->
<LoadingSpinner size="large" text="正在加载数据..." />

<!-- 带遮罩层 -->
<LoadingSpinner overlay text="处理中，请稍候..." />
```

### FeedbackForm 反馈表单

用于收集用户反馈的表单组件。

#### 使用方法

```vue
<template>
  <FeedbackForm 
    :material-id="materialId"
    @submit="handleFeedbackSubmit"
    @cancel="handleFeedbackCancel"
  />
</template>

<script setup>
import FeedbackForm from '@/components/FeedbackForm.vue'

const materialId = ref(1)

const handleFeedbackSubmit = (feedbackData) => {
  console.log('反馈数据:', feedbackData)
}

const handleFeedbackCancel = () => {
  console.log('取消反馈')
}
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| materialId | Number | null | 素材ID |
| placeholder | String | '请输入您的反馈...' | 输入框占位符 |
| maxLength | Number | 500 | 最大字符数 |
| required | Boolean | true | 是否必填 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| submit | feedbackData | 提交反馈时触发 |
| cancel | - | 取消反馈时触发 |

#### 反馈数据格式

```javascript
{
  materialId: 1,
  userId: 'example_user_id',
  message: '用户反馈内容'
}
```

### FloatingLabelInput 浮动标签输入框

带有浮动标签效果的输入框组件。

#### 使用方法

```vue
<template>
  <FloatingLabelInput
    v-model="inputValue"
    label="用户名"
    type="text"
    :required="true"
    :error="errorMessage"
  />
</template>

<script setup>
import FloatingLabelInput from '@/components/FloatingLabelInput.vue'

const inputValue = ref('')
const errorMessage = ref('')
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | String | '' | 输入值 (v-model) |
| label | String | '' | 标签文本 |
| type | String | 'text' | 输入类型 |
| placeholder | String | '' | 占位符 |
| required | Boolean | false | 是否必填 |
| disabled | Boolean | false | 是否禁用 |
| error | String | '' | 错误信息 |
| maxlength | Number | null | 最大长度 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | value | 值变化时触发 |
| focus | event | 获得焦点时触发 |
| blur | event | 失去焦点时触发 |

#### 示例

```vue
<!-- 基础用法 -->
<FloatingLabelInput v-model="username" label="用户名" />

<!-- 密码输入 -->
<FloatingLabelInput 
  v-model="password" 
  label="密码" 
  type="password" 
  required 
/>

<!-- 带错误提示 -->
<FloatingLabelInput 
  v-model="email" 
  label="邮箱" 
  type="email" 
  :error="emailError" 
/>
```

## 业务组件

### MaterialCard 素材卡片

用于展示素材信息的卡片组件。

#### 使用方法

```vue
<template>
  <MaterialCard 
    :material="materialData"
    @click="handleCardClick"
    @delete="handleDelete"
  />
</template>

<script setup>
import MaterialCard from '@/components/MaterialCard.vue'

const materialData = ref({
  id: 1,
  title: '素材标题',
  description: '素材描述',
  imageUrl: 'https://example.com/image.jpg',
  tags: ['标签1', '标签2']
})

const handleCardClick = (material) => {
  console.log('点击素材:', material)
}

const handleDelete = (materialId) => {
  console.log('删除素材:', materialId)
}
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| material | Object | {} | 素材数据 |
| showActions | Boolean | true | 是否显示操作按钮 |
| clickable | Boolean | true | 是否可点击 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| click | material | 点击卡片时触发 |
| delete | materialId | 删除素材时触发 |
| edit | material | 编辑素材时触发 |

#### 素材数据格式

```javascript
{
  id: 1,
  title: '素材标题',
  description: '素材描述',
  imageUrl: 'https://example.com/image.jpg',
  tags: ['标签1', '标签2'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}
```

### Pagination 分页组件

用于数据分页的组件。

#### 使用方法

```vue
<template>
  <Pagination 
    :current-page="currentPage"
    :total-pages="totalPages"
    :total-items="totalItems"
    @page-change="handlePageChange"
  />
</template>

<script setup>
import Pagination from '@/components/Pagination.vue'

const currentPage = ref(1)
const totalPages = ref(10)
const totalItems = ref(100)

const handlePageChange = (page) => {
  currentPage.value = page
  // 加载新页面数据
}
</script>
```

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| currentPage | Number | 1 | 当前页码 |
| totalPages | Number | 1 | 总页数 |
| totalItems | Number | 0 | 总条目数 |
| pageSize | Number | 10 | 每页条目数 |
| showSizeChanger | Boolean | false | 是否显示页面大小选择器 |
| showQuickJumper | Boolean | false | 是否显示快速跳转 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| page-change | page | 页码变化时触发 |
| size-change | size | 页面大小变化时触发 |

## 组合式函数 (Composables)

### usePagination 分页管理

用于管理分页状态的组合式函数。

#### 使用方法

```javascript
import { usePagination } from '@/composables/usePagination'

const {
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  goToPage,
  nextPage,
  prevPage,
  updatePagination
} = usePagination({
  initialPage: 1,
  initialPageSize: 10
})

// 更新分页信息
updatePagination({ totalItems: 100 })

// 跳转到指定页面
goToPage(3)
```

#### 返回值

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| currentPage | Ref<number> | 当前页码 |
| pageSize | Ref<number> | 每页条目数 |
| totalItems | Ref<number> | 总条目数 |
| totalPages | ComputedRef<number> | 总页数 |
| goToPage | Function | 跳转到指定页面 |
| nextPage | Function | 下一页 |
| prevPage | Function | 上一页 |
| updatePagination | Function | 更新分页信息 |

### useLoading 加载状态管理

用于管理加载状态的组合式函数。

#### 使用方法

```javascript
import { useLoading } from '@/composables/useLoading'

const { isLoading, startLoading, stopLoading, withLoading } = useLoading()

// 手动控制加载状态
startLoading()
// 执行异步操作
stopLoading()

// 自动管理加载状态
const fetchData = withLoading(async () => {
  const response = await api.get('/data')
  return response.data
})
```

#### 返回值

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| isLoading | Ref<boolean> | 加载状态 |
| startLoading | Function | 开始加载 |
| stopLoading | Function | 停止加载 |
| withLoading | Function | 包装异步函数，自动管理加载状态 |

### useApi API请求管理

用于管理API请求的组合式函数。

#### 使用方法

```javascript
import { useApi } from '@/composables/useApi'

const { request, get, post, put, delete: del } = useApi()

// GET请求
const materials = await get('/materials', { page: 1, limit: 10 })

// POST请求
const newMaterial = await post('/materials', {
  title: '新素材',
  description: '描述'
})

// 通用请求
const response = await request({
  method: 'GET',
  url: '/materials',
  params: { page: 1 }
})
```

## 样式指南

### CSS变量

项目使用CSS变量来管理主题色彩：

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --background-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
  --border-radius: 8px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### 组件样式规范

1. **使用scoped样式**：所有组件样式都应该使用`<style scoped>`
2. **BEM命名规范**：CSS类名使用BEM命名规范
3. **响应式设计**：使用媒体查询适配不同屏幕尺寸
4. **无障碍支持**：添加适当的ARIA属性

```vue
<template>
  <div class="component">
    <div class="component__header">
      <h2 class="component__title">标题</h2>
    </div>
    <div class="component__content">
      <!-- 内容 -->
    </div>
  </div>
</template>

<style scoped>
.component {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.component__header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.component__title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 600;
}

.component__content {
  padding: 1rem;
}

@media (max-width: 768px) {
  .component {
    margin: 0.5rem;
  }
}
</style>
```

## 开发指南

### 创建新组件

1. 在`src/components`目录下创建组件文件
2. 使用Vue 3 Composition API
3. 添加TypeScript类型定义
4. 编写组件文档
5. 添加单元测试

### 组件模板

```vue
<template>
  <div class="my-component">
    <!-- 组件内容 -->
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'

// Props定义
const props = defineProps({
  // prop定义
})

// Events定义
const emit = defineEmits(['event-name'])

// 响应式数据
const state = ref({})

// 计算属性
const computedValue = computed(() => {
  // 计算逻辑
})

// 方法
const handleClick = () => {
  emit('event-name', data)
}
</script>

<style scoped>
.my-component {
  /* 样式定义 */
}
</style>
```

### 最佳实践

1. **单一职责**：每个组件只负责一个功能
2. **可复用性**：设计通用的、可配置的组件
3. **性能优化**：使用`v-memo`、`shallowRef`等优化性能
4. **错误处理**：添加适当的错误边界和错误提示
5. **无障碍性**：支持键盘导航和屏幕阅读器

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 实现基础通用组件
- 实现业务组件
- 实现组合式函数