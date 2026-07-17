<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, onActivated, inject, nextTick } from 'vue';
import apiClient from '../axiosConfig.js';
import { useFeedbackStore } from '@/stores/feedback';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';
import GalaxyBackground from '../components/GalaxyBackground.vue';
import { useTheme } from '../composables/useTheme.js';

const { isDark } = useTheme();

// 简单的 UUID 生成函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- 基础状态 ---
const materials = shallowRef([]);
const displayMaterials = shallowRef([]);
const searchTerm = ref('');
const tags = ref([]);
const activeTag = ref('');
const isLoading = ref(false); // 初始为 false
let debounceTimer = null;
let requestSerial = 0;
let latestAppliedSerial = 0;
let lastSubmittedQuery = '';
let appendFrameId = null;
let suggestionsTimer = null;
let suggestionsSerial = 0;
let lastSuggestionKeyword = '';
const isChunkRendering = ref(false);
const isTagsExpanded = ref(false); //控制标签面板是否展开
const tagsContainerRef = ref(null); // 标签容器引用
const visibleTagsCount = ref(20); // 动态计算的可见标签数量

// --- 收藏夹状态（使用全局状态） ---
const appFavorites = inject('appFavorites', { favorites: ref([]), addToFavorites: () => {} });
const favorites = appFavorites.favorites;

// --- 注入Gallery回调引用 ---
const galleryCallbacks = inject('galleryCallbacks', ref({}));

// 动态排除标签（由 App.vue 根据 page-categories 配置注入）
const excludeTagsParam = inject('excludeTagsParam', ref(''));

// 快速筛选处理方法
const handleQuickFilter = (filterValue) => {
  // 根据快速筛选应用不同的逻辑
  switch(filterValue) {
    case 'video':
      // 筛选视频素材
      activeTag.value = '';
      searchTerm.value = '';
      // 这里可以添加视频筛选逻辑
      break;
    case 'latest':
      // 按最新排序
      activeTag.value = '';
      searchTerm.value = '';
      // 这里可以添加最新排序逻辑
      break;
    case 'popular':
      // 按热门排序
      activeTag.value = '';
      searchTerm.value = '';
      break;
    default:
      // 其他筛选可以设置为搜索词
      searchTerm.value = filterValue;
      activeTag.value = '';
  }
};

const addToFavorites = (material) => {
  const exists = favorites.value.find(fav => fav.id === material.id);
  if (!exists) {
    appFavorites.addToFavorites(material);
    showCustomToast('已添加到收藏夹', 'success');
  }
};

const removeFromFavorites = (materialId) => {
  const index = favorites.value.findIndex(fav => fav.id === materialId);
  if (index > -1) {
    favorites.value.splice(index, 1);
    showCustomToast('已从收藏夹移除', 'success');
  }
};

// 移动端检测（≤768px 用横向滚动标签，不走折行逻辑）
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768);
const onResize = () => { isMobile.value = window.innerWidth <= 768; };

const visibleTags = computed(() => {
  if (!tags.value || !Array.isArray(tags.value)) return [];
  // 移动端直接显示全部，由 CSS overflow-x:auto 实现横向滚动
  if (isMobile.value) return tags.value;
  if (isTagsExpanded.value || tags.value.length <= visibleTagsCount.value) return tags.value;
  return tags.value.slice(0, visibleTagsCount.value);
});

// 计算实际可见的标签数量（仅桌面端执行）
const calculateVisibleTags = async () => {
  if (isMobile.value) return; // 移动端不需要折行计算
  if (!tagsContainerRef.value || !tags.value || tags.value.length === 0) return;

  const container = tagsContainerRef.value;
  const maxHeight = 110;

  const originalExpanded = isTagsExpanded.value;
  isTagsExpanded.value = true;
  await new Promise(resolve => setTimeout(resolve, 0));
  const fullHeight = container.scrollHeight;

  if (fullHeight <= maxHeight) {
    visibleTagsCount.value = tags.value.length;
    isTagsExpanded.value = originalExpanded;
    return;
  }

  isTagsExpanded.value = originalExpanded;
  let testCount = tags.value.length - 1;

  while (testCount > 0) {
    visibleTagsCount.value = testCount;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (container.scrollHeight <= maxHeight) {
      visibleTagsCount.value = Math.max(1, testCount - 1);
      break;
    }
    testCount--;
  }

  if (testCount === 0) visibleTagsCount.value = 1;
}

// --- 分页与无限滚动状态 ---
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const SEARCH_RESULT_MAX = 120;
const hasMore = computed(() => currentPage.value < totalPages.value);
const isSearching = computed(() => searchTerm.value.trim().length > 0 || activeTag.value !== '');
const reachedSearchDisplayLimit = computed(() => isSearching.value && displayMaterials.value.length >= SEARCH_RESULT_MAX);
const hasHiddenSearchResults = computed(() => isSearching.value && materials.value.length > displayMaterials.value.length);
const totalResultCount = computed(() => {
  if (totalItems.value && totalItems.value > 0) return totalItems.value;
  return Math.max(materials.value.length, displayMaterials.value.length);
});
const loadedCountText = computed(() => `${displayMaterials.value.length} / ${totalResultCount.value}`);
const isLoadingMoreSearch = ref(false);
const observerEl = ref(null);
let observer = null;

const handleWindowResize = () => {
  isMobile.value = window.innerWidth <= 768;
  setTimeout(async () => {
    await calculateVisibleTags();
  }, 100);
};

const handleDocumentClick = (e) => {
  const searchWrapper = document.querySelector('.search-wrapper');
  if (searchWrapper && !searchWrapper.contains(e.target)) {
    showSuggestions.value = false;
  }
};

// --- Lightbox 和 Video Modal 状态 ---
const lightboxVisible = ref(false);
const lightboxIndex = ref(0);
const videoModalVisible = ref(false);
const currentVideoUrl = ref('');
const currentVideoName = ref(''); // 添加当前视频名称
const currentVideoPoster = ref(''); // 添加当前视频封面
const feedbackMessage = ref(''); // 用户留言内容（页面底部）

// --- 搜索建议相关状态 ---
const searchSuggestions = ref([]); // 搜索建议列表
const showSuggestions = ref(false); // 是否显示建议
const isFetchingSuggestions = ref(false); // 是否正在获取建议

// 新增：提交留言功能（页面底部）
const submitFeedback = async () => {
  // 确保留言内容非空且去除首尾空格
  const trimmedMessage = feedbackMessage.value.trim();
  if (!trimmedMessage) {
    showCustomToast('留言内容不能为空！', 'error');
    return;
  }

  // 获取或生成用户ID
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem('user_id', userId);
  }

  try {
    // 确保提交的数据格式正确
    const result = await feedbackStore.submitFeedback({
      message: trimmedMessage, // 使用去除空格后的内容
      user_id: userId
    });
    
    if (result.success) {
      showCustomToast('留言成功，感谢您的反馈！', 'success');
      feedbackMessage.value = ''; // 清空留言内容
      fetchUserFeedbacks(); // 提交成功后刷新用户留言列表
    } else {
      showCustomToast(result.message || '提交留言失败，请稍后再试。', 'error');
    }
  } catch (error) {
    console.error('提交留言失败:', error);
    showCustomToast('提交留言失败，请稍后再试。', 'error');
  }
};
const showFeedbackForm = ref(false); // 新增：控制留言表单的显示
const isWidgetHovered = ref(false); // 新增：控制留言时间线小部件的悬停状态
const feedbackStore = useFeedbackStore(); // 反馈store

// 将OSS URL转换为CDN URL
const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || 'https://assets.fangdutex.cn';
const toCdnUrl = (url) => {
  if (!url) return url;
  return url.replace(/https?:\/\/[^/?#]+\.aliyuncs\.com/, CDN_BASE_URL);
};

// 检查URL是否跨域
const isCrossOriginUrl = (url) => {
  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
};

const imageOnlyMaterials = computed(() => {
    if (!displayMaterials.value || !Array.isArray(displayMaterials.value)) {
      return [];
    }
    return displayMaterials.value.filter(m => m.media_type === 'image');
});

const imageIndexMap = computed(() => {
  const map = new Map();
  imageOnlyMaterials.value.forEach((item, idx) => {
    map.set(item.id, idx);
  });
  return map;
});

const imageSources = computed(() => {
    return imageOnlyMaterials.value.map(m => {
        return toCdnUrl(m.file_path);
    });
});

const recordMaterialView = async (material) => {
    if (!material?.id) return;

    try {
      await apiClient.post(`/api/v1/materials/${material.id}/view`);
    } catch (error) {
      // 静默失败，不影响用户查看
    }
};

const showMedia = (material) => {
    recordMaterialView(material);

    if (material.media_type === 'image') {
        const imageIndex = imageIndexMap.value.get(material.id);
        if (imageIndex === undefined || imageIndex < 0) return;
        lightboxIndex.value = imageIndex;
        lightboxVisible.value = true;
    } else if (material.media_type === 'video') {
        // 无论 file_path 是什么，都移除可能存在的OSS图片处理参数
        const cleanVideoUrl = material.file_path.split('?')[0];
        currentVideoUrl.value = cleanVideoUrl;
        currentVideoName.value = material.name; // 设置当前视频名称
        // 设置视频封面：优先使用cover_image_path，其次是thumbnail_url
        currentVideoPoster.value = material.cover_image_path || material.thumbnail_url || '';
        videoModalVisible.value = true;
    }
};

const applyDisplayMaterials = (source, { append = false, chunkSize = 24 } = {}) => {
    if (appendFrameId) {
      cancelAnimationFrame(appendFrameId);
      appendFrameId = null;
    }

    const safeSource = Array.isArray(source) ? source : [];
    isChunkRendering.value = true;

    if (!append) {
      displayMaterials.value = [];
    }

    if (safeSource.length === 0) {
      isChunkRendering.value = false;
      return;
    }

    let cursor = 0;
    const pump = () => {
      if (isSearching.value && displayMaterials.value.length >= SEARCH_RESULT_MAX) {
        appendFrameId = null;
        isChunkRendering.value = false;
        return;
      }

      const nextChunk = safeSource.slice(cursor, cursor + chunkSize);
      if (nextChunk.length > 0) {
        const cappedChunk = isSearching.value
          ? nextChunk.slice(0, Math.max(0, SEARCH_RESULT_MAX - displayMaterials.value.length))
          : nextChunk;

        displayMaterials.value = append || cursor > 0
          ? [...displayMaterials.value, ...cappedChunk]
          : cappedChunk;
      }
      cursor += chunkSize;
      if (cursor < safeSource.length) {
        appendFrameId = requestAnimationFrame(pump);
      } else {
        appendFrameId = null;
        isChunkRendering.value = false;
      }
    };

    pump();
};

const fetchMaterials = async (isLoadMore = false) => {
    if (isLoadMore && isLoading.value) return;

    const query = {
      search: searchTerm.value.trim(),
      tag: activeTag.value,
      exclude_tags: excludeTagsParam.value || undefined,
      page: currentPage.value,
      limit: 20
    };

    const requestId = ++requestSerial;
    isLoading.value = true;

    try {
        const response = await apiClient.get(`/api/v1/materials`, {
            params: query
        });

        // 忽略过期响应，避免旧请求覆盖新搜索结果
        if (requestId < latestAppliedSerial) return;
        latestAppliedSerial = requestId;

        if (response.data && response.data.meta) {
            const { data, meta } = response.data;
            if (isLoadMore) {
                materials.value = [...materials.value, ...data];
                applyDisplayMaterials(data, { append: true, chunkSize: 20 });
            } else {
                materials.value = data;
                applyDisplayMaterials(data, { append: false, chunkSize: 20 });
            }
            totalPages.value = meta.totalPages || 1;
            totalItems.value = meta.totalItems || meta.total || meta.count || 0;

            if (data.length === 0 && query.search.length > 0 && !isLoadMore) {
                await fetchSearchSuggestions();
            } else {
                showSuggestions.value = false;
                searchSuggestions.value = [];
            }
        } else {
            console.warn("后端返回数据格式不正确，缺少 meta 信息");
            materials.value = [];
            displayMaterials.value = [];
            showFeedbackForm.value = materials.value.length === 0 && !isLoading.value;

            if (query.search.length > 0) {
                await fetchSearchSuggestions();
            }
        }
    } catch (error) {
        if (requestId >= latestAppliedSerial) {
          console.error('获取素材失败:', error);
        }
    } finally {
        if (requestId === requestSerial) {
          isLoading.value = false;
          showFeedbackForm.value = materials.value.length === 0 && !isLoading.value;
        }
    }
};

// 获取搜索建议
const fetchSearchSuggestions = async () => {
    const trimmedSearch = searchTerm.value.trim();
    if (!trimmedSearch || trimmedSearch.length < 2) {
        searchSuggestions.value = [];
        showSuggestions.value = false;
        return;
    }

    if (trimmedSearch === lastSuggestionKeyword && searchSuggestions.value.length > 0) {
      showSuggestions.value = true;
      return;
    }

    const serial = ++suggestionsSerial;
    isFetchingSuggestions.value = true;
    try {
        const response = await apiClient.get(`/api/v1/materials/suggestions`, {
            params: {
                q: trimmedSearch,
                limit: 5
            }
        });

        if (serial !== suggestionsSerial) return;

        if (response.data && response.data.success) {
            searchSuggestions.value = response.data.data || [];
            showSuggestions.value = searchSuggestions.value.length > 0;
            lastSuggestionKeyword = trimmedSearch;
        } else {
            searchSuggestions.value = [];
            showSuggestions.value = false;
        }
    } catch (error) {
        if (serial === suggestionsSerial) {
          console.error('获取搜索建议失败:', error);
          searchSuggestions.value = [];
          showSuggestions.value = false;
        }
    } finally {
        if (serial === suggestionsSerial) {
          isFetchingSuggestions.value = false;
        }
    }
};

// 点击建议项，使用建议的关键词进行搜索
const useSuggestion = (suggestion) => {
    searchTerm.value = suggestion;
    showSuggestions.value = false;
    searchSuggestions.value = [];
};

const showMoreSearchResults = async () => {
  if (!isSearching.value || isLoadingMoreSearch.value || isLoading.value) return;

  isLoadingMoreSearch.value = true;
  try {
    if (hasHiddenSearchResults.value) {
      const incrementalChunk = materials.value.slice(displayMaterials.value.length, displayMaterials.value.length + 80);
      applyDisplayMaterials(incrementalChunk, { append: true, chunkSize: 20 });
      return;
    }

    if (hasMore.value) {
      currentPage.value += 1;
      await fetchMaterials(true);
    }
  } finally {
    setTimeout(() => {
      isLoadingMoreSearch.value = false;
    }, 300);
  }
};

// 处理搜索框获得焦点
const handleSearchFocus = () => {
    // 如果已有建议且搜索词不为空，显示建议
    if (searchSuggestions.value.length > 0 && searchTerm.value.trim().length > 0) {
        showSuggestions.value = true;
    }
};

// 处理搜索框失去焦点（延迟关闭，以便点击建议）
const handleSearchBlur = () => {
    // 延迟关闭，以便用户能点击建议
    setTimeout(() => {
        showSuggestions.value = false;
    }, 200);
};

// 提示框状态
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref('success'); // 'success' | 'error'

// 显示高端提示框
const showCustomToast = (message, type = 'success') => {
    toastMessage.value = message;
    toastType.value = type;
    showToast.value = true;
    
    // 3秒后自动隐藏
    setTimeout(() => {
        showToast.value = false;
    }, 2000);
};

// 处理抽屉组件的反馈提交
const handleFeedbackSubmit = async (feedbackData) => {
  // 获取或生成用户ID
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem('user_id', userId);
  }

  try {
    // 处理从SideDrawer传来的字符串或对象格式
    const message = typeof feedbackData === 'string' ? feedbackData : feedbackData.message;
    
    const result = await feedbackStore.submitFeedback({
      message: message,
      user_id: userId
    });
    
    if (result.success) {
      showCustomToast('留言成功，感谢您的反馈！', 'success');
      fetchUserFeedbacks(); // 提交成功后刷新用户留言列表
    } else {
      showCustomToast(result.message || '提交留言失败，请稍后再试。', 'error');
    }
  } catch (error) {
    console.error('提交留言失败:', error);
    showCustomToast('提交留言失败，请稍后再试。', 'error');
  }
};

// 新增：用户留言列表和相关状态
const userFeedbacks = ref([]);
const showUserFeedbackTimeline = ref(false);
const isUserFeedbacksLoading = ref(false);

// 新增：获取用户留言列表
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

// 新增：格式化日期 (复用 Admin.vue 中的函数)
const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleString();
};

const fetchTags = async () => {
  try {
    const response = await apiClient.get(`/api/v1/materials/tags/all`, {
      params: { exclude_tags: excludeTagsParam.value || undefined }
    });
    tags.value = response.data.data;
    // 标签加载完成后计算可见标签数量
    setTimeout(async () => {
      await calculateVisibleTags();
    }, 100);
  } catch (error) {
    console.error('获取标签失败:', error);
  }
};

// --- 数据缓存状态 ---
const isDataLoaded = ref(false); // 标记数据是否已加载

const getSessionId = () => {
    let sessionId = localStorage.getItem('visitor_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('visitor_session_id', sessionId);
    }
    return sessionId;
};

const recordSearchKeyword = async (keyword) => {
    const normalized = (keyword || '').trim();
    if (!normalized || normalized === lastSubmittedQuery) return;

    lastSubmittedQuery = normalized;

    try {
        await apiClient.post('/api/v1/visits/search', {
            keyword: normalized,
            page: window.location.pathname,
            sessionId: getSessionId()
        });
    } catch (error) {
        // 静默失败，不影响主流程
    }
};

const handleFilterChange = () => {
    currentPage.value = 1;
    totalPages.value = 1;
    // 立即清空，让 DOM 移除发生在 API 等待期间，避免"清除+插入"同帧卡顿
    isChunkRendering.value = true;
    displayMaterials.value = [];
    fetchMaterials(false);
    recordSearchKeyword(searchTerm.value);
};

const filterByTag = (tag) => {
    if (activeTag.value === tag) return;
    activeTag.value = tag;
    handleFilterChange();
};

watch(searchTerm, () => {
    clearTimeout(debounceTimer);
    clearTimeout(suggestionsTimer);

    debounceTimer = setTimeout(() => {
        handleFilterChange();
    }, 500);

    suggestionsTimer = setTimeout(async () => {
      const trimmed = searchTerm.value.trim();
      if (!trimmed) {
        showSuggestions.value = false;
        searchSuggestions.value = [];
        lastSuggestionKeyword = '';
        return;
      }

      await fetchSearchSuggestions();
    }, 380);
});

const setupObserver = () => {
    // 清理之前的观察器
    if (observer) {
        observer.disconnect();
    }
    
    observer = new IntersectionObserver((entries) => {
        const firstEntry = entries[0];
        if (isSearching.value) return;
        if (firstEntry.isIntersecting && hasMore.value && !isLoading.value) {
            currentPage.value++;
            fetchMaterials(true);
        }
    });

    // 使用nextTick确保DOM已更新
    nextTick(() => {
        if (observerEl.value) {
            observer.observe(observerEl.value);
        }
    });
};

onMounted(() => {
    // 注册Gallery页面的回调函数到全局
    galleryCallbacks.value.handleQuickFilter = handleQuickFilter;
    galleryCallbacks.value.handleShowMedia = showMedia;
    galleryCallbacks.value.handleRemoveFromFavorites = removeFromFavorites;
    
    // 只在首次挂载时加载数据
    if (!isDataLoaded.value) {
        handleFilterChange();
        fetchTags();
        fetchUserFeedbacks(); // 页面加载时获取用户留言
        isDataLoaded.value = true;
    }
    
    // 使用nextTick确保DOM完全渲染后再设置观察器
    nextTick(() => {
        setupObserver();
    });

    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('click', handleDocumentClick);
});

// keep-alive组件激活时的逻辑
onActivated(() => {
    // 重新设置观察器，因为组件可能被缓存
    nextTick(() => {
        setupObserver();
    });
});

onUnmounted(() => {
    // 清除Gallery页面的回调引用
    if (galleryCallbacks.value) {
        galleryCallbacks.value.handleQuickFilter = null;
        galleryCallbacks.value.handleShowMedia = null;
        galleryCallbacks.value.handleRemoveFromFavorites = null;
    }

    if (observer) {
      observer.disconnect();
    }

    if (appendFrameId) {
      cancelAnimationFrame(appendFrameId);
      appendFrameId = null;
    }

    clearTimeout(debounceTimer);
    clearTimeout(suggestionsTimer);

    window.removeEventListener('resize', handleWindowResize);
    document.removeEventListener('click', handleDocumentClick);
});

const toggleWidget = () => {
  isWidgetHovered.value = !isWidgetHovered.value;
};

const widgetFilter = ref('all'); // 'all' | 'pending' | 'approved'
const filteredFeedbacks = computed(() => {
  if (widgetFilter.value === 'all') return userFeedbacks.value;
  return userFeedbacks.value.filter(f => f.status === widgetFilter.value);
});
const pendingFeedbacks = computed(() => userFeedbacks.value.filter(f => f.status === 'pending'));
const approvedFeedbacks = computed(() => userFeedbacks.value.filter(f => f.status !== 'pending'));


// 留言表单始终显示
showFeedbackForm.value = true;

// 将任意图片 blob 转为 PNG（ClipboardItem 只支持 image/png）
const blobToPngBlob = (blob) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(png => png ? resolve(png) : reject(new Error('toBlob failed')), 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
  img.src = url;
});

// 快捷复制图片（通过后端代理绕过 CORS，转 PNG 后写入剪贴板）
const quickCopyImage = async (material) => {
  if (material.media_type !== 'image') return;

  const imageName = material.name || '图片';
  const imageUrl = toCdnUrl(material.file_path);

  showCustomToast(`正在复制"${imageName}"...`, 'success');

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    const origin = apiBase?.startsWith('http') ? apiBase : window.location.origin;
    const proxyUrl = `${origin}/api/v1/proxy/media?url=${encodeURIComponent(imageUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const pngBlob = await blobToPngBlob(blob);

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    showCustomToast(`"${imageName}" 已复制！`, 'success');
  } catch (error) {
    console.error('复制图片失败:', error);
    try {
      await navigator.clipboard.writeText(imageUrl);
      showCustomToast('已复制图片链接', 'info');
    } catch {
      showCustomToast('复制失败，请重试', 'error');
    }
  }
};
</script>

<template>
  <GalaxyBackground v-if="isDark" />
  <header class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">方度实拍图</h1>
      <p class="hero-subtitle">您可以在这里获取到各种面料、款式、等实拍图素材</p>
      <div class="search-wrapper">
        <div class="search-bar-row">
          <input
            type="text"
            v-model="searchTerm"
            placeholder="请以关键词的形式搜索 如：圆领短袖 插肩"
            class="search-input-cool"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @keydown.enter="handleFilterChange"
          >
          <button class="search-btn" @click="handleFilterChange">搜索</button>
        </div>
        <!-- 搜索建议下拉列表 -->
        <div v-if="showSuggestions && searchSuggestions.length > 0" class="search-suggestions">
          <div class="suggestions-header">
            <span class="suggestions-icon">💡</span>
            <span class="suggestions-title">为您推荐以下关键词：</span>
          </div>
          <div class="suggestions-list">
            <button
              v-for="(suggestion, index) in searchSuggestions"
              :key="index"
              @click="useSuggestion(suggestion)"
              class="suggestion-item"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
  
    <div class="tags-container" :class="{ 'tags-expanded': isTagsExpanded }">
      <div class="tags-inner" ref="tagsContainerRef">
        <TransitionGroup name="tag-list">
          <button @click="filterByTag('')" :class="{ active: activeTag === '' }" key="all-btn">
            全部
          </button>

          <button
            v-for="tag in visibleTags"
            :key="tag"
            @click="filterByTag(tag)"
            :class="{ active: tag === activeTag }"
          >
            {{ tag }}
          </button>
        </TransitionGroup>
      </div>
      <div class="tags-footer" v-if="!isMobile && tags && tags.length > visibleTagsCount">
        <button
          @click="isTagsExpanded = !isTagsExpanded"
          class="tags-toggle-btn"
        >
          {{ isTagsExpanded ? '↑ 收起' : '展开更多 ↓' }}
        </button>
      </div>
    </div>
    <TransitionGroup :name="isChunkRendering ? '' : 'gallery'" tag="div" class="grid-container">
      <div 
        v-for="material in displayMaterials" 
        :key="material.id" 
        class="grid-item"
        @click="showMedia(material)" 
      >
        <img v-if="material.media_type === 'image'" :src="toCdnUrl(material.thumbnail_url || material.file_path)" :alt="material.name" loading="lazy" decoding="async" fetchpriority="low">
        <video
            v-else-if="material.media_type === 'video'"
            :src="toCdnUrl(material.file_path)"
            :poster="toCdnUrl(material.cover_image_path || material.thumbnail_url)"
            preload="metadata"
            muted
            playsinline
            disablePictureInPicture
            @click.prevent
        ></video>
        <p>{{ material.name }}</p>
        <div v-if="material.media_type === 'video'" class="media-icon">▶</div>
        
        <!-- 快捷操作按钮组 -->
        <div class="card-actions">
          <!-- 收藏按钮 -->
          <button 
            @click.stop="addToFavorites(material)" 
            class="action-btn favorite-btn" 
            :class="{ 'favorited': favorites.find(fav => fav.id === material.id) }"
            title="收藏"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61V4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <!-- 快捷复制按钮（仅图片显示） -->
          <button 
            v-if="material.media_type === 'image'"
            @click.stop="quickCopyImage(material)" 
            class="action-btn copy-btn"
            title="快捷复制"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V18M8 5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 3V5M8 5C8 6.10457 8.89543 7 10 7H14C15.1046 7 16 6.10457 16 7V8M16 8H18C19.1046 8 20 8.89543 20 10V16C20 17.1046 19.1046 18 18 18H16M16 8V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>

    <div class="load-more-container">
        <div v-if="isLoading" class="loader"></div>
        <!-- 浏览模式：显示加载进度 -->
        <div v-if="!isSearching && totalItems > 0 && displayMaterials.length > 0" class="browse-load-count">
          已加载 <strong>{{ displayMaterials.length }}</strong> / {{ totalItems }} 条
        </div>
        <div v-if="isSearching && (hasHiddenSearchResults || hasMore)" class="search-limit-wrap search-tip-card">
          <p class="search-tip-title">当前结果较多，已优先显示部分内容</p>
          <p class="search-tip-subtitle">为避免页面卡顿，结果会按批次继续加载。你也可以手动继续。</p>
          <div class="search-progress">已显示 {{ loadedCountText }}</div>
          <button class="show-more-btn" :disabled="isLoadingMoreSearch || isLoading" @click="showMoreSearchResults">
            <span class="btn-icon">＋</span>
            <span>{{ (isLoadingMoreSearch || isLoading) ? '加载中...' : '继续加载' }}</span>
          </button>
        </div>
        <div v-else-if="reachedSearchDisplayLimit" class="search-limit-wrap search-tip-card">
          <p class="search-tip-title">搜索结果已全部展示</p>
          <p class="search-tip-subtitle">当前关键词结果较多，系统已完成分批加载。</p>
        </div>
        <p v-else-if="!hasMore && materials && materials.length > 0 && !isLoading" class="load-complete">已加载全部素材</p>
        <p v-if="(!materials || materials.length === 0) && !isLoading && (!searchTerm || searchTerm.trim().length === 0) && (!activeTag || activeTag === '')" class="no-results">输入关键词探索素材</p>
        <div v-if="(!materials || materials.length === 0) && !isLoading && ((searchTerm && searchTerm.trim().length > 0) || (activeTag && activeTag !== ''))" class="empty-state">
          <!-- 图标 -->
          <div class="empty-icon-wrap">
            <svg class="empty-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="34" cy="34" r="22" stroke="#0a3d22" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="50" y1="50" x2="66" y2="66" stroke="#0a3d22" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="27" y1="27" x2="41" y2="41" stroke="#5a8f73" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="41" y1="27" x2="27" y2="41" stroke="#5a8f73" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>

          <!-- 文案 -->
          <h3 class="empty-title">
            未找到<span class="empty-keyword">「{{ searchTerm || activeTag }}」</span>的相关素材
          </h3>
          <p class="empty-subtitle">换个关键词试试，或向我们描述您的需求，我们会及时跟进</p>

          <!-- 搜索建议 chips -->
          <div v-if="searchSuggestions && searchSuggestions.length > 0" class="empty-suggestions">
            <span class="empty-suggestions-label">试试：</span>
            <button
              v-for="(suggestion, index) in searchSuggestions"
              :key="index"
              class="suggestion-chip"
              @click="useSuggestion(suggestion)"
            >{{ suggestion }}</button>
          </div>

          <!-- 留言表单 -->
          <div class="empty-feedback">
            <textarea
              v-model="feedbackMessage"
              class="empty-textarea"
              placeholder="描述您想要的素材，例如：复合双层拉链风衣…"
              rows="3"
            ></textarea>
            <button class="empty-submit" @click="submitFeedback">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              提交需求
            </button>
          </div>
        </div>
        <!-- 无限滚动观察器元素 -->
        <div ref="observerEl" class="observer"></div>
    </div>
  <!-- 高端提示框 -->
  <div v-if="showToast" class="custom-toast" :class="`toast-${toastType}`">
    <div class="toast-content">
      <div class="toast-icon">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="toast-message">{{ toastMessage }}</span>
      <button @click="showToast = false" class="toast-close">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>


  <vue-easy-lightbox
    :visible="lightboxVisible"
    :imgs="imageSources"
    :index="lightboxIndex"
    @hide="lightboxVisible = false"
  ></vue-easy-lightbox>

  <VideoModal
    :visible="videoModalVisible"
    :src="currentVideoUrl"
    :poster="currentVideoPoster"
    :video-name="currentVideoName"
    @close="videoModalVisible = false"
  />

  <!-- 需求记录浮动 Widget -->
  <div v-if="userFeedbacks && userFeedbacks.length > 0" class="req-widget">
    <!-- 展开面板 -->
    <transition name="req-panel">
      <div v-if="isWidgetHovered" class="req-panel">
        <div class="req-panel-header">
          <div class="req-panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            我的需求记录
          </div>
          <button class="req-panel-close" @click="isWidgetHovered = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="req-filter-tabs">
          <button :class="['req-filter-tab', widgetFilter === 'all' && 'active']" @click="widgetFilter = 'all'">
            全部 <span class="req-filter-count">{{ userFeedbacks.length }}</span>
          </button>
          <button :class="['req-filter-tab', widgetFilter === 'pending' && 'active']" @click="widgetFilter = 'pending'">
            处理中 <span class="req-filter-count pending">{{ pendingFeedbacks.length }}</span>
          </button>
          <button :class="['req-filter-tab', widgetFilter === 'approved' && 'active']" @click="widgetFilter = 'approved'">
            已完成 <span class="req-filter-count done">{{ approvedFeedbacks.length }}</span>
          </button>
        </div>
        <div class="req-panel-body">
          <div v-if="isUserFeedbacksLoading" class="req-loading">
            <div class="req-loading-dot"></div>
            <div class="req-loading-dot"></div>
            <div class="req-loading-dot"></div>
          </div>
          <div v-else-if="filteredFeedbacks.length === 0" class="req-empty">暂无记录</div>
          <ul v-else class="req-list">
            <li v-for="feedback in filteredFeedbacks" :key="feedback.id" class="req-item">
              <div class="req-item-top">
                <span :class="['req-status', feedback.status === 'pending' ? 'req-status-pending' : 'req-status-done']">
                  <span class="req-status-dot"></span>
                  {{ feedback.status === 'pending' ? '处理中' : '已完成' }}
                </span>
                <span class="req-time">{{ formatDateTime(feedback.created_at) }}</span>
              </div>
              <p class="req-text">{{ feedback.message }}</p>
            </li>
          </ul>
        </div>
      </div>
    </transition>

    <!-- 触发按钮 -->
    <button class="req-trigger" @click="toggleWidget" :class="{ active: isWidgetHovered }">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <span
        v-if="(userFeedbacks || []).filter(f => f.status === 'pending').length > 0"
        class="req-badge"
      >{{ (userFeedbacks || []).filter(f => f.status === 'pending').length }}</span>
    </button>
  </div>
</template>

<style>
  body { font-family: sans-serif; background-color: #060d08; margin: 0; overflow-y: scroll; }
  /* 亮色主题：恢复浅色背景 */
  body.theme-light { background-color: #f0f2f5; }
  body.theme-light .tags-container { background: #f5f5f5; border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  body.theme-light .tags-container button { background: #e0e0e0; border: none; color: #555; }
  body.theme-light .tags-container button:hover { background: #d0d0d0; color: #333; }
  body.theme-light .grid-item { background: white; backdrop-filter: none; -webkit-backdrop-filter: none; border: none; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  body.theme-light .grid-item:hover { background: white; border-color: transparent; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
  body.theme-light .grid-item img, body.theme-light .grid-item video { background-color: #e9ecef; }
  body.theme-light .grid-item p { color: #343a40; }
  body.theme-light .no-results, body.theme-light .loading-results { color: #6c757d; }
  body.theme-light .search-suggestions { background: white; border: none; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
  body.theme-light .suggestions-header { background: linear-gradient(135deg,#f5f7fa,#c3cfe2); border-bottom: 1px solid #e0e0e0; }
  body.theme-light .suggestions-title { color: #555; }
  body.theme-light .suggestion-item { color: #333; }
  body.theme-light .search-tip-card { background: #f8fafc; border: 1px solid #dfe3e8; box-shadow: 0 6px 16px rgba(15,23,42,0.08); }
  body.theme-light .search-tip-title { color: #1f2937; }
  body.theme-light .search-tip-subtitle { color: #4b5563; }
  body.theme-light .search-progress { color: #6b7280; }
  body.theme-light .show-more-btn { background: #fff; border: 1px solid #cbd5e1; color: #111827; box-shadow: 0 2px 8px rgba(15,23,42,0.08); }
  body.theme-light .show-more-btn:hover { background: #f3f4f6; box-shadow: 0 6px 14px rgba(15,23,42,0.12); }
  body.theme-light .btn-icon { color: #374151; }
  body.theme-light .browse-load-count { color: #9ca3af; }
  body.theme-light .browse-load-count strong { color: #3d6b52; }
  body.theme-light .empty-title { color: #1a2332; }
  body.theme-light .empty-subtitle { color: #64748b; }
  body.theme-light .empty-keyword { color: #0a3d22; }
  body.theme-light .suggestion-chip { border-color: rgba(10,61,34,0.25); color: #0a3d22; }
  body.theme-light .suggestion-chip:hover { background: #0a3d22; border-color: #0a3d22; color: #fff; }
  body.theme-light .empty-feedback { background: #f8fafc; border: 1px solid #e2e8f0; }
  body.theme-light .empty-textarea { background: #fff; border-color: #e2e8f0; color: #374151; }
  body.theme-light .empty-suggestions-label { color: #94a3b8; }
  body.theme-light .load-more-container { color: #6c757d; }
  body.theme-light .loader { border-color: #e8f7f0; border-top-color: #5a8f73; }
  main { 
    padding: 1rem; 
    max-width: 1200px; 
    margin-top: calc(0px + var(--announcement-height, 0px)); /* 导航栏高度 + 公告栏高度 */
    margin-left: auto;
    margin-right: auto;
    min-height: 50vh;
    transition: margin-top 0.3s ease; /* 平滑过渡 */
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }

  main {
    position: relative;
    z-index: 1;
  }

  .hero-header {
    position: relative;
    z-index: 1;
    background: linear-gradient(-45deg, #020d07, #062818, #0a3d22, #051f10, #0d4a2a, #021208);
    background-size: 400% 400%;
    animation: gradient-animation 18s ease infinite;
    color: white;
    text-align: center;
    padding: 3rem 1rem;
    border-bottom-left-radius: 25px;
    border-bottom-right-radius: 25px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  @keyframes gradient-animation {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

.hero-content { max-width: 700px; margin: 0 auto; }
.hero-title { 
  font-family: 'Montserrat', sans-serif; /* 现代字体 */
  font-size: 3.5rem; /* 更大标题 */
  font-weight: 800; /* 更粗字重 */
  margin: 0; 
  letter-spacing: 3px; /* 增加字间距 */
  text-shadow: 0 4px 10px rgba(0,0,0,0.3); /* 更深更柔和的阴影 */
}
.hero-subtitle { 
  font-family: 'Roboto', sans-serif; /* 现代字体 */
  font-size: 1.3rem; 
  font-weight: 300; 
  opacity: 0.95; 
  margin: 1rem 0 2.5rem 0; /* 调整间距 */
}
/* 搜索栏行：输入框 + 按钮组合 */
.search-bar-row {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 30px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  transition: box-shadow 0.4s ease, transform 0.4s ease;
  overflow: hidden;
}

.search-bar-row:focus-within {
  box-shadow: 0 8px 30px rgba(0,0,0,0.25), 0 0 0 4px rgba(90, 143, 115, 0.35);
  transform: translateY(-2px);
}

.search-input-cool {
  flex: 1;
  min-width: 0;
  padding: 1.2rem 1.5rem 1.2rem 2rem;
  font-size: 1.1rem;
  border: none;
  background: transparent;
  outline: none;
  color: #333;
}

.search-btn {
  flex-shrink: 0;
  margin: 0.4rem 0.4rem 0.4rem 0;
  padding: 0.75rem 1.6rem;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: opacity 0.2s ease, transform 0.15s ease;
}

.search-btn:hover {
  opacity: 0.88;
  transform: scale(1.03);
}

.search-btn:active {
  transform: scale(0.98);
}
.search-input-cool::placeholder { 
  color: #999; /* 占位符颜色 */
  opacity: 0.8;
}

/* 搜索框包装器 */
.search-wrapper {
  position: relative;
  width: 100%;
}

/* 搜索建议下拉列表 */
.search-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  animation: slideDown 0.3s ease-out;
  max-height: 300px;
  overflow-y: auto;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestions-header {
  padding: 12px 16px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestions-icon {
  font-size: 1.2em;
}

.suggestions-title {
  font-size: 0.9em;
  color: #555;
  font-weight: 500;
}

.suggestions-list {
  padding: 8px;
}

.suggestion-item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
  font-size: 1em;
  margin-bottom: 4px;
} 

.suggestion-item:hover {
  background: linear-gradient(135deg, #0a3d22 0%, #5a8f73 100%);
  color: white;
  transform: translateX(4px);
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

/* 无结果区域的搜索建议 */
.search-suggestions-inline {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.suggestions-hint {
  font-size: 1.1em;
  font-weight: 600;
  color: #555;
  margin-bottom: 1rem;
  text-align: center;
}

.suggestions-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: center;
}

.suggestion-btn {
  padding: 0.7rem 1.4rem;
  background: white;
  border: 2px solid #5a8f73;
  border-radius: 25px;
  color: #3d6b52;
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(90, 143, 115, 0.2);
}

.suggestion-btn:hover {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(90, 143, 115, 0.35);
}
  
.tags-container {
  margin-bottom: 0rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
  overflow: hidden;
}
.tags-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem 0 0.4rem;
  max-height: 110px;
  overflow: hidden;
  transition: max-height 0.4s ease-in-out;
}
.tags-container.tags-expanded .tags-inner {
  max-height: 1000px;
}
.tags-footer {
  display: flex;
  justify-content: center;
  padding: 0.15rem 0 0.55rem;
}

/* --- 新增：为 TransitionGroup 内的标签按钮添加过渡动画 --- */

/* 1. 定义过渡期间的动画效果 */
.tag-list-move,
.tag-list-enter-active,
.tag-list-leave-active {
  transition: all 0.4s ease;
}

/* 2. 定义进入动画的开始状态和离开动画的结束状态 */
.tag-list-enter-from,
.tag-list-leave-to {
  opacity: 0;
  transform: translateY(10px); /* 从下方轻微上浮进入 */
}

/* 3. 确保离开的元素脱离布局流，防止布局抖动 */
.tag-list-leave-active {
  position: absolute;
}

/* TransitionGroup 渲染的 div 继承 flex 布局 */
.tags-inner > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.tags-container button {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 0.7rem 1.4rem;
  margin: 0.4rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: rgba(255,255,255,0.65);
}
.tags-container button:hover {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.tags-container button.active {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(90, 143, 115, 0.35);
  transform: translateY(-1px);
}

.grid-container { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 调整最小宽度 */
  gap: 1.5rem; /* 增加间距 */
  padding: 1rem 0;
}
.grid-item { 
  border: none; /* 移除边框 */
  border-radius: 12px; /* 更大圆角 */
  background-color: white; 
  text-align: center; 
  padding: 1.5rem; /* 增加内边距 */
  box-shadow: 0 6px 20px rgba(0,0,0,0.08); /* 柔和阴影 */
  transition: all 0.3s ease-in-out; 
  cursor: pointer; 
  position: relative;
  overflow: hidden; /* 隐藏超出内容 */
}
.grid-item:hover {
  transform: translateY(-5px) scale(1.02); /* 增强悬浮效果 */
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.grid-item img, .grid-item video { 
  max-width: 100%; 
  height: 180px; /* 增加高度 */
  object-fit: cover; 
  border-radius: 8px; /* 调整图片圆角 */
  display: block; 
  background-color: #e9ecef; /* 占位背景色 */
  margin-bottom: 1rem;
}

/* 防止video元素在列表中被直接播放 */
.grid-item video {
  pointer-events: none; /* 禁止video自身的交互 */
}
.grid-item p { 
  margin-top: 0.5rem; 
  font-weight: 600; /* 更粗字重 */
  color: rgba(255,255,255,0.88);
  font-size: 1.1em;
}
.no-results, .loading-results {
  text-align: center;
  color: rgba(255,255,255,0.45); 
  /* margin-top: 3rem;  */
  /* font-size: 1.2em; */
}

  .gallery-move, .gallery-enter-active, .gallery-leave-active { transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1); }
.gallery-enter-from, .gallery-leave-to { opacity: 0; transform: scale(0.9); }
  .gallery-leave-active { position: absolute; }

.media-icon { 
  position: absolute; 
  top: 35%; 
  left: 50%; 
  transform: translate(-50%, -50%); 
  background-color: rgba(0, 0, 0, 0.6); 
  color: white; 
  border-radius: 50%; 
  width: 35px; /* 调整大小 */
  height: 35px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  font-size: 16px; 
  backdrop-filter: blur(5px); /* 毛玻璃效果 */
}
  
.load-more-container { 
  display: flex; 
  flex-direction: column;
  justify-content: center; 
  align-items: center; 
  /* padding: 2rem 1rem; */
  margin-top: 0px;
  color: rgba(255,255,255,0.45); 
  font-size: 1.1em;
  text-align: center;
}

.load-complete {
  color: #28a745;
  font-weight: 500;
  margin: 1rem 0;
}

.browse-load-count {
  color: rgba(255,255,255,0.35);
  font-size: 0.82rem;
  margin: 0.6rem 0 0.2rem;
  letter-spacing: 0.01em;
}

.browse-load-count strong {
  color: #3d6b52;
  font-weight: 600;
}

.search-limit-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.search-tip-card {
  width: min(760px, calc(100% - 24px));
  margin: 0 auto;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid #dfe3e8;
  background: #f8fafc;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.search-tip-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
}

.search-tip-subtitle {
  margin: 0;
  font-size: 0.83rem;
  line-height: 1.55;
  color: #4b5563;
  text-align: center;
}

.search-progress {
  color: #6b7280;
  font-size: 0.8rem;
}

.show-more-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #111827;
  border-radius: 999px;
  padding: 0.5rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.btn-icon {
  font-size: 0.76rem;
  color: rgba(255,255,255,0.5);
}

.show-more-btn:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.show-more-btn:active {
  transform: translateY(0);
}

.show-more-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

/* ── 搜索无结果空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px 56px;
  text-align: center;
}

.empty-icon-wrap {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(90,143,115,0.18), rgba(90,143,115,0.28));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-svg {
  width: 44px;
  height: 44px;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1a2332;
  margin: 0 0 8px;
  line-height: 1.4;
}

.empty-keyword {
  color: #0a3d22;
}

.empty-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0 0 20px;
  line-height: 1.6;
  max-width: 320px;
}

/* 搜索建议 chips */
.empty-suggestions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}

.empty-suggestions-label {
  font-size: 0.82rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.suggestion-chip {
  padding: 5px 14px;
  border: 1.5px solid rgba(10,61,34,0.25);
  border-radius: 99px;
  background: transparent;
  color: #0a3d22;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.suggestion-chip:hover {
  background: #0a3d22;
  border-color: #0a3d22;
  color: #fff;
}

/* 留言表单 */
.empty-feedback {
  width: 100%;
  max-width: 420px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.9rem;
  color: #374151;
  resize: none;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
  box-sizing: border-box;
  line-height: 1.5;
  font-family: inherit;
}

.empty-textarea:focus {
  border-color: #5a8f73;
}

.empty-textarea::placeholder {
  color: #94a3b8;
}

.empty-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
  letter-spacing: 0.02em;
}

.empty-submit:hover {
  filter: brightness(1.1);
}

.feedback-btn {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  box-shadow: 0 4px 15px rgba(90, 143, 115, 0.3);
}

.feedback-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(90, 143, 115, 0.4);
}
.loader {
  border: 4px solid rgba(255,255,255,0.1);
  border-top: 4px solid #5a8f73;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .observer { height: 20px; }

  /* --- 新增：针对移动端的响应式优化 --- */
@media (max-width: 768px) {
  .hero-content {
    /* 为内容区增加左右内边距，防止搜索框紧贴边缘 */
    padding-left: 1rem;
    padding-right: 1rem; 
  }
  /* 移动端标签内容区高度调整 */
  .tags-inner {
    max-height: 100px;
  }
  
  .hero-title {
    font-size: 2rem; /* 在小屏幕上适当缩小标题字号 */
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }


  .grid-container {
    /* 在手机上使用更少的列数，让图片更大更清晰 */
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  /* 移动端搜索框 */
  .search-input-cool {
    padding: 0.9rem 1rem 0.9rem 1.4rem;
    font-size: 1rem;
  }
  .search-btn {
    padding: 0.65rem 1.1rem;
    font-size: 0.9rem;
  }
  
  /* 移动端搜索建议 */
  .search-suggestions {
    border-radius: 8px;
    max-height: 250px;
  }
  
  .suggestions-header {
    padding: 10px 12px;
    font-size: 0.85em;
  }
  
  .suggestion-item {
    padding: 10px 14px;
    font-size: 0.9em;
  }
  
  .search-suggestions-inline {
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .suggestions-hint {
    font-size: 1em;
    margin-bottom: 0.8rem;
  }
  
  .suggestion-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.85em;
  }
}

.feedback-form {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  max-width: 100%;
  border: 1px solid #e0e0e0;
}


.feedback-form textarea {
  width: calc(100% - 24px); /* 减去padding和border */
  padding: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  font-size: 1.05rem;
  margin-bottom: 1.2rem;
  box-sizing: border-box; 
  resize: vertical; 
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

.feedback-form textarea:focus {
  outline: none;
  border-color: #5a8f73;
  box-shadow: 0 0 0 4px rgba(90, 143, 115, 0.15);
}

.feedback-form button {
  display: block;
  width: 100%;
  padding: 1rem 1.8rem;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.15rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(90, 143, 115, 0.25);
}

.feedback-form button:hover {
  background: linear-gradient(135deg, #3d6b52, #6aab88);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(90, 143, 115, 0.4);
}

.feedback-form button:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(90, 143, 115, 0.2);
}

/* ── 需求记录浮动 Widget ── */
.req-widget {
  position: fixed;
  bottom: 90px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

/* 触发按钮 */
.req-trigger {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(10, 61, 34, 0.35);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}
.req-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(10, 61, 34, 0.45);
}
.req-trigger.active {
  background: linear-gradient(135deg, #062818, #3d6b52);
}

/* 角标 */
.req-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-sizing: border-box;
  border: 2px solid #fff;
}

/* 面板 */
.req-panel {
  width: 300px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* 面板入场动画 */
.req-panel-enter-active,
.req-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.req-panel-enter-from,
.req-panel-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 面板头部 */
.req-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #0a3d22, #1e6b42);
  color: #fff;
}
.req-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.req-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.req-panel-close:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* 筛选 Tabs */
.req-filter-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px 10px;
  border-bottom: 1px solid #f1f5f9;
}
.req-filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.req-filter-tab:hover { background: #f1f5f9; }
.req-filter-tab.active { background: #f0f7f3; color: #1a6640; font-weight: 600; }
.req-filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 700;
}
.req-filter-count.pending { background: rgba(234,88,12,0.12); color: #ea580c; }
.req-filter-count.done    { background: rgba(5,150,105,0.12);  color: #059669; }
.req-filter-tab.active .req-filter-count { background: rgba(26,102,64,0.15); color: #1a6640; }
.req-filter-tab.active .req-filter-count.pending { background: rgba(234,88,12,0.18); color: #ea580c; }
.req-filter-tab.active .req-filter-count.done    { background: rgba(5,150,105,0.18);  color: #059669; }

/* 空状态 */
.req-empty {
  padding: 24px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.82rem;
}

/* 面板内容区 */
.req-panel-body {
  max-height: 320px;
  overflow-y: auto;
  padding: 10px 12px 12px;
}
.req-panel-body::-webkit-scrollbar { width: 4px; }
.req-panel-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

/* 加载动画 */
.req-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 0;
}
.req-loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5a8f73;
  animation: req-bounce 1.2s ease-in-out infinite;
}
.req-loading-dot:nth-child(2) { animation-delay: 0.2s; }
.req-loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes req-bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40%            { transform: scale(1);   opacity: 1; }
}

/* 列表 */
.req-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.req-item {
  padding: 11px 12px;
  border-radius: 9px;
  transition: background 0.15s;
}
.req-item:hover { background: #f8fafc; }

.req-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

/* 状态标签 */
.req-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 99px;
}
.req-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.req-status-pending {
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}
.req-status-pending .req-status-dot {
  background: #ea580c;
  animation: req-bounce 1.5s ease-in-out infinite;
}
.req-status-done {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.req-status-done .req-status-dot { background: #059669; }

.req-time {
  font-size: 0.75rem;
  color: #94a3b8;
}
.req-text {
  margin: 0;
  font-size: 0.87rem;
  color: #374151;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════
   移动端响应式设计（≤ 768px）
   设计原则：
   - Hero 用 clamp() 流式字号，不靠断点硬缩
   - 标签改为单行横向滚动，节省竖向空间
   - 图片用 aspect-ratio 自适应列宽，不固定高度
   - 卡片去除外 padding，图片撑满，标题内嵌其下
   ═══════════════════════════════════════════════════ */
@media (max-width: 768px) {
  main {
    padding: 0;
    margin-top: calc(56px + var(--announcement-height, 0px));
    transition: margin-top 0.3s ease;
  }

  /* ── Hero ── */
  .hero-header {
    padding: 1.6rem 1rem 1.8rem;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }
  .hero-title {
    font-size: clamp(1.5rem, 6vw, 2.2rem);
    letter-spacing: 1px;
    margin-bottom: 0;
  }
  /* 移动端隐藏副标题，搜索栏直接跟在标题后 */
  .hero-subtitle {
    display: none;
  }
  .search-wrapper {
    margin-top: 1rem;
  }
  .search-input-cool {
    padding: 0.75rem 0.75rem 0.75rem 1rem;
    font-size: 0.9rem;
  }
  .search-btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  /* ── 标签：单行横向滚动 ── */
  .tags-container {
    margin-bottom: 0.75rem;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
  }
  .tags-inner {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: none;
    padding: 0.6rem 1rem 0.6rem 56px; /* 左侧56px避开侧边菜单按钮 */
    justify-content: flex-start;
    gap: 0.4rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .tags-inner::-webkit-scrollbar { display: none; }
  .tags-inner > div {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.4rem;
    min-width: max-content;
    justify-content: flex-start;
  }
  .tags-container button {
    padding: 0.4rem 0.85rem;
    font-size: 0.82rem;
    white-space: nowrap;
    flex-shrink: 0;
    margin: 0;
    border-radius: 999px;
  }

  /* ── 网格：2列，aspect-ratio 自适应 ── */
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0 0.5rem 0.5rem;
  }
  .grid-item {
    padding: 0;
    border-radius: 10px;
    overflow: hidden;
  }
  .grid-item img,
  .grid-item video {
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 0;
    margin-bottom: 0;
    display: block;
  }
  .grid-item p {
    font-size: 0.82rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    padding: 0.45rem 0.6rem 0.55rem;
    text-align: left;
  }
  .media-icon {
    width: 30px;
    height: 30px;
  }

  /* ── feedback 小部件 ── */
  .feedback-timeline-widget {
    bottom: 15px;
    left: 8px;
    width: 60px;
    max-height: 50px;
  }
  .feedback-timeline-widget.expanded {
    width: calc(100% - 16px);
    max-height: 350px;
  }
  .widget-header { padding: 10px 12px; font-size: 1em; }
  .widget-header .icon { font-size: 1.2em; margin-right: 0; position: relative; }
  .feedback-timeline-widget.expanded .widget-header .icon { margin-right: 8px; }
  .widget-header .pending-badge { padding: 0.15em 0.4em; font-size: 0.6em; min-width: 18px; margin-left: 4px; }
  .feedback-timeline-widget:not(.expanded) .widget-header .pending-badge { top: 4px; right: 4px; width: 8px; height: 8px; padding: 0; margin: 0; }
  .feedback-timeline-widget.expanded .widget-header .pending-badge { margin-left: 8px; }
  .widget-header .toggle-icon { margin-left: 8px; }
  .widget-content { padding: 10px; }
  .feedback-item { padding: 10px; }
  .feedback-message { font-size: 0.85em; }
}

/* ── 窄屏微调（≤ 480px） ── */
@media (max-width: 480px) {
  main {
    margin-top: calc(52px + var(--announcement-height, 0px));
  }
  .grid-container {
    gap: 0.4rem;
    padding: 0 0.4rem 0.4rem;
  }
  .grid-item {
    border-radius: 8px;
  }
  .grid-item p {
    font-size: 0.78rem;
    padding: 0.4rem 0.5rem 0.5rem;
  }
}

/* 标签切换按钮 */
.tags-toggle-btn {
  background-color: transparent !important;
  color: #3d6b52 !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  box-shadow: none !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  letter-spacing: 0.02em;
}

.tags-toggle-btn:hover {
  background-color: rgba(90, 143, 115, 0.08) !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 高端提示框样式 */
.custom-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  min-width: 320px;
  max-width: 500px;
  backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
}

.toast-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(21, 128, 61, 0.95) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.toast-icon {
  width: 24px;
  height: 24px;
  color: white;
  flex-shrink: 0;
}

.toast-icon svg {
  width: 100%;
  height: 100%;
}

.toast-message {
  color: white;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  flex: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toast-close {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: scale(1.1);
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .custom-toast {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
  
  .toast-content {
    padding: 14px 16px;
  }
  
  .toast-message {
    font-size: 14px;
  }
}

/* 导航栏活跃状态按钮样式
a.router-link-active.router-link-exact-active{
  background-color: #20a94e;
} */

/* 搜索框引导动画 */
@keyframes gentle-shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}

/* === 抽屉相关样式已移至SideDrawer.vue组件 === */

/* === 卡片快捷操作按钮组 === */
.card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.grid-item:hover .card-actions {
  opacity: 1;
  transform: translateY(0);
}

/* 移动端始终显示按钮，适配无 padding 卡片 */
@media (max-width: 768px) {
  .card-actions {
    opacity: 1;
    transform: translateY(0);
    gap: 4px;
    top: 6px;
    right: 6px;
  }

  .action-btn {
    width: 26px;
    height: 26px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
  }

  .action-btn svg {
    width: 12px;
    height: 12px;
  }
}

/* 统一的操作按钮样式 */
.action-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #6c757d;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.action-btn:hover {
  background: white;
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn:active {
  transform: scale(1.05);
}

.action-btn svg {
  width: 18px;
  height: 18px;
  transition: all 0.2s ease;
}

/* 收藏按钮特定样式 */
.favorite-btn:hover {
  color: #dc3545;
}

.favorite-btn.favorited {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
}

.favorite-btn.favorited:hover {
  background: linear-gradient(135deg, #c82333, #bd2130);
}

.favorite-btn svg {
  fill: currentColor;
}

/* 复制按钮特定样式 */
.copy-btn {
  color: #3d6b52;
}

.copy-btn:hover {
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: white;
  box-shadow: 0 4px 12px rgba(90, 143, 115, 0.4);
}

.copy-btn svg {
  stroke: currentColor;
}

/* 按钮动画效果 */
@keyframes copySuccess {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.copy-btn.copying {
  animation: copySuccess 0.4s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}

</style>