<script setup>
import { ref, reactive, onMounted } from 'vue';
import apiClient from '../axiosConfig.js';
import { useToast } from 'vue-toastification';

const toast = useToast();

// --- State ---
const newMaterial = ref({ name: '', tags: '', file: null });
const message = ref('');
const isLoading = ref(false);
const uploadProgress = ref(0); // 用于存储上传进度

// 用于跟踪表单错误
const errors = reactive({
  name: false,
  tags: false,
  file: false
});

// --- 方法 ---
const validateForm = () => {
  let isValid = true;
  
  // 重置所有错误
  errors.name = false;
  errors.tags = false;
  errors.file = false;
  
  // 验证名称
  if (!newMaterial.value.name.trim()) {
    errors.name = true;
    isValid = false;
  }
  
  // 验证标签
  if (!newMaterial.value.tags.trim()) {
    errors.tags = true;
    isValid = false;
  }
  
  // 验证文件
  if (!newMaterial.value.file) {
    errors.file = true;
    isValid = false;
  }
  
  return isValid;
};

// 确保组件在挂载时正确初始化
onMounted(() => {
  // 可以在这里添加初始化逻辑
});

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    newMaterial.value.file = file;
    errors.file = false; // 清除文件错误
  }
};

const handleDrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) {
    newMaterial.value.file = file;
    errors.file = false; // 清除文件错误
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
};

const uploadMaterial = async () => {
  if (!validateForm()) {
    toast.error('请填写所有必填字段');
    return;
  }
  
  isLoading.value = true;
  uploadProgress.value = 0;
  
  const formData = new FormData();
  formData.append('name', newMaterial.value.name);
  formData.append('tags', newMaterial.value.tags);
  formData.append('file', newMaterial.value.file);
  
  try {
    const response = await apiClient.post('/materials', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
      }
    });
    
    toast.success('素材上传成功');
    message.value = '素材上传成功';
    
    // 重置表单
    newMaterial.value = { name: '', tags: '', file: null };
    uploadProgress.value = 0;
    
    // 重置文件输入框
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    
  } catch (error) {
    console.error('上传素材失败:', error);
    toast.error('上传素材失败');
    message.value = '上传素材失败';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="card">
    <h2>上传新素材</h2>
    <form @submit.prevent="uploadMaterial" class="upload-form">
      <div class="form-grid">
        <div class="form-group">
          <label for="name" :class="{ 'error-label': errors.name }">素材名称 *</label>
          <input 
            id="name" 
            v-model="newMaterial.name" 
            type="text" 
            :class="{ 'error-input': errors.name }"
            @input="errors.name = false"
          >
          <span v-if="errors.name" class="error-message">请输入素材名称</span>
        </div>
        
        <div class="form-group">
          <label for="tags" :class="{ 'error-label': errors.tags }">标签 *</label>
          <input 
            id="tags" 
            v-model="newMaterial.tags" 
            type="text" 
            placeholder="多个标签用逗号分隔"
            :class="{ 'error-input': errors.tags }"
            @input="errors.tags = false"
          >
          <span v-if="errors.tags" class="error-message">请输入标签</span>
        </div>
      </div>
      
      <div class="form-group">
        <label :class="{ 'error-label': errors.file }">上传文件 *</label>
        <div 
          class="upload-drop-zone"
          :class="{ 'error-border': errors.file, 'has-file': newMaterial.file }"
          @drop="handleDrop"
          @dragover="handleDragOver"
        >
          <div v-if="!newMaterial.file">
            <i class="upload-icon">📁</i>
            <p>拖放文件到这里或</p>
            <input 
              type="file" 
              id="file-input"
              @change="handleFileChange"
              accept="image/*,video/*"
              class="file-input"
            >
            <label for="file-input" class="file-label">选择文件</label>
          </div>
          <div v-else class="file-preview">
            <p>已选择: {{ newMaterial.file.name }}</p>
            <button 
              type="button" 
              class="btn-remove" 
              @click="newMaterial.file = null"
            >
              移除
            </button>
          </div>
        </div>
        <span v-if="errors.file" class="error-message">请选择文件</span>
      </div>
      
      <div v-if="uploadProgress > 0 && isLoading" class="progress-container">
        <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
      
      <button 
        type="submit" 
        class="btn-submit" 
        :disabled="isLoading"
      >
        {{ isLoading ? '上传中...' : '上传素材' }}
      </button>
      
      <p v-if="message" :class="{ 'success-message': message.includes('成功'), 'error-message': message.includes('失败') }">
        {{ message }}
      </p>
    </form>
  </div>
</template>

<style scoped>
.card {
  background: linear-gradient(-45deg, #f8f8f8, #f0f0f0);
  background-size: 200% 200%;
  animation: gradient-animation 20s ease infinite;
  border-radius: 15px;
  padding: 2.5rem;
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  border: 1px solid #e0e0e0;
  transition: box-shadow 0.3s ease;
}

.card h2 {
  font-family: 'Montserrat', sans-serif;
  font-size: 1.8rem;
  color: #343a40;
  margin-bottom: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
}

@keyframes gradient-animation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  color: #495057;
}

input[type="text"] {
  padding: 0.75rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

input[type="text"]:focus {
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.2);
  outline: none;
}

.upload-drop-zone {
  border: 2px dashed #ced4da;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s ease, background-color 0.3s ease;
  background-color: #f8f9fa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-drop-zone:hover {
  border-color: #42b883;
  background-color: #f0f7f4;
}

.upload-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
  color: #6c757d;
}

.file-input {
  display: none;
}

.file-label {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #42b883;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 0.5rem;
  transition: background-color 0.3s ease;
}

.file-label:hover {
  background-color: #3aa876;
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.btn-remove {
  padding: 0.3rem 0.8rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

.btn-remove:hover {
  background-color: #c82333;
}

.progress-container {
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  margin-top: 0.5rem;
}

.progress-bar {
  height: 100%;
  background-color: #42b883;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  color: #495057;
}

.btn-submit {
  padding: 0.75rem 1.5rem;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;
  align-self: flex-start;
  margin-top: 1rem;
}

.btn-submit:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.error-label {
  color: #dc3545;
}

.error-input, .error-border {
  border-color: #dc3545 !important;
}

.error-message {
  color: #dc3545;
  font-size: 0.9rem;
}

.success-message {
  color: #42b883;
  font-weight: 500;
}

.has-file {
  border-color: #42b883;
  background-color: #f0f7f4;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .upload-drop-zone {
    min-height: 150px;
  }
  
  .btn-submit {
    width: 100%;
  }
}
</style>