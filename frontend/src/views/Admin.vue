<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../axiosConfig.js';

const router = useRouter();
const pendingFeedbacksCount = ref(0);
const showLogoutConfirm = ref(false);

// --- 获取未处理留言数量 ---
const fetchPendingFeedbacksCount = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/v1/feedbacks/stats/unprocessed', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 后端返回格式: { success: true, data: { count } }
    pendingFeedbacksCount.value = response.data.data?.count || 0;
  } catch (error) {
    console.error('获取未处理留言数量失败:', error);
    pendingFeedbacksCount.value = 0;
  }
};

// 导航到指定路由
const navigateTo = (routeName) => {
  router.push({ name: routeName });
};

// 显示退出登录确认对话框
const showLogoutDialog = () => {
  showLogoutConfirm.value = true;
};

// 确认退出登录
const confirmLogout = () => {
  localStorage.removeItem('authToken');
  // 触发storage事件通知其他组件更新登录状态
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'authToken',
    newValue: null,
    storageArea: localStorage
  }));
  router.push('/');
  showLogoutConfirm.value = false;
};

// 取消退出登录
const cancelLogout = () => {
  showLogoutConfirm.value = false;
};

// 监听留言状态更新事件
const handleFeedbackUpdate = () => {
  fetchPendingFeedbacksCount();
};

onMounted(() => {
  fetchPendingFeedbacksCount();
  // 每60秒刷新一次未处理留言数量
  const interval = setInterval(fetchPendingFeedbacksCount, 60000);
  
  // 监听留言状态更新事件
  window.addEventListener('feedbackStatusUpdated', handleFeedbackUpdate);
  window.addEventListener('feedbackDeleted', handleFeedbackUpdate);
  
  // 确保当前路径是/admin时，重定向到默认子路由
  if (router.currentRoute.value.name === 'Admin' || router.currentRoute.value.name === 'AdminDefault') {
    router.push({ name: 'UploadMaterial' });
  }
  
  // 组件卸载时清除定时器和事件监听器
  return () => {
    clearInterval(interval);
    window.removeEventListener('feedbackStatusUpdated', handleFeedbackUpdate);
    window.removeEventListener('feedbackDeleted', handleFeedbackUpdate);
  };
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
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'Statistics' }"
          @click="navigateTo('Statistics')"
        >
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">📊</i>
          <span class="nav-text">访问统计</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'DrawerConfig' }"
          @click="navigateTo('DrawerConfig')"
        >
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">🎛️</i>
          <span class="nav-text">抽屉配置</span>
        </div>
      </div>
      
      <!-- 退出登录按钮 -->
      <div class="sidebar-footer">
        <div class="nav-item logout-item" @click="showLogoutDialog">
          <span class="nav-hover-effect"></span>
          <i class="nav-icon">🚪</i>
          <span class="nav-text">退出登录</span>
        </div>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-area">
      <router-view></router-view>
    </div>
    
    <!-- 退出登录确认对话框 -->
    <div v-if="showLogoutConfirm" class="logout-overlay" @click="cancelLogout">
      <div class="logout-dialog" @click.stop>
        <div class="dialog-header">
          <h3>确认退出</h3>
        </div>
        <div class="dialog-content">
          <p>您确定要退出管理后台吗？</p>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="cancelLogout">取消</button>
          <button class="btn-confirm" @click="confirmLogout">确认退出</button>
        </div>
      </div>
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
  flex: 1;
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
  box-shadow: 0 2px 4px rgba(255, 71, 87, 0.3);
  animation: pulse 2s infinite;
}

/* 脉冲动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(255, 71, 87, 0.3);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(255, 71, 87, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(255, 71, 87, 0.3);
  }
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
    padding: 0 0.5rem;
    margin: 0.5rem auto;
    gap: 1rem;
  }
  
  .sidebar {
    width: 100%;
    margin-bottom: 0;
  }
  
  .sidebar-header {
    padding: 1rem;
  }
  
  .sidebar-header h2 {
    font-size: 1.3rem;
  }
  
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem 0;
    scrollbar-width: thin;
  }
  
  .sidebar-nav::-webkit-scrollbar {
    height: 4px;
  }
  
  .sidebar-nav::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
  
  .nav-item {
    padding: 0.75rem 1rem;
    white-space: nowrap;
    min-width: fit-content;
  }
  
  .nav-icon {
    margin-right: 0.5rem;
    font-size: 1rem;
  }
  
  .nav-text {
    font-size: 0.9rem;
  }
  
  .content-area {
    padding: 1rem;
    min-height: 400px;
  }
}

@media (max-width: 480px) {
  .admin-container {
    padding: 0 0.25rem;
    margin: 0.25rem auto;
  }
  
  .sidebar-header h2 {
    font-size: 1.2rem;
  }
  
  .nav-item {
    padding: 0.6rem 0.8rem;
  }
  
  .nav-text {
    font-size: 0.85rem;
  }
  
  .content-area {
    padding: 0.75rem;
  }
}

/* 侧边栏底部样式 */
.sidebar-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 退出登录按钮样式 */
.logout-item {
  color: #ff6b6b !important;
}

.logout-item:hover {
  background: rgba(255, 107, 107, 0.1) !important;
}

.logout-item .nav-hover-effect {
  background: #ff6b6b !important;
}

/* 确认对话框样式 */
.logout-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.logout-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  min-width: 320px;
  max-width: 400px;
  overflow: hidden;
}

.dialog-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-content p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.dialog-actions {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: #ff6b6b;
  color: white;
}

.btn-confirm:hover {
  background: #ff5252;
}
</style>