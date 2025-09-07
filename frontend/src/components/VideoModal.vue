<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
      <div class="modal-container">
        <video 
          ref="videoRef"
          :src="src" 
          controls 
          autoplay
          @error="handleVideoError"
          @loadstart="handleLoadStart"
          @canplay="handleCanPlay"
          @stalled="handleStalled"
          @suspend="handleSuspend"
        ></video>
        
        <!-- 视频播放错误提示 -->
        <div v-if="showErrorTip" class="video-error-tip">
          <div class="error-icon">⚠️</div>
          <div class="error-content">
            <h4>视频播放遇到问题</h4>
            <p>{{ errorMessage }}</p>
            <div class="error-suggestions">
              <p><strong>可能的解决方案：</strong></p>
              <ul>
                <li>刷新页面重试</li>
                <li>检查网络连接</li>
                <li>尝试使用其他浏览器（推荐Chrome、Edge）</li>
                <li>更新浏览器到最新版本</li>
                <li>如果问题持续，请联系技术支持</li>
              </ul>
            </div>
            <div class="error-actions">
              <button class="btn-retry" @click="retryVideo">重试播放</button>
              <button class="btn-close" @click="$emit('close')">关闭</button>
            </div>
          </div>
        </div>
        
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch, onMounted, onUnmounted, ref, nextTick } from 'vue';

const props = defineProps({
  visible: Boolean,
  src: String
});
const emit = defineEmits(['close']);

// 视频相关的响应式数据
const videoRef = ref(null);
const showErrorTip = ref(false);
const errorMessage = ref('');
const loadingTimeout = ref(null);

// 监听 visible 变化，控制 body 滚动和重置错误状态
watch(() => props.visible, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
    // 重置错误状态
    showErrorTip.value = false;
    errorMessage.value = '';
    // 设置超时检测
    setupLoadingTimeout();
  } else {
    document.body.style.overflow = '';
    clearLoadingTimeout();
  }
});

// 设置加载超时检测
const setupLoadingTimeout = () => {
  clearLoadingTimeout();
  loadingTimeout.value = setTimeout(() => {
    if (videoRef.value && videoRef.value.readyState < 2) {
      handleVideoError({ type: 'timeout' });
    }
  }, 10000); // 10秒超时
};

// 清除加载超时
const clearLoadingTimeout = () => {
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value);
    loadingTimeout.value = null;
  }
};

// 视频开始加载
const handleLoadStart = () => {
  showErrorTip.value = false;
  setupLoadingTimeout();
};

// 视频可以播放
const handleCanPlay = () => {
  clearLoadingTimeout();
  showErrorTip.value = false;
};

// 视频停滞
const handleStalled = () => {
  console.warn('视频播放停滞');
};

// 视频暂停加载
const handleSuspend = () => {
  console.warn('视频加载暂停');
};

// 处理视频错误
const handleVideoError = (event) => {
  clearLoadingTimeout();
  showErrorTip.value = true;
  
  if (event.type === 'timeout') {
    errorMessage.value = '视频加载超时，可能是网络问题或文件过大。';
  } else if (videoRef.value && videoRef.value.error) {
    const error = videoRef.value.error;
    switch (error.code) {
      case error.MEDIA_ERR_ABORTED:
        errorMessage.value = '视频播放被中断。';
        break;
      case error.MEDIA_ERR_NETWORK:
        errorMessage.value = '网络错误导致视频下载失败。';
        break;
      case error.MEDIA_ERR_DECODE:
        errorMessage.value = '视频解码失败，可能是格式不支持或文件损坏。';
        break;
      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage.value = '视频格式不支持或文件路径无效。';
        break;
      default:
        errorMessage.value = '视频播放出现未知错误。';
    }
  } else {
    errorMessage.value = '视频播放出现问题，请尝试刷新页面。';
  }
  
  console.error('视频播放错误:', event, videoRef.value?.error);
};

// 重试播放视频
const retryVideo = () => {
  if (videoRef.value) {
    showErrorTip.value = false;
    videoRef.value.load(); // 重新加载视频
    setupLoadingTimeout();
  }
};

// 处理 ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.visible) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  clearLoadingTimeout();
  // 确保组件卸载时恢复 body 滚动
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-mask { position: fixed; z-index: 9998; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; }
.modal-container { position: relative; max-width: 80vw; max-height: 80vh;   display: flex; justify-content: center; align-items: center;}
.modal-container video { max-width: 100%; max-height: 100%; width: auto; height: 90vh; object-fit: contain; /* 保持比例完整显示 */ display: block; }
.close-button { 
  position: absolute; 
  top: -40px; 
  right: -40px; 
  background: rgba(255, 255, 255, 0.2); /* 半透明背景 */
  border: none; 
  border-radius: 50%; 
  color: white; 
  font-size: 1.8rem; /* 稍微小一点，更精致 */
  width: 40px; 
  height: 40px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  cursor: pointer; 
  transition: all 0.3s ease; 
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); /* 细微阴影 */
}
.close-button:hover { 
  background: rgba(255, 255, 255, 0.4); 
  transform: rotate(90deg); /* 鼠标悬停时旋转 */
}

/* 视频错误提示样式 */
.video-error-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10;
  text-align: left;
}

.error-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 16px;
}

.error-content h4 {
  margin: 0 0 12px 0;
  color: #e74c3c;
  font-size: 1.2rem;
  font-weight: 600;
}

.error-content p {
  margin: 0 0 16px 0;
  color: #666;
  line-height: 1.5;
}

.error-suggestions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.error-suggestions p {
  margin: 0 0 8px 0;
  color: #333;
  font-weight: 500;
}

.error-suggestions ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.error-suggestions li {
  margin: 4px 0;
  color: #555;
  line-height: 1.4;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-retry, .btn-close {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-retry {
  background: #3498db;
  color: white;
}

.btn-retry:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-close {
  background: #95a5a6;
  color: white;
}

.btn-close:hover {
  background: #7f8c8d;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .video-error-tip {
    width: 95%;
    padding: 20px;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .btn-retry, .btn-close {
    width: 100%;
  }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>