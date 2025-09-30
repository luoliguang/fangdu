<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
      <div class="modal-container">
        <div ref="videoContainer" class="video-container"></div>
        
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
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const props = defineProps({
  visible: Boolean,
  src: String
});
const emit = defineEmits(['close']);

// 视频相关的响应式数据
const videoContainer = ref(null);
const player = ref(null);
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
    // 初始化视频播放器
    nextTick(() => {
      initVideoPlayer();
    });
  } else {
    document.body.style.overflow = '';
    clearLoadingTimeout();
    // 销毁视频播放器
    disposeVideoPlayer();
  }
});

// 初始化视频播放器
const initVideoPlayer = () => {
  if (!videoContainer.value) return;
  
  // 创建video元素
  const videoElement = document.createElement('video');
  videoElement.className = 'video-js vjs-big-play-centered';
  videoContainer.value.appendChild(videoElement);
  
  // 初始化video.js播放器
  player.value = videojs(videoElement, {
    controls: true,
    autoplay: true,
    preload: 'auto',
    fluid: true,
    sources: [{
      src: props.src,
      type: getVideoType(props.src)
    }],
    html5: {
      hls: {
        overrideNative: true
      },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false
    }
  });
  
  // 设置事件监听
  player.value.on('error', handleVideoError);
  player.value.on('loadstart', handleLoadStart);
  player.value.on('canplay', handleCanPlay);
  player.value.on('stalled', handleStalled);
  player.value.on('suspend', handleSuspend);
  
  // 设置超时检测
  setupLoadingTimeout();
};

// 销毁视频播放器
const disposeVideoPlayer = () => {
  if (player.value) {
    player.value.dispose();
    player.value = null;
  }
};

// 根据文件扩展名获取视频类型
const getVideoType = (src) => {
  if (!src) return 'video/mp4';
  
  const extension = src.split('.').pop().toLowerCase();
  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
      return 'video/ogg';
    case 'm3u8':
      return 'application/x-mpegURL';
    case 'mpd':
      return 'application/dash+xml';
    default:
      return 'video/mp4';
  }
};

// 设置加载超时检测
const setupLoadingTimeout = () => {
  clearLoadingTimeout();
  loadingTimeout.value = setTimeout(() => {
    if (player.value && !player.value.readyState() || player.value.readyState() < 2) {
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
  } else if (player.value && player.value.error()) {
    const error = player.value.error();
    switch (error.code) {
      case 1: // MEDIA_ERR_ABORTED
        errorMessage.value = '视频播放被中断。';
        break;
      case 2: // MEDIA_ERR_NETWORK
        errorMessage.value = '网络错误导致视频下载失败。';
        break;
      case 3: // MEDIA_ERR_DECODE
        errorMessage.value = '视频解码失败，可能是格式不支持或文件损坏。';
        break;
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage.value = '视频格式不支持或文件路径无效。';
        break;
      default:
        errorMessage.value = '视频播放出现未知错误。';
    }
  } else {
    errorMessage.value = '视频播放出现问题，请尝试刷新页面。';
  }
  
  console.error('视频播放错误:', event, player.value?.error());
};

// 重试播放视频
const retryVideo = () => {
  if (player.value) {
    showErrorTip.value = false;
    player.value.reset();
    player.value.src({
      src: props.src,
      type: getVideoType(props.src)
    });
    player.value.load();
    player.value.play();
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
  disposeVideoPlayer();
  // 确保组件卸载时恢复 body 滚动
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-mask { position: fixed; z-index: 9998; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; }
.modal-container { position: relative; max-width: 80vw; max-height: 80vh; display: flex; justify-content: center; align-items: center;}
.video-container { width: 100%; height: 100%; min-width: 640px; min-height: 360px; }
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 20px;
  text-align: center;
  z-index: 10;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-content {
  max-width: 500px;
}

.error-content h4 {
  font-size: 24px;
  margin-bottom: 10px;
}

.error-suggestions {
  margin: 20px 0;
  text-align: left;
}

.error-suggestions ul {
  margin-left: 20px;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-retry, .btn-close {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn-retry {
  background-color: #4caf50;
  color: white;
}

.btn-retry:hover {
  background-color: #45a049;
}

.btn-close {
  background-color: #f44336;
  color: white;
}

.btn-close:hover {
  background-color: #d32f2f;
}

/* Video.js 自定义样式 */
:deep(.video-js) {
  width: 100%;
  height: 100%;
  min-width: 640px;
  min-height: 360px;
}

:deep(.vjs-big-play-button) {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

:deep(.vjs-poster) {
  background-size: contain;
}

/* 过渡动画 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>