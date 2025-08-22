<template>
  <div class="input-group">
    <input
      :type="type"
      :id="id"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      placeholder=" "
      :class="{ 'has-error': hasError }"
    >
    <label :for="id">{{ label }}</label>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  type: {
    type: String,
    default: 'text'
  },
  hasError: {
    type: Boolean,
    default: false
  },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).substring(2, 9)}` // 生成唯一ID
  }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.input-group {
  position: relative;
  margin-bottom: 1.5rem; /* 为浮动标签留出空间 */
  width: 100%;
}

.input-group input {
  width: 100%;
  padding: 1.25rem 1rem 0.5rem 1rem; /* 调整 padding，为标签留出更多空间 */
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  background-color: #fff; /* 默认白色背景 */
  color: #333; /* 输入文字颜色 */
  box-sizing: border-box;
  outline: none;
  transition: all 0.2s ease-out; 
}

.input-group input:focus {
  border-color: #007bff; /* 聚焦时边框颜色 */
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* 聚焦时的蓝色光晕 */
}

.input-group label {
  position: absolute;
  left: 1rem;
  top: 0.75rem; /* 初始位置 */
  color: #888; /* 标签默认颜色 */
  font-size: 1rem;
  pointer-events: none;
  transition: all 0.2s ease-out;
  transform-origin: left top;
  background-color: transparent;
  padding: 0 0.25rem; 
}

/* 当输入框有内容或聚焦时 */
.input-group input:focus~label,
.input-group input:not(:placeholder-shown)~label {
  top: -0.75rem; /* 向上移动更多 */
  left: 0.75rem; 
  font-size: 0.8rem; /* 缩小更多 */
  color: #007bff; /* 浮动时颜色 */
  background-color: #fff; /* 背景色与输入框一致，覆盖边框 */
  transform: translateY(0);
  padding: 0 0.5rem; 
}

/* 错误状态样式 */
.input-group input.has-error {
  border-color: #dc3545; /* 红色边框 */
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25); /* 红色光晕 */
}

.input-group input.has-error ~ label {
  color: #dc3545; /* 红色标签 */
}
</style> 