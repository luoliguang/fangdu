<script setup>
import { ref, onMounted, onUnmounted,watch,nextTick  } from 'vue';
import { useRoute, useRouter  } from 'vue-router';


// --- 新增：导航栏滑动效果的逻辑 ---
const navSlider = ref(null); // 滑块元素的引用
const mainNav = ref(null);  // 导航容器的引用
const route = useRoute();   // 获取当前路由信息
const router = useRouter(); //获取 router 实例

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
  }
};

// --- 生命周期钩子 ---
onMounted(async () => { // 将 onMounted 变为 async 函数
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', updateSlider);
  
  // 等待路由准备就绪
  await router.isReady();
  updateSlider(); // 现在再执行，就能确保找到激活的链接了
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', updateSlider); // 移除监听
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
    <nav class="main-nav" ref="mainNav">
      <div class="nav-slider" ref="navSlider"></div>
      <router-link to="/" @click="handleNavClick">素材库</router-link>
      <a href="https://fangdutex.cn/node/019879ce-3372-7e4b-a98a-d9b243f7ea50" target="_blank">面料细节</a>
      <a href="https://fangdutex.cn/welcome" target="_blank">📚方度知识库</a>
      <router-link to="/admin" @click="handleNavClick">后台管理</router-link>
    </nav>
    <main>
      <router-view></router-view>
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
  .main-nav {
    background-color: #2c3e50;
    padding: 1rem 2rem;
    display: flex;
    gap: 1.5rem;
    position: relative; /* 1. 父容器设为相对定位 */
  }
  /* 2. 定义滑块的样式和动画 */
  .nav-slider {
    position: absolute;
    top: 0.5rem; /* 直接设置顶部距离，避免transform冲突 */
    left: 0;
    height: calc(100% - 1rem); /* 高度留出上下边距 */
    background-color: #42b983; /* 这是我们的"滑块"颜色 */
    border-radius: 4px;
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); /* 平滑过渡动画 */
    z-index: 1; /* 置于底层 */
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