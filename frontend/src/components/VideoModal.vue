<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
      <div class="modal-container">
        <div ref="videoContainer" class="video-container"></div>
        
        <!-- 视频播放错误提示 -->
        <div v-if="showErrorTip" class="error-content">
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
                <li v-if="deviceInfo.isLowEndDevice">您的设备配置较低，建议关闭其他应用程序</li>
                <li v-if="deviceInfo.isOldDevice">您的浏览器版本较旧，建议升级到最新版本</li>
                <li v-if="isOssVideo">阿里云OSS视频可能需要转码处理，建议使用阿里云视频点播服务</li>
                <li>如果问题持续，请联系技术支持</li>
              </ul>
            </div>
            <div class="error-actions">
              <button class="btn-retry" @click="retryVideo">重试播放</button>
              <button v-if="hasAlternativeSource" class="btn-alternative" @click="tryAlternativeFormat">尝试其他格式</button>
              <button v-if="hasLowResSource" class="btn-lowres" @click="tryLowResolutionSource">尝试低清版本</button>
              <button v-if="isOssVideo && !isTranscoding" class="btn-transcode" @click="transcodeVideo">使用FFmpeg转码</button>
              <button class="btn-close" @click="$emit('close')">关闭</button>
            </div>
          </div>
        </div>
        
        <!-- 转码进度提示 -->
        <div v-if="isTranscoding" class="transcoding-tip">
          <div class="loading-spinner"></div>
          <p>正在转码视频，请稍候... {{ transcodingProgress }}%</p>
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
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const props = defineProps({
  visible: Boolean,
  src: String,
  poster: String
});
const emit = defineEmits(['close']);

// 视频相关的响应式数据
const videoContainer = ref(null);
const player = ref(null);
const showErrorTip = ref(false);
const errorMessage = ref('');
const loadingTimeout = ref(null);
const deviceInfo = ref({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isLowEndDevice: false,
  isOldDevice: false,
  connectionType: 'unknown'
});
const hasAlternativeSource = ref(false);
const hasLowResSource = ref(false);
const isOssVideo = ref(false);
const isTranscoding = ref(false);
const transcodingProgress = ref(0);
const ffmpeg = ref(null);

// 监听 visible 变化，控制 body 滚动和重置错误状态
watch(() => props.visible, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
    // 重置错误状态
    showErrorTip.value = false;
    errorMessage.value = '';
    
    // 检查浏览器兼容性
    const browserCompat = checkBrowserCompatibility();
    if (!browserCompat.isCompatible) {
      showErrorTip.value = true;
      errorMessage.value = `浏览器兼容性问题: ${browserCompat.issues.join(', ')}`;
      return;
    }
    
    // 检查设备环境
    deviceInfo.value = checkDeviceEnvironment();
    if (deviceInfo.value.isLowEndDevice) {
      console.log('检测到低端设备，将应用优化设置');
    }
    
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
const initVideoPlayer = async () => {
  if (!videoContainer.value) return;
  
  // 检查网络状态和环境
  const networkOk = checkNetworkStatus();
  if (!networkOk) {
    return;
  }
  
  // 创建video元素
  const videoElement = document.createElement('video');
  videoElement.className = 'video-js vjs-big-play-centered';
  // 先不强制设置跨域，待确定源是否同源后再设置
  // videoContainer.value.appendChild(videoElement);
  
  // 准备多个不同格式的视频源
  const sources = [];
  
  // 判断是否跨域
  const isCrossOrigin = (url) => {
    try {
      if (!url) return false;
      if (url.startsWith('blob:') || url.startsWith('data:')) return false;
      const u = new URL(url, window.location.href);
      return u.origin !== window.location.origin;
    } catch (_) {
      return true;
    }
  };
  
  // 添加一个URL可用性探测方法（优先HEAD，其次Range GET），公司网络/CORS下更稳健
  const urlReachable = async (url, signal) => {
    if (!url) return false;
    try {
      // 同源或 blob:/data: 直接认为可达，避免本地/开发环境被误判
      if (url.startsWith('blob:') || url.startsWith('data:')) return true;
      try {
        const test = new URL(url, window.location.href);
        if (test.origin === window.location.origin) return true;
        // 对跨域资源不做主动探测，避免触发CORS错误日志
        return false;
      } catch (_) {}
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const headResp = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (headResp.ok || headResp.status === 206) return true;
    } catch (_) {}
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const getResp = await fetch(url, {
        method: 'GET',
        headers: { 'Range': 'bytes=0-1' },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return getResp.ok || getResp.status === 206;
    } catch (_) {
      return false;
    }
  };
  
  // 添加主源
  if (props.src) {
    const mainSrcPath = normalizePath(props.src);
    const cross = isCrossOrigin(mainSrcPath);
    
    // 始终加入主源
    sources.push({
      src: mainSrcPath,
      type: getVideoType(props.src)
    });
    
    // 可达性探测仅用于同源备用策略与日志；跨域不探测，避免CORS报错
    if (!cross) {
      if (!(await urlReachable(mainSrcPath))) {
        console.warn('主视频源可用性探测失败(同源):', mainSrcPath);
      }
    }
    
    // 仅同源时构造备用源，避免跨域环境下生成404/触发CORS
    if (!cross) {
      const extension = props.src.split('.').pop().toLowerCase();
      const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
      
      if (extension === 'mp4') {
        const webmSrc = normalizePath(`${baseSrc}.webm`);
        if (await urlReachable(webmSrc)) {
          sources.push({ src: webmSrc, type: 'video/webm' });
          hasAlternativeSource.value = true;
        }
      } else if (extension === 'webm') {
        const mp4Src = normalizePath(`${baseSrc}.mp4`);
        if (await urlReachable(mp4Src)) {
          sources.push({ src: mp4Src, type: 'video/mp4' });
          hasAlternativeSource.value = true;
        }
      }
      
      const lowResSrc = normalizePath(`${baseSrc}_low.${extension}`);
      if (await urlReachable(lowResSrc)) {
        sources.push({ src: lowResSrc, type: getVideoType(props.src) });
        hasLowResSource.value = true;
      }
      
      const hlsSrc = normalizePath(`${baseSrc}.m3u8`);
      if (await urlReachable(hlsSrc)) {
        sources.push({ src: hlsSrc, type: 'application/x-mpegURL' });
      }
    } else {
      hasAlternativeSource.value = false;
      hasLowResSource.value = false;
    }
  }
  
  // 根据首个源是否同源决定是否设置 crossorigin
  if (sources.length > 0) {
    try {
      const first = new URL(sources[0].src, window.location.href);
      if (first.origin === window.location.origin || first.origin === 'null') {
        videoElement.setAttribute('crossorigin', 'anonymous');
      } else {
        videoElement.removeAttribute('crossorigin');
      }
    } catch (_) {
      videoElement.removeAttribute('crossorigin');
    }
  }
  
  // 将元素挂载到容器
  videoContainer.value.appendChild(videoElement);
  
  // 检测设备环境并准备播放器配置
  console.log('设备环境检测结果:', deviceInfo.value);

  // 初始化video.js播放器，使用多源配置和环境适配
  player.value = videojs(videoElement, {
    controls: true,
    autoplay: !deviceInfo.value.isLowEndDevice, // 低端设备不自动播放
    preload: deviceInfo.value.isLowEndDevice ? 'metadata' : 'auto', // 低端设备只预加载元数据
    fluid: true,
    poster: props.poster ? normalizePath(props.poster) : null,
    sources: sources,
    html5: {
      hls: {
        overrideNative: true,
        enableLowInitialPlaylist: deviceInfo.value.isLowEndDevice || deviceInfo.value.isMobile,
        limitRenditionByPlayerDimensions: deviceInfo.value.isMobile || deviceInfo.value.isTablet,
        smoothQualityChange: !deviceInfo.value.isLowEndDevice,
        bandwidth: deviceInfo.value.isLowEndDevice ? 1000000 : undefined // 低端设备限制带宽
      },
      // 关键：关闭凭据，跨域以匿名方式请求
      vhs: { withCredentials: false },
      xhr: { withCredentials: false },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false
    },
    techOrder: ["html5"],
    // 添加响应式UI配置
    responsive: true,
    playbackRates: [0.5, 1, 1.5, 2]
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

// 检测设备和环境
const checkDeviceEnvironment = () => {
  const deviceInfo = {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
    isDesktop: !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
    isLowEndDevice: false,
    isOldDevice: false,
    connectionType: 'unknown'
  };
  
  // 检测是否为低端设备
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    deviceInfo.isLowEndDevice = true;
  }
  
  // 检测内存情况（如果可用）
  if (navigator.deviceMemory) {
    if (navigator.deviceMemory < 2) {
      deviceInfo.isLowEndDevice = true;
    }
  }
  
  // 检测网络连接类型
  if (navigator.connection) {
    deviceInfo.connectionType = navigator.connection.effectiveType || 'unknown';
    if (['slow-2g', '2g', '3g'].includes(deviceInfo.connectionType)) {
      deviceInfo.isLowEndDevice = true;
    }
  }
  
  // 检测是否为旧设备（基于浏览器版本）
  const browserInfo = checkBrowserCompatibility();
  if (browserInfo.isOutdated) {
    deviceInfo.isOldDevice = true;
  }
  
  console.log('设备环境检测完成:', deviceInfo);
  return deviceInfo;
};

// 应用移动设备优化
const applyMobileOptimizations = () => {
  if (player.value) {
    // 移动设备上使用较低分辨率
    if (player.value.options_ && player.value.options_.html5) {
      player.value.options_.html5.vhs = {
        ...player.value.options_.html5.vhs,
        enableLowInitialPlaylist: true,
        limitRenditionByPlayerDimensions: true
      };
    }
    
    // 减少缓冲以节省数据流量
    if (player.value.tech_ && player.value.tech_.vhs) {
      player.value.tech_.vhs.bufferSize = 15; // 15秒缓冲
    }
    
    console.log('已应用移动设备优化设置');
  }
};

// 应用低端设备优化
const applyLowEndDeviceOptimizations = () => {
  if (player.value) {
    // 低端设备使用最低分辨率
    if (player.value.options_ && player.value.options_.html5) {
      player.value.options_.html5.vhs = {
        ...player.value.options_.html5.vhs,
        enableLowInitialPlaylist: true,
        limitRenditionByPlayerDimensions: true,
        useDevicePixelRatio: false
      };
    }
    
    // 减少缓冲区大小，降低内存占用
    if (player.value.tech_ && player.value.tech_.vhs) {
      player.value.tech_.vhs.bufferSize = 5; // 5秒缓冲
    }
    
    // 禁用一些高级功能
    player.value.autoplay(false);
    
    console.log('已应用低端设备优化设置');
  }
};

// 添加浏览器兼容性检测函数
const checkBrowserCompatibility = () => {
  const browserInfo = {
    name: '',
    version: '',
    isCompatible: true,
    isOutdated: false,
    issues: []
  };
  
  // 获取浏览器信息
  const userAgent = navigator.userAgent;
  
  // 检测浏览器类型和版本
  if (userAgent.indexOf("Edge") > -1 || userAgent.indexOf("Edg") > -1) {
    browserInfo.name = "Edge";
    const edgeMatch = userAgent.match(/(Edge|Edg)\/(\d+)/);
    browserInfo.version = edgeMatch ? edgeMatch[2] : "";
  } else if (userAgent.indexOf("Chrome") > -1) {
    browserInfo.name = "Chrome";
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    browserInfo.version = chromeMatch ? chromeMatch[1] : "";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browserInfo.name = "Firefox";
    const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
    browserInfo.version = firefoxMatch ? firefoxMatch[1] : "";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserInfo.name = "Safari";
    const safariMatch = userAgent.match(/Version\/(\d+)/);
    browserInfo.version = safariMatch ? safariMatch[1] : "";
  } else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident/") > -1) {
    browserInfo.name = "Internet Explorer";
    browserInfo.isCompatible = false;
    browserInfo.isOutdated = true;
    browserInfo.issues.push("Internet Explorer 不完全支持现代视频格式，建议使用 Chrome 或 Edge");
  }
  
  // 检查视频格式支持
  const videoElement = document.createElement('video');
  
  if (!videoElement.canPlayType) {
    browserInfo.isCompatible = false;
    browserInfo.issues.push("您的浏览器不支持 HTML5 视频");
  } else {
    // 检查常见视频格式支持
    const formats = {
      mp4: videoElement.canPlayType('video/mp4'),
      webm: videoElement.canPlayType('video/webm'),
      ogg: videoElement.canPlayType('video/ogg'),
      hls: videoElement.canPlayType('application/x-mpegURL') || videoElement.canPlayType('application/vnd.apple.mpegURL')
    };
    
    // 记录不支持的格式
    Object.entries(formats).forEach(([format, support]) => {
      if (!support) {
        browserInfo.issues.push(`不支持 ${format.toUpperCase()} 格式`);
      }
    });
    
    // 如果主要格式都不支持，标记为不兼容
    if (!formats.mp4 && !formats.webm) {
      browserInfo.isCompatible = false;
      browserInfo.issues.push("您的浏览器不支持常见的视频格式，建议升级浏览器");
    }
  }
  
  // 检查是否为旧版浏览器
  if (browserInfo.name === "Chrome" && parseInt(browserInfo.version) < 70) {
    browserInfo.issues.push("您的Chrome浏览器版本较低，可能影响视频播放，建议升级");
    browserInfo.isOutdated = true;
  } else if (browserInfo.name === "Firefox" && parseInt(browserInfo.version) < 65) {
    browserInfo.issues.push("您的Firefox浏览器版本较低，可能影响视频播放，建议升级");
    browserInfo.isOutdated = true;
  } else if (browserInfo.name === "Safari" && parseInt(browserInfo.version) < 12) {
    browserInfo.issues.push("您的Safari浏览器版本较低，可能影响视频播放，建议升级");
    browserInfo.isOutdated = true;
  } else if (browserInfo.name === "Edge" && parseInt(browserInfo.version) < 79) {
    browserInfo.issues.push("您的Edge浏览器版本较低，可能影响视频播放，建议升级");
    browserInfo.isOutdated = true;
  }
  
  console.log('浏览器兼容性检查结果:', browserInfo);
  return browserInfo;
};

// 添加网络状态检测函数
const checkNetworkStatus = () => {
  // 检测网络连接状态
  if (!navigator.onLine) {
    handleVideoError({ type: 'network', message: '网络连接已断开' });
    return false;
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
  const isCorpNetwork = checkCorporateNetwork();
  if (isCorpNetwork) {
    console.warn('检测到企业网络环境，可能影响视频播放');
    // 自动应用企业网络环境优化
    applyCorpNetworkOptimizations();
  }
  
  return true;
};

// 应用企业网络环境优化
const applyCorpNetworkOptimizations = () => {
  // 如果检测到企业网络环境，预先设置一些优化选项
  if (player.value) {
    // 降低初始播放质量
    if (player.value.options_ && player.value.options_.html5) {
      player.value.options_.html5.vhs = {
        overrideNative: true,
        enableLowInitialPlaylist: true,
        limitRenditionByPlayerDimensions: true,
        useDevicePixelRatio: false
      };
    }
    
    // 减少缓冲区大小，更快开始播放
    if (player.value.tech_ && player.value.tech_.vhs) {
      player.value.tech_.vhs.bandwidth = 1000000; // 1Mbps
      player.value.tech_.vhs.bufferSize = 10; // 10秒缓冲
    }
    
    console.log('已应用企业网络环境优化设置');
  }
};

// 检测是否在企业网络环境
const checkCorporateNetwork = () => {
  // 创建一个图像对象来测试外部资源加载
  const testImage = new Image();
  let isBlocked = false;
  let isCorpNetwork = false;
  
  // 设置超时
  const timeoutId = setTimeout(() => {
    isBlocked = true;
    isCorpNetwork = true;
    console.warn('可能处于受限网络环境，某些资源可能被阻止');
  }, 3000);
  
  // 图像加载成功
  testImage.onload = () => {
    clearTimeout(timeoutId);
    if (!isBlocked) {
      console.log('网络环境正常');
      isCorpNetwork = false;
    }
  };
  
  // 图像加载失败
  testImage.onerror = () => {
    clearTimeout(timeoutId);
    console.warn('可能处于受限网络环境，某些资源可能被阻止');
    isCorpNetwork = true;
  };
  
  // 尝试加载一个常见的外部资源
  testImage.src = 'https://www.google.com/favicon.ico';
  
  // 检查是否使用了代理
  if (window.location.hostname.includes('internal') || 
      window.location.hostname.includes('intranet') ||
      window.location.hostname.includes('corp')) {
    isCorpNetwork = true;
  }
  
  return isCorpNetwork;
};

// 规范化路径，处理本地和生产环境的路径差异
const normalizePath = (path) => {
  if (!path) return null;
  
  // 如果是完整URL（包含http或https），直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 如果是相对路径，确保正确处理
  if (path.startsWith('./') || path.startsWith('../')) {
    // 在生产环境中可能需要添加基础路径
    const baseUrl = import.meta.env.BASE_URL || '/';
    return new URL(path, window.location.origin + baseUrl).href;
  }
  
  // 如果是绝对路径（以/开头）
  if (path.startsWith('/')) {
    return new URL(path, window.location.origin).href;
  }
  
  // 其他情况，添加基础路径
  const baseUrl = import.meta.env.BASE_URL || '/';
  return new URL(path, window.location.origin + baseUrl).href;
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

// 检查视频编码兼容性
const checkVideoCodecCompatibility = (src) => {
  return new Promise((resolve) => {
    // 创建一个临时视频元素来测试编码兼容性
    const testVideo = document.createElement('video');
    testVideo.style.display = 'none';
    document.body.appendChild(testVideo);
    
    // 设置测试源
    const source = document.createElement('source');
    source.src = src;
    source.type = getVideoType(src);
    testVideo.appendChild(source);
    
    // 设置超时，避免长时间等待
    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        compatible: false,
        reason: '视频加载超时，可能是格式不兼容或网络问题'
      });
    }, 5000);
    
    // 视频可以播放
    testVideo.oncanplay = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        compatible: true
      });
    };
    
    // 视频错误
    testVideo.onerror = () => {
      clearTimeout(timeout);
      const errorCode = testVideo.error ? testVideo.error.code : 0;
      let reason = '未知错误';
      
      switch (errorCode) {
        case 1:
          reason = '视频加载被中断';
          break;
        case 2:
          reason = '网络错误，无法加载视频';
          break;
        case 3:
          reason = '视频解码失败，编码格式可能不兼容';
          break;
        case 4:
          reason = '视频格式不受支持';
          break;
      }
      
      cleanup();
      resolve({
        compatible: false,
        reason,
        errorCode
      });
    };
    
    // 清理函数
    function cleanup() {
      if (testVideo.parentNode) {
        testVideo.pause();
        document.body.removeChild(testVideo);
      }
    }
    
    // 开始加载视频
    testVideo.load();
  });
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
const handleVideoError = async (event) => {
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
        // 检查是否是阿里云OSS兼容性问题
        checkOssCompatibility();
        // 尝试切换到其他格式
        tryAlternativeFormat();
        break;
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage.value = '视频格式不支持或文件路径无效，可能是阿里云OSS格式兼容性问题。';
        // 检查是否是阿里云OSS兼容性问题
        checkOssCompatibility();
        // 尝试切换到其他格式
        tryAlternativeFormat();
        break;
      default:
        errorMessage.value = '视频播放出现未知错误。';
    }
  } else {
    errorMessage.value = '视频播放出现问题，请尝试刷新页面或检查办公网络设置。';
  }
  
  // 添加设备特定的错误提示
  if (deviceInfo.value.isLowEndDevice) {
    errorMessage.value += ' 您的设备配置较低，可能影响视频播放。';
  }
  
  if (deviceInfo.value.isOldDevice) {
    errorMessage.value += ' 您的浏览器版本较旧，建议升级。';
  }
  
  console.error('视频播放错误:', event, player.value?.error());
};

// 检查是否是阿里云OSS兼容性问题
const checkOssCompatibility = () => {
  // 检查视频URL是否来自阿里云OSS
  if (props.src && (props.src.includes('aliyuncs.com') || props.src.includes('oss-cn'))) {
    console.warn('检测到阿里云OSS视频源，可能存在格式兼容性问题');
    errorMessage.value += ' 检测到阿里云OSS视频源，可能需要转码处理。';
    isOssVideo.value = true;
    
    // 添加OSS特定的错误提示到控制台
    console.log('阿里云OSS视频可能需要通过转码服务处理，建议使用阿里云的视频点播服务');
  }
};

// 尝试使用低分辨率视频源
const tryLowResolutionSource = async () => {
  if (!props.src || !player.value) return;
  
  const extension = props.src.split('.').pop().toLowerCase();
  const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
  const lowResSrc = normalizePath(`${baseSrc}_low.${extension}`);
  
  if (!(await urlReachable(lowResSrc))) {
    console.warn('低清视频不可达，放弃切换:', lowResSrc);
    return;
  }
  
  console.log('尝试切换到低分辨率视频源:', lowResSrc);
  
  // 更新错误提示
  errorMessage.value += ' 正在尝试使用低分辨率版本...';
  
  setTimeout(() => {
    if (player.value) {
      player.value.src({ src: lowResSrc, type: getVideoType(lowResSrc) });
      player.value.load();
      player.value.play().catch(err => {
        console.error('低分辨率视频播放失败:', err);
      });
    }
  }, 2000);
};

// 尝试使用替代格式
const tryAlternativeFormat = async () => {
  if (!props.src || !player.value) return;
  
  const extension = props.src.split('.').pop().toLowerCase();
  const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
  
  let alternativeSrc = '';
  let alternativeType = '';
  
  if (extension === 'mp4') {
    alternativeSrc = normalizePath(`${baseSrc}.webm`);
    alternativeType = 'video/webm';
  } else {
    alternativeSrc = normalizePath(`${baseSrc}.mp4`);
    alternativeType = 'video/mp4';
  }
  
  if (!(await urlReachable(alternativeSrc))) {
    console.warn('替代格式视频不可达，放弃切换:', alternativeSrc);
    // 如果替代也不可达，尝试低清
    return tryLowResolutionSource();
  }
  
  console.log('尝试切换到替代格式:', alternativeSrc);
  
  errorMessage.value += ' 正在尝试使用替代格式...';
  
  setTimeout(() => {
    if (player.value) {
      player.value.src({ src: alternativeSrc, type: alternativeType });
      player.value.load();
      player.value.play().catch(err => {
        console.error('替代格式视频播放失败:', err);
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
      src: normalizePath(props.src),
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

// 使用FFmpeg转码视频
const transcodeVideo = async () => {
  try {
    isTranscoding.value = true;
    transcodingProgress.value = 0;
    
    // 初始化FFmpeg - 使用兼容的0.10.x版本API
    if (!ffmpeg.value) {
      ffmpeg.value = createFFmpeg({
        log: true,
        progress: ({ ratio }) => {
          transcodingProgress.value = Math.floor(ratio * 100);
        },
        corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js' // 指定Core库路径
      });
      await ffmpeg.value.load();
    }
    
    // 获取视频文件名
    const fileName = props.src.split('/').pop() || 'video.mp4';
    const outputFileName = 'transcoded_' + fileName;
    
    // 获取视频文件
    const videoData = await fetchFile(props.src);
    
    // 写入FFmpeg文件系统
    ffmpeg.value.FS('writeFile', fileName, videoData);
    
    // 执行转码，转为H.264编码的MP4
    await ffmpeg.value.run(
      '-i', fileName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputFileName
    );
    
    // 从FFmpeg文件系统读取转码后的文件
    const data = ffmpeg.value.FS('readFile', outputFileName);
    
    // 创建Blob URL - 在0.10.x版本中，data已经是Uint8Array
    const blob = new Blob([data], { type: 'video/mp4' });
    const transcodedUrl = URL.createObjectURL(blob);
    
    // 重新初始化播放器使用转码后的视频
    if (player.value) {
      player.value.src({
        src: transcodedUrl,
        type: 'video/mp4'
      });
      player.value.load();
      player.value.play().catch(err => {
        console.error('转码后视频播放失败:', err);
      });
    }
    
    // 清理FFmpeg文件系统
    ffmpeg.value.FS('unlink', fileName);
    ffmpeg.value.FS('unlink', outputFileName);
    
    showErrorTip.value = false;
    
  } catch (error) {
    console.error('视频转码失败:', error);
    errorMessage.value = '视频转码失败: ' + error.message;
    showErrorTip.value = true;
  } finally {
    isTranscoding.value = false;
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

.btn-retry, .btn-close, .btn-alternative, .btn-lowres {
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

.btn-alternative {
  background-color: #2196F3;
  color: white;
}

.btn-alternative:hover {
  background-color: #0b7dda;
}

.btn-lowres {
  background-color: #ff9800;
  color: white;
}

.btn-lowres:hover {
  background-color: #e68a00;
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