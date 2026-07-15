<template>
  <button class="tutorial-fab" @click="startTour" aria-label="使用教程">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
    </svg>
    <span>教程</span>
  </button>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const route = useRoute();

const getSteps = () => [
  {
    element: '.search-wrapper',
    popover: {
      title: '关键词搜索',
      description: '在这里输入关键词，如「圆领短袖」「翻领」「速干 圆领」，点击搜索即可获得精准结果。搜索词越具体，结果越好。',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '.tags-inner',
    popover: {
      title: '标签快速筛选',
      description: '点击这里的标签，无需打字即可一键筛选对应分类的素材。可以与关键词搜索组合使用，进一步缩小范围。',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '.grid-item',
    popover: {
      title: '收藏与快捷复制',
      description: '悬停在图片上即可看到操作按钮：点击 ♡ 收藏素材，点击复制图标快速获取图片链接，方便在设计工具中直接使用。',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '.drawer-trigger',
    popover: {
      title: '收藏夹 & 功能菜单',
      description: '点击左侧「菜单」按钮，可在侧边抽屉中查看所有收藏的素材、快速筛选，以及提交意见反馈。',
      side: 'right',
      align: 'center'
    }
  },
  {
    element: window.innerWidth > 768 ? '.main-nav' : '.mobile-nav-bar',
    popover: {
      title: '探索更多功能',
      description: '导航栏还有「打色卡」辅助设计配色、「尺码转换」提供中美欧码对照，以及独立的素材分类页面。遇到问题随时点左下角「教程」重看。',
      side: 'bottom',
      align: 'center'
    }
  }
];

let driverInstance = null;

const lockScroll = () => { document.documentElement.style.overflow = 'hidden'; };
const unlockScroll = () => { document.documentElement.style.overflow = ''; };

const handleReflow = () => { driverInstance?.refresh(); };

const teardown = () => {
  unlockScroll();
  window.removeEventListener('scroll', handleReflow);
  window.removeEventListener('resize', handleReflow);
};

const createDriver = () => driver({
  showProgress: true,
  progressText: '{{current}} / {{total}}',
  nextBtnText: '下一步 →',
  prevBtnText: '← 上一步',
  doneBtnText: '开始使用',
  allowClose: true,
  overlayOpacity: 0.72,
  popoverClass: 'fangdu-popover',
  onDestroyStarted: () => {
    localStorage.setItem('tutorial_seen', '1');
    teardown();
    setTimeout(() => driverInstance?.destroy(), 0);
  },
  steps: getSteps()
});

const startTour = () => {
  // 回顶确保元素起始位置准确
  window.scrollTo({ top: 0, behavior: 'instant' });
  lockScroll();
  window.addEventListener('scroll', handleReflow, { passive: true });
  window.addEventListener('resize', handleReflow, { passive: true });
  driverInstance = createDriver();
  driverInstance.drive();
};

onMounted(() => {
  if (!localStorage.getItem('tutorial_seen') && route.path === '/') {
    setTimeout(startTour, 1800);
  }
});
</script>

<style scoped>
.tutorial-fab {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 0 10px;
  height: 38px;
  background: linear-gradient(135deg, #0a3d22, #1d6b43);
  color: rgba(255, 255, 255, 0.92);
  border: none;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(10, 61, 34, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tutorial-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(10, 61, 34, 0.45);
}

@media (max-width: 768px) {
  .tutorial-fab {
    bottom: 20px;
    left: 16px;
    height: 34px;
    padding: 0 12px 0 9px;
    font-size: 0.78rem;
  }
}
</style>

<!-- driver.js 全局样式覆盖（不可 scoped） -->
<style>
.fangdu-popover {
  --dp-bg: rgba(10, 18, 14, 0.94);
  background: var(--dp-bg) !important;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(90, 143, 115, 0.28) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(90, 143, 115, 0.1) !important;
  padding: 18px 20px 16px !important;
  max-width: 320px !important;
}

.fangdu-popover .driver-popover-title {
  color: #ffffff !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
  margin-bottom: 8px !important;
  line-height: 1.3 !important;
}

.fangdu-popover .driver-popover-description {
  color: rgba(220, 235, 228, 0.88) !important;
  font-size: 0.875rem !important;
  line-height: 1.65 !important;
}

.fangdu-popover .driver-popover-progress-text {
  color: #5a8f73 !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em !important;
}

.fangdu-popover .driver-popover-footer {
  margin-top: 14px !important;
  gap: 8px !important;
}

.fangdu-popover .driver-popover-prev-btn,
.fangdu-popover .driver-popover-next-btn,
.fangdu-popover .driver-popover-done-btn {
  border-radius: 999px !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  padding: 0.44rem 1rem !important;
  transition: filter 0.15s, transform 0.15s !important;
  border: none !important;
  cursor: pointer !important;
}

.fangdu-popover .driver-popover-prev-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
}

.fangdu-popover .driver-popover-prev-btn:hover {
  background: rgba(255, 255, 255, 0.16) !important;
  color: #fff !important;
}

.fangdu-popover .driver-popover-next-btn,
.fangdu-popover .driver-popover-done-btn {
  background: linear-gradient(135deg, #0a3d22, #5a8f73) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(10, 61, 34, 0.4) !important;
}

.fangdu-popover .driver-popover-next-btn:hover,
.fangdu-popover .driver-popover-done-btn:hover {
  filter: brightness(1.12) !important;
  transform: translateY(-1px) !important;
}

/* 高亮边框 */
.driver-active-element {
  outline: 2.5px solid #5a8f73 !important;
  outline-offset: 3px !important;
  border-radius: 8px !important;
}

/* popover 箭头跟随主题色 */
.fangdu-popover .driver-popover-arrow-side-top.driver-popover-arrow::before {
  border-bottom-color: rgba(10, 18, 14, 0.94) !important;
}
.fangdu-popover .driver-popover-arrow-side-bottom.driver-popover-arrow::before {
  border-top-color: rgba(10, 18, 14, 0.94) !important;
}
.fangdu-popover .driver-popover-arrow-side-left.driver-popover-arrow::before {
  border-right-color: rgba(10, 18, 14, 0.94) !important;
}
.fangdu-popover .driver-popover-arrow-side-right.driver-popover-arrow::before {
  border-left-color: rgba(10, 18, 14, 0.94) !important;
}

/* 移动端宽度适配 */
@media (max-width: 768px) {
  .fangdu-popover {
    max-width: calc(100vw - 40px) !important;
  }
}
</style>
