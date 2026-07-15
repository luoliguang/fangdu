<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed, provide } from 'vue';
import { useRoute, useRouter  } from 'vue-router';
import apiClient from './axiosConfig.js';
import SideDrawer from './components/SideDrawer.vue';
import TopAnnouncement from './components/TopAnnouncement.vue';
import FabricGoQRModal from './components/FabricGoQRModal.vue';
import TutorialGuide from './components/TutorialGuide.vue';


// --- 新增：导航栏滑动效果的逻辑 ---
const navSlider = ref(null); // 滑块元素的引用
const mainNav = ref(null);  // 导航容器的引用
const route = useRoute();   // 获取当前路由信息
const router = useRouter(); //获取 router 实例
const isAdminRoute = computed(() => route.path.startsWith('/admin'));

// 登录状态管理
const loginState = ref(!!localStorage.getItem('authToken'));
const isLoggedIn = computed(() => loginState.value);

// 动态页面分类（从后台配置中加载）
const pageCategories = ref([]);
const excludeTagsParam = computed(() => {
  const allTags = pageCategories.value.flatMap(c => c.tags ?? []);
  return [...new Set(allTags)].join(',');
});

const fetchPageCategories = async () => {
  try {
    const { data: res } = await apiClient.get('/api/v1/drawer-config/page-categories');
    pageCategories.value = (res?.data ?? []).filter(c => c.is_active);
  } catch (err) {
    console.error('加载分类配置失败:', err);
  }
};

// 未处理留言数量
const pendingFeedbacksCount = ref(0);
const showQRModal = ref(false);
const fabricGoBtn = ref(null);

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
const showNavBar = ref(true);
const lastScrollY = ref(0);

// 2. 处理滚动事件的函数
// 当页面垂直滚动的距离 > 300px 时，显示按钮，否则隐藏
const handleScroll = () => {
  const currentY = window.scrollY;
  showScrollTopButton.value = currentY > 300;

  if (currentY < 80) {
    showNavBar.value = true;
  } else if (currentY > lastScrollY.value + 6) {
    showNavBar.value = false;
  } else if (currentY < lastScrollY.value - 6) {
    showNavBar.value = true;
  }

  lastScrollY.value = currentY;
};

// 3. 点击按钮后，平滑滚动到页面顶部的函数
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Provide favorites state and callbacks to child components
provide('appFavorites', { favorites, addToFavorites });
provide('galleryCallbacks', galleryCallbacks);
provide('excludeTagsParam', excludeTagsParam);

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
    // 获取激活链接的位置和尺寸，两侧各扩展 12px 让滑块有足够呼吸感
    const { offsetLeft, offsetWidth } = activeLink;
    const PADDING = 12;
    navSlider.value.style.width = `${offsetWidth + PADDING * 2}px`;
    navSlider.value.style.transform = `translateX(${offsetLeft - PADDING}px)`;
    navSlider.value.style.opacity = '1';
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

  // 加载动态页面分类配置（用于主页排除标签和动态导航）
  fetchPageCategories();

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
const handleNavClick = () => {
  showNavBar.value = true;

  // 延迟更长时间后更新滑块，确保路由状态和DOM都已更新
  setTimeout(() => {
    updateSlider();
  }, 100);
  
  // 也可以立即尝试一次更新
  nextTick(() => {
    setTimeout(updateSlider, 50);
  });
};

const openFabricGoModal = async () => {
  fabricGoBtn.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  showQRModal.value = true;
};

const goToFrontendHome = () => {
  router.push('/');
};

// ── 移动端折叠导航 ──────────────────────────────────────
const mobileNavOpen = ref(false);

const currentPageTitle = computed(() => {
  const path = route.path;
  if (path === '/') return '实拍';
  if (path === '/color-card') return '设计专用';
  if (path === '/size-converter') return '尺码转换';
  if (path === '/login') return '登录';
  if (path.startsWith('/admin')) return '后台管理';
  if (path.startsWith('/category/')) {
    const slug = path.replace('/category/', '');
    const cat = pageCategories.value.find(c => c.slug === slug);
    return cat?.name ?? '分类';
  }
  return '方度素材库';
});

// 路由变化时关闭移动菜单
watch(() => route.path, () => { mobileNavOpen.value = false; });

const closeMobileNav = () => { mobileNavOpen.value = false; };

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

    <div v-if="isAdminRoute" class="admin-topbar">
      <div class="admin-topbar__brand">
        <span class="admin-topbar__dot"></span>
        管理后台
      </div>
      <div class="admin-topbar__meta">专注内容与数据运营</div>
      <button class="admin-topbar__back" @click="goToFrontendHome">返回前台</button>
    </div>

    <!-- 桌面端导航（>768px） -->
    <nav v-if="!isAdminRoute" class="main-nav" :class="{ 'is-hidden': !showNavBar }" ref="mainNav">
      <div class="nav-slider" ref="navSlider"></div>
      <router-link to="/" @click="handleNavClick">实拍</router-link>
      <router-link
        v-for="cat in pageCategories"
        :key="cat.slug"
        :to="`/category/${cat.slug}`"
        @click="handleNavClick"
      >{{ cat.name }}</router-link>
      <a ref="fabricGoBtn" href="https://fangdutex.cn/node/019879ce-3372-7e4b-a98a-d9b243f7ea50" target="_blank" @click.prevent="openFabricGoModal">面料细节</a>
      <a href="https://fangdutex.cn/welcome" target="_blank">知识库「所有知识」</a>
      <router-link to="/color-card" @click="handleNavClick">设计专用</router-link>
      <router-link to="/size-converter" @click="handleNavClick">尺码转换</router-link>
      <router-link v-if="!isLoggedIn" to="/login" @click="handleNavClick">登录</router-link>
      <template v-else>
        <router-link to="/admin" @click="handleNavClick">后台管理</router-link>
      </template>
    </nav>

    <!-- 移动端折叠导航（≤768px） -->
    <div v-if="!isAdminRoute" class="mobile-nav" :class="{ 'is-hidden': !showNavBar }">
      <!-- 顶部胶囊：当前页名 + 汉堡按钮 -->
      <div class="mobile-nav-bar" @click.stop>
        <span class="mobile-nav-current">{{ currentPageTitle }}</span>
        <button class="mobile-nav-toggle" @click="mobileNavOpen = !mobileNavOpen" :aria-label="mobileNavOpen ? '关闭菜单' : '打开菜单'">
          <svg v-if="!mobileNavOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
            <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- 展开后的菜单下拉 -->
      <Transition name="mobile-menu-drop">
        <div v-if="mobileNavOpen" class="mobile-nav-dropdown" @click.stop>
          <router-link to="/" @click="closeMobileNav">实拍</router-link>
          <router-link
            v-for="cat in pageCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            @click="closeMobileNav"
          >{{ cat.name }}</router-link>
          <a href="https://fangdutex.cn/node/019879ce-3372-7e4b-a98a-d9b243f7ea50" target="_blank" @click="closeMobileNav">面料细节</a>
          <a href="https://fangdutex.cn/welcome" target="_blank" @click="closeMobileNav">知识库</a>
          <router-link to="/color-card" @click="closeMobileNav">设计专用</router-link>
          <router-link to="/size-converter" @click="closeMobileNav">尺码转换</router-link>
          <router-link v-if="!isLoggedIn" to="/login" @click="closeMobileNav">登录</router-link>
          <router-link v-else to="/admin" @click="closeMobileNav">后台管理</router-link>
        </div>
      </Transition>

      <!-- 点击遮罩关闭 -->
      <div v-if="mobileNavOpen" class="mobile-nav-backdrop" @click="mobileNavOpen = false" />
    </div>
    
    <!-- 顶部公告通知 -->
    <TopAnnouncement />
    
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
        aria-label="回到顶部"
      >
        <svg class="scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </Transition>

    <FabricGoQRModal v-model="showQRModal" />

    <!-- 新手引导 -->
    <TutorialGuide v-if="!isAdminRoute" />
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
    margin-top: calc(64px + var(--announcement-height, 0px)); /* 导航栏高度 + 公告高度 */
    transition: margin-top 0.3s ease; /* 平滑过渡 */
  }

  .admin-topbar {
    position: fixed;
    top: calc(var(--announcement-height, 0px) + 10px);
    left: 50%;
    transform: translateX(-50%);
    width: min(1360px, calc(100vw - 32px));
    min-height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0 1rem;
    box-sizing: border-box;
    z-index: 1000;
    background: rgba(9, 12, 18, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #e2e8f0;
  }

  .admin-topbar__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .admin-topbar__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    box-shadow: 0 0 12px rgba(168, 85, 247, 0.7);
    flex-shrink: 0;
  }

  .admin-topbar__meta {
    font-size: 0.8rem;
    color: #94a3b8;
    white-space: nowrap;
  }

  .admin-topbar__back {
    flex-shrink: 0;
    border: 1px solid rgba(168, 85, 247, 0.28);
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(168, 85, 247, 0.92));
    color: #fff;
    border-radius: 999px;
    padding: 0.55rem 0.95rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 10px 20px rgba(124, 58, 237, 0.25);
  }

  .admin-topbar__back:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  .main-nav {
    background: rgba(10, 12, 20, 0.72);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    padding: 0.68rem 2.1rem;
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2.1rem;
    flex-wrap: nowrap; /* 永不折行 */
    position: fixed;
    top: calc(var(--announcement-height, 0px) + 10px);
    left: 50%;
    transform: translateX(-50%);
    width: min(980px, calc(100vw - 32px));
    border-radius: 999px;
    z-index: 1000;
    box-sizing: border-box;
    overflow: hidden;
    transition: top 0.3s ease, transform 0.35s ease, opacity 0.35s ease;
  }

  .main-nav.is-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -18px);
  }
  .nav-slider {
    position: absolute;
    top: 0.5rem; /* 直接设置顶部距离，避免transform冲突 */
    left: 0;
    height: calc(100% - 1rem); /* 高度留出上下边距 */
    background: linear-gradient(135deg, #0a3d22, #1db870);
    border-radius: 4px;
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease; /* 添加opacity过渡动画 */
    z-index: 1; /* 置于底层 */
    opacity: 1; /* 默认显示 */
    padding: 0 10px; /* 左右增加 padding，让滑块更宽 */
    box-sizing: border-box;
  }
  .main-nav a {
    color: rgba(244, 248, 255, 0.88);
    text-decoration: none;
    font-weight: 500;
    font-size: 1.06rem;
    letter-spacing: 0.02em;
    padding: 0.45rem 0.1rem;
    border-radius: 0;
    position: relative;
    z-index: 2; /* 置于上层，确保可点击 */
    transition: color 0.3s ease, opacity 0.3s ease;
    cursor: pointer; /* 确保退出登录链接有手型光标 */
  }

  .main-nav a:hover {
    color: #ffffff;
  }

  .main-nav a.router-link-exact-active {
    color: #ffffff;
  }



  /* --- 返回顶部按钮 --- */
  .scroll-to-top-btn {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 1000;

    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    isolation: isolate;

    background: linear-gradient(145deg, #0c4427, #1d6b43);
    color: #fff;

    display: flex;
    align-items: center;
    justify-content: center;

    box-shadow:
      0 6px 24px rgba(10, 61, 34, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);

    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  /* 旋转光环 */
  .scroll-to-top-btn::before {
    content: '';
    position: absolute;
    inset: -2.5px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #5a8f73 0deg,
      #9ed4b5 90deg,
      transparent 160deg,
      transparent 280deg,
      #5a8f73 360deg
    );
    animation: ring-spin 3.5s linear infinite;
    z-index: -1;
  }

  /* 光环内填充层（遮住渐变中心） */
  .scroll-to-top-btn::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: linear-gradient(145deg, #0c4427, #1d6b43);
    z-index: -1;
  }

  @keyframes ring-spin {
    to { transform: rotate(360deg); }
  }

  .scroll-arrow {
    width: 19px;
    height: 19px;
    position: relative;
    z-index: 1;
    transition: transform 0.25s ease;
  }

  .scroll-to-top-btn:hover {
    transform: translateY(-3px);
    box-shadow:
      0 12px 32px rgba(10, 61, 34, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .scroll-to-top-btn:hover .scroll-arrow {
    transform: translateY(-2px);
  }

  .scroll-to-top-btn:active {
    transform: translateY(0);
  }

  /* 淡入淡出 + 上浮出现 */
  .fade-enter-active {
    transition: opacity 0.35s ease, transform 0.35s ease;
  }
  .fade-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
  }
  .fade-enter-from {
    opacity: 0;
    transform: translateY(14px);
  }
  .fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  /* --- 中等屏幕：导航切换为可滚动模式（避免折行）--- */
  @media (max-width: 1100px) {
    .main-nav {
      justify-content: flex-start;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      padding-left: 1.4rem;
      padding-right: 1.4rem;
      gap: 1.6rem;
    }

    .main-nav::-webkit-scrollbar {
      display: none;
    }

    .main-nav a {
      flex: 0 0 auto;
      white-space: nowrap;
      font-size: 0.95rem;
    }
  }

  /* ── 移动端折叠导航（默认隐藏，≤768px 显示） ── */
  .mobile-nav {
    display: none;
  }

  /* --- 移动端适配样式 --- */
  @media (max-width: 768px) {
    main {
      margin-top: calc(64px + var(--announcement-height, 0px));
    }

    /* 桌面 nav 在移动端完全隐藏 */
    .main-nav {
      display: none !important;
    }

    /* 移动端折叠导航 */
    .mobile-nav {
      display: block;
      position: fixed;
      top: calc(var(--announcement-height, 0px) + 10px);
      left: 12px;
      right: 12px;
      z-index: 1000;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .mobile-nav.is-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(-12px);
    }

    /* 顶部胶囊栏 */
    .mobile-nav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem 0 1.3rem;
      height: 48px;
      background: rgba(10, 12, 20, 0.82);
      backdrop-filter: blur(18px) saturate(140%);
      -webkit-backdrop-filter: blur(18px) saturate(140%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    }

    .mobile-nav-current {
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .mobile-nav-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .mobile-nav-toggle:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    /* 展开的下拉面板 */
    .mobile-nav-dropdown {
      margin-top: 8px;
      background: rgba(10, 12, 20, 0.92);
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
      padding: 0.6rem 0.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
    }

    .mobile-nav-dropdown a {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1rem;
      color: rgba(244, 248, 255, 0.82);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 12px;
      text-align: center;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .mobile-nav-dropdown a:hover,
    .mobile-nav-dropdown a:active {
      background: rgba(90, 143, 115, 0.22);
      color: #fff;
    }

    .mobile-nav-dropdown a.router-link-exact-active {
      background: linear-gradient(135deg, rgba(10, 61, 34, 0.8), rgba(90, 143, 115, 0.6));
      color: #fff;
      font-weight: 600;
    }

    /* 遮罩层 */
    .mobile-nav-backdrop {
      position: fixed;
      inset: 0;
      z-index: -1;
    }

    /* 展开动画 */
    .mobile-menu-drop-enter-active {
      transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
    }
    .mobile-menu-drop-leave-active {
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .mobile-menu-drop-enter-from {
      opacity: 0;
      transform: translateY(-8px) scale(0.97);
    }
    .mobile-menu-drop-leave-to {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }

    .admin-topbar {
      width: calc(100vw - 20px);
      min-height: 46px;
      border-radius: 12px;
      padding: 0 0.75rem;
      top: calc(var(--announcement-height, 0px) + 8px);
      gap: 0.6rem;
    }

    .admin-topbar__meta {
      display: none;
    }

    .admin-topbar__back {
      padding: 0.45rem 0.75rem;
      font-size: 0.78rem;
    }

    .nav-slider {
      display: none;
    }

    .scroll-to-top-btn {
      bottom: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
    }
  }

  @media (max-width: 480px) {
    main {
      margin-top: calc(62px + var(--announcement-height, 0px));
    }

    .admin-topbar {
      width: calc(100vw - 14px);
      padding: 0 0.58rem;
      border-radius: 10px;
    }

    .admin-topbar__brand {
      font-size: 0.82rem;
      gap: 0.42rem;
    }

    .admin-topbar__dot {
      width: 6px;
      height: 6px;
    }

    .admin-topbar__back {
      padding: 0.38rem 0.6rem;
      font-size: 0.72rem;
    }

    .scroll-to-top-btn {
      bottom: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
    }
  }
</style>