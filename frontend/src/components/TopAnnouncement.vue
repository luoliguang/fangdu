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
            <MdPreview 
              :modelValue="topAnnouncement.content" 
              language="zh-CN" 
              :showCodeRowNumber="false"
              previewTheme="default"
              :theme="'light'"
              class="top-announcement-markdown"
            />
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
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
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
  line-height: 1.4;
  /* 移除 opacity，让内容更清晰 */
  background: transparent !important;
}

/* 针对 MdPreview 组件的样式 */
.top-announcement-markdown :deep(*) {
  background-color: transparent !important;
}

.top-announcement-markdown :deep(.md-editor-preview-wrapper),
.top-announcement-markdown :deep(.md-editor-preview),
.top-announcement-markdown :deep(.md-editor-preview-body),
.top-announcement-markdown :deep(.md-preview),
.top-announcement-markdown :deep(.md-preview-wrapper) {
  background: transparent !important;
  background-color: transparent !important;
}

/* Markdown 预览样式定制 */
.announcement-description :deep(.md-editor-preview) {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.95) !important;
  padding: 0 !important;
  font-size: 14px;
  line-height: 1.5;
}

.announcement-description :deep(.md-editor-preview-wrapper) {
  background: transparent !important;
  background-color: transparent !important;
}

/* 确保所有可能产生背景的元素都是透明的 */
.announcement-description :deep(.md-editor-preview-wrapper),
.announcement-description :deep(.md-editor-preview),
.announcement-description :deep(.md-editor-preview-body),
.announcement-description :deep(.md-preview),
.announcement-description :deep(.md-preview-wrapper) {
  background: transparent !important;
  background-color: transparent !important;
}

/* 移除任何可能产生的白色背景或边框 */
.announcement-description :deep(div) {
  background-color: transparent !important;
}

/* 确保列表、段落等元素也是透明的 */
.announcement-description :deep(p),
.announcement-description :deep(ul),
.announcement-description :deep(ol),
.announcement-description :deep(li) {
  background-color: transparent !important;
}

.announcement-description :deep(p) {
  margin: 0 0 8px 0;
  color: rgba(255, 255, 255, 0.95);
}

.announcement-description :deep(p:last-child) {
  margin-bottom: 0;
}

.announcement-description :deep(h1),
.announcement-description :deep(h2),
.announcement-description :deep(h3),
.announcement-description :deep(h4),
.announcement-description :deep(h5),
.announcement-description :deep(h6) {
  margin: 0 0 8px 0;
  color: white;
  font-weight: 600;
}

.announcement-description :deep(h1) { font-size: 18px; }
.announcement-description :deep(h2) { font-size: 17px; }
.announcement-description :deep(h3) { font-size: 16px; }
.announcement-description :deep(h4),
.announcement-description :deep(h5),
.announcement-description :deep(h6) { font-size: 15px; }

.announcement-description :deep(a) {
  color: rgba(255, 255, 255, 1);
  text-decoration: underline;
}

.announcement-description :deep(a:hover) {
  opacity: 0.8;
}

.announcement-description :deep(strong),
.announcement-description :deep(b) {
  color: white;
  font-weight: 600;
}

.announcement-description :deep(em),
.announcement-description :deep(i) {
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
}

.announcement-description :deep(ul),
.announcement-description :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.95);
}

.announcement-description :deep(li) {
  margin: 4px 0;
}

.announcement-description :deep(code) {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.announcement-description :deep(pre) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.announcement-description :deep(pre code) {
  background: transparent;
  padding: 0;
}

.announcement-description :deep(blockquote) {
  border-left: 3px solid rgba(255, 255, 255, 0.5);
  padding-left: 12px;
  margin: 8px 0;
  color: rgba(255, 255, 255, 0.9);
}

.announcement-description :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}

.announcement-description :deep(table th),
.announcement-description :deep(table td) {
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 4px 8px;
  background: transparent !important;
}

.announcement-description :deep(table th) {
  background: rgba(255, 255, 255, 0.15) !important;
  font-weight: 600;
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
  
  .announcement-description :deep(.md-editor-preview) {
    font-size: 12px;
  }
  
  .announcement-description :deep(h1) { font-size: 14px; }
  .announcement-description :deep(h2) { font-size: 13px; }
  .announcement-description :deep(h3) { font-size: 12px; }
}

@media (max-width: 480px) {
  .top-announcement {
    top: 0;
  }
}
</style>

