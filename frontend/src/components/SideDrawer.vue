<template>
  <!-- 抽屉触发按钮 -->
  <div class="drawer-trigger" @click="toggleDrawer" :class="{ 'active': isDrawerOpen }">
    <div class="trigger-icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="trigger-text">菜单</div>
  </div>

  <!-- 左侧抽屉遮罩 -->
  <div v-if="isDrawerOpen" class="drawer-overlay" @click="isDrawerOpen = false"></div>

  <!-- 左侧抽屉 -->
  <div class="side-drawer" :class="{ 'open': isDrawerOpen }">
    <div class="drawer-header">
      <h3>功能菜单</h3>
      <button class="drawer-close" @click="isDrawerOpen = false">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="drawer-tabs">
      <button 
        v-for="tab in drawerTabs"
        :key="tab.key"
        @click="switchDrawerTab(tab.key)"
        :class="{ 'active': activeDrawerTab === tab.key }"
        class="drawer-tab"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="drawer-content">
      <!-- 公告内容 -->
      <div v-if="activeDrawerTab === 'announcement'" class="tab-content">
        <div class="announcements-list">
          <div v-for="announcement in announcements" :key="announcement.id" class="announcement-item" :class="announcement.type">
            <div class="announcement-header">
              <h4 class="announcement-title">{{ announcement.title }}</h4>
              <span v-if="announcement.isNew" class="new-badge">NEW</span>
            </div>
            <p class="announcement-content">{{ announcement.content }}</p>
            <div class="announcement-meta">
              <div class="announcement-date">{{ formatDateTime(announcement.created_at || announcement.date) }}</div>
              <div class="announcement-publish-time">发布于: {{ formatDateTime(announcement.publish_time || announcement.created_at || announcement.date) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 教程内容 -->
      <div v-if="activeDrawerTab === 'tutorial'" class="tab-content">
        <div class="tutorial-list">
          <div v-for="step in tutorialSteps" :key="step.id" class="tutorial-item">
            <div class="tutorial-icon">{{ step.icon }}</div>
            <div class="tutorial-content">
              <h4 class="tutorial-title">{{ step.title }}</h4>
              <p class="tutorial-description">{{ step.content }}</p>
              <div class="tutorial-meta">
                <div class="tutorial-publish-time">发布于: {{ formatDateTime(step.publish_time || step.created_at || '2024-01-01') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速筛选 -->
      <div v-if="activeDrawerTab === 'filter'" class="tab-content">
        <div class="quick-filters">
          <h4 class="filter-section-title">快速筛选</h4>
          <div class="filter-grid">
            <button 
              v-for="filter in quickFilters" 
              :key="filter.value"
              @click="applyQuickFilter(filter.value)"
              class="filter-button"
            >
              <span class="filter-icon">{{ filter.icon }}</span>
              <span class="filter-name">{{ filter.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 收藏夹 -->
      <div v-if="activeDrawerTab === 'favorites'" class="tab-content">
        <div class="favorites-list">
          <div v-if="favorites.length === 0" class="empty-state">
            <div class="empty-icon">❤️</div>
            <p>还没有收藏任何素材</p>
            <p class="empty-hint">在素材上点击收藏按钮来添加收藏</p>
          </div>
          <div v-else class="favorites-grid">
            <div v-for="favorite in favorites" :key="favorite.id" class="favorite-item" @click="$emit('showMedia', favorite)">
              <img :src="favorite.thumbnail_url || favorite.file_path" :alt="favorite.name" loading="lazy">
              <div class="favorite-info">
                <p class="favorite-name">{{ favorite.name }}</p>
                <button @click.stop="$emit('removeFromFavorites', favorite.id)" class="remove-favorite">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 反馈建议 -->
      <div v-if="activeDrawerTab === 'feedback'" class="tab-content">
        <div class="feedback-section">
          <h4>意见反馈</h4>
          <div class="feedback-form">
            <textarea v-model="feedbackMessage" placeholder="请告诉我们您的建议或遇到的问题..." rows="4"></textarea>
            <button @click="submitFeedback" class="feedback-submit-btn">提交反馈</button>
          </div>
          
          <!-- 用户留言历史记录 -->
          <div v-if="userFeedbacks && userFeedbacks.length > 0" class="feedback-history">
            <h5>我的反馈历史</h5>
            <div v-if="isUserFeedbacksLoading" class="loading-message">加载中...</div>
            <div v-else class="feedback-list">
              <div v-for="feedback in userFeedbacks" :key="feedback.id" class="feedback-item">
                <div class="feedback-meta">
                  <span :class="{ 'status-tag': true, 'status-pending': feedback.status === 'pending', 'status-resolved': feedback.status === 'resolved' }">
                    {{ feedback.status === 'pending' ? '待处理' : '已处理' }}
                  </span>
                  <span class="timestamp">{{ formatDateTime(feedback.created_at) }}</span>
                </div>
                <p class="feedback-message">{{ feedback.message }}</p>
              </div>
            </div>
          </div>
          
          <div class="contact-info">
            <h5>联系我们</h5>
            <div v-if="isContactInfosLoading" class="loading-message">加载中...</div>
            <div v-else-if="contactInfos && contactInfos.length > 0">
              <p v-for="contact in contactInfos" :key="contact.id">
                {{ contact.icon }} {{ contact.label }}：{{ contact.value }}
              </p>
            </div>
            <div v-else class="empty-contact-info">
              <p>暂无联系方式</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../axiosConfig.js';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  favorites: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['showMedia', 'removeFromFavorites', 'applyFilter', 'submitFeedback']);

// 抽屉状态
const isDrawerOpen = ref(false);
const activeDrawerTab = ref('announcement');
const feedbackMessage = ref('');

// 用户留言相关状态
const userFeedbacks = ref([]);
const isUserFeedbacksLoading = ref(false);

// 联系信息相关状态
const contactInfos = ref([]);
const isContactInfosLoading = ref(false);

// 配置数据 - 将从后台获取
const drawerTabs = ref([
  { key: 'announcement', label: '公告', icon: '📢' },
  { key: 'tutorial', label: '教程', icon: '📚' },
  { key: 'filter', label: '筛选', icon: '🔍' },
  { key: 'favorites', label: '收藏', icon: '❤️' },
  { key: 'feedback', label: '反馈', icon: '💬' }
]);

const announcements = ref([]);
const tutorialSteps = ref([]);
const quickFilters = ref([]);

// 方法
const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value;
};

const switchDrawerTab = (tab) => {
  activeDrawerTab.value = tab;
};

const applyQuickFilter = (filterValue) => {
  emit('applyFilter', filterValue);
  isDrawerOpen.value = false; // 应用筛选后关闭抽屉
};

const submitFeedback = async () => {
  // 确保留言内容非空且去除首尾空格
  const trimmedMessage = feedbackMessage.value.trim();
  if (!trimmedMessage) {
    // 使用美化的提示样式替代原生alert
    ElMessage({
      message: '请输入反馈内容',
      type: 'warning',
      showClose: true,
      duration: 2000
    });
    return;
  }
  
  emit('submitFeedback', trimmedMessage);
  feedbackMessage.value = '';
  
  // 提交成功后刷新用户留言列表
  await fetchUserFeedbacks();
};

// 获取用户留言列表
const fetchUserFeedbacks = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) return; // 如果没有用户ID，则不加载

  isUserFeedbacksLoading.value = true;
  try {
    const response = await apiClient.get(`/api/v1/feedbacks/user/${userId}`);
    userFeedbacks.value = response.data.data;
  } catch (error) {
    console.error('获取用户留言失败:', error);
  } finally {
    isUserFeedbacksLoading.value = false;
  }
};

// 格式化日期时间
const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleString();
};

// 从后台获取配置数据
const fetchDrawerConfig = async () => {
  try {
    const response = await apiClient.get('/api/v1/drawer-config/config');
    const config = response.data.data;
    
    if (config.announcements) announcements.value = config.announcements;
    if (config.tutorials) tutorialSteps.value = config.tutorials;
    if (config.quickFilters) quickFilters.value = config.quickFilters;
    if (config.tabs) drawerTabs.value = config.tabs;
    
    // 获取联系信息
    await fetchContactInfos();
  } catch (error) {
    console.error('获取抽屉配置失败:', error);
    // 使用默认配置
    loadDefaultConfig();
  }
};

// 获取联系信息
const fetchContactInfos = async () => {
  isContactInfosLoading.value = true;
  try {
    const response = await apiClient.get('/api/v1/drawer-config/contacts');
    contactInfos.value = response.data.data;
  } catch (error) {
    console.error('获取联系信息失败:', error);
    contactInfos.value = [];
  } finally {
    isContactInfosLoading.value = false;
  }
};

const loadDefaultConfig = () => {
  announcements.value = [
    {
      id: 1,
      title: '🎉 新增视频素材功能',
      content: '现在您可以浏览和下载高质量的视频素材了！',
      date: '2024-01-15',
      type: 'feature',
      isNew: true
    },
    {
      id: 2,
      title: '📢 素材库更新通知',
      content: '本周新增了200+春季新款面料素材，快来探索吧！',
      date: '2024-01-10',
      type: 'update',
      isNew: false
    }
  ];

  tutorialSteps.value = [
    {
      id: 1,
      title: '🔍 如何搜索素材',
      content: '在搜索框中输入关键词，如"圆领短袖"、"插肩"等，系统会智能匹配相关素材。',
      icon: '🔍'
    },
    {
      id: 2,
      title: '🏷️ 使用标签筛选',
      content: '点击下方的标签按钮可以快速筛选特定类型的素材，支持多标签组合。',
      icon: '🏷️'
    }
  ];

  quickFilters.value = [
    { name: '最新上传', value: 'latest', icon: '🆕' },
    { name: '热门素材', value: 'popular', icon: '🔥' },
    { name: '高清图片', value: 'hd', icon: '📸' },
    { name: '视频素材', value: 'video', icon: '🎬' }
  ];
};

onMounted(() => {
  fetchDrawerConfig();
});
</script>

<style scoped>
/* 抽屉触发按钮 */
.drawer-trigger {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0 25px 25px 0;
  padding: 15px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 2px 0 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  font-size: 12px;
  font-weight: 500;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.drawer-trigger:hover {
  transform: translateY(-50%) translateX(5px);
  box-shadow: 2px 0 20px rgba(102, 126, 234, 0.6);
}

.drawer-trigger.active {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  transform: translateY(-50%) translateX(5px);
}

.trigger-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.trigger-icon svg {
  width: 100%;
  height: 100%;
}

/* 抽屉遮罩 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  backdrop-filter: blur(4px);
}

/* 抽屉主体 */
.side-drawer {
  position: fixed;
  top: 0;
  left: -400px;
  width: 400px;
  height: 100vh;
  background: white;
  z-index: 1002;
  transition: left 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.side-drawer.open {
  left: 0;
}

/* 抽屉头部 */
.drawer-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.drawer-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.drawer-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.drawer-close svg {
  width: 20px;
  height: 20px;
  color: #666;
}

/* 抽屉标签栏 */
.drawer-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  overflow-x: auto;
}

.drawer-tab {
  flex: 1;
  padding: 12px 8px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  min-width: 60px;
}

.drawer-tab:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.drawer-tab.active {
  background-color: #667eea;
  color: white;
}

.tab-icon {
  font-size: 16px;
}

.tab-label {
  font-size: 12px;
  font-weight: 500;
}

/* 抽屉内容 */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 公告样式 */
.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-item {
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid #667eea;
  background: #f8f9ff;
  transition: transform 0.2s;
}

.announcement-item:hover {
  transform: translateX(4px);
}

.announcement-item.feature {
  border-left-color: #4CAF50;
  background: #f1f8e9;
}

.announcement-item.update {
  border-left-color: #FF9800;
  background: #fff3e0;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.announcement-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.new-badge {
  background: #ff4757;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}

.announcement-content {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

/* 公告元数据样式 */
.announcement-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.announcement-date, 
.announcement-publish-time {
  font-size: 11px;
  color: #999;
}

.announcement-publish-time {
  display: flex;
  align-items: center;
}

.announcement-publish-time::before {
  content: '🕒';
  margin-right: 4px;
  font-size: 12px;
}

/* 教程元数据样式 */
.tutorial-meta {
  margin-top: 8px;
}

.tutorial-publish-time {
  font-size: 11px;
  color: #999;
  display: flex;
  align-items: center;
}

.tutorial-publish-time::before {
  content: '🕒';
  margin-right: 4px;
  font-size: 12px;
}

/* 教程样式 */
.tutorial-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tutorial-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: transform 0.2s;
}

.tutorial-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tutorial-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.tutorial-content {
  flex: 1;
}

.tutorial-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.tutorial-description {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

/* 筛选样式 */
.filter-section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.filter-button {
  padding: 12px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.filter-button:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateY(-2px);
}

.filter-icon {
  font-size: 20px;
}

.filter-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

/* 收藏夹样式 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.favorite-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  background: #f8f9fa;
}

.favorite-item:hover {
  transform: scale(1.02);
}

.favorite-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.favorite-info {
  padding: 8px;
  position: relative;
}

.favorite-name {
  margin: 0;
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-favorite {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 71, 87, 0.9);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.remove-favorite:hover {
  background: #ff4757;
}

.remove-favorite svg {
  width: 12px;
  height: 12px;
  color: white;
}

/* 反馈样式 */
.feedback-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.feedback-form {
  margin-bottom: 24px;
}

.feedback-form textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.feedback-form textarea:focus {
  outline: none;
  border-color: #667eea;
}

.feedback-submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: transform 0.2s;
}

.feedback-submit-btn:hover {
  transform: translateY(-1px);
}

.contact-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.contact-info h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.contact-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .side-drawer {
    width: 320px;
    left: -320px;
  }
  
  .drawer-content {
    padding: 16px;
  }
  
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>