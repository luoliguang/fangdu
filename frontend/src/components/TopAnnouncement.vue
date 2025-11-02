<template>
  <Transition name="slide-down">
    <div v-if="visible && topAnnouncement" class="top-announcement" ref="announcementElement">
      <div class="announcement-content">
        <div class="announcement-icon">
          <el-icon :size="24"><Bell /></el-icon>
        </div>
        <div class="announcement-text">
          <div class="announcement-title">{{ topAnnouncement.title }}</div>
          <div class="announcement-description" v-if="topAnnouncement.content">
            {{ getAnnouncementSummary(topAnnouncement.content) }}
          </div>
        </div>
        <button class="close-button" @click="handleClose">
          <el-icon :size="20"><Close /></el-icon>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Bell, Close } from '@element-plus/icons-vue';
import apiClient from '../axiosConfig.js';

// Props
const props = defineProps({
  duration: {
    type: Number,
    default: 24 * 60 * 60 * 1000 // 24小时，单位毫秒
  }
});

const visible = ref(false);
const announcementElement = ref(null);
const topAnnouncement = ref(null);
const loading = ref(false);
let refreshInterval = null;

// 获取公告摘要（去除HTML标记，取前50个字符）
const getAnnouncementSummary = (content) => {
  if (!content) return '';
  // 简单的文本提取，去除HTML标签
  const text = content.replace(/<[^>]*>/g, '').trim();
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

// 从API获取顶部公告
const fetchTopAnnouncement = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/api/v1/drawer-config/top-announcement');
    if (response.data.success && response.data.data) {
      topAnnouncement.value = response.data.data;
      // 检查是否应该显示
      if (shouldShow()) {
        visible.value = true;
      }
    } else {
      topAnnouncement.value = null;
      visible.value = false;
    }
  } catch (error) {
    console.error('获取顶部公告失败:', error);
    topAnnouncement.value = null;
    visible.value = false;
  } finally {
    loading.value = false;
  }
};

// 检查是否应该显示通知
const shouldShow = () => {
  if (!topAnnouncement.value || !topAnnouncement.value.id) {
    return false;
  }
  
  const key = `top_announcement_${topAnnouncement.value.id}_dismissed`;
  const dismissedTime = localStorage.getItem(key);
  
  if (!dismissedTime) {
    return true; // 从未关闭过，显示
  }
  
  const elapsed = Date.now() - parseInt(dismissedTime);
  return elapsed >= props.duration; // 超过时间间隔，重新显示
};

// 处理关闭
const handleClose = () => {
  visible.value = false;
  if (topAnnouncement.value && topAnnouncement.value.id) {
    const key = `top_announcement_${topAnnouncement.value.id}_dismissed`;
    localStorage.setItem(key, Date.now().toString());
  }
};

// 当公告显示时，更新CSS变量来控制main的margin-top和nav的top
const updateLayout = async () => {
  const root = document.documentElement;
  if (visible.value) {
    // 等待DOM渲染后获取实际高度
    await nextTick();
    if (announcementElement.value) {
      const height = announcementElement.value.offsetHeight;
      root.style.setProperty('--announcement-height', `${height}px`);
    }
  } else {
    root.style.setProperty('--announcement-height', '0px');
  }
};

// 监听visible变化，更新布局
watch(visible, updateLayout, { immediate: true });

// 监听topAnnouncement变化，重新检查是否显示
watch(topAnnouncement, () => {
  if (topAnnouncement.value && shouldShow()) {
    visible.value = true;
  } else {
    visible.value = false;
  }
});

// 初始化
onMounted(() => {
  // 获取顶部公告
  fetchTopAnnouncement();
  
  // 监听窗口大小变化，重新计算高度
  window.addEventListener('resize', updateLayout);
  
  // 定期刷新顶部公告（每5分钟检查一次）
  refreshInterval = setInterval(fetchTopAnnouncement, 5 * 60 * 1000);
});

// 组件卸载时清理CSS变量和事件监听
onUnmounted(() => {
  document.documentElement.style.setProperty('--announcement-height', '0px');
  window.removeEventListener('resize', updateLayout);
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.top-announcement {
  position: fixed;
  top: 0; /* 固定在顶部 */
  left: 0;
  right: 0;
  z-index: 999; /* 在导航栏之上 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.announcement-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.announcement-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.announcement-text {
  flex: 1;
  min-width: 0;
}

.announcement-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.4;
}

.announcement-description {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
}

.close-button {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

/* 滑动动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .top-announcement {
    top: 0; /* 固定在顶部 */
  }
  
  .announcement-content {
    padding: 12px 16px;
    gap: 12px;
  }
  
  .announcement-title {
    font-size: 14px;
  }
  
  .announcement-description {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .top-announcement {
    top: 0;
  }
}
</style>

