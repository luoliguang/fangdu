<script setup>
import { ref, onMounted, onUnmounted,watch,nextTick, computed, provide  } from 'vue';
import { useRoute, useRouter  } from 'vue-router';
import apiClient from './axiosConfig.js';
import SideDrawer from './components/SideDrawer.vue';


// --- 新增：导航栏滑动效果的逻辑 ---
const navSlider = ref(null); // 滑块元素的引用
const mainNav = ref(null);  // 导航容器的引用
const route = useRoute();   // 获取当前路由信息
const router = useRouter(); //获取 router 实例

// 登录状态管理
const loginState = ref(!!localStorage.getItem('authToken'));
const isLoggedIn = computed(() => loginState.value);

// 未处理留言数量
const pendingFeedbacksCount = ref(0);

// --- SideDrawer 全局状态 ---
// 收藏夹（只在Gallery页面使用）
const favorites = ref([]);

// 简单的 UUID 生成函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 提供给子组件使用的方法
const addToFavorites = (material) => {
  const exists = favorites.value.find(fav => fav.id === material.id);
  if (!exists) {
    favorites.value.push(material);
    // 已添加到收藏夹
  }
};

// 监听localStorage变化
const updateLoginState = () => {
  loginState.value = !!localStorage.getItem('authToken');
  
  // 登录状态变化时，重新获取未处理留言数量
  if (loginState.value) {
    fetchPendingFeedbacksCount();
  } else {
    pendingFeedbacksCount.value = 0;
  }
};

// 获取未处理留言数量
const fetchPendingFeedbacksCount = async () => {
  if (!loginState.value) return;
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/v1/feedbacks/stats/unprocessed', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // 确保正确解析响应数据
    const count = response.data?.data?.count || response.data?.count || 0;
    pendingFeedbacksCount.value = count;
  } catch (error) {
    console.error('获取未处理留言数量失败:', error);
    pendingFeedbacksCount.value = 0;
  }
};

// --- SideDrawer 处理方法 ---
// 处理反馈提交
const handleFeedbackSubmit = async (feedbackData) => {
  // 获取或生成用户ID
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem('user_id', userId);
  }

  try {
    // 处理从SideDrawer传来的字符串格式
    const message = typeof feedbackData === 'string' ? feedbackData : feedbackData.message;
    
    const response = await apiClient.post('/api/v1/feedbacks', {
      message: message,
      user_id: userId
    });
    
    if (response.data.success) {
      // 显示成功提示（可以使用Element Plus的消息提示）
      // 留言成功，感谢反馈
    }
  } catch (error) {
    console.error('提交留言失败:', error);
  }
};

// Gallery页面的回调引用
const galleryCallbacks = ref({
  handleQuickFilter: null,
  handleShowMedia: null,
  handleRemoveFromFavorites: null
});

// 处理快速筛选（仅在Gallery页面有效）
const handleQuickFilter = (filterValue) => {
  if (galleryCallbacks.value.handleQuickFilter) {
    galleryCallbacks.value.handleQuickFilter(filterValue);
  } else {
    // 快速筛选
  }
};

// 处理显示媒体（仅在Gallery页面有效）
const handleShowMedia = (material) => {
  if (galleryCallbacks.value.handleShowMedia) {
    galleryCallbacks.value.handleShowMedia(material);
  } else {
    // 显示媒体
  }
};

// 处理从收藏夹移除
const handleRemoveFromFavorites = (materialId) => {
  if (galleryCallbacks.value.handleRemoveFromFavorites) {
    galleryCallbacks.value.handleRemoveFromFavorites(materialId);
  } else {
    const index = favorites.value.findIndex(fav => fav.id === materialId);
    if (index > -1) {
      favorites.value.splice(index, 1);
      // 已从收藏夹移除
    }
  }
};



// --- “返回顶部”按钮的逻辑 ---
// 1. 创建一个 ref 来控制按钮的显示和隐藏
const showScrollTopButton = ref(false);

// 2. 处理滚动事件的函数
  // 当页面垂直滚动的距离 > 300px 时，显示按钮，否则隐藏
  const handleScroll = () => {
  showScrollTopButton.value = window.scrollY > 300;
};

// 3. 点击按钮后，平滑滚动到页面顶部的函数
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Provide favorites state and callbacks to child components
provide('appFavorites', {
  favorites,
  addToFavorites
});

provide('galleryCallbacks', galleryCallbacks);

// 4. 在组件挂载时，监听整个窗口的滚动事件
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

// 5. 在组件卸载时，移除监听，避免内存泄漏
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

// 更新滑块位置的核心函数
const updateSlider = async () => {
  // 等待DOM更新完成
  await nextTick();

  if (!mainNav.value || !navSlider.value) return;

  // 找到当前激活的链接元素，尝试多种选择器
  let activeLink = mainNav.value.querySelector('.router-link-exact-active');
  if (!activeLink) {
    activeLink = mainNav.value.querySelector('.router-link-active');
  }
  
  // 如果还是没找到，根据当前路由手动查找
  if (!activeLink) {
    const currentPath = route.path;
    const links = mainNav.value.querySelectorAll('router-link, a[href]');
    for (const link of links) {
      const linkTo = link.getAttribute('to');
      // 精确匹配或者当前路径以链接路径开头（处理嵌套路由）
      if (linkTo === currentPath || (linkTo && currentPath.startsWith(linkTo) && linkTo !== '/')) {
        activeLink = link;
        break;
      }
    }
  }

  if (activeLink) {
    // 获取激活链接的位置和尺寸
    const { offsetLeft, offsetWidth } = activeLink;
    
    // 更新滑块的样式
    navSlider.value.style.width = `${offsetWidth}px`;
    navSlider.value.style.transform = `translateX(${offsetLeft}px)`;
    navSlider.value.style.opacity = '1'; // 显示滑块
  } else {
    // 如果没有找到激活链接（比如在/login页面），隐藏滑块
    navSlider.value.style.opacity = '0';
  }
};

// --- 生命周期钩子 ---
onMounted(async () => { // 将 onMounted 变为 async 函数
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', updateSlider);
  window.addEventListener('storage', updateLoginState); // 监听localStorage变化
  
  // 初始化登录状态
  updateLoginState();
  
  // 如果已登录，开始定期获取未处理留言数量
  if (loginState.value) {
    fetchPendingFeedbacksCount();
    // 每60秒刷新一次未处理留言数量
    setInterval(fetchPendingFeedbacksCount, 60000);
  }
  

  
  // 等待路由准备就绪
  await router.isReady();
  updateSlider(); // 现在再执行，就能确保找到激活的链接了
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', updateSlider); // 移除监听
  window.removeEventListener('storage', updateLoginState); // 移除storage监听
});

// 监听路由变化，当页面切换时，更新滑块位置
watch(() => route.path, updateSlider);

// 处理导航链接点击事件
const handleNavClick = (event) => {
  // 延迟更长时间后更新滑块，确保路由状态和DOM都已更新
  setTimeout(() => {
    updateSlider();
  }, 100);
  
  // 也可以立即尝试一次更新
  nextTick(() => {
    setTimeout(updateSlider, 50);
  });
};

</script>

<template>
  <div id="app">
    <!-- 全局左侧抽屉 -->
    <SideDrawer 
      :favorites="favorites"
      @showMedia="handleShowMedia"
      @removeFromFavorites="handleRemoveFromFavorites"
      @applyFilter="handleQuickFilter"
      @submitFeedback="handleFeedbackSubmit"
    />

    <nav class="main-nav" ref="mainNav">
      <div class="nav-slider" ref="navSlider"></div>
      <router-link to="/" @click="handleNavClick">🥼实拍库</router-link>
      <a href="https://fangdutex.cn/node/019879ce-3372-7e4b-a98a-d9b243f7ea50" target="_blank">面料细节</a>
      <a href="https://fangdutex.cn/welcome" target="_blank">📚方度知识库</a>
      <router-link to="/color-card" @click="handleNavClick">设计专用</router-link>
      <router-link to="/size-converter" @click="handleNavClick">尺码相关</router-link>
      <!-- 未登录时显示登录链接 -->
      <router-link v-if="!isLoggedIn" to="/login" @click="handleNavClick">登录</router-link>
      <!-- 已登录时显示后台管理 -->
      <template v-else>
        <router-link to="/admin" @click="handleNavClick">
          后台管理
        </router-link>
      </template>
    </nav>
    <main>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <Transition name="fade">
      <button 
        v-if="showScrollTopButton" 
        @click="scrollToTop" 
        class="scroll-to-top-btn"
      >
        ↑
      </button>
    </Transition>
  </div>
</template>

<style>
  /* ... 您原有的全局样式保持不变 ... */
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f0f2f5;
    margin: 0;
  }
  
  /* 为main元素添加上边距，避免被固定导航栏遮挡 */
  main {
    margin-top: 80px; /* 根据导航栏高度调整，大约是padding(1rem*2) + 文字高度 + gap */
  }
  .main-nav {
    background-color: #2c3e50;
    padding: 1rem 2rem;
    display: flex;
    gap: 1.5rem;
    position: fixed; /* 固定定位 */
    top: 0; /* 固定在顶部 */
    left: 0; /* 从左边开始 */
    right: 0; /* 到右边结束 */
    width: 100%; /* 占满整个宽度 */
    z-index: 1000; /* 确保在最顶层 */
    box-sizing: border-box; /* 确保padding不会影响总宽度 */
  }
  /* 2. 定义滑块的样式和动画 */
  .nav-slider {
    position: absolute;
    top: 0.5rem; /* 直接设置顶部距离，避免transform冲突 */
    left: 0;
    height: calc(100% - 1rem); /* 高度留出上下边距 */
    background-color: #42b983; /* 这是我们的"滑块"颜色 */
    border-radius: 4px;
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease; /* 添加opacity过渡动画 */
    z-index: 1; /* 置于底层 */
    opacity: 1; /* 默认显示 */
  }
  .main-nav a {
    color: #fff;
    text-decoration: none;
    font-weight: bold;
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: 4px;
    position: relative; /* 3. 链接设为相对定位 */
    z-index: 2; /* 置于上层，确保可点击 */
    transition: color 0.4s ease; /* 文字颜色也添加过渡效果 */
    cursor: pointer; /* 确保退出登录链接有手型光标 */
  }

  /* 移除旧的激活样式，因为现在由滑块负责背景 */
  .main-nav a.router-link-exact-active {
    color: #fff; /* 确保激活时文字颜色不变或更突出 */
  }



  /* --- 新增：“返回顶部”按钮的样式 --- */
  .scroll-to-top-btn {
    position: fixed; /* 固定在视口位置 */
    bottom: 30px;
    right: 30px;
    z-index: 1000; /* 确保在最上层 */
    
    width: 50px;
    height: 50px;
    border-radius: 50%; /* 圆形 */
    background-color: #42b983;
    color: white;
    border: none;
    
    font-size: 24px;
    line-height: 50px;
    text-align: center;
    
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease; /* 平滑过渡效果 */
  }

  .scroll-to-top-btn:hover {
    background-color: #3aa875;
    transform: scale(1.1); /* 鼠标悬浮时放大一点 */
  }
  
  /* --- 新增：按钮的淡入淡出动画 --- */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  /* --- 移动端适配样式 --- */
  @media (max-width: 768px) {
    .main-nav {
      padding: 0.8rem 1rem;
      gap: 0.8rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .main-nav a {
      font-size: 0.9rem;
      padding: 0.4rem 0.8rem;
      white-space: nowrap;
    }
    
    .nav-slider {
      display: none; /* 在移动端隐藏滑块，避免布局复杂 */
    }
    
    .scroll-to-top-btn {
      bottom: 20px;
      right: 20px;
      width: 45px;
      height: 45px;
      font-size: 20px;
      line-height: 45px;
    }
  }
  
  @media (max-width: 480px) {
    .main-nav {
      padding: 0.6rem 0.8rem;
      gap: 0.5rem;
    }
    
    .main-nav a {
      font-size: 0.8rem;
      padding: 0.3rem 0.6rem;
    }
    
    .scroll-to-top-btn {
      bottom: 15px;
      right: 15px;
      width: 40px;
      height: 40px;
      font-size: 18px;
      line-height: 40px;
    }
  }
</style>