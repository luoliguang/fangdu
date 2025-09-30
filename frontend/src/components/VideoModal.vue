<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
      <div class="modal-container" @click.stop>
        <div ref="videoContainer" class="video-container"></div>
        
        <!-- 视频播放错误提示 -->
        <div v-if="showErrorTip" class="error-overlay">
          <div class="error-content">
            <div class="error-icon">⚠️</div>
            <div class="error-message">
              <h4>视频播放遇到问题</h4>
              <p>{{ errorMessage }}</p>
              <div class="error-suggestions">
                <p><strong>推荐解决方案：</strong></p>
                <ul>
                  <li><strong>直接下载视频到本地播放</strong> - 最简单有效的解决方案</li>
                  <li>刷新页面重试</li>
                  <li>检查网络连接状态</li>
                  <li>尝试使用其他浏览器（推荐Chrome、Edge）</li>
                  <li>更新浏览器到最新版本</li>
                  <li v-if="deviceInfo.isLowEndDevice">您的设备配置较低，建议关闭其他应用程序</li>
                  <li v-if="deviceInfo.isOldDevice">您的浏览器版本较旧，建议升级到最新版本</li>

                  <li>如果问题持续，请联系技术支持</li>
                </ul>
              </div>
              <div class="error-actions">
                <button class="btn-retry" @click="retryVideo">重试播放</button>
                <button v-if="hasAlternativeSource" class="btn-alternative" @click="tryAlternativeFormat">尝试其他格式</button>
                <button v-if="hasLowResSource" class="btn-lowres" @click="tryLowResolutionSource">尝试低清版本</button>
                <button v-if="isOssVideo && !isTranscoding" class="btn-transcode" @click="transcodeVideo">使用FFmpeg转码</button>
                              <a :href="downloadUrl" class="btn-download" download target="_blank" rel="noopener" @click.stop>下载到本地</a>
              <button class="btn-close" @click="$emit('close')">关闭</button>
            </div>
          </div>
        </div>
        
        <!-- 转码进度提示 -->
        <div v-if="isTranscoding" class="transcoding-tip">
          <div class="loading-spinner"></div>
          <p>正在转码视频，请稍候... {{ transcodingProgress }}%</p>
        </div>
        
        <!-- 常规视频控制按钮区域 -->
        <div v-if="!showErrorTip && !isTranscoding" class="video-controls" @click.stop>
          <div class="control-buttons">
            <button class="btn-download-normal" @click.stop="downloadVideo" title="下载视频" type="button">
              <span class="download-icon">⬇</span>
              下载
            </button>
            <button v-if="hasAlternativeSource" class="btn-format" @click.stop="tryAlternativeFormat" title="尝试其他格式" type="button">
              <span class="format-icon">🔄</span>
              切换格式
            </button>
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
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { useToast } from 'vue-toastification';

const props = defineProps({
  visible: Boolean,
  src: String,
  poster: String,
  videoName: String
});
const emit = defineEmits(['close']);

// 初始化toast通知
const toast = useToast();

// 辅助函数：判断是否跨域
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

// 辅助函数：转换为代理URL
const resolveApiBase = () => {
  // 生产环境一律同源 /api，避免跨域与路径层级问题
  if (import.meta.env && import.meta.env.PROD) return '/api';
  // 开发环境：尊重 VITE_API_BASE_URL，否则回退 /api
  let base = (import.meta.env && import.meta.env.VITE_API_BASE_URL) ? String(import.meta.env.VITE_API_BASE_URL) : '/api';
  // 去掉末尾斜杠
  base = base.replace(/\/$/, '');
  // 如果结尾为 /api/v1 统一改为 /api
  base = base.replace(/\/api\/v1$/,'/api');
  // http(s) 情况：若末尾不是 /api 则补上 /api
  if (/^https?:\/\//i.test(base)) {
    if (!/\/api$/i.test(base)) base = base + '/api';
    return base;
  }
  // 非 http(s)：若不以 /api 结尾，则补上 /api
  if (!base.endsWith('/api')) base = base + '/api';
  return base;
};

const toProxyUrl = (rawUrl) => {
  try {
    if (!rawUrl) return rawUrl;
    const full = normalizePath(rawUrl);
    if (!isCrossOrigin(full)) return full;
    const base = resolveApiBase();
    const proxyPath = `${base}/proxy/media`;
    const proxied = new URL(proxyPath, window.location.origin);
    proxied.searchParams.set('url', full);
    return proxied.toString();
  } catch (_) {
    return rawUrl;
  }
};

// 辅助函数：URL可用性探测方法
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
const isTranscoding = ref(false);
const transcodingProgress = ref(0);
const ffmpeg = ref(null);
const downloadUrl = ref('');

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
    
    // 初始化下载链接（跨域时走代理）
    nextTick(() => {
      initVideoPlayer();
      // 初始化下载链接（跨域时走代理）
      const src = normalizePath(props.src);
      const downloadProxyPath = `${resolveApiBase()}/proxy/download`;
      downloadUrl.value = isCrossOrigin(src) ? 
        (() => {
          const proxied = new URL(downloadProxyPath, window.location.origin);
          proxied.searchParams.set('url', src);
          return proxied.toString();
        })() : src;
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
  
  // 添加主源
  if (props.src) {
    const mainSrcPath = normalizePath(props.src);
    const cross = isCrossOrigin(mainSrcPath);
    
    // 始终加入主源（跨域时改写为代理URL）
    const mainPlayable = cross ? toProxyUrl(mainSrcPath) : mainSrcPath;
    sources.push({
      src: mainPlayable,
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
  const posterUrl = props.poster ? (isCrossOrigin(props.poster) ? toProxyUrl(props.poster) : normalizePath(props.poster)) : null;
  console.log('封面处理结果:', {
    原始poster: props.poster,
    是否跨域: props.poster ? isCrossOrigin(props.poster) : false,
    最终posterUrl: posterUrl
  });
  
  // 确保video元素被添加到容器中
  videoContainer.value.appendChild(videoElement);
  
  player.value = videojs(videoElement, {
    controls: true,
    autoplay: !deviceInfo.value.isLowEndDevice, // 低端设备不自动播放
    preload: deviceInfo.value.isLowEndDevice ? 'metadata' : 'auto', // 低端设备只预加载元数据
    fluid: true,
    responsive: true,
    poster: posterUrl,
    sources: sources,
    html5: {
      hls: {
        overrideNative: true,
        enableLowInitialPlaylist: deviceInfo.value.isLowEndDevice || deviceInfo.value.isMobile,
        limitRenditionByPlayerDimensions: deviceInfo.value.isMobile || deviceInfo.value.isTablet,
        smoothQualityChange: !deviceInfo.value.isLowEndDevice,
        bandwidth: deviceInfo.value.isLowEndDevice ? 1000000 : undefined // 低端设备限制带宽
      },
      vhs: { withCredentials: false },
      xhr: { withCredentials: false },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false
    },
    techOrder: ["html5"],
    // 添加完整的播放器控件配置
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    // 确保显示所有标准控件
    userActions: {
      hotkeys: true
    },
    // 启用重播功能（使用内置功能）
    loop: false
  });
  
  // 阻止点击视频触发任何外层默认行为（例如某些全局click监听导致跳转）
  videoElement.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // 关闭 video.js 内置错误提示，由我们自定义层接管
  if (player.value && player.value.errorDisplay) {
    player.value.errorDisplay.hide();
    player.value.errorDisplay.dispose && player.value.errorDisplay.dispose();
  }
  
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
  console.log('handleVideoError 被调用:', event);
  console.log('当前 showErrorTip 状态:', showErrorTip.value);
  
  clearLoadingTimeout();
  
  // 强制设置错误状态
  showErrorTip.value = true;
  
  if (event.type === 'timeout') {
    errorMessage.value = '视频加载超时，可能是网络问题或文件过大。';
  } else if (event.type === 'network') {
    errorMessage.value = event.message || '网络连接问题，请检查您的网络设置。';
  } else if (player.value && player.value.error()) {
    const error = player.value.error();
    console.log('Video.js 错误详情:', error);
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
        errorMessage.value = '视频格式不支持或文件路径无效。可能是媒体资源404错误导致。';
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
  console.log('设置后 showErrorTip.value:', showErrorTip.value);
  console.log('设置后 errorMessage.value:', errorMessage.value);
  
  // 强制触发Vue的响应式更新
  await nextTick();
  console.log('nextTick后 showErrorTip.value:', showErrorTip.value);
};



// 尝试使用低分辨率视频源
const tryLowResolutionSource = async () => {
  if (!props.src || !player.value) return;
  
  const extension = props.src.split('.').pop().toLowerCase();
  const baseSrc = props.src.substring(0, props.src.lastIndexOf('.'));
  let lowResSrc = normalizePath(`${baseSrc}_low.${extension}`);
  // 跨域时走代理，避免公司网络/CORS/404
  if (isCrossOrigin(lowResSrc)) lowResSrc = toProxyUrl(lowResSrc);
  
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
  // 跨域时走代理
  if (isCrossOrigin(alternativeSrc)) alternativeSrc = toProxyUrl(alternativeSrc);
  
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

// 下载视频到本地
const downloadVideo = async () => {
  if (!props.src) {
    toast.error('没有可下载的视频源');
    return;
  }
  
  try {
    // 获取文件名 - 优先使用传入的videoName，否则从URL提取
    let fileName;
    if (props.videoName && props.videoName.trim()) {
      fileName = props.videoName.trim();
      // 确保文件名有扩展名
      if (!fileName.includes('.')) {
        // 从原始URL获取扩展名
        const url = new URL(props.src, window.location.origin);
        const pathname = url.pathname;
        const originalFileName = pathname.split('/').pop() || 'video';
        const extension = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'mp4';
        fileName += '.' + extension;
      }
    } else {
      // 回退到原始逻辑
      const url = new URL(props.src, window.location.origin);
      const pathname = url.pathname;
      fileName = pathname.split('/').pop() || 'video';
      
      // 确保文件名有扩展名
      if (!fileName.includes('.')) {
        fileName += '.mp4';
      }
    }
    
    // 处理跨域URL
    let downloadUrl = props.src;
    if (isCrossOrigin(props.src)) {
      downloadUrl = toProxyUrl(props.src);
    }
    
    console.log('开始下载视频:', {
      原始URL: props.src,
      下载URL: downloadUrl,
      文件名: fileName
    });
    
    try {
      // 尝试通过fetch获取视频数据
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'video/*,*/*;q=0.9'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 检查响应类型
      const contentType = response.headers.get('content-type');
      console.log('响应内容类型:', contentType);
      
      const blob = await response.blob();
      console.log('获取到blob:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('下载的文件为空');
      }
      
      const blobUrl = URL.createObjectURL(blob);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
      console.log('视频下载成功');
      toast.success('视频下载成功！请检查浏览器下载文件夹。');
      
    } catch (fetchError) {
      console.error('通过fetch下载失败:', fetchError);
      
      // 如果fetch失败，尝试直接下载
      console.log('尝试直接下载...');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('尝试直接下载完成');
      toast.warning('已尝试下载视频，如果没有开始下载，请右键点击视频选择"另存为"');
    }
    
  } catch (error) {
    console.error('视频下载失败:', error);
    toast.error(`视频下载失败: ${error.message}\n\n请尝试以下方法：\n1. 右键点击视频选择"另存为"\n2. 检查网络连接\n3. 尝试使用其他浏览器`);
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
.modal-container { position: relative; width: 90vw; max-width: 1000px; max-height: 85vh; display: flex; justify-content: center; align-items: center; }
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
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 8px;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  padding: 30px;
  text-align: center;
  max-width: 90vw;
  max-height: 70vh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.error-message h4 {
  font-size: 28px;
  margin-bottom: 15px;
  color: #ff6b6b;
  font-weight: 600;
}

.error-message p {
  font-size: 16px;
  margin-bottom: 20px;
  color: #e0e0e0;
  line-height: 1.5;
}

.error-suggestions {
  margin: 20px 0;
  text-align: left;
  overflow: hidden;
}

.error-suggestions p {
  font-weight: 600;
  color: #4caf50;
  margin-bottom: 15px;
}

.error-suggestions ul {
  margin-left: 20px;
  max-height: none;
  overflow: hidden;
  list-style: disc;
}

.error-suggestions li {
  margin-bottom: 8px;
  line-height: 1.4;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.btn-retry, .btn-close, .btn-alternative, .btn-lowres, .btn-transcode, .btn-download {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn-download {
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #6a5acd;
  color: #fff;
  text-decoration: none;
  font-weight: bold;
}

.btn-download:hover {
  background-color: #5a4acb;
}

.download-icon {
  font-size: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-2px);
  }
}

.btn-retry {
  background: linear-gradient(135deg, #4caf50, #45a049);
  color: white;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.btn-retry:hover {
  background: linear-gradient(135deg, #45a049, #3d8b40);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.btn-alternative {
  background: linear-gradient(135deg, #2196F3, #0b7dda);
  color: white;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
}

.btn-alternative:hover {
  background: linear-gradient(135deg, #0b7dda, #0a6bc2);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
}

.btn-lowres {
  background: linear-gradient(135deg, #ff9800, #e68a00);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
}

.btn-lowres:hover {
  background: linear-gradient(135deg, #e68a00, #cc7a00);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
}

.btn-transcode {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  color: white;
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.3);
}

.btn-transcode:hover {
  background: linear-gradient(135deg, #7b1fa2, #6a1b9a);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(156, 39, 176, 0.4);
}

.btn-close {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.btn-close:hover {
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
}

/* 转码进度提示样式 */
.transcoding-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 30px;
  border-radius: 10px;
  text-align: center;
  z-index: 15;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 常规视频控制按钮样式 */
.video-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 15;
}

.control-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-download-normal, .btn-format {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-download-normal {
  background: rgba(76, 175, 80, 0.9);
  color: white;
}

.btn-download-normal:hover {
  background: rgba(76, 175, 80, 1);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.3);
}

.btn-format {
  background: rgba(33, 150, 243, 0.9);
  color: white;
}

.btn-format:hover {
  background: rgba(33, 150, 243, 1);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.3);
}

.download-icon, .format-icon {
  font-size: 16px;
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
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 过渡动画 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

::deep(.vjs-error .vjs-error-display) {
  display: none !important; /* 隐藏video.js默认黑色报错层 */
}

@media (max-width: 768px) {
  .video-container { min-width: 320px; min-height: 180px; }
  .modal-container { width: 95vw; max-width: 95vw; max-height: 85vh; }
  .close-button { top: -32px; right: -32px; width: 32px; height: 32px; font-size: 1.2rem; }
  .error-content { max-height: 60vh; }
}
</style>