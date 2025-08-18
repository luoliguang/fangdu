<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import apiClient from '../axiosConfig.js';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';

// --- 基础状态 ---
const materials = ref([]);
const searchTerm = ref('');
const tags = ref([]);
const activeTag = ref('');
const isLoading = ref(false); // 初始为 false
let debounceTimer = null;

// --- 分页与无限滚动状态 ---
const currentPage = ref(1);
const totalPages = ref(1);
const hasMore = computed(() => currentPage.value < totalPages.value);
const observerEl = ref(null);
let observer = null;

// --- Lightbox 和 Video Modal 状态 ---
const lightboxVisible = ref(false);
const lightboxIndex = ref(0);
const videoModalVisible = ref(false);
const currentVideoUrl = ref('');

const imageSources = computed(() =>
    materials.value
        .filter(m => m.media_type === 'image')
        .map(m => m.file_path)
);

const showMedia = (material) => {
    if (material.media_type === 'image') {
        const imageIndex = materials.value.filter(m => m.media_type === 'image').findIndex(m => m.id === material.id);
        lightboxIndex.value = imageIndex;
        lightboxVisible.value = true;
    } else if (material.media_type === 'video') {
        currentVideoUrl.value = material.file_path;
        videoModalVisible.value = true;
    }
};

const fetchMaterials = async (isLoadMore = false) => {
    // 关键：如果正在加载，并且不是加载更多（即是筛选触发的），则直接返回，防止重复请求
    if (isLoading.value && !isLoadMore) return;
    isLoading.value = true;

    try {
        const response = await apiClient.get(`/materials`, {
            params: {
                search: searchTerm.value,
                tag: activeTag.value,
                page: currentPage.value,
                limit: 20
            }
        });

        // 确保 response.data 和 meta 存在
        if (response.data && response.data.meta) {
            const { data, meta } = response.data;
            if (isLoadMore) {
                materials.value.push(...data);
            } else {
                materials.value = data;
            }
            totalPages.value = meta.totalPages;
        } else {
            // 如果后端返回数据格式不正确，清空并打印警告
            console.warn("后端返回数据格式不正确，缺少 meta 信息");
            materials.value = [];
        }
    } catch (error) {
        console.error('获取素材失败:', error);
    } finally {
        isLoading.value = false;
    }
};

const fetchTags = async () => {
  try {
    const response = await apiClient.get(`/tags`);
    tags.value = response.data.data;
  } catch (error) {
    console.error('获取标签失败:', error);
  }
};

const handleFilterChange = () => {
    currentPage.value = 1;
    totalPages.value = 1;
    // 不立即清空，让 fetchMaterials 直接替换，避免闪烁
    fetchMaterials(false); // 传入 false 表示是全新加载
};

const filterByTag = (tag) => {
    if (activeTag.value === tag) return;
    activeTag.value = tag;
    handleFilterChange();
};

watch(searchTerm, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleFilterChange, 300);
});

const setupObserver = () => {
    observer = new IntersectionObserver((entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore.value && !isLoading.value) {
            currentPage.value++;
            fetchMaterials(true);
        }
    });

    if (observerEl.value) {
        observer.observe(observerEl.value);
    }
};

onMounted(() => {
    handleFilterChange();
    fetchTags();
    setupObserver();
});

onUnmounted(() => {
    if (observer && observerEl.value) {
        observer.unobserve(observerEl.value);
    }
});
</script>

<template>
  <header class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">方度素材库</h1>
      <p class="hero-subtitle">您可以在这里获取到各种面料、款式、设计等素材图片</p>
      <input type="text" v-model="searchTerm" placeholder="探索面料、款式、设计..." class="search-input-cool">
    </div>
  </header>

  <main>
    <div class="tags-container">
      <button @click="filterByTag('')" :class="{ active: activeTag === '' }">全部</button>
      <button
        v-for="tag in tags"
        :key="tag"
        @click="filterByTag(tag)"
        :class="{ active: tag === activeTag }"
      >
        {{ tag }}
      </button>
    </div>

    <TransitionGroup name="gallery" tag="div" class="grid-container">
      <div 
        v-for="material in materials" 
        :key="material.id" 
        class="grid-item"
        @click="showMedia(material)" 
      >
        <img v-if="material.media_type === 'image'" :src="material.file_path" :alt="material.name" loading="lazy" >
        <video v-else-if="material.media_type === 'video'" :src="material.file_path" muted loop playsinline></video>
        <p>{{ material.name }}</p>
        <div v-if="material.media_type === 'video'" class="media-icon">▶</div>
      </div>
    </TransitionGroup>

    <div class="load-more-container">
        <div v-if="isLoading" class="loader"></div>
        <p v-if="!hasMore && materials.length > 0">已加载全部内容</p>
        <p v-if="materials.length === 0 && !isLoading" class="no-results">没有找到匹配的素材。</p>
    </div>
    <div ref="observerEl" class="observer"></div>

  </main>

  <vue-easy-lightbox
    :visible="lightboxVisible"
    :imgs="imageSources"
    :index="lightboxIndex"
    @hide="lightboxVisible = false"
  ></vue-easy-lightbox>

  <VideoModal
    :visible="videoModalVisible"
    :src="currentVideoUrl"
    @close="videoModalVisible = false"
  />
</template>

<style>
  body { font-family: sans-serif; background-color: #f0f2f5; margin: 0; overflow-y: scroll; }
  main { padding: 1rem; max-width: 1200px; margin: 0 auto; min-height: 50vh; }

  .hero-header {
    background: linear-gradient(45deg, #1ba98c, #276e6c);
    color: white;
    text-align: center;
    padding: 2rem 1rem;
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }
  .hero-content { max-width: 600px; margin: 0 auto; }
  .hero-title { font-size: 3rem; font-weight: 700; margin: 0; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
  .hero-subtitle { font-size: 1.2rem; font-weight: 300; opacity: 0.9; margin: 0.5rem 0 2rem 0; }
  .search-input-cool { width: 100%; padding: 1rem 1.5rem; font-size: 1rem; border-radius: 50px; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: all 0.3s ease; }
  .search-input-cool:focus { outline: none; box-shadow: 0 8px 25px rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.5); }
  
  .tags-container { margin-bottom: 1.5rem; text-align: center; }
  .tags-container button { background-color: #fff; border: 1px solid #ccc; border-radius: 16px; padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; transition: all 0.2s; }
  .tags-container button:hover { background-color: #e0e0e0; }
  .tags-container button.active { background-color: #007bff; color: white; border-color: #007bff; }

  .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .grid-item { border: 1px solid #ccc; border-radius: 8px; background-color: white; text-align: center; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease-in-out; cursor: pointer; position: relative; }
  .grid-item img, .grid-item video { max-width: 100%; height: 150px; object-fit: cover; border-radius: 4px; display: block; background-color: #000; }
  .grid-item p { margin-top: 0.5rem; font-weight: bold; }
  .no-results, .loading-results { text-align: center; color: #888; margin-top: 2rem; }

  .gallery-move, .gallery-enter-active, .gallery-leave-active { transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1); }
  .gallery-enter-from, .gallery-leave-to { opacity: 0; transform: scale(0.8); }
  .gallery-leave-active { position: absolute; }

  .media-icon { position: absolute; top: 10px; right: 10px; background-color: rgba(0, 0, 0, 0.5); color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-size: 14px; }
  
  .load-more-container { display: flex; justify-content: center; align-items: center; padding: 2rem; color: #888; }
  .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .observer { height: 20px; }

  /* --- 新增：针对移动端的响应式优化 --- */
@media (max-width: 768px) {
  .hero-content {
    /* 为内容区增加左右内边距，防止搜索框紧贴边缘 */
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .hero-title {
    font-size: 2.2rem; /* 在小屏幕上适当缩小标题字号 */
  }

  .tags-container {
    /* 关键：允许标签按钮自动换行 */
    display: flex;
    flex-wrap: wrap;
    justify-content: center; /* 让换行后的标签也保持居中 */
  }

  .grid-container {
    /* 在手机上使用更少的列数，让图片更大更清晰 */
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  /* 移动端搜索框 */
  .search-input-cool{
    width: 80%;
  }
}
</style>