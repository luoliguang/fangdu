<template>
  <div class="form-field" :class="{ 'has-error': hasError, 'required': required }">
    <label v-if="label" :for="fieldId" class="field-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="field-wrapper">
      <!-- 文本输入框 -->
      <input 
        v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'"
        :id="fieldId"
        :type="type"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        class="field-input"
      />
      
      <!-- 文本域 -->
      <textarea 
        v-else-if="type === 'textarea'"
        :id="fieldId"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        class="field-textarea"
      ></textarea>
      
      <!-- 选择框 -->
      <select 
        v-else-if="type === 'select'"
        :id="fieldId"
        :value="modelValue"
        @change="handleInput"
        @blur="handleBlur"
        :disabled="disabled"
        class="field-select"
      >
        <option value="" v-if="placeholder">{{ placeholder }}</option>
        <option 
          v-for="option in options" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <!-- 复选框 -->
      <label v-else-if="type === 'checkbox'" class="checkbox-wrapper">
        <input 
          :id="fieldId"
          type="checkbox"
          :checked="modelValue"
          @change="handleInput"
          :disabled="disabled"
          class="field-checkbox"
        />
        <span class="checkbox-label">{{ checkboxLabel }}</span>
      </label>
      
      <!-- 文件上传 -->
      <input 
        v-else-if="type === 'file'"
        :id="fieldId"
        type="file"
        @change="handleFileChange"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        class="field-file"
      />
      
      <!-- 自定义插槽 -->
      <slot v-else></slot>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="hasError" class="field-error">
      {{ errorMessage }}
    </div>
    
    <!-- 帮助文本 -->
    <div v-if="helpText && !hasError" class="field-help">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, Array, File],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => [
      'text', 'email', 'password', 'number', 'textarea', 
      'select', 'checkbox', 'file', 'custom'
    ].includes(value)
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  },
  // textarea 特有属性
  rows: {
    type: Number,
    default: 3
  },
  // select 特有属性
  options: {
    type: Array,
    default: () => []
  },
  // checkbox 特有属性
  checkboxLabel: {
    type: String,
    default: ''
  },
  // file 特有属性
  accept: {
    type: String,
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  },
  // 验证规则
  rules: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'blur', 'change']);

const fieldId = ref(`field-${Math.random().toString(36).substr(2, 9)}`);
const internalError = ref('');

const hasError = computed(() => {
  return !!(props.error || internalError.value);
});

const errorMessage = computed(() => {
  return props.error || internalError.value;
});

const handleInput = (event) => {
  let value;
  
  if (props.type === 'checkbox') {
    value = event.target.checked;
  } else if (props.type === 'number') {
    value = event.target.value === '' ? '' : Number(event.target.value);
  } else {
    value = event.target.value;
  }
  
  emit('update:modelValue', value);
  emit('change', value);
  
  // 清除内部错误
  if (internalError.value) {
    internalError.value = '';
  }
};

const handleFileChange = (event) => {
  const files = event.target.files;
  const value = props.multiple ? Array.from(files) : files[0];
  emit('update:modelValue', value);
  emit('change', value);
};

const handleBlur = () => {
  validateField();
  emit('blur');
};

const validateField = () => {
  if (!props.rules.length) return true;
  
  for (const rule of props.rules) {
    const result = rule(props.modelValue);
    if (result !== true) {
      internalError.value = result;
      return false;
    }
  }
  
  internalError.value = '';
  return true;
};

defineExpose({
  validate: validateField,
  clearError: () => {
    internalError.value = '';
  }
});
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.required-mark {
  color: #dc3545;
  margin-left: 0.25rem;
}

.field-wrapper {
  position: relative;
}

.field-input,
.field-textarea,
.field-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: white;
}

.field-input:focus,
.field-textarea:focus,
.field-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.field-checkbox {
  margin: 0;
}

.checkbox-label {
  font-size: 0.9rem;
  color: #333;
}

.field-file {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.field-error {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #dc3545;
}

.field-help {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}

.form-field.has-error .field-input,
.form-field.has-error .field-textarea,
.form-field.has-error .field-select {
  border-color: #dc3545;
}

.form-field.has-error .field-input:focus,
.form-field.has-error .field-textarea:focus,
.form-field.has-error .field-select:focus {
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.field-input:disabled,
.field-textarea:disabled,
.field-select:disabled,
.field-file:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.6;
}

.field-input:readonly,
.field-textarea:readonly {
  background: #f8f9fa;
}
</style>