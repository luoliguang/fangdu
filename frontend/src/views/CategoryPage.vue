<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, inject, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '../axiosConfig.js';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';

const route = useRoute();
const router = useRouter();

// ── 分类配置 ──────────────────────────────────────────────────────
const categoryConfig = ref(null); // { name, slug, description, tags }
const configLoading = ref(true);
const configError = ref(false);

const anyTagsParam = computed(() =>
  (categoryConfig.value?.tags ?? []).join(',')
);

// ── CDN ───────────────────────────────────────────────────────────
const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || 'https://assets.fangdutex.cn';
const toCdnUrl = (url) => {
  if (!url) return url;
  return url.replace(/https?:\/\/[^/?#]+\.aliyuncs\.com/, CDN_BASE_URL);
};

// ── 复用 App 已拉取的分类列表，避免重复请求 ──────────────────
const injectedCategories = inject('pageCategories', ref([]));

// ── 收藏（复用 App 全局状态）────────────────────────────────────
const appFavorites = inject('appFavorites', { favorites: ref([]), addToFavorites: () => {} });
const favorites = appFavorites.favorites;
const addToFavorites = (material) => {
  if (!favorites.value.find(f => f.id === material.id)) {
    appFavorites.addToFavorites(material);
    showCustomToast('已添加到收藏夹', 'success');
  }
};

// ── Toast ────────────────────────────────────────────────────────
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref('success');
let toastTimer = null;
const showCustomToast = (msg, type = 'success') => {
  toastMessage.value = msg;
  toastType.value = type;
  showToast.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { showToast.value = false; }, 3000);
};

// ── 素材状态 ─────────────────────────────────────────────────────
const materials = shallowRef([]);
const displayMaterials = shallowRef([]);
const searchTerm = ref('');
const tags = ref([]);
const activeTag = ref('');
const isLoading = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const hasMore = ref(false);
const isTagsExpanded = ref(false);
const visibleTagsCount = ref(20);
const tagsContainerRef = ref(null);
const observerEl = ref(null);
let requestSerial = 0;
let latestSerial = 0;
let debounceTimer = null;
let appendFrameId = null;
let observer = null;

// ── 灯箱 / 视频弹窗 ──────────────────────────────────────────────
const lightboxVisible = ref(false);
const lightboxIndex = ref(0);
const videoModalVisible = ref(false);
const currentVideoUrl = ref('');
const currentVideoName = ref('');
const currentVideoPoster = ref('');

const imageSources = computed(() =>
  materials.value
    .filter(m => m.media_type === 'image')
    .map(m => ({ src: toCdnUrl(m.file_path), title: m.name }))
);

// ── 标签可见数量 ──────────────────────────────────────────────────
const visibleTags = computed(() => {
  if (!tags.value?.length) return [];
  if (isTagsExpanded.value || tags.value.length <= visibleTagsCount.value) return tags.value;
  return tags.value.slice(0, visibleTagsCount.value);
});

const calculateVisibleTags = async () => {
  if (!tagsContainerRef.value || !tags.value?.length) return;
  const container = tagsContainerRef.value;
  const maxH = 110;
  isTagsExpanded.value = true;
  await new Promise(r => setTimeout(r, 0));
  if (container.scrollHeight <= maxH) {
    visibleTagsCount.value = tags.value.length;
    isTagsExpanded.value = false;
    return;
  }
  isTagsExpanded.value = false;
  let count = tags.value.length - 1;
  while (count > 1) {
    visibleTagsCount.value = count;
    await nextTick();
    if (container.scrollHeight <= maxH) { count -= 2; break; }
    count--;
  }
  visibleTagsCount.value = Math.max(1, count);
};

// ── 分帧渲染 ─────────────────────────────────────────────────────
const applyDisplayMaterials = (source, { append = false, chunkSize = 24 } = {}) => {
  if (appendFrameId) { cancelAnimationFrame(appendFrameId); appendFrameId = null; }
  const list = Array.isArray(source) ? source : [];
  if (!append) displayMaterials.value = [];
  if (!list.length) return;
  let cursor = 0;
  const pump = () => {
    const chunk = list.slice(cursor, cursor + chunkSize);
    if (chunk.length) {
      displayMaterials.value = (append || cursor > 0)
        ? [...displayMaterials.value, ...chunk] : chunk;
    }
    cursor += chunkSize;
    appendFrameId = cursor < list.length ? requestAnimationFrame(pump) : null;
  };
  pump();
};

// ── 获取素材 ──────────────────────────────────────────────────────
const fetchMaterials = async (isLoadMore = false) => {
  if (!anyTagsParam.value || isLoading.value) return;
  const page = isLoadMore ? currentPage.value + 1 : 1;
  const serial = ++requestSerial;
  isLoading.value = true;
  try {
    const { data: res } = await apiClient.get('/api/v1/materials', {
      params: {
        any_tag: anyTagsParam.value,
        tag: activeTag.value,
        search: searchTerm.value.trim(),
        page, limit: 20
      }
    });
    if (serial < latestSerial) return;
    latestSerial = serial;
    const list = res?.data ?? [];
    if (isLoadMore) {
      materials.value = [...materials.value, ...list];
      applyDisplayMaterials(list, { append: true, chunkSize: 20 });
    } else {
      materials.value = list;
      applyDisplayMaterials(list, { append: false, chunkSize: 20 });
    }
    currentPage.value = page;
    totalPages.value = res?.meta?.totalPages ?? 1;
    totalItems.value = res?.meta?.total ?? 0;
    hasMore.value = page < totalPages.value;
  } catch (err) {
    if (serial === requestSerial) console.error('获取素材失败:', err);
  } finally {
    if (serial === requestSerial) isLoading.value = false;
  }
};

// ── 获取标签 ──────────────────────────────────────────────────────
const fetchTags = async () => {
  if (!anyTagsParam.value) return;
  try {
    const { data: res } = await apiClient.get('/api/v1/materials/tags/all', {
      params: { any_tag: anyTagsParam.value }
    });
    tags.value = res?.data ?? [];
    setTimeout(calculateVisibleTags, 100);
  } catch (err) {
    console.error('获取标签失败:', err);
  }
};

// ── 加载分类配置 ─────────────────────────────────────────────────
const loadConfig = async () => {
  configLoading.value = true;
  configError.value = false;
  try {
    const slug = route.params.slug;
    // 优先复用 App 已拉取的分类，避免重复请求
    let found = injectedCategories.value.find(c => c.slug === slug && c.is_active);
    if (!found) {
      const { data: res } = await apiClient.get('/api/v1/drawer-config/page-categories');
      found = (res?.data ?? []).find(c => c.slug === slug && c.is_active);
    }
    if (!found) { configError.value = true; return; }
    categoryConfig.value = found;
    await Promise.all([fetchMaterials(), fetchTags()]);
  } catch (err) {
    console.error('加载分类配置失败:', err);
    configError.value = true;
  } finally {
    configLoading.value = false;
    // v-else 渲染完再绑定 observer（之前在 onMounted 时 observerEl 还是 null）
    await nextTick();
    if (observerEl.value && !observer) setupObserver();
  }
};

// ── 交互 ──────────────────────────────────────────────────────────
const filterByTag = (tag) => {
  if (activeTag.value === tag) return;
  activeTag.value = tag;
  fetchMaterials();
};

const showMedia = (material) => {
  if (material.media_type === 'image') {
    const imgs = materials.value.filter(m => m.media_type === 'image');
    lightboxIndex.value = imgs.findIndex(m => m.id === material.id);
    lightboxVisible.value = true;
  } else {
    currentVideoUrl.value = material.file_path.split('?')[0];
    currentVideoName.value = material.name;
    currentVideoPoster.value = material.cover_image_path || material.thumbnail_url || '';
    videoModalVisible.value = true;
  }
};

// ── 快捷复制 ─────────────────────────────────────────────────────
const blobToPng = (blob) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    c.toBlob(p => p ? resolve(p) : reject(new Error('toBlob failed')), 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
  img.src = url;
});

const quickCopyImage = async (material) => {
  if (material.media_type !== 'image') return;
  const imageUrl = toCdnUrl(material.file_path);
  showCustomToast(`正在复制"${material.name}"...`, 'success');
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    const origin = base?.startsWith('http') ? base : window.location.origin;
    const res = await fetch(`${origin}/api/v1/proxy/media?url=${encodeURIComponent(imageUrl)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const png = await blobToPng(await res.blob());
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    showCustomToast(`"${material.name}" 已复制！`, 'success');
  } catch {
    try { await navigator.clipboard.writeText(imageUrl); showCustomToast('已复制图片链接', 'info'); }
    catch { showCustomToast('复制失败，请重试', 'error'); }
  }
};

// ── 搜索防抖 ─────────────────────────────────────────────────────
watch(searchTerm, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchMaterials(), 400);
});

// ── 路由变化重新加载 ──────────────────────────────────────────────
watch(() => route.params.slug, () => {
  categoryConfig.value = null;
  materials.value = [];
  displayMaterials.value = [];
  tags.value = [];
  activeTag.value = '';
  searchTerm.value = '';
  observer?.disconnect();
  observer = null;
  loadConfig();
});

// ── 无限滚动 ─────────────────────────────────────────────────────
const setupObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoading.value) fetchMaterials(true);
    },
    { rootMargin: '200px' }
  );
  if (observerEl.value) observer.observe(observerEl.value);
};

onMounted(() => {
  loadConfig();
});

onUnmounted(() => {
  observer?.disconnect();
  clearTimeout(debounceTimer);
  clearTimeout(toastTimer);
  if (appendFrameId) cancelAnimationFrame(appendFrameId);
});
</script>

<template>
  <!-- 加载中 -->
  <div v-if="configLoading" class="category-loading">
    <div class="loader" />
  </div>

  <!-- 404 -->
  <div v-else-if="configError" class="category-error">
    <h2>页面不存在</h2>
    <p>该分类尚未配置或已停用，请联系管理员。</p>
  </div>

  <!-- 正常内容（与主页同款样式） -->
  <template v-else>
    <header class="hero-header">
      <div class="hero-content">
        <h1 class="hero-title">{{ categoryConfig.name }}</h1>
        <p class="hero-subtitle">{{ categoryConfig.description || '独立分类素材库' }}</p>
        <div class="search-wrapper">
          <div class="search-bar-row">
            <input
              type="text"
              v-model="searchTerm"
              :placeholder="`搜索${categoryConfig.name}款式...`"
              class="search-input-cool"
            />
            <button class="search-btn" @click="fetchMaterials()">搜索</button>
          </div>
        </div>
      </div>
    </header>

    <!-- 标签栏 -->
    <div class="tags-container" :class="{ 'tags-expanded': isTagsExpanded }">
      <div class="tags-inner" ref="tagsContainerRef">
        <TransitionGroup name="tag-list">
          <button @click="filterByTag('')" :class="{ active: activeTag === '' }" key="all">全部</button>
          <button
            v-for="tag in visibleTags" :key="tag"
            @click="filterByTag(tag)"
            :class="{ active: tag === activeTag }"
          >{{ tag }}</button>
        </TransitionGroup>
      </div>
      <div class="tags-footer" v-if="tags.length > visibleTagsCount">
        <button @click="isTagsExpanded = !isTagsExpanded" class="tags-toggle-btn">
          {{ isTagsExpanded ? '↑ 收起' : '展开更多 ↓' }}
        </button>
      </div>
    </div>

    <!-- 素材网格 -->
    <TransitionGroup name="gallery" tag="div" class="grid-container">
      <div
        v-for="material in displayMaterials" :key="material.id"
        class="grid-item"
        @click="showMedia(material)"
      >
        <img
          v-if="material.media_type === 'image'"
          :src="toCdnUrl(material.thumbnail_url || material.file_path)"
          :alt="material.name"
          loading="lazy" decoding="async" fetchpriority="low"
        />
        <video
          v-else-if="material.media_type === 'video'"
          :src="toCdnUrl(material.file_path)"
          :poster="toCdnUrl(material.cover_image_path || material.thumbnail_url)"
          preload="metadata" muted playsinline disablePictureInPicture @click.prevent
        />
        <p>{{ material.name }}</p>
        <div v-if="material.media_type === 'video'" class="media-icon">▶</div>
        <div class="card-actions">
          <button
            @click.stop="addToFavorites(material)"
            class="action-btn favorite-btn"
            :class="{ favorited: favorites.find(f => f.id === material.id) }"
            title="收藏"
          >
            <svg viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.5487 7.04097 1.5487 8.5C1.5487 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61V4.61Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button
            v-if="material.media_type === 'image'"
            @click.stop="quickCopyImage(material)"
            class="action-btn copy-btn" title="快捷复制"
          >
            <svg viewBox="0 0 24 24" fill="none"><path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V18M8 5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 3V5M8 5C8 6.10457 8.89543 7 10 7H14C15.1046 7 16 6.10457 16 7V8M16 8H18C19.1046 8 20 8.89543 20 10V16C20 17.1046 19.1046 18 18 18H16M16 8V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </TransitionGroup>

    <!-- 底部状态 -->
    <div class="load-more-container">
      <div v-if="isLoading" class="loader" />
      <div v-if="!isLoading && totalItems > 0 && displayMaterials.length > 0" class="browse-load-count">
        已加载 <strong>{{ displayMaterials.length }}</strong> / {{ totalItems }} 条
      </div>
      <p v-if="!hasMore && materials.length > 0 && !isLoading" class="load-complete">已加载全部素材</p>
      <p v-if="materials.length === 0 && !isLoading" class="no-results">
        {{ searchTerm || activeTag ? '暂无符合条件的素材' : '该分类暂无素材' }}
      </p>
      <div ref="observerEl" class="observer" />
    </div>

    <!-- Toast -->
    <div v-if="showToast" class="custom-toast" :class="`toast-${toastType}`">
      <div class="toast-content">
        <div class="toast-icon">
          <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="toast-message">{{ toastMessage }}</span>
        <button @click="showToast = false" class="toast-close">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>

    <vue-easy-lightbox :visible="lightboxVisible" :imgs="imageSources" :index="lightboxIndex" @hide="lightboxVisible = false" />
    <VideoModal :visible="videoModalVisible" :src="currentVideoUrl" :poster="currentVideoPoster" :video-name="currentVideoName" @close="videoModalVisible = false" />
  </template>
</template>

<style scoped>
.category-loading {
  display: flex;
  justify-content: center;
  padding: 120px 0;
}
.category-error {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}
.category-error h2 { color: #333; margin-bottom: 8px; }
</style>
