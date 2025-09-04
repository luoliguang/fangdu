<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../axiosConfig.js';

const router = useRouter();
const pendingFeedbacksCount = ref(0);

// --- 获取未处理留言数量 ---
const fetchPendingFeedbacksCount = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/feedbacks/pending/count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    pendingFeedbacksCount.value = response.data.count;
  } catch (error) {
    console.error('获取未处理留言数量失败:', error);
  }
};

// 导航到指定路由
const navigateTo = (routeName) => {
  router.push({ name: routeName });
};

onMounted(() => {
  fetchPendingFeedbacksCount();
  // 每60秒刷新一次未处理留言数量
  const interval = setInterval(fetchPendingFeedbacksCount, 60000);
  
  // 确保当前路径是/admin时，重定向到默认子路由
  if (router.currentRoute.value.name === 'Admin' || router.currentRoute.value.name === 'AdminDefault') {
    router.push({ name: 'UploadMaterial' });
  }
  
  // 组件卸载时清除定时器
  return () => clearInterval(interval);
});
</script>

<template>
  <div class="admin-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>管理后台</h2>
      </div>
      <div class="sidebar-nav">
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'UploadMaterial' }"
          @click="navigateTo('UploadMaterial')"
        >
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">📤</i>
          <span class="nav-text">上传素材</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'MaterialManagement' }"
          @click="navigateTo('MaterialManagement')"
        >
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">🖼️</i>
          <span class="nav-text">素材管理</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'FeedbackManagement' }"
          @click="navigateTo('FeedbackManagement')"
        >
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">💬</i>
          <span class="nav-text">留言管理</span>
          <span v-if="pendingFeedbacksCount > 0" class="badge">{{ pendingFeedbacksCount }}</span>
        </div>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-area">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
/* 主容器样式 */
.admin-container { 
  max-width: 1250px; /* 增加最大宽度 */
  margin: 2.5rem auto; /* 调整外边距 */
  display: flex; 
  gap: 2.5rem; /* 增加卡片间距 */
  padding: 0 1.5rem; /* 增加左右内边距 */
  height: calc(100vh - 5rem); /* 设置高度为视口高度减去上下边距 */
  overflow: hidden; /* 防止内容溢出 */
}

/* 侧边栏样式 */
.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #42b883, #35495e);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  color: white;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.2);
}

.nav-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
  transform: scale(0);
  opacity: 0;
  transition: transform 0.5s ease, opacity 0.5s ease;
  pointer-events: none;
}

.nav-item:hover .nav-hover-effect {
  transform: scale(2);
  opacity: 1;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background-color: white;
}

.nav-icon {
  margin-right: 1rem;
  font-size: 1.2rem;
}

.nav-text {
  font-weight: 500;
}

.badge {
  background-color: #ff4757;
  color: white;
  border-radius: 50%;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  margin-left: auto;
}

/* 内容区域样式 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative; /* 为绝对定位的卡片提供定位上下文 */
  min-height: 500px; /* 确保内容区域有最小高度 */
  display: block; /* 确保内容区域是块级元素 */
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: relative;
  height: 100%;
  width: 100%;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .admin-container {
    flex-direction: column;
    height: auto;
    padding: 0 1rem;
    margin: 1rem auto;
  }
  
  .sidebar {
    width: 100%;
    margin-bottom: 1.5rem;
  }
  
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem 0;
  }
  
  .nav-item {
    padding: 0.75rem 1rem;
    white-space: nowrap;
  }
  
  .content-area {
    padding-right: 0;
  }
}
</style>