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
defineProps({
  visible: Boolean,
  src: String
});
defineEmits(['close']);
</script>

<style scoped>
.modal-mask { position: fixed; z-index: 9998; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; }
.modal-container { position: relative; max-width: 80vw; max-height: 80vh; }
.modal-container video { width: 100%; height: 100%; display: block; }
.close-button { position: absolute; top: -30px; right: -30px; background: none; border: none; color: white; font-size: 2.5rem; cursor: pointer; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>