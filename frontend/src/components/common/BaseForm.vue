<template>
  <form @submit.prevent="handleSubmit" class="base-form">
    <div class="form-header" v-if="$slots.header || title">
      <slot name="header">
        <h3 class="form-title">{{ title }}</h3>
      </slot>
    </div>
    
    <div class="form-body">
      <slot></slot>
    </div>
    
    <div class="form-footer" v-if="$slots.footer || showDefaultButtons">
      <slot name="footer">
        <div class="form-buttons">
          <button 
            v-if="showCancelButton"
            type="button" 
            @click="handleCancel" 
            class="btn btn-cancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button 
            type="submit" 
            class="btn btn-submit"
            :disabled="loading || !isValid"
          >
            <span v-if="loading" class="loading-spinner"></span>
            {{ submitText }}
          </button>
        </div>
      </slot>
    </div>
  </form>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  showDefaultButtons: {
    type: Boolean,
    default: true
  },
  showCancelButton: {
    type: Boolean,
    default: true
  },
  submitText: {
    type: String,
    default: '提交'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  validation: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['submit', 'cancel']);

const isValid = computed(() => {
  if (!props.validation || Object.keys(props.validation).length === 0) {
    return true;
  }
  
  return Object.values(props.validation).every(field => {
    return !field.required || (field.value && field.value.toString().trim() !== '');
  });
});

const handleSubmit = () => {
  if (!props.loading && isValid.value) {
    emit('submit');
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.base-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.form-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.form-body {
  margin-bottom: 1.5rem;
}

.form-footer {
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.form-buttons {
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
  min-width: 80px;
  justify-content: center;
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

.btn-submit {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-submit:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .base-form {
    padding: 1rem;
  }
  
  .form-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>