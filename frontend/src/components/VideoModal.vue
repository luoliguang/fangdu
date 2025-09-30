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
                <li>如果在办公区域，可能受网络限制，请尝试使用手机热点</li>
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
  
  // 准备多个不同格式的视频源
  const sources = [];
  
  // 添加主源
  if (props.src) {
    sources.push({
      src: props.src,
      type: getVideoType(props.src)
    });
    
    // 添加备用源（如果原始源是mp4，添加webm备用，反之亦然）
    const extension = props.src.split('.').pop().toLowerCase();
    const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
    
    if (extension === 'mp4') {
      // 添加webm备用源
      sources.push({
        src: `${baseSrc}.webm`,
        type: 'video/webm'
      });
    } else if (extension === 'webm') {
      // 添加mp4备用源
      sources.push({
        src: `${baseSrc}.mp4`,
        type: 'video/mp4'
      });
    }
    
    // 添加低分辨率备用源（适合网络受限环境）
    sources.push({
      src: `${baseSrc}_low.${extension}`,
      type: getVideoType(props.src)
    });
  }
  
  // 初始化video.js播放器，使用多源配置
  player.value = videojs(videoElement, {
    controls: true,
    autoplay: true,
    preload: 'auto',
    fluid: true,
    sources: sources,
    html5: {
      hls: {
        overrideNative: true,
        enableLowInitialPlaylist: true,
        limitRenditionByPlayerDimensions: false,
        smoothQualityChange: true
      },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false
    },
    techOrder: ["html5"]
  });
  
  // 设置事件监听
  player.value.on('error', handleVideoError);
  player.value.on('loadstart', handleLoadStart);
  player.value.on('canplay', handleCanPlay);
  player.value.on('stalled', handleStalled);
  player.value.on('suspend', handleSuspend);
  
  // 添加网络状态检测
  checkNetworkStatus();
  
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

// 添加网络状态检测函数
const checkNetworkStatus = () => {
  // 检测网络连接状态
  if (!navigator.onLine) {
    handleVideoError({ type: 'network', message: '网络连接已断开' });
    return;
  }
  
  // 检测网络速度
  if (window.performance && window.performance.navigation) {
    const navTiming = window.performance.timing;
    const loadTime = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
    
    // 如果页面加载时间过长，可能是网络较慢
    if (loadTime > 5000) {
      console.warn('网络连接较慢，可能影响视频播放');
    }
  }
  
  // 尝试检测是否在企业网络环境
  checkCorporateNetwork();
};

// 检测是否在企业网络环境
const checkCorporateNetwork = () => {
  // 创建一个图像对象来测试外部资源加载
  const testImage = new Image();
  let isBlocked = false;
  
  // 设置超时
  const timeoutId = setTimeout(() => {
    isBlocked = true;
    console.warn('可能处于受限网络环境，某些资源可能被阻止');
  }, 3000);
  
  // 图像加载成功
  testImage.onload = () => {
    clearTimeout(timeoutId);
    if (!isBlocked) {
      console.log('网络环境正常');
    }
  };
  
  // 图像加载失败
  testImage.onerror = () => {
    clearTimeout(timeoutId);
    console.warn('可能处于受限网络环境，某些资源可能被阻止');
  };
  
  // 尝试加载一个常见的外部资源
  testImage.src = 'https://www.google.com/favicon.ico';
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
  } else if (event.type === 'network') {
    errorMessage.value = event.message || '网络连接问题，请检查您的网络设置。';
  } else if (player.value && player.value.error()) {
    const error = player.value.error();
    switch (error.code) {
      case 1: // MEDIA_ERR_ABORTED
        errorMessage.value = '视频播放被中断。';
        break;
      case 2: // MEDIA_ERR_NETWORK
        errorMessage.value = '网络错误导致视频下载失败，可能是办公网络限制导致。';
        // 尝试切换到低分辨率版本
        tryLowResolutionSource();
        break;
      case 3: // MEDIA_ERR_DECODE
        errorMessage.value = '视频解码失败，可能是格式不支持或文件损坏。';
        // 尝试切换到其他格式
        tryAlternativeFormat();
        break;
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage.value = '视频格式不支持或文件路径无效，可能是办公网络限制导致。';
        // 尝试切换到其他格式
        tryAlternativeFormat();
        break;
      default:
        errorMessage.value = '视频播放出现未知错误。';
    }
  } else {
    errorMessage.value = '视频播放出现问题，请尝试刷新页面或检查办公网络设置。';
  }
  
  console.error('视频播放错误:', event, player.value?.error());
};

// 尝试使用低分辨率视频源
const tryLowResolutionSource = () => {
  if (!props.src || !player.value) return;
  
  const extension = props.src.split('.').pop().toLowerCase();
  const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
  const lowResSrc = `${baseSrc}_low.${extension}`;
  
  console.log('尝试切换到低分辨率视频源:', lowResSrc);
  
  // 更新错误提示
  errorMessage.value += ' 正在尝试使用低分辨率版本...';
  
  // 延迟一下再切换源，让用户看到提示
  setTimeout(() => {
    if (player.value) {
      player.value.src({
        src: lowResSrc,
        type: getVideoType(lowResSrc)
      });
      player.value.load();
      player.value.play().catch(err => {
        console.error('低分辨率视频播放失败:', err);
      });
    }
  }, 2000);
};

// 尝试使用替代格式
const tryAlternativeFormat = () => {
  if (!props.src || !player.value) return;
  
  const extension = props.src.split('.').pop().toLowerCase();
  const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
  
  let alternativeSrc = '';
  let alternativeType = '';
  
  if (extension === 'mp4') {
    alternativeSrc = `${baseSrc}.webm`;
    alternativeType = 'video/webm';
  } else {
    alternativeSrc = `${baseSrc}.mp4`;
    alternativeType = 'video/mp4';
  }
  
  console.log('尝试切换到替代格式:', alternativeSrc);
  
  // 更新错误提示
  errorMessage.value += ' 正在尝试使用替代格式...';
  
  // 延迟一下再切换源，让用户看到提示
  setTimeout(() => {
    if (player.value) {
      player.value.src({
        src: alternativeSrc,
        type: alternativeType
      });
      player.value.load();
      player.value.play().catch(err => {
        console.error('替代格式视频播放失败:', err);
        // 如果替代格式也失败，尝试低分辨率版本
        tryLowResolutionSource();
      });
    }
  }, 2000);
};

// 重试播放视频
const retryVideo = () => {
  if (player.value) {
    showErrorTip.value = false;
    errorMessage.value = '';
    
    // 检查网络状态
    checkNetworkStatus();
    
    // 重置播放器
    player.value.reset();
    
    // 尝试使用原始源
    player.value.src({
      src: props.src,
      type: getVideoType(props.src)
    });
    
    player.value.load();
    player.value.play().catch(err => {
      console.error('重试播放失败:', err);
      handleVideoError({ type: 'retry_failed', message: '重试播放失败，尝试使用其他格式...' });
      // 如果重试失败，尝试其他格式
      tryAlternativeFormat();
    });
    
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