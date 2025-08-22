<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
      <div class="modal-container">
        <video :src="src" controls autoplay></video>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue'; // 引入 watch, onMounted, onUnmounted

const props = defineProps({
  visible: Boolean,
  src: String
});
const emit = defineEmits(['close']);

// 监听 visible 变化，控制 body 滚动
watch(() => props.visible, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

// 处理 ESC 键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.visible) {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  // 确保组件卸载时恢复 body 滚动
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-mask { position: fixed; z-index: 9998; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; }
.modal-container { position: relative; max-width: 80vw; max-height: 80vh;   display: flex; justify-content: center; align-items: center;}
.modal-container video { max-width: 100%; max-height: 100%; width: auto; height: 90vh; object-fit: contain; /* 保持比例完整显示 */ display: block; }
.close-button { 
  position: absolute; 
  top: -40px; 
  right: -40px; 
  background: rgba(255, 255, 255, 0.2); /* 半透明背景 */
  border: none; 
  border-radius: 50%; 
  color: white; 
  font-size: 1.8rem; /* 稍微小一点，更精致 */
  width: 40px; 
  height: 40px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  cursor: pointer; 
  transition: all 0.3s ease; 
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); /* 细微阴影 */
}
.close-button:hover { 
  background: rgba(255, 255, 255, 0.4); 
  transform: rotate(90deg); /* 鼠标悬停时旋转 */
}
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>