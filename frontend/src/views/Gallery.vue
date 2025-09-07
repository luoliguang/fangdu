<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import apiClient from '../axiosConfig.js';
import VueEasyLightbox from 'vue-easy-lightbox';
import VideoModal from '../components/VideoModal.vue';
import TutorialGuide from '../components/TutorialGuide.vue';
import tutorialManager from '../utils/tutorialManager.js';

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
const searchTerm = ref('');
const tags = ref([]);
const activeTag = ref('');
const isLoading = ref(false); // 初始为 false
let debounceTimer = null;
const isTagsExpanded = ref(false); //控制标签面板是否展开
const visibleTags = computed(() => {
  //如果是展开状态，或者标签总数小于等于20个，则全部显示
  if (isTagsExpanded.value || tags.value.length <= 20){
    return tags.value;
  }
  //否则只显示前20个
  return tags.value.slice(0,20)
})

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
const feedbackMessage = ref(''); // 新增：用户留言内容
const showFeedbackForm = ref(false); // 新增：控制留言表单的显示
const isWidgetHovered = ref(false); // 新增：控制留言时间线小部件的悬停状态

// --- 教程相关状态 ---
const showTutorial = ref(false); // 控制教程显示
const tutorialTarget = ref('.search-input-cool'); // 教程聚焦目标
const tutorialGuideRef = ref(null); // 教程组件引用

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
        // 无论 file_path 是什么，都移除可能存在的OSS图片处理参数
        const cleanVideoUrl = material.file_path.split('?')[0];
        currentVideoUrl.value = cleanVideoUrl;
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
            // 当没有素材且不在加载中时，显示留言表单
            showFeedbackForm.value = materials.value.length === 0 && !isLoading.value;
        }
    } catch (error) {
        console.error('获取素材失败:', error);
    } finally {
        isLoading.value = false;
        // 当没有素材且不在加载中时，显示留言表单
        showFeedbackForm.value = materials.value.length === 0 && !isLoading.value;
    }
};

// 新增：提交留言功能
const submitFeedback = async () => {
if (!feedbackMessage.value.trim()) {
    alert('留言内容不能为空！');
    return;
}

// 获取或生成用户ID
let userId = localStorage.getItem('user_id');
if (!userId) {
    userId = generateUUID();
    localStorage.setItem('user_id', userId);
}

try {
    // 这里需要调用后端API来保存留言，稍后实现
    await apiClient.post('/feedback', { message: feedbackMessage.value, user_id: userId });
    alert('留言成功，感谢您的反馈！');
    feedbackMessage.value = ''; // 清空留言内容
    showFeedbackForm.value = false; // 提交成功后隐藏表单
    fetchUserFeedbacks(); // 提交成功后刷新用户留言列表
} catch (error) {
    console.error('提交留言失败:', error);
    alert('提交留言失败，请稍后再试。');
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
    const response = await apiClient.get(`/feedbacks/user/${userId}`);
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
    fetchUserFeedbacks(); // 页面加载时获取用户留言
    initTutorial(); // 初始化教程
});

onUnmounted(() => {
    if (observer && observerEl.value) {
        observer.unobserve(observerEl.value);
    }
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

// 监听 materials 变化，在没有搜索结果时显示留言表单
watch(materials, (newVal) => {
showFeedbackForm.value = newVal.length === 0 && !isLoading.value && searchTerm.value.length > 0;
});

watch(isLoading, (newVal) => {
showFeedbackForm.value = materials.value.length === 0 && !newVal && searchTerm.value.length > 0;
});
</script>

<template>
  <header class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">方度实拍图</h1>
      <p class="hero-subtitle">您可以在这里获取到各种面料、款式、等实拍图素材</p>
      <input type="text" v-model="searchTerm" placeholder="请以关键词的形式搜索 如：圆领短袖 插肩" class="search-input-cool">
    </div>
  </header>

  <main>
    <div class="tags-container" :class="{ 'tags-expanded': isTagsExpanded }">
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
          v-if="tags.length > 20" 
          @click="isTagsExpanded = !isTagsExpanded" 
          class="tags-toggle-btn"
          key="toggle-btn"
        >
          {{ isTagsExpanded ? '收起' : '展开更多' }}
        </button>
      </TransitionGroup>
    </div>

    <TransitionGroup name="gallery" tag="div" class="grid-container">
      <div 
        v-for="material in materials" 
        :key="material.id" 
        class="grid-item"
        @click="showMedia(material)" 
      >
        <img v-if="material.media_type === 'image'" :src="material.thumbnail_url || material.file_path" :alt="material.name" loading="lazy" >
        <img 
            v-else-if="material.media_type === 'video'"
            :src="material.cover_image_path || material.thumbnail_url" 
            :alt="material.name + ' 封面'"
            loading="lazy"
        >
        <p>{{ material.name }}</p>
        <div v-if="material.media_type === 'video'" class="media-icon">▶</div>
      </div>
    </TransitionGroup>

    <div class="load-more-container">
        <div v-if="isLoading" class="loader"></div>
        <p v-if="!hasMore && materials.length > 0">已加载全部内容</p>
        <p v-if="materials.length === 0 && !isLoading && searchTerm.length === 0" class="no-results">输入关键词探索素材。</p>
        <div v-if="materials.length === 0 && !isLoading && searchTerm.length > 0" class="no-results">
            <p>私密马赛，暂未找到匹配的素材。</p>
            <p>没有找到您想要的素材？请告诉我们您的需求，我们会尽快处理！</p>
            <div class="feedback-form" v-if="showFeedbackForm">
                <textarea v-model="feedbackMessage" placeholder="请描述您想要的素材，例如：复合双层拉链风衣" rows="4"></textarea>
                <button @click="submitFeedback">提交留言</button>
            </div>
        </div>
    </div>
    <div ref="observerEl" class="observer"></div>

  </main>

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
    @close="videoModalVisible = false"
  />

  <!-- 新增：用户留言时间线小部件 -->
  <div v-if="userFeedbacks.length > 0" 
    :class="{ 'feedback-timeline-widget': true, 'expanded': isWidgetHovered }"
    @mouseenter="handleWidgetMouseEnter" 
    @mouseleave="handleWidgetMouseLeave"
  >
    <div class="widget-header">
      <span class="icon">💬</span>
      <transition name="fade" mode="out-in">
        <span v-if="isWidgetHovered" class="title">我的实拍图请求</span>
      </transition>
      <span v-if="userFeedbacks.filter(f => f.status === 'pending').length > 0" class="pending-badge">
        <span v-if="isWidgetHovered">{{ userFeedbacks.filter(f => f.status === 'pending').length }}</span>
        <span v-else class="dot"></span> <!-- 红点占位 -->
      </span>
      <transition name="fade" mode="out-in">
        <span v-if="isWidgetHovered" class="toggle-icon">{{ isWidgetHovered ? '▲' : '▼' }}</span>
      </transition>
    </div>
    <div v-if="isWidgetHovered" class="widget-content">
      <div v-if="isUserFeedbacksLoading" class="loading-message">加载中...</div>
      <div v-else class="feedback-list">
        <div v-for="feedback in userFeedbacks" :key="feedback.id" class="feedback-item">
          <div class="feedback-meta">
            <span :class="{ 'status-tag': true, 'status-pending': feedback.status === 'pending', 'status-resolved': feedback.status === 'resolved' }">
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
  main { padding: 1rem; max-width: 1200px; margin: 0 auto; min-height: 50vh; }

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
  top: 50%; 
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
  justify-content: center; 
  align-items: center; 
  /* padding: 3rem;  */
  color: #6c757d; 
  font-size: 1.1em;
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
}

.feedback-form {
  margin-top: 1.5rem; /* 调整距离 */
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 15px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid #e0e0e0; /* 柔和边框 */
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
  left: 10px; /* 调整位置，更靠近左侧 */
  width: 60px; /* 默认收起宽度 */
  background-color: #ffffff;
  border-radius: 15px; /* 更大圆角 */
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15); /* 更柔和更深阴影 */
  overflow: hidden;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); /* 更平滑的过渡 */
  max-height: 60px; /* 默认收起高度 */
  border: 1px solid #e0e0e0; /* 柔和边框 */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  }
  
  /* 英雄区域移动端适配 */
  .hero-header {
    padding: 2rem 1rem;
  }
  
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
    top: 50%;
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
}

.tags-toggle-btn:hover {
  background-color: #f0e6fa !important; /* 悬浮时淡紫色背景 */
  transform: none !important; /* 移除悬浮时的上移效果 */
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

</style>