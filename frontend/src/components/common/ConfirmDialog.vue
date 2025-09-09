<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click="handleOverlayClick">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <h3 class="confirm-title">{{ title }}</h3>
        </div>
        
        <div class="confirm-body">
          <p class="confirm-message">{{ message }}</p>
        </div>
        
        <div class="confirm-footer">
          <button 
            @click="handleCancel" 
            class="btn btn-cancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button 
            @click="handleConfirm" 
            class="btn btn-confirm"
            :class="{ 'btn-danger': type === 'danger' }"
            :disabled="loading"
          >
            <span v-if="loading" class="loading-spinner"></span>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '确认操作'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  type: {
    type: String,
    default: 'default', // 'default' | 'danger'
    validator: (value) => ['default', 'danger'].includes(value)
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['confirm', 'cancel', 'close']);

const visible = ref(false);
const loading = ref(false);

const show = () => {
  visible.value = true;
};

const hide = () => {
  visible.value = false;
  loading.value = false;
};

const handleConfirm = async () => {
  loading.value = true;
  try {
    await emit('confirm');
    hide();
  } catch (error) {
    loading.value = false;
    // 如果确认操作失败，不关闭对话框
  }
};

const handleCancel = () => {
  emit('cancel');
  hide();
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !loading.value) {
    handleCancel();
  }
};

defineExpose({
  show,
  hide
});
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.confirm-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.2s ease;
}

.confirm-header {
  padding: 1.5rem 1.5rem 0;
}

.confirm-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.confirm-body {
  padding: 1rem 1.5rem;
}

.confirm-message {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.confirm-footer {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #666;
}

.btn-cancel:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #999;
}

.btn-confirm {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-confirm:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-danger {
  background: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  border-color: #c82333;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>