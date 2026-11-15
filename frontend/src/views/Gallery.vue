<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, onActivated, inject, nextTick } from 'vue';
import apiClient from '../axiosConfig.js';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';
import { useTheme } from '../composables/useTheme.js';
import { copyText } from '../utils/clipboard.js';

const { isDark } = useTheme();

// --- 基础状态 ---
const materials = shallowRef([]);
const displayMaterials = shallowRef([]);
const searchTerm = ref('');
const tags = ref([]);
const activeTag = ref('');
const sortBy = ref('latest'); // latest | popular
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
const heroSearchRef = ref(null); // hero 搜索框引用（用于判断是否滚出视野）
const showStickySearch = ref(false); // 滚出视野后显示的粘顶精简搜索条
const visibleTagsCount = ref(20); // 动态计算的可见标签数量

// --- 收藏夹状态（使用全局状态） ---
const appFavorites = inject('appFavorites', { favorites: ref([]), addToFavorites: () => {} });
const favorites = appFavorites.favorites;

// --- 注入Gallery回调引用 ---
const galleryCallbacks = inject('galleryCallbacks', ref({}));

// 动态排除标签（由 App.vue 根据 page-categories 配置注入）
const excludeTagsParam = inject('excludeTagsParam', ref(''));
// 分类配置就绪信号（App.vue 提供）：首屏必须等它，否则 exclude_tags 为空，
// 数量和列表会把「杂款领口」等独立分类的素材也算进来
const categoriesReady = inject('categoriesReady', Promise.resolve());

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

// Hero 右侧预览图：只在首屏取一次固定展示，避免筛选/搜索时闪烁
const heroPreviewImages = ref([]);
watch(displayMaterials, (list) => {
  if (heroPreviewImages.value.length > 0) return; // 已固定，不再更新
  const imgs = (list || []).filter(m => m.media_type === 'image').slice(0, 4);
  if (imgs.length > 0) heroPreviewImages.value = imgs;
});

// Hero 热门搜索标签：取前 6 个标签
const heroHotTags = computed(() => (tags.value || []).slice(0, 6));

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

// --- 搜索建议相关状态 ---
const searchSuggestions = ref([]); // 搜索建议列表
const showSuggestions = ref(false); // 是否显示建议
const isFetchingSuggestions = ref(false); // 是否正在获取建议

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
        if (material.conversion_status === 'converting' || !material.file_path || material.file_path === '_converting_') return;
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
      sort: sortBy.value,
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
            // 如果有正在转码的视频，启动轮询
            if (data.some(m => m.conversion_status === 'converting')) {
                startConversionPolling();
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
const askXiaodu = () => {
  window.dispatchEvent(new CustomEvent('fbot:open', {
    detail: { topic: 'notfound', text: searchTerm.value || activeTag.value || '' }
  }));
};

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

// 切换排序（最新 / 最多浏览）
const changeSort = (value) => {
    if (sortBy.value === value) return;
    sortBy.value = value;
    currentPage.value = 1;
    totalPages.value = 1;
    isChunkRendering.value = true;
    displayMaterials.value = [];
    fetchMaterials(false);
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

// hero 搜索框底部滚出视野顶部时，显示粘顶精简搜索条（滚动监听，确定性强）
const updateStickySearch = () => {
    if (!heroSearchRef.value) return;
    showStickySearch.value = heroSearchRef.value.getBoundingClientRect().bottom < 8;
};

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
        isDataLoaded.value = true;
        // 等排除标签配置就绪再请求，保证首屏的素材与数量就已排除独立分类；
        // 配置接口异常时最多等 2s 兜底，不阻塞首屏
        Promise.race([
            categoriesReady,
            new Promise(resolve => setTimeout(resolve, 2000))
        ]).then(() => {
            handleFilterChange();
            fetchTags();
        });
    }
    
    // 使用nextTick确保DOM完全渲染后再设置观察器
    nextTick(() => {
        setupObserver();
        updateStickySearch();
    });

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', updateStickySearch, { passive: true });
    document.addEventListener('click', handleDocumentClick);
});

// keep-alive组件激活时的逻辑
onActivated(() => {
    // 重新设置观察器，因为组件可能被缓存
    nextTick(() => {
        setupObserver();
        updateStickySearch();
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

    window.removeEventListener('scroll', updateStickySearch);

    if (appendFrameId) {
      cancelAnimationFrame(appendFrameId);
      appendFrameId = null;
    }

    clearTimeout(debounceTimer);
    clearTimeout(suggestionsTimer);
    stopConversionPolling();

    window.removeEventListener('resize', handleWindowResize);
    document.removeEventListener('click', handleDocumentClick);
});

// --- MOV 转码进度轮询 ---
let conversionPollTimer = null;

function startConversionPolling() {
  if (conversionPollTimer) return;
  conversionPollTimer = setInterval(async () => {
    const converting = displayMaterials.value.filter(m => m.conversion_status === 'converting');
    if (converting.length === 0) { stopConversionPolling(); return; }
    for (const m of converting) {
      try {
        const { data: res } = await apiClient.get(`/api/v1/materials/${m.id}/conversion-status`);
        if (res.data.conversion_status !== 'converting') {
          // 更新 shallowRef 里的对象（shallowRef 只追踪数组引用，需要替换整个数组）
          const idx = displayMaterials.value.findIndex(x => x.id === m.id);
          if (idx !== -1) {
            const updated = [...displayMaterials.value];
            updated[idx] = { ...updated[idx], ...res.data };
            displayMaterials.value = updated;
          }
          const midx = materials.value.findIndex(x => x.id === m.id);
          if (midx !== -1) {
            const updated = [...materials.value];
            updated[midx] = { ...updated[midx], ...res.data };
            materials.value = updated;
          }
        }
      } catch (_) {}
    }
  }, 5000);
}

function stopConversionPolling() {
  if (conversionPollTimer) { clearInterval(conversionPollTimer); conversionPollTimer = null; }
}


// 将任意图片 blob 转为 PNG（ClipboardItem 只支持 image/png）
// maxDim: 最长边超过此值时按比例缩小，避免大图 toBlob 耗时过长
const blobToPngBlob = (blob, maxDim = 1500) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (Math.max(w, h) > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(png => png ? resolve(png) : reject(new Error('toBlob failed')), 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
  img.src = url;
});

// 为 OSS/CDN 图片 URL 追加复制专用的缩略参数，减少下载体积
const getCopyOptimizedUrl = (url) => {
  const cdnDomain = 'assets.fangdutex.cn';
  const ossDomain = 'aliyuncs.com';
  if (!url.includes(cdnDomain) && !url.includes(ossDomain)) return url;
  const base = url.split('?')[0];
  // m_lfit: 等比缩放不裁剪；limit_1: 仅缩小不放大；w_1500 宽度上限
  return `${base}?x-oss-process=image/resize,m_lfit,w_1500,limit_1,quality,q_92`;
};

const quickCopyName = async (material) => {
  try {
    await copyText(material.name);
    showCustomToast(`名称“${material.name}”已复制`, 'success');
  } catch (error) {
    console.error('复制名称失败:', error);
    showCustomToast('名称复制失败，请重试', 'error');
  }
};

// 快捷复制图片（通过后端代理绕过 CORS，转 PNG 后写入剪贴板）
const quickCopyImage = async (material) => {
  if (material.media_type !== 'image') return;

  const imageName = material.name || '图片';
  const imageUrl = getCopyOptimizedUrl(toCdnUrl(material.file_path));

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
      await navigator.clipboard.writeText(toCdnUrl(material.file_path));
      showCustomToast('已复制图片链接', 'info');
    } catch {
      showCustomToast('复制失败，请重试', 'error');
    }
  }
};
</script>

<template>
  <!-- 滚动后从顶部滑下的精简搜索条（hero 搜索框滚出视野时出现） -->
  <Transition name="sticky-search">
    <div v-show="showStickySearch" class="sticky-search">
      <div class="sticky-search__inner">
        <svg class="sticky-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          v-model="searchTerm"
          placeholder="搜索素材 如：圆领短袖 插肩"
          class="sticky-search__input"
          @keydown.enter="handleFilterChange"
        >
        <button class="sticky-search__btn" @click="handleFilterChange">搜索</button>
      </div>
    </div>
  </Transition>

  <header class="hero-header">
    <div class="hero-layout">
      <div class="hero-content">
        <h1 class="hero-title">方度实拍图</h1>
        <p class="hero-subtitle">您可以在这里获取到各种面料、款式、等实拍图素材</p>
        <div class="search-wrapper" ref="heroSearchRef">
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
        <!-- 热门搜索 -->
        <div v-if="heroHotTags.length" class="hero-hot-tags">
          <span class="hero-hot-label">热门搜索：</span>
          <button
            v-for="t in heroHotTags"
            :key="t"
            class="hero-hot-tag"
            @click="filterByTag(t)"
          >{{ t }}</button>
        </div>
      </div>
      <!-- 右侧预览图 -->
      <div v-if="heroPreviewImages.length" class="hero-preview">
        <div
          v-for="img in heroPreviewImages"
          :key="img.id"
          class="hero-preview-item"
          @click="showMedia(img)"
        >
          <img :src="toCdnUrl(img.thumbnail_url || img.file_path)" :alt="img.name" loading="lazy" decoding="async">
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
    <div class="sort-toolbar">
      <span class="sort-toolbar__count">
        <svg class="count-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
        <template v-if="isSearching">找到 <b class="count-num">{{ totalItems }}</b> 个结果</template>
        <template v-else-if="totalItems > 0">共 <b class="count-num">{{ totalItems }}</b> 个实拍素材</template>
        <template v-else>全部实拍素材</template>
      </span>
      <div class="sort-tabs">
        <button class="sort-tab" :class="{ active: sortBy === 'latest' }" @click="changeSort('latest')">最新上传</button>
        <button class="sort-tab" :class="{ active: sortBy === 'popular' }" @click="changeSort('popular')">最多浏览</button>
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
        <div v-else-if="material.media_type === 'video' && material.conversion_status === 'converting'" class="converting-placeholder">
          <svg class="converting-spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="80 30"/></svg>
          <span>视频转换中…</span>
        </div>
        <div v-else-if="material.media_type === 'video' && material.conversion_status === 'failed'" class="converting-placeholder converting-failed">
          <span>转换失败</span>
        </div>
        <!-- 有封面图时用 img（iOS Safari 最可靠，不受 video 跨域限制） -->
        <img
            v-else-if="material.media_type === 'video' && (material.cover_image_path || material.thumbnail_url)"
            :src="toCdnUrl(material.cover_image_path || material.thumbnail_url)"
            :alt="material.name"
            loading="lazy"
            decoding="async"
        >
        <!-- 无封面图时回退到 video，用 #t=0.1 强制 iOS 渲染首帧作为预览 -->
        <video
            v-else-if="material.media_type === 'video'"
            :src="toCdnUrl(material.file_path).split('#')[0] + '#t=0.1'"
            preload="metadata"
            muted
            playsinline
            webkit-playsinline
            disablePictureInPicture
            @click.prevent
        ></video>
        <div class="card-body">
          <div class="card-title-row">
            <p class="card-title" :title="material.name">{{ material.name }}</p>
            <button
              class="copy-name-btn"
              type="button"
              title="复制名称"
              :aria-label="`复制名称：${material.name}`"
              @click.stop="quickCopyName(material)"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 7V5a2 2 0 0 1 2-2h7l3 3v11a2 2 0 0 1-2 2h-2M13 3v4h4M6 9h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm1 4h5m-5 4h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="card-meta">
            <!-- 移动端收藏：放在信息行右侧，不遮挡图片 -->
            <button
              class="card-fav-inline"
              :class="{ favorited: favorites.find(fav => fav.id === material.id) }"
              @click.stop="addToFavorites(material)"
              aria-label="收藏"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61V4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
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
            <svg class="empty-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="21" cy="21" r="12" class="empty-svg-ring" stroke-width="2.4"/>
              <path d="M30 30l9 9" class="empty-svg-ring" stroke-width="2.4" stroke-linecap="round"/>
              <path d="M16.5 21h9" class="empty-svg-cross" stroke-width="2.4" stroke-linecap="round"/>
              <circle cx="38" cy="10" r="2" class="empty-svg-dot"/>
              <circle cx="9" cy="38" r="1.5" class="empty-svg-dot"/>
            </svg>
          </div>

          <!-- 文案 -->
          <h3 class="empty-title">
            未找到<span class="empty-keyword">「{{ searchTerm || activeTag }}」</span>的相关素材
          </h3>
          <p class="empty-subtitle">换个关键词试试</p>

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

          <!-- 小度反馈入口 -->
          <div class="empty-cta">
            <div class="empty-cta-text">
              <strong>还是没找到？告诉小度</strong>
              <span>说说你想要的款式，团队会帮你记下来</span>
            </div>
            <button class="empty-cta-btn" @click="askXiaodu">告诉小度</button>
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

  <!-- 版权声明 -->
  <div class="site-footer">
    本站素材仅供内部参考使用。如您认为某一素材侵犯了您的版权，请联系
    <a href="mailto:luoyangyang614@gmail.com" class="footer-link">luoyangyang614@gmail.com</a>
    ，我们将在核实后第一时间下架处理。
  </div>

</template>
