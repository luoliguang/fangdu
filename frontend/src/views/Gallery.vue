<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onActivated, inject, nextTick } from 'vue';
import apiClient from '../axiosConfig.js';
import { useFeedbackStore } from '@/stores/feedback';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';
import TutorialGuide from '../components/TutorialGuide.vue';
import tutorialManager from '../utils/tutorialManager.js';
import { copyImageToClipboard } from 'copy-image-clipboard';

// 简单的 UUID 生成函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- 基础状态 ---
const materials = ref([]);
const displayMaterials = ref([]);
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

const visibleTags = computed(() => {
  //如果tags.value不存在或不是数组，返回空数组
  if (!tags.value || !Array.isArray(tags.value)) {
    return [];
  }
  //如果是展开状态，或者标签总数小于等于可见数量，则全部显示
  if (isTagsExpanded.value || tags.value.length <= visibleTagsCount.value){
    return tags.value;
  }
  //否则只显示计算出的可见数量
  return tags.value.slice(0, visibleTagsCount.value)
})

// 计算实际可见的标签数量
const calculateVisibleTags = async () => {
  if (!tagsContainerRef.value || !tags.value || tags.value.length === 0) {
    return;
  }
  
  const container = tagsContainerRef.value;
  const maxHeight = 110; // 对应CSS中的max-height
  
  // 先显示所有标签来测试是否溢出
  const originalExpanded = isTagsExpanded.value;
  isTagsExpanded.value = true;
  
  await new Promise(resolve => setTimeout(resolve, 0)); // 等待DOM更新
  
  const fullHeight = container.scrollHeight;
  
  // 如果没有溢出，显示所有标签
  if (fullHeight <= maxHeight) {
    visibleTagsCount.value = tags.value.length;
    isTagsExpanded.value = originalExpanded;
    return;
  }
  
  // 恢复原始状态
  isTagsExpanded.value = originalExpanded;
  
  // 逐个减少标签数量直到不溢出
  let testCount = tags.value.length - 1;
  
  while (testCount > 0) {
    visibleTagsCount.value = testCount;
    
    await new Promise(resolve => setTimeout(resolve, 0)); // 等待DOM更新
    
    const currentHeight = container.scrollHeight;
    
    if (currentHeight <= maxHeight) {
      // 找到合适的数量，但需要为"展开更多"按钮留出空间
      // 所以再减少1-2个标签
      visibleTagsCount.value = Math.max(1, testCount - 1);
      break;
    }
    
    testCount--;
  }
  
  if (testCount === 0) {
    visibleTagsCount.value = 1; // 至少显示1个标签
  }
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

// --- 教程相关状态 ---
const showTutorial = ref(false); // 控制教程显示
const tutorialTarget = ref('.search-input-cool'); // 教程聚焦目标
const tutorialGuideRef = ref(null); // 教程组件引用

// 获取代理URL
const getProxyUrl = (url) => {
  try {
    const proxyPath = '/api/proxy/media';
    const proxied = new URL(proxyPath, window.location.origin);
    proxied.searchParams.set('url', url);
    return proxied.toString();
  } catch (error) {
    console.error('构建代理URL失败:', error);
    return url;
  }
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
        return isCrossOriginUrl(m.file_path) ? getProxyUrl(m.file_path) : m.file_path;
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
                materials.value.push(...data);
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
    const response = await apiClient.get(`/api/v1/materials/tags/all`);
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
        initTutorial(); // 初始化教程
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

// 新增：处理小部件鼠标进入事件
const handleWidgetMouseEnter = () => {
  isWidgetHovered.value = true;
};

// 新增：处理小部件鼠标离开事件
const handleWidgetMouseLeave = () => {
  isWidgetHovered.value = false;
};

// --- 教程相关函数 ---
// 初始化教程
const initTutorial = () => {
  // 只在桌面端且首次访问时显示教程
  if (tutorialManager.isDesktop() && tutorialManager.isFirstVisit()) {
    // 延迟显示教程，确保页面完全加载
    setTimeout(() => {
      showTutorial.value = true;
    }, 1000);
  }
};

// 关闭教程
const closeTutorial = () => {
  showTutorial.value = false;
  tutorialManager.markTutorialCompleted('cancelled');
};

// 跳过教程
const skipTutorial = () => {
  showTutorial.value = false;
  tutorialManager.markTutorialCompleted('skipped');
};

// 完成教程
const completeTutorial = () => {
  showTutorial.value = false;
  tutorialManager.markTutorialCompleted('completed');
  // 可以添加一些引导用户开始搜索的逻辑
  // 例如：聚焦搜索框
  setTimeout(() => {
    const searchInput = document.querySelector('.search-input-cool');
    if (searchInput) {
      searchInput.focus();
    }
  }, 300);
};

// 处理教程下一步事件
const handleTutorialNextStep = (step) => {
  console.log('教程进入步骤:', step);
  // 在第二步时，可以添加一些额外的引导效果
  if (step === 1) {
    // 例如：轻微晃动搜索框来吸引注意
    const searchInput = document.querySelector('.search-input-cool');
    if (searchInput) {
      searchInput.style.animation = 'gentle-shake 0.5s ease-in-out 3';
      setTimeout(() => {
        searchInput.style.animation = '';
      }, 1500);
    }
  }
};

// 重置教程（用于测试，可以在控制台调用）
const resetTutorial = () => {
  tutorialManager.resetTutorial();
  // 重置教程组件的步骤
  if (tutorialGuideRef.value) {
    tutorialGuideRef.value.resetStep();
  }
  console.log('教程状态已重置，刷新页面可重新显示教程');
};

// 将重置函数暴露到全局，方便测试
if (typeof window !== 'undefined') {
  window.resetTutorial = resetTutorial;
}

// 留言表单始终显示
showFeedbackForm.value = true;

// 快捷复制图片（从卡片直接复制，不打开大图）
const quickCopyImage = async (material) => {
  try {
    if (material.media_type !== 'image') return;
    
    const imageUrl = material.file_path;
    const imageName = material.name || '图片';
    
    showCustomToast(`正在复制"${imageName}"...`, 'success');

    const isCrossOrigin = isCrossOriginUrl(imageUrl);
    let imageUrlToUse = isCrossOrigin ? getProxyUrl(imageUrl) : imageUrl;

    try {
      await copyImageToClipboard(imageUrlToUse);
      showCustomToast(`"${imageName}" 已复制！`, 'success');
    } catch (error) {
      console.error('快捷复制失败:', error);
      await copyImageNative(imageUrlToUse, material);
    }
  } catch (error) {
    console.error('快捷复制图片失败:', error);
    showCustomToast('复制失败，请重试', 'error');
  }
};

// 原生复制方法（作为降级方案）
const copyImageNative = async (imageUrl, material) => {
  try {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('浏览器不支持剪贴板API');
    }

    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // 确保blob类型正确
    let finalBlob = blob;
    if (!blob.type || !blob.type.startsWith('image/')) {
      finalBlob = new Blob([blob], { type: 'image/png' });
    }
    
    await navigator.clipboard.write([
      new ClipboardItem({
        [finalBlob.type]: finalBlob
      })
    ]);

    const successMsg = material?.name ? `"${material.name}" 已复制！` : '图片已复制到剪贴板！';
    showCustomToast(successMsg, 'success');
  } catch (error) {
    console.error('原生复制方法失败:', error);
    
    // 最终降级：复制图片链接
    await navigator.clipboard.writeText(imageUrl);
    showCustomToast('已复制图片链接（图片无法直接复制）', 'success');
  }
};
</script>

<template>
  <header class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">方度实拍图</h1>
      <p class="hero-subtitle">您可以在这里获取到各种面料、款式、等实拍图素材</p>
      <div class="search-wrapper">
        <input 
          type="text" 
          v-model="searchTerm" 
          placeholder="请以关键词的形式搜索 如：圆领短袖 插肩" 
          class="search-input-cool"
          @focus="handleSearchFocus"
          @blur="handleSearchBlur"
        >
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
  
    <div class="tags-container" :class="{ 'tags-expanded': isTagsExpanded }" ref="tagsContainerRef">
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

        <button 
          v-if="tags && tags.length > visibleTagsCount" 
          @click="isTagsExpanded = !isTagsExpanded" 
          class="tags-toggle-btn"
          key="toggle-btn"
        >
          {{ isTagsExpanded ? '收起' : '展开更多' }}
        </button>
      </TransitionGroup>
    </div>
    <TransitionGroup :name="isChunkRendering ? '' : 'gallery'" tag="div" class="grid-container">
      <div 
        v-for="material in displayMaterials" 
        :key="material.id" 
        class="grid-item"
        @click="showMedia(material)" 
      >
        <img v-if="material.media_type === 'image'" :src="material.thumbnail_url || material.file_path" :alt="material.name" loading="lazy" decoding="async" fetchpriority="low">
        <video 
            v-else-if="material.media_type === 'video'"
            :src="material.file_path" 
            :poster="material.cover_image_path || material.thumbnail_url"
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
        <div v-if="(!materials || materials.length === 0) && !isLoading && ((searchTerm && searchTerm.trim().length > 0) || (activeTag && activeTag !== ''))" class="no-results">
            <p>暂无更多的素材</p>
            <!-- 搜索建议区域 -->
            <div v-if="searchSuggestions && searchSuggestions.length > 0" class="search-suggestions-inline">
              <p class="suggestions-hint">💡 试试这些关键词：</p>
              <div class="suggestions-buttons">
                <button
                  v-for="(suggestion, index) in searchSuggestions"
                  :key="index"
                  @click="useSuggestion(suggestion)"
                  class="suggestion-btn"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>
            <p>如果找到您想要的素材？请告诉我们您的需求，我们会尽快处理！</p>
            <div class="feedback-form">
                <textarea v-model="feedbackMessage" placeholder="请描述您想要的素材，例如：复合双层拉链风衣" rows="3"></textarea>
                <button @click="submitFeedback" class="feedback-btn">提交留言</button>
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

  <!-- 教程引导组件 -->
  <TutorialGuide
    ref="tutorialGuideRef"
    :visible="showTutorial"
    :target-element="tutorialTarget"
    @close="closeTutorial"
    @skip="skipTutorial"
    @complete="completeTutorial"
    @next-step="handleTutorialNextStep"
  />

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

  <!-- 新增：用户留言时间线小部件 -->
  <div v-if="userFeedbacks && userFeedbacks.length > 0" 
    :class="{ 'feedback-timeline-widget': true, 'expanded': isWidgetHovered }"
    @mouseenter="handleWidgetMouseEnter" 
    @mouseleave="handleWidgetMouseLeave"
  >
    <div class="widget-header">
      <span class="icon">💬</span>
      <transition name="fade" mode="out-in">
        <span v-if="isWidgetHovered" class="title">我的实拍图请求</span>
      </transition>
      <span v-if="(userFeedbacks && Array.isArray(userFeedbacks)) && userFeedbacks.filter(f => f.status === 'pending').length > 0" class="pending-badge">
        <span v-if="isWidgetHovered">{{ (userFeedbacks && Array.isArray(userFeedbacks)) ? userFeedbacks.filter(f => f.status === 'pending').length : 0 }}</span>
        <span v-else class="dot"></span> <!-- 红点占位 -->
      </span>
      <transition name="fade" mode="out-in">
        <span v-if="isWidgetHovered" class="toggle-icon">{{ isWidgetHovered ? '▲' : '▼' }}</span>
      </transition>
    </div>
    <div v-if="isWidgetHovered" class="widget-content">
      <div v-if="isUserFeedbacksLoading" class="loading-message">加载中...</div>
      <div v-else class="feedback-list">
        <div v-for="feedback in (userFeedbacks || [])" :key="feedback.id" class="feedback-item">
          <div class="feedback-meta">
            <span :class="{ 'status-tag': true, 'status-pending': feedback.status === 'pending', 'status-resolved': feedback.status === 'resolved' || feedback.status === 'approved' }">
              {{ feedback.status === 'pending' ? '待处理' : '已处理' }}
            </span>
            <span class="timestamp">{{ formatDateTime(feedback.created_at) }}</span>
          </div>
          <p class="feedback-message">{{ feedback.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  body { font-family: sans-serif; background-color: #f0f2f5; margin: 0; overflow-y: scroll; }
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

  .hero-header {
    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); /* 新的动感渐变色 */
    background-size: 400% 400%; /* 扩大背景尺寸，为动画做准备 */
    animation: gradient-animation 15s ease infinite; /* 渐变动画 */
    color: white;
    text-align: center;
    padding: 3rem 1rem; /* 增加上下内边距 */
    border-bottom-left-radius: 25px; /* 增加圆角 */
    border-bottom-right-radius: 25px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2); /* 柔和阴影 */
  }

  @keyframes gradient-animation {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
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
.search-input-cool {
  width: 100%; 
  padding: 1.2rem 2rem; /* 增加内边距 */
  font-size: 1.1rem; 
  border-radius: 30px; /* 更圆的边框 */
  border: none; 
  background-color: rgba(255, 255, 255, 0.95); /* 半透明背景 */
  box-shadow: 0 6px 20px rgba(0,0,0,0.15); /* 柔和阴影 */
  transition: all 0.4s ease; 
  color: #333; /* 字体颜色 */
}
.search-input-cool::placeholder { 
  color: #999; /* 占位符颜色 */
  opacity: 0.8;
}
.search-input-cool:focus { 
  outline: none; 
  box-shadow: 0 8px 30px rgba(0,0,0,0.25), 0 0 0 4px rgba(138, 43, 226, 0.4); /* 调整焦点效果颜色 */
  transform: translateY(-2px); /* 略微上浮效果 */
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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-bottom: 1px solid #e0e0e0;
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
  background: linear-gradient(135deg, #1c7863 0%, #0eeeba 100%);
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
  border: 2px solid #23d5ab;
  border-radius: 25px;
  color: #5be3c4;
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(138, 43, 226, 0.2);
}

.suggestion-btn:hover {
  background: linear-gradient(135deg, rgb(151, 165, 228) 0%, #5be3c4 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
}
  
.tags-container { 
  margin-bottom: 2rem; 
  text-align: center; padding: 1rem 0; 
  background-color: #f5f5f5; 
  border-radius: 12px; 
  box-shadow: 0 2px 10px rgba(0,0,0,0.05); 
      /* 关键：允许标签按钮自动换行 */
  display: flex;
  flex-wrap: wrap;
  justify-content: center; /* 让换行后的标签也保持居中 */
  /* 默认最多显示两行的高度，可以根据按钮大小微调 */
  max-height: 110px; 
  overflow: hidden;
  transition: max-height 0.4s ease-in-out;
}
.tags-container.tags-expanded {
  /* 一个足够大的值，确保能容纳所有标签 */
  max-height: 1000px; 
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

/* 4. TransitionGroup 需要一个容器来计算动画，我们让它继承父级样式 */
.tags-container > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.tags-container button { 
  background-color: #e0e0e0; 
  border: none; /* 移除边框 */
  border-radius: 20px; /* 更圆的标签 */
  padding: 0.7rem 1.4rem; 
  margin: 0.4rem; 
  cursor: pointer; 
  transition: all 0.3s ease; 
  font-weight: 500; 
  color: #555; /* 字体颜色 */
}
.tags-container button:hover { 
  background-color: #d0d0d0; 
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.tags-container button.active { 
  background: linear-gradient(45deg, #8a2be2, #4b0082); /* 渐变色高亮 */
  color: white; 
  border-color: #8a2be2; 
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
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
  color: #343a40; /* 字体颜色 */
  font-size: 1.1em;
}
.no-results, .loading-results { 
  text-align: center; 
  color: #6c757d; 
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
  color: #6c757d; 
  font-size: 1.1em;
  text-align: center;
}

.load-complete {
  color: #28a745;
  font-weight: 500;
  margin: 1rem 0;
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
  color: #374151;
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

.no-results {
  color: #6c757d;
  text-align: center;
  margin: 2rem 0;
}

.no-results p {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.feedback-btn {
  background: linear-gradient(45deg, #8a2be2, #4b0082);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  box-shadow: 0 4px 15px rgba(138, 43, 226, 0.3);
}

.feedback-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(138, 43, 226, 0.4);
}
.loader { 
  border: 4px solid #f3f3f3; 
  border-top: 4px solid #8a2be2; /* 调整加载动画颜色 */
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
  /* --- 新增：为移动端调整标签容器的高度 --- */
  .tags-container {
  /* 在移动端，由于每行能显示的标签更少，我们需要一个更大的默认高度来容纳大约3-4行 */
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
  .search-input-cool{
    width: 90%;
    padding: 1rem 1.5rem;
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

.no-results .feedback-form {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: none;
  border: 1px solid #dee2e6;
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
  border-color: #8a2be2; /* 调整焦点边框颜色 */
  box-shadow: 0 0 0 4px rgba(138, 43, 226, 0.2); /* 调整焦点阴影颜色 */
}

.feedback-form button {
  display: block;
  width: 100%;
  padding: 1rem 1.8rem;
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); /* 新的动感渐变色 */
  background-size: 400% 400%; /* 扩大背景尺寸，为动画做准备 */
  animation: gradient-animation 15s ease infinite; /* 渐变动画 */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.15rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(138, 43, 226, 0.2);
}

.feedback-form button:hover {
  background: linear-gradient(-45deg, #e73c7e, #ee7752, #23a6d5, #23d5ab); /* 悬停时渐变方向或颜色微调 */
  background-size: 400% 400%;
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(138, 43, 226, 0.3);
}

.feedback-form button:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(138, 43, 226, 0.2);
}

/* 新增：留言时间线小部件样式 */
.feedback-timeline-widget {
  position: fixed;
  bottom: 30px; /* 调整位置 */
  left: 20px; /* 调整位置，更靠近左侧 */
  width: 60px; /* 默认收起宽度 */
  background-color: #ffffff;
  border-radius: 18px; /* 更大圆角 */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18); /* 更柔和更深阴影 */
  overflow: hidden;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); /* 更平滑的过渡 */
  max-height: 60px; /* 默认收起高度 */
  border: 1px solid #e0e0e0; /* 柔和边框 */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  backdrop-filter: blur(10px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(10px);
}

.feedback-timeline-widget.expanded {
  width: 320px; /* 展开后的宽度 */
  max-height: 450px; /* 展开后的最大高度 */
}

.widget-header {
  display: flex;
  align-items: center;
  padding: 12px 12px; /* 调整内边距 */
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); /* 新的动感渐变背景 */
  background-size: 400% 400%; /* 扩大背景尺寸 */
  animation: gradient-animation 15s ease infinite; /* 渐变动画 */
  color: white;
  cursor: pointer;
  font-weight: 600; /* 更粗字重 */
  font-size: 1.1em; /* 调整字体大小 */
  position: sticky; /* 吸顶效果 */
  top: 0;
  z-index: 10;
  width: 100%; /* 确保在 expanded 状态下铺满 */
  box-sizing: border-box;
}

.widget-header .icon {
  font-size: 1.4em; /* 调整图标大小 */
  margin-right: 0; /* 默认没有右边距 */
  transition: margin-right 0.3s ease;
  position: relative; /* 为红点定位提供上下文 */
}

.feedback-timeline-widget.expanded .widget-header .icon {
  margin-right: 12px; /* 展开后有右边距 */
}

.widget-header .title {
  flex-grow: 1;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feedback-meta .status-tag {
  padding: 0.3em 0.7em;
  border-radius: 10px;
  font-weight: 600;
  text-transform: capitalize;
}

.feedback-meta .status-pending {
  background-color: #ffc107; /* 警告色保持不变 */
  color: white;
}

.feedback-meta .status-resolved {
  background-color: #28a745; /* 成功色保持不变 */
  color: white;
}

.pending-badge {
  background-color: #ff3b30; /* 醒目红色 */
  color: white;
  border-radius: 50%; /* 更圆的徽章 */
  padding: 0.2em 0.5em; /* 调整默认内边距 */
  font-size: 0.7em; /* 调整默认字体大小 */
  margin-left: 5px; /* 默认左边距 */
  font-weight: bold;
  min-width: 20px; /* 调整默认最小宽度 */
  text-align: center;
  transition: all 0.3s ease; /* 添加过渡效果 */
  line-height: 1; /* 确保垂直居中 */
  box-sizing: border-box; /* 确保 padding 包含在 width/height 内 */
}

/* 只有当 .pending-badge 内部有 .dot 元素时才应用样式 */
.pending-badge .dot {
  display: block;
  width: 100%;
  height: 100%;
  background-color: inherit; /* 继承父级的背景颜色 */
  border-radius: 50%;
}

.feedback-timeline-widget:not(.expanded) .widget-header .pending-badge {
  position: absolute; /* 绝对定位，脱离文档流 */
  top: 10px; /* 距离顶部 */
  right: 10px; /* 距离右侧 */
  width: 10px; /* 红点尺寸 */
  height: 10px; /* 红点尺寸 */
  padding: 0; /* 移除内边距 */
  font-size: 0; /* 隐藏数字 */
  min-width: 0; /* 移除最小宽度限制 */
  margin: 0; /* 移除外边距 */
}

.feedback-timeline-widget.expanded .widget-header .pending-badge {
  margin-left: 10px; /* 展开后有左边距 */
}

.widget-header .toggle-icon {
  margin-left: 12px;
  font-size: 0.9em;
  transition: transform 0.3s ease;
}
.widget-header .toggle-icon.expanded {
  transform: rotate(180deg);
}

.widget-content {
  padding: 15px;
  max-height: 380px; /* 调整内容区最大高度 */
  overflow-y: auto;
  background-color: #f8f9fa; /* 柔和背景色 */
  flex-grow: 1;
  width: 100%;
  box-sizing: border-box;
}

.loading-message {
  text-align: center;
  color: #888;
  padding: 20px;
  font-style: italic;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 增加留言项间距 */
}

.feedback-item {
  border-bottom: 1px solid #e9ecef; /* 柔和边框 */
  padding: 10px 0;
  background-color: #ffffff; /* 白色背景 */
  border-radius: 8px;
  padding: 12px 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.feedback-item:last-child {
  border-bottom: none;
}

.feedback-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8em;
  color: #6c757d;
  margin-bottom: 8px;
}

.feedback-meta .status-tag {
  padding: 0.3em 0.7em;
  border-radius: 10px;
  font-weight: 600;
  text-transform: capitalize;
}

.feedback-meta .status-pending {
  background-color: #ffc107; /* 警告色保持不变 */
  color: white;
}

.feedback-meta .status-resolved {
  background-color: #28a745; /* 成功色保持不变 */
  color: white;
}

.feedback-message {
  margin: 0;
  font-size: 0.9em;
  color: #343a40;
  line-height: 1.5;
}

@media (max-width: 768px) {
  /* 主要内容区域适配 */
  main {
    padding: 0.5rem;
    margin-top: calc(60px + var(--announcement-height, 0px)); /* 移动端导航栏高度 + 公告栏高度 */
    transition: margin-top 0.3s ease; /* 平滑过渡 */
  }
  
  /* 英雄区域移动端适配 */
  /* .hero-header 样式在桌面端已定义，移动端无需额外调整 */
  
  .hero-title {
    font-size: 2.5rem;
    letter-spacing: 1px;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
    margin: 0.8rem 0 2rem 0;
  }
  
  .search-input-cool {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  /* 标签容器移动端适配 */
  .tags-container {
    padding: 0.8rem 0;
    margin-bottom: 1.5rem;
  }
  
  .tags-container button {
    padding: 0.5rem 1rem;
    margin: 0.3rem;
    font-size: 0.9rem;
  }
  
  /* 网格布局移动端适配 */
  .grid-container {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    padding: 0.5rem 0;
  }
  
  .grid-item {
    padding: 1rem;
  }
  
  .grid-item img, .grid-item video {
    height: 120px;
  }
  
  .grid-item p {
    font-size: 1rem;
  }
  
  .media-icon {
    width: 30px;
    height: 30px;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .feedback-timeline-widget {
    bottom: 15px;
    left: 8px; /* 移动端更靠近左侧 */
    width: 60px; /* 移动端默认收起宽度 */
    max-height: 50px;
  }
  .feedback-timeline-widget.expanded {
    width: calc(100% - 16px); /* 调整宽度 */
    max-height: 350px;
  }
  .widget-header {
    padding: 10px 12px;
    font-size: 1em;
    background-size: 400% 400%; /* 确保移动端也应用背景尺寸 */
    animation: gradient-animation 15s ease infinite; /* 确保移动端也应用动画 */
  }
  .widget-header .icon {
    font-size: 1.2em;
    margin-right: 0;
    position: relative; /* 为红点定位提供上下文 */
  }
  .feedback-timeline-widget.expanded .widget-header .icon {
    margin-right: 8px;
  }
  .widget-header .pending-badge {
    padding: 0.15em 0.4em; /* 移动端调整默认内边距 */
    font-size: 0.6em; /* 移动端调整默认字体大小 */
    min-width: 18px; /* 移动端调整默认最小宽度 */
    margin-left: 4px; /* 移动端默认左边距 */
  }
  .feedback-timeline-widget:not(.expanded) .widget-header .pending-badge {
    top: 4px; /* 移动端距离顶部 */
    right: 4px; /* 移动端距离右侧 */
    width: 8px; /* 移动端红点尺寸 */
    height: 8px; /* 移动端红点尺寸 */
    padding: 0;
    margin: 0;
  }
  .feedback-timeline-widget.expanded .widget-header .pending-badge {
    margin-left: 8px;
  }
  .widget-header .toggle-icon {
    margin-left: 8px;
  }
  .widget-content {
    padding: 10px;
  }
  .feedback-item {
    padding: 10px;
  }
  .feedback-message {
    font-size: 0.85em;
  }
  .feedback-form button {
    background-size: 400% 400%; /* 确保移动端按钮也应用背景尺寸 */
    animation: gradient-animation 15s ease infinite; /* 确保移动端按钮也应用动画 */
  }
  .feedback-form button:hover {
    animation: gradient-animation 10s ease infinite; /* 确保移动端按钮 hover 动画 */
  }
}

/* 小屏幕设备进一步优化 */
@media (max-width: 480px) {
  main {
    margin-top: calc(60px + var(--announcement-height, 0px)); /* 小屏幕导航栏高度 + 公告栏高度 */
    transition: margin-top 0.3s ease; /* 平滑过渡 */
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .grid-container {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.8rem;
  }
  
  .grid-item {
    padding: 0.8rem;
  }
  
  .grid-item img, .grid-item video {
    height: 100px;
  }
  
  .tags-container button {
    padding: 0.4rem 0.8rem;
    margin: 0.2rem;
    font-size: 0.85rem;
  }
}

/* 新增标签切换按钮的样式 */
.tags-toggle-btn {
  background-color: transparent !important; /* !important 覆盖原有样式 */
  color: #8a2be2 !important; /* 紫色主题色 */
  font-weight: bold !important;
  box-shadow: none !important;
  flex-shrink: 0 !important; /* 防止按钮被压缩 */
  white-space: nowrap !important; /* 防止文字换行 */
  order: 999 !important; /* 确保按钮排在最后 */
}

.tags-toggle-btn:hover {
  background-color: #f0e6fa !important; /* 悬浮时淡紫色背景 */
  transform: none !important; /* 移除悬浮时的上移效果 */
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

/* 移动端始终显示按钮 */
@media (max-width: 768px) {
  .card-actions {
    opacity: 1;
    transform: translateY(0);
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
  color: #8a2be2;
}

.copy-btn:hover {
  background: linear-gradient(135deg, #8a2be2, #4b0082);
  color: white;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
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