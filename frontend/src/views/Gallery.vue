<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import apiClient from '../axiosConfig.js';
import VueEasyLightbox from 'vue-easy-lightbox'; // 1. 引入Lightbox
import VideoModal from '../components/VideoModal.vue'; // 1. 引入视频模态框

const materials = ref([]);
const searchTerm = ref('');
const tags = ref([]); // 新增：存储所有标签
const activeTag = ref(''); // 新增：存储当前选中的标签
let debounceTimer = null; // 新增一个计时器变量
const isLoading = ref(true);

// 2. 新增 Lightbox 需要的变量(images)
const lightboxVisible = ref(false);
const lightboxIndex = ref(0); // 当前显示的图片索引

// --- Modal State (for videos) ---
const videoModalVisible = ref(false);
const currentVideoUrl = ref('');

// 直接使用从数据库获取的完整OSS URL ---
const imageSources = computed(() => 
    materials.value
        .filter(m => m.media_type === 'image')
        .map(m => m.file_path) // m.file_path 本身就是完整的URL，不再需要拼接
);

// 3. 定义打开 Lightbox 的函数
const showLightbox = (index) => {
  lightboxIndex.value = index;
  lightboxVisible.value = true;
};

const handleHide = () => {
  lightboxVisible.value = false;
};

const showMedia = (material) => {
  if (material.media_type === 'image') {
    // 找到这张图片在所有图片中的索引
    const imageIndex = materials.value.filter(m => m.media_type === 'image').findIndex(m => m.id === material.id);
    lightboxIndex.value = imageIndex;
    lightboxVisible.value = true;
  } else if (material.media_type === 'video') {
    currentVideoUrl.value = material.file_path; // <--- 直接赋值
    videoModalVisible.value = true;
  }
};

// 获取素材列表的函数
const fetchMaterials = async () => {
  isLoading.value = true;
  try {
    // 同时支持搜索和标签过滤
    const response = await apiClient.get(`/materials?search=${searchTerm.value}&tag=${activeTag.value}`);
    materials.value = response.data.data;
  } catch (error) {
    console.error('获取素材失败:', error);
  }finally {
    isLoading.value = false;
  }
};

// 获取所有标签的函数
const fetchTags = async () => {
  try {
    // --- 修正 3: 使用相对路径 ---
    const response = await apiClient.get(`/tags`);
    tags.value = response.data.data;
  } catch (error) {
    console.error('获取标签失败:', error);
  }
};

// 点击标签时触发的函数
const filterByTag = (tag) => {
  // 如果点击的已经是激活的标签，则取消筛选
  if (activeTag.value === tag) {
    activeTag.value = '';
  } else {
    activeTag.value = tag;
  }
  // 筛选后立即获取新的素材列表
  fetchMaterials();
};

// 页面加载时，获取素材和标签
onMounted(() => {
  fetchMaterials();
  fetchTags();
});

// 监听搜索框的变化
// watch(searchTerm, fetchMaterials);
// 使用新的、带防抖的 watch
watch(searchTerm, (newValue) => {
    clearTimeout(debounceTimer); // 清除上一个计时器
    debounceTimer = setTimeout(() => {
        fetchMaterials(); // 300毫秒后执行搜索
    }, 300);
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

    <p v-if="materials.length === 0 && !isLoading" class="no-results">没有找到匹配的素材。</p>
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
  body { font-family: sans-serif; background-color: #f0f2f5; margin: 0; }
  /* header { background-color: #333; color: white; padding: 1rem; text-align: center; }
  .search-input { width: 50%; padding: 0.5rem; margin-top: 1rem; border-radius: 4px; border: none; } */
  main { padding: 1rem; max-width: 1200px; margin: 0 auto; }

  .hero-header {
  background: linear-gradient(45deg, #1ba98c, #276e6c); /* 漂亮的渐变背景 */
  color: white;
  text-align: center;
  padding: 2rem 1rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.hero-content {
  max-width: 600px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 2px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  opacity: 0.9;
  margin: 0.5rem 0 2rem 0;
}

.search-input-cool {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  border-radius: 50px; /* 圆角胶囊形状 */
  border: none;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.search-input-cool:focus {
  outline: none;
  box-shadow: 0 8px 25px rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.5);
}

  /* 标签按钮的样式 */
  .tags-container {
    margin-bottom: 1.5rem;
    text-align: center;
  }
  .tags-container button {
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 16px;
    padding: 0.5rem 1rem;
    margin: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tags-container button:hover {
    background-color: #e0e0e0;
  }
  .tags-container button.active {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
  }

  .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .grid-item { border: 1px solid #ccc; border-radius: 8px; background-color: white; text-align: center; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease-in-out; cursor: pointer;/* 让所有变化都更平滑 */position: relative; /* 新增这一行 */}
  .grid-item img { max-width: 100%; height: 150px; object-fit: cover; border-radius: 4px; }
  .grid-item p { margin-top: 0.5rem; font-weight: bold; }
  
  .no-results { text-align: center; color: #888; margin-top: 2rem; }

  /* 动画效果 */
.gallery-move, /* 应用于移动中的元素 */
.gallery-enter-active,
.gallery-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.gallery-enter-from,
.gallery-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 确保离开的元素能被正确计算位置，以实现流畅的移动动画 */
.gallery-leave-active {
  position: absolute;
}

/* 视频的样式 */
.grid-item video {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  background-color: #000;
}

.media-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
}
</style>