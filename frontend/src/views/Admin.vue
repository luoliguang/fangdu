<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import apiClient from '../axiosConfig.js';
import { BREAKPOINTS } from '../config/breakpoints.js';
import {
  Upload,
  PictureRounded,
  ChatDotRound,
  DataAnalysis,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue';

const DESKTOP_BREAKPOINT = BREAKPOINTS.desktop;

const router = useRouter();
const route = useRoute();
const pendingFeedbacksCount = ref(0);
const showLogoutConfirm = ref(false);
const showMobileMenu = ref(false);
const isDesktop = ref(window.innerWidth > DESKTOP_BREAKPOINT);

const navItems = [
  { name: 'UploadMaterial', label: '上传素材', icon: Upload },
  { name: 'MaterialManagement', label: '素材管理', icon: PictureRounded },
  { name: 'FeedbackManagement', label: '留言管理', icon: ChatDotRound },
  { name: 'Statistics', label: '访问统计', icon: DataAnalysis },
  { name: 'DrawerConfig', label: '抽屉配置', icon: Setting }
];

const mobileMenuTitle = computed(() => {
  const current = navItems.find((item) => item.name === route.name);
  return current?.label || '管理菜单';
});

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
  showMobileMenu.value = false;
};

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
};

const handleResize = () => {
  isDesktop.value = window.innerWidth > DESKTOP_BREAKPOINT;
  if (isDesktop.value) {
    showMobileMenu.value = false;
  }
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

watch(() => route.name, () => {
  showMobileMenu.value = false;
});

const showSidebar = computed(() => isDesktop.value || showMobileMenu.value);

// 监听留言状态更新事件
const handleFeedbackUpdate = () => {
  fetchPendingFeedbacksCount();
};

let interval = null;

onMounted(() => {
  fetchPendingFeedbacksCount();
  interval = setInterval(fetchPendingFeedbacksCount, 60000);

  window.addEventListener('feedbackStatusUpdated', handleFeedbackUpdate);
  window.addEventListener('feedbackDeleted', handleFeedbackUpdate);
  window.addEventListener('resize', handleResize);
  handleResize();

  if (router.currentRoute.value.name === 'Admin' || router.currentRoute.value.name === 'AdminDefault') {
    router.push({ name: 'UploadMaterial' });
  }
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
  window.removeEventListener('feedbackStatusUpdated', handleFeedbackUpdate);
  window.removeEventListener('feedbackDeleted', handleFeedbackUpdate);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="admin-container">
    <div class="mobile-nav-toggle">
      <button class="mobile-nav-toggle__btn" @click="toggleMobileMenu">
        <span>{{ mobileMenuTitle }}</span>
        <span class="mobile-nav-toggle__arrow" :class="{ open: showMobileMenu }">▾</span>
      </button>
    </div>

    <!-- 侧边栏 -->
    <Transition name="mobile-menu">
      <div v-show="showSidebar" class="sidebar" :class="{ 'is-open': showMobileMenu }">
        <div class="sidebar-header">
          <h2>管理后台</h2>
        </div>
        <div class="sidebar-nav">
          <div
            v-for="item in navItems"
            :key="item.name"
            class="nav-item"
            :class="{ active: $route.name === item.name }"
            @click="navigateTo(item.name)"
          >
            <span class="nav-hover-effect"></span>
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-text">{{ item.label }}</span>
            <span
              v-if="item.name === 'FeedbackManagement' && pendingFeedbacksCount > 0"
              class="badge"
            >
              {{ pendingFeedbacksCount }}
            </span>
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
    </Transition>
    
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
  width: 100%;
  max-width: 1360px;
  margin: 1.25rem auto;
  padding: 0 0.75rem;
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: 0.85rem;
  min-height: calc(100vh - 2.5rem);
  color: #f1f5f9;
  overflow-x: clip;
}

.sidebar {
  width: 100%;
  min-width: 0;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(168, 85, 247, 0.18) 0%, rgba(168, 85, 247, 0) 55%),
    linear-gradient(180deg, #0f1117 0%, #0b0d12 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.mobile-nav-toggle {
  display: none;
}

.mobile-nav-toggle__btn {
  width: 100%;
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(168, 85, 247, 0.14));
  color: #f8fafc;
  padding: 0.7rem 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.mobile-nav-toggle__arrow {
  transition: transform 0.2s ease;
}

.mobile-nav-toggle__arrow.open {
  transform: rotate(180deg);
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
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  padding: 1rem;
}

.content-area :deep(*) {
  max-width: 100%;
}

.content-area :deep(.el-table__inner-wrapper),
.content-area :deep(.el-scrollbar),
.content-area :deep(.el-form-item__content) {
  min-width: 0;
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

/* Keep this in sync with DESKTOP_BREAKPOINT */
@media (max-width: 1024px) {
  .admin-container {
    margin: 0.95rem auto;
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .mobile-nav-toggle {
    display: block;
  }

  .sidebar {
    width: 100%;
    transform-origin: top center;
  }

  .sidebar-header {
    display: none;
  }

  .sidebar-nav {
    flex-direction: column;
    overflow: visible;
    padding: 0.7rem;
    gap: 0.45rem;
  }

  .nav-item {
    width: 100%;
    white-space: nowrap;
  }

  .sidebar-footer {
    padding: 0.7rem;
    margin-top: 0;
  }

  .content-area {
    min-height: 65vh;
  }
}

@media (max-width: 640px) {
  .admin-container {
    margin: 0.65rem auto;
    padding: 0 0.45rem;
    gap: 0.65rem;
  }

  .sidebar {
    border-radius: 14px;
  }

  .sidebar-header h2 {
    font-size: 0.9rem;
  }

  .sidebar-nav {
    padding: 0.6rem;
    gap: 0.4rem;
  }

  .nav-item {
    padding: 0.6rem 0.7rem;
    gap: 0.52rem;
    border-radius: 9px;
  }

  .nav-icon {
    font-size: 0.92rem;
  }

  .nav-text {
    font-size: 0.84rem;
  }

  .badge {
    min-width: 1.2rem;
    height: 1.2rem;
    font-size: 0.66rem;
    padding: 0 0.28rem;
  }

  .content-area {
    padding: 0.58rem;
    border-radius: 12px;
  }

  .logout-dialog {
    min-width: 0;
    width: calc(100vw - 26px);
  }
}

@media (max-width: 420px) {
  .admin-container {
    margin: 0.5rem auto;
    padding: 0 0.35rem;
    gap: 0.55rem;
  }

  .sidebar-header {
    padding: 0.85rem 0.85rem 0.72rem;
  }

  .sidebar-nav,
  .sidebar-footer {
    padding: 0.5rem;
  }

  .nav-item {
    padding: 0.52rem 0.58rem;
  }

  .content-area {
    padding: 0.5rem;
  }
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

.mobile-menu-enter-to,
.mobile-menu-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
