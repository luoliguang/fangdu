<template>
  <div v-if="visible" class="tutorial-overlay" @click="handleOverlayClick">
    <!-- 背景遮罩 -->
    <div class="tutorial-backdrop"></div>
    
    <!-- 聚光灯效果 - 突出显示搜索框 -->
    <div class="tutorial-spotlight" :style="spotlightStyle"></div>
    
    <!-- 教程内容卡片 -->
    <div class="tutorial-card" :style="cardStyle">
      <!-- 步骤0: 介绍教程 -->
      <template v-if="currentStep === 0">
        <div class="tutorial-header">
          <h3>🎯 欢迎来到方度实拍图</h3>
          <button class="tutorial-close" @click="closeTutorial" title="关闭教程">
            ✕
          </button>
        </div>
        
        <div class="tutorial-content">
          <div class="tutorial-step">
            <div class="step-icon">🔍</div>
            <div class="step-text">
              <h4>快速搜索素材</h4>
              <p>在搜索框中输入关键词，例如：<span class="keyword-example">"圆领短袖"</span>、<span class="keyword-example">"插肩"</span> 等</p>
            </div>
          </div>
          
          <div class="tutorial-step">
            <div class="step-icon">🏷️</div>
            <div class="step-text">
              <h4>使用标签筛选</h4>
              <p>点击下方标签按钮快速筛选不同类型的素材</p>
            </div>
          </div>
          
          <div class="tutorial-step">
            <div class="step-icon">📱</div>
            <div class="step-text">
              <h4>查看素材详情</h4>
              <p>点击任意素材可以查看大图或播放视频</p>
            </div>
          </div>
        </div>
        
        <div class="tutorial-actions">
          <button class="btn-secondary" @click="skipTutorial">
            跳过教程
          </button>
          <button class="btn-primary" @click="nextStep">
            开始体验
          </button>
        </div>
        
        <div class="tutorial-footer">
          <small>💡 提示：您可以随时在设置中重新查看此教程</small>
        </div>
      </template>
      
      <!-- 步骤1: 搜索引导 -->
      <template v-else-if="currentStep === 1">
        <div class="tutorial-header">
          <h3>🔍 现在试试搜索功能</h3>
          <button class="tutorial-close" @click="closeTutorial" title="关闭教程">
            ✕
          </button>
        </div>
        
        <div class="tutorial-content">
          <div class="tutorial-step active-step">
            <div class="step-icon animate-pulse">👆</div>
            <div class="step-text">
              <h4>点击上方搜索框</h4>
              <p>试试输入 <span class="keyword-example">"圆领短袖"</span> 或 <span class="keyword-example">"插肩"</span> 来搜索素材</p>
            </div>
          </div>
          
          <div class="tutorial-step">
            <div class="step-icon">⚡</div>
            <div class="step-text">
              <h4>实时搜索结果</h4>
              <p>输入关键词后，系统会立即显示相关的素材图片和视频</p>
            </div>
          </div>
          
          <!-- <div class="tutorial-step">
            <div class="step-icon">🎯</div>
            <div class="step-text">
              <h4>精准匹配</h4>
              <p>我们的AI会根据您的关键词找到最相关的素材</p>
            </div>
          </div> -->
        </div>
        
        <div class="tutorial-actions">
          <button class="btn-secondary" @click="skipTutorial">
            跳过教程
          </button>
          <button class="btn-primary" @click="completeTutorial">
            我知道了
          </button>
        </div>
        
        <div class="tutorial-footer">
          <small>💡 现在就试试在搜索框中输入关键词吧！</small>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetElement: {
    type: String,
    default: '.search-input-cool' // 默认聚焦搜索框
  }
});

const emit = defineEmits(['close', 'skip', 'complete', 'next-step']);

// 教程步骤管理
const currentStep = ref(0); // 0: 介绍步骤, 1: 搜索引导步骤

// 响应式数据
const spotlightStyle = ref({});
const cardStyle = ref({});

// 计算聚光灯和卡片位置
const updatePositions = () => {
  const targetEl = document.querySelector(props.targetElement);
  if (!targetEl) return;
  
  const rect = targetEl.getBoundingClientRect();
  const padding = 20;
  
  // 聚光灯样式 - 围绕搜索框
  spotlightStyle.value = {
    left: `${rect.left - padding}px`,
    top: `${rect.top - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`
  };
  
  // 卡片位置 - 居中显示，但避开搜索框区域
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = 500; // 实际卡片宽度
  const cardHeight = 420; // 实际卡片高度
  
  // 计算居中位置
  let cardLeft = (viewportWidth - cardWidth) / 2;
  let cardTop = (viewportHeight - cardHeight) / 2;
  
  // 搜索框区域边界
  const searchBoxTop = rect.top - 30;
  const searchBoxBottom = rect.bottom + 30;
  const searchBoxLeft = rect.left - 30;
  const searchBoxRight = rect.right + 30;
  
  // 检查卡片是否与搜索框重叠
  const cardRight = cardLeft + cardWidth;
  const cardBottom = cardTop + cardHeight;
  
  const isOverlapping = (
    cardLeft < searchBoxRight &&
    cardRight > searchBoxLeft &&
    cardTop < searchBoxBottom &&
    cardBottom > searchBoxTop
  );
  
  if (isOverlapping) {
    // 优先尝试放在搜索框下方
    const spaceBelow = viewportHeight - searchBoxBottom;
    const spaceAbove = searchBoxTop;
    const spaceLeft = searchBoxLeft;
    const spaceRight = viewportWidth - searchBoxRight;
    
    if (spaceBelow >= cardHeight + 40) {
      // 放在搜索框下方
      cardTop = searchBoxBottom + 20;
    } else if (spaceAbove >= cardHeight + 40) {
      // 放在搜索框上方
      cardTop = searchBoxTop - cardHeight - 20;
    } else if (spaceRight >= cardWidth + 40) {
      // 放在搜索框右侧
      cardLeft = searchBoxRight + 20;
      cardTop = Math.max(20, Math.min(cardTop, viewportHeight - cardHeight - 20));
    } else if (spaceLeft >= cardWidth + 40) {
      // 放在搜索框左侧
      cardLeft = searchBoxLeft - cardWidth - 20;
      cardTop = Math.max(20, Math.min(cardTop, viewportHeight - cardHeight - 20));
    } else {
      // 如果空间都不够，强制放在下方并调整高度
      cardTop = Math.min(searchBoxBottom + 20, viewportHeight - cardHeight - 20);
    }
  }
  
  // 确保不超出屏幕边界
  cardLeft = Math.max(20, Math.min(cardLeft, viewportWidth - cardWidth - 20));
  cardTop = Math.max(20, Math.min(cardTop, viewportHeight - cardHeight - 20));
  
  cardStyle.value = {
    left: `${cardLeft}px`,
    top: `${cardTop}px`
  };
};

// 事件处理
const handleOverlayClick = (event) => {
  // 点击遮罩层关闭教程
  if (event.target.classList.contains('tutorial-overlay')) {
    closeTutorial();
  }
};

const closeTutorial = () => {
  emit('close');
};

const skipTutorial = () => {
  emit('skip');
};

const nextStep = () => {
  currentStep.value = 1;
  // 发出进入下一步的事件，让父组件知道教程进入搜索引导阶段
  emit('next-step', currentStep.value);
};

const completeTutorial = () => {
  emit('complete');
};

// 重置教程步骤
const resetStep = () => {
  currentStep.value = 0;
};

// 暴露重置方法给父组件
defineExpose({
  resetStep
});

// 生命周期
onMounted(() => {
  if (props.visible) {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updatePositions);
  // 恢复页面滚动
  document.body.style.overflow = '';
});

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 多次延迟更新确保位置准确
    setTimeout(() => {
      updatePositions();
    }, 100);
    setTimeout(() => {
      updatePositions();
    }, 300);
    setTimeout(() => {
      updatePositions();
      window.addEventListener('resize', updatePositions);
      // 防止页面滚动
      document.body.style.overflow = 'hidden';
    }, 500);
  } else {
    window.removeEventListener('resize', updatePositions);
    // 恢复页面滚动
    document.body.style.overflow = '';
  }
}, { immediate: true });
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: all;
}

.tutorial-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
}

.tutorial-spotlight {
  position: absolute;
  background-color: transparent;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  transition: all 0.3s ease;
  pointer-events: none;
}

.tutorial-card {
  position: absolute;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 500px;
  height: 420px;
  padding: 0;
  animation: slideInUp 0.4s ease-out;
  z-index: 10000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(50%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.tutorial-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
}

.tutorial-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.tutorial-close:hover {
  background-color: #f5f5f5;
  color: #666;
}

.tutorial-content {
  padding: 0.8rem 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.tutorial-step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.tutorial-step:last-child {
  margin-bottom: 0;
}

.step-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  flex-shrink: 0;
}

/* 活跃步骤样式 */
.tutorial-step.active-step {
  background-color: #f0f7ff;
  border: 2px solid #0066cc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.tutorial-step.active-step .step-text h4 {
  color: #0066cc;
}

.tutorial-step.active-step .step-text p {
  color: #004499;
}

/* 脉冲动画 */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.step-text h4 {
  margin: 0 0 0.3rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.step-text p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

.keyword-example {
  background-color: #f0f7ff;
  color: #0066cc;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.tutorial-actions {
  display: flex;
  gap: 0.8rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary {
  flex: 1;
  padding: 0.8rem 1rem;
  background-color: #f8f9fa;
  color: #666;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #e9ecef;
  color: #555;
}

.btn-primary {
  flex: 2;
  padding: 0.8rem 1rem;
  background: linear-gradient(45deg, #42b883, #369870);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(45deg, #369870, #2d7a5f);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.tutorial-footer {
  padding: 0.8rem 1.5rem 1.2rem 1.5rem;
  text-align: center;
}

.tutorial-footer small {
  color: #999;
  font-size: 0.8rem;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .tutorial-card {
    display: none; /* 移动端隐藏教程 */
  }
}

@media (max-width: 480px) {
  .tutorial-card {
    min-width: 300px;
    max-width: calc(100vw - 40px);
  }
  
  .tutorial-header,
  .tutorial-content,
  .tutorial-actions,
  .tutorial-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>