<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../axiosConfig.js';
import {
  Upload,
  PictureRounded,
  ChatDotRound,
  DataAnalysis,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue';

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
          <el-icon class="nav-icon"><Upload /></el-icon>
          <span class="nav-text">上传素材</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'MaterialManagement' }"
          @click="navigateTo('MaterialManagement')"
        >
          <span class="nav-hover-effect"></span>
          <el-icon class="nav-icon"><PictureRounded /></el-icon>
          <span class="nav-text">素材管理</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'FeedbackManagement' }"
          @click="navigateTo('FeedbackManagement')"
        >
          <span class="nav-hover-effect"></span>
          <el-icon class="nav-icon"><ChatDotRound /></el-icon>
          <span class="nav-text">留言管理</span>
          <span v-if="pendingFeedbacksCount > 0" class="badge">{{ pendingFeedbacksCount }}</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'Statistics' }"
          @click="navigateTo('Statistics')"
        >
          <span class="nav-hover-effect"></span>
          <el-icon class="nav-icon"><DataAnalysis /></el-icon>
          <span class="nav-text">访问统计</span>
        </div>
        <div 
          class="nav-item" 
          :class="{ active: $route.name === 'DrawerConfig' }"
          @click="navigateTo('DrawerConfig')"
        >
          <span class="nav-hover-effect"></span>
          <el-icon class="nav-icon"><Setting /></el-icon>
          <span class="nav-text">抽屉配置</span>
        </div>
      </div>
      
      <!-- 退出登录按钮 -->
      <div class="sidebar-footer">
        <div class="nav-item logout-item" @click="showLogoutDialog">
          <span class="nav-hover-effect"></span>
          <el-icon class="nav-icon"><SwitchButton /></el-icon>
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
.admin-container {
  max-width: 1360px;
  margin: 1.25rem auto;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 1rem;
  min-height: calc(100vh - 2.5rem);
  color: #f1f5f9;
}

.sidebar {
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(168, 85, 247, 0.18) 0%, rgba(168, 85, 247, 0) 55%),
    linear-gradient(180deg, #0f1117 0%, #0b0d12 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}

.sidebar-header {
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 650;
  color: #f8fafc;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: #e2e8f0;
  border: 1px solid transparent;
}

.nav-item:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.16);
}

.nav-item.active {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(168, 85, 247, 0.22));
  border-color: rgba(168, 85, 247, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 20%;
  width: 3px;
  height: 60%;
  border-radius: 999px;
  background: linear-gradient(180deg, #c084fc, #a855f7);
}

.nav-hover-effect {
  display: none;
}

.nav-icon {
  margin-right: 0;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 0.95rem;
  font-weight: 540;
}

.badge {
  margin-left: auto;
  background: #f43f5e;
  color: white;
  border-radius: 999px;
  min-width: 1.35rem;
  height: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  padding: 0 0.35rem;
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.45);
}

.content-area {
  min-height: 0;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  padding: 1rem;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.9rem;
}

.logout-item {
  color: #fda4af !important;
}

.logout-item:hover {
  color: #ffe4e6 !important;
  background: rgba(244, 63, 94, 0.12) !important;
  border-color: rgba(244, 63, 94, 0.28) !important;
}

.logout-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.logout-dialog {
  background: linear-gradient(180deg, #121722 0%, #0d1117 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  min-width: 340px;
  max-width: 420px;
  overflow: hidden;
}

.dialog-header {
  padding: 1.2rem 1.2rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dialog-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.05rem;
}

.dialog-content {
  padding: 1.2rem;
}

.dialog-content p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.dialog-actions {
  padding: 0.9rem 1.2rem 1.2rem;
  display: flex;
  gap: 0.7rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.88rem;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-confirm {
  background: linear-gradient(135deg, #fb7185, #f43f5e);
  color: #fff;
}

.btn-confirm:hover {
  filter: brightness(1.08);
}

@media (max-width: 1024px) {
  .admin-container {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .sidebar {
    width: 100%;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.75rem;
  }

  .nav-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .content-area {
    min-height: 65vh;
  }
}

@media (max-width: 640px) {
  .admin-container {
    margin: 0.75rem auto;
    padding: 0 0.55rem;
    gap: 0.75rem;
  }

  .sidebar-header h2 {
    font-size: 0.92rem;
  }

  .nav-item {
    padding: 0.65rem 0.75rem;
  }

  .nav-text {
    font-size: 0.88rem;
  }

  .content-area {
    padding: 0.7rem;
  }
}
</style>
