// luoliguang/fangdu/fangdu-bab4912808d592ef8504732e7e3eaf9ec978990f/frontend/src/App.vue

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// --- “返回顶部”按钮的逻辑 ---

// 1. 创建一个 ref 来控制按钮的显示和隐藏
const showScrollTopButton = ref(false);

// 2. 处理滚动事件的函数
const handleScroll = () => {
  // 当页面垂直滚动的距离 > 300px 时，显示按钮，否则隐藏
  if (window.scrollY > 300) {
    showScrollTopButton.value = true;
  } else {
    showScrollTopButton.value = false;
  }
};

// 3. 点击按钮后，平滑滚动到页面顶部的函数
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // 关键属性：实现平滑滚动
  });
};

// 4. 在组件挂载时，监听整个窗口的滚动事件
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

// 5. 在组件卸载时，移除监听，避免内存泄漏
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div id="app">
    <nav class="main-nav">
      <router-link to="/">素材库</router-link>
      <a href="https://fangdutex.cn/welcome" target="_blank">方度知识库</a>
      <router-link to="/admin">后台管理</router-link>
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
  }
  .main-nav a {
    color: #fff;
    text-decoration: none;
    font-weight: bold;
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: 4px;
  }
  .main-nav a.-link-exact-activerouter {
    background-color: #42b983;
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
</style>