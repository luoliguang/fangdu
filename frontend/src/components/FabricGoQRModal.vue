<script setup>
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
}

const handleMaskClick = (event) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Transition name="fabricgo-qr-fade">
    <div
      v-if="props.modelValue"
      class="fabricgo-qr-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fabricgo-qr-title"
      @click="handleMaskClick"
    >
      <div class="fabricgo-qr-card">
        <button
          class="fabricgo-qr-close"
          type="button"
          aria-label="关闭"
          @click="close"
        >
          ✕
        </button>

        <h2 id="fabricgo-qr-title" class="fabricgo-qr-title">扫码进入 fabricGo</h2>

        <img
          class="fabricgo-qr-image"
          src="../assets/fabricgo-qr.jpg"
          alt="fabricGo 小程序二维码"
          width="220"
          height="220"
        />

        <p class="fabricgo-qr-subtext">微信扫一扫，即可查看所有面料细节</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fabricgo-qr-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  padding: 16px;
}

.fabricgo-qr-card {
  position: relative;
  width: min(92vw, 360px);
  background: #fff;
  border-radius: 16px;
  padding: 24px 24px 22px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.fabricgo-qr-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #444;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.fabricgo-qr-close:hover {
  background: rgba(0, 0, 0, 0.06);
}

.fabricgo-qr-title {
  margin: 8px 0 18px;
  font-size: 22px;
  font-weight: 700;
  color: #111;
}

.fabricgo-qr-image {
  width: 220px;
  height: 220px;
  object-fit: cover;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}

.fabricgo-qr-subtext {
  margin: 14px 0 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

.fabricgo-qr-fade-enter-active,
.fabricgo-qr-fade-leave-active {
  transition: opacity 0.22s ease;
}

.fabricgo-qr-fade-enter-from,
.fabricgo-qr-fade-leave-to {
  opacity: 0;
}
</style>
