<script setup>
import { ref, reactive, computed } from 'vue';
import { useMaterialStore } from '@/stores/material';
import { useToast } from 'vue-toastification';

const toast = useToast();
const materialStore = useMaterialStore();

// --- State ---
const uploadMode = ref('single'); // 'single' or 'batch'
const newMaterial = ref({ name: '', tags: '', file: null });
const batchFiles = ref([]); // 批量上传的文件列表（每个包含 file, name, tags）
const batchTags = ref(''); // 批量上传共享的标签（用于批量应用）
const message = ref('');
const isLoading = ref(false);
const uploadProgress = ref(0);
const currentUploadIndex = ref(0); // 当前上传的文件索引

// 用于跟踪表单错误
const errors = reactive({
  name: false,
  tags: false,
  file: false,
  batchTags: false,
  batchFiles: false
});

// 计算属性
const isSingleMode = computed(() => uploadMode.value === 'single');
const isBatchMode = computed(() => uploadMode.value === 'batch');

// --- 单个上传方法 ---
const validateSingleForm = () => {
  let isValid = true;
  
  errors.name = false;
  errors.tags = false;
  errors.file = false;
  
  if (!newMaterial.value.name.trim()) {
    errors.name = true;
    isValid = false;
  }
  
  if (!newMaterial.value.tags.trim()) {
    errors.tags = true;
    isValid = false;
  }
  
  if (!newMaterial.value.file) {
    errors.file = true;
    isValid = false;
  }
  
  return isValid;
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    newMaterial.value.file = file;
    errors.file = false;
  }
};

const handleDrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) {
    newMaterial.value.file = file;
    errors.file = false;
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
};

const uploadSingleMaterial = async () => {
  if (!validateSingleForm()) {
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
    const result = await materialStore.uploadMaterial(formData, (progressEvent) => {
      uploadProgress.value = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
    });
    
    if (result.success) {
      message.value = '素材上传成功';
      newMaterial.value = { name: '', tags: '', file: null };
      uploadProgress.value = 0;
      
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } else {
      message.value = result.message || '上传素材失败';
    }
  } catch (error) {
    console.error('上传素材失败:', error);
    message.value = '上传素材失败';
  } finally {
    isLoading.value = false;
  }
};

// --- 批量上传方法 ---
const validateBatchForm = () => {
  let isValid = true;
  
  errors.batchTags = false;
  errors.batchFiles = false;
  
  if (!batchTags.value.trim()) {
    errors.batchTags = true;
    isValid = false;
  }
  
  if (batchFiles.value.length === 0) {
    errors.batchFiles = true;
    isValid = false;
  }
  
  return isValid;
};

const handleBatchFileChange = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    // 为每个文件创建包含元数据的对象
    batchFiles.value = files.map(file => ({
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ''), // 去除扩展名作为默认名称
      tags: batchTags.value || '', // 使用共享标签作为默认值
      uploading: false,
      uploaded: false,
      error: null
    }));
    errors.batchFiles = false;
  }
};

const handleBatchDrop = (event) => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    // 为每个文件创建包含元数据的对象
    batchFiles.value = files.map(file => ({
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ''), // 去除扩展名作为默认名称
      tags: batchTags.value || '', // 使用共享标签作为默认值
      uploading: false,
      uploaded: false,
      error: null
    }));
    errors.batchFiles = false;
  }
};

const removeBatchFile = (index) => {
  batchFiles.value.splice(index, 1);
};

const clearBatchFiles = () => {
  batchFiles.value = [];
  const fileInput = document.getElementById('batch-file-input');
  if (fileInput) fileInput.value = '';
};

// 批量应用标签到所有文件
const applyTagsToAll = () => {
  if (!batchTags.value.trim()) {
    toast.warning('请先填写共享标签');
    return;
  }
  
  batchFiles.value.forEach(item => {
    item.tags = batchTags.value;
  });
  
  toast.success('已将标签应用到所有文件');
};

const uploadBatchMaterials = async () => {
  // 验证每个文件都有名称和标签
  let hasError = false;
  batchFiles.value.forEach((item, index) => {
    if (!item.name.trim() || !item.tags.trim()) {
      hasError = true;
      toast.error(`文件 ${index + 1} 的名称和标签不能为空`);
    }
  });
  
  if (hasError || batchFiles.value.length === 0) {
    return;
  }
  
  isLoading.value = true;
  currentUploadIndex.value = 0;
  let successCount = 0;
  let failedCount = 0;
  const failedItems = [];
  
  // 逐个上传文件
  for (let i = 0; i < batchFiles.value.length; i++) {
    const item = batchFiles.value[i];
    currentUploadIndex.value = i;
    item.uploading = true;
    
    try {
      const formData = new FormData();
      formData.append('name', item.name);
      formData.append('tags', item.tags);
      formData.append('file', item.file);
      
      const result = await materialStore.uploadMaterial(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        uploadProgress.value = Math.round(((i + progress / 100) / batchFiles.value.length) * 100);
      });
      
      if (result.success) {
        item.uploaded = true;
        item.uploading = false;
        successCount++;
      } else {
        item.error = result.message || '上传失败';
        item.uploading = false;
        failedCount++;
        failedItems.push({ name: item.file.name, message: item.error });
      }
    } catch (error) {
      console.error(`上传文件 ${item.file.name} 失败:`, error);
      item.error = error.message || '上传失败';
      item.uploading = false;
      failedCount++;
      failedItems.push({ name: item.file.name, message: item.error });
    }
  }
  
  // 显示结果
  if (successCount > 0) {
    toast.success(`成功上传 ${successCount} 个文件${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`);
  }
  
  if (failedItems.length > 0) {
    failedItems.forEach(item => {
      toast.error(`${item.name}: ${item.message}`);
    });
  }
  
  // 如果全部成功，清空列表
  if (failedCount === 0) {
    batchTags.value = '';
    batchFiles.value = [];
    uploadProgress.value = 0;
    
    const fileInput = document.getElementById('batch-file-input');
    if (fileInput) fileInput.value = '';
  } else {
    // 只保留失败的文件
    batchFiles.value = batchFiles.value.filter(item => !item.uploaded);
  }
  
  isLoading.value = false;
  currentUploadIndex.value = 0;
};

// 切换上传模式
const switchMode = (mode) => {
  uploadMode.value = mode;
  message.value = '';
  uploadProgress.value = 0;
  // 重置表单
  newMaterial.value = { name: '', tags: '', file: null };
  batchFiles.value = [];
  batchTags.value = '';
  Object.keys(errors).forEach(key => errors[key] = false);
};
</script>

<template>
  <div class="card">
    <h2>上传新素材</h2>
    
    <!-- 上传模式切换 -->
    <div class="mode-switch">
      <button 
        :class="['mode-btn', { active: isSingleMode }]"
        @click="switchMode('single')"
      >
        单个上传
      </button>
      <button 
        :class="['mode-btn', { active: isBatchMode }]"
        @click="switchMode('batch')"
      >
        批量上传
      </button>
    </div>

    <!-- 单个上传表单 -->
    <form v-if="isSingleMode" @submit.prevent="uploadSingleMaterial" class="upload-form">
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

    <!-- 批量上传表单 -->
    <form v-if="isBatchMode" @submit.prevent="uploadBatchMaterials" class="upload-form">
      <div class="form-group">
        <div class="batch-tags-header">
          <label for="batch-tags">共享标签 <span class="help-text">(可选，用于批量应用)</span></label>
          <button 
            v-if="batchFiles.length > 0 && batchTags.trim()"
            type="button" 
            class="btn-apply-tags" 
            @click="applyTagsToAll"
            title="将此标签应用到所有文件"
          >
            应用到所有文件
          </button>
        </div>
        <input 
          id="batch-tags" 
          v-model="batchTags" 
          type="text" 
          placeholder="多个标签用逗号分隔，然后点击【应用到所有文件】"
        >
      </div>
      
      <div class="form-group">
        <div 
          class="upload-drop-zone batch"
          :class="{ 'error-border': errors.batchFiles, 'has-file': batchFiles.length > 0 }"
          @drop="handleBatchDrop"
          @dragover="handleDragOver"
        >
          <div v-if="batchFiles.length === 0">
            <i class="upload-icon">📁</i>
            <p>拖放多个文件到这里或</p>
            <input 
              type="file" 
              id="batch-file-input"
              @change="handleBatchFileChange"
              accept="image/*,video/*"
              multiple
              class="file-input"
            >
            <label for="batch-file-input" class="file-label">选择多个文件</label>
            <p class="help-text">最多可同时上传20个文件</p>
          </div>
          <div v-else class="batch-file-list">
            <div class="batch-file-header">
              <h4>已选择 {{ batchFiles.length }} 个文件</h4>
              <button 
                type="button" 
                class="btn-clear-all" 
                @click="clearBatchFiles"
              >
                清空所有
              </button>
            </div>
            <div class="file-items">
              <div 
                v-for="(item, index) in batchFiles" 
                :key="index" 
                class="file-item-card"
                :class="{ 
                  'uploading': item.uploading, 
                  'uploaded': item.uploaded, 
                  'error': item.error 
                }"
              >
                <div class="file-item-header">
                  <div class="file-basic-info">
                    <span class="file-icon">{{ item.file.type.startsWith('image/') ? '🖼️' : '🎬' }}</span>
                    <span class="file-original-name" :title="item.file.name">{{ item.file.name }}</span>
                    <span class="file-size">{{ (item.file.size / 1024 / 1024).toFixed(2) }} MB</span>
                  </div>
                  <button 
                    type="button" 
                    class="btn-remove-file" 
                    @click="removeBatchFile(index)"
                    title="移除"
                    :disabled="item.uploading"
                  >
                    ×
                  </button>
                </div>
                
                <div class="file-item-fields">
                  <div class="field-group">
                    <label>素材名称 *</label>
                    <input 
                      v-model="item.name" 
                      type="text" 
                      placeholder="素材名称"
                      :disabled="item.uploading || item.uploaded"
                      :class="{ 'field-error': !item.name.trim() }"
                    >
                  </div>
                  
                  <div class="field-group">
                    <label>标签 *</label>
                    <input 
                      v-model="item.tags" 
                      type="text" 
                      placeholder="多个标签用逗号分隔"
                      :disabled="item.uploading || item.uploaded"
                      :class="{ 'field-error': !item.tags.trim() }"
                    >
                  </div>
                </div>
                
                <div v-if="item.uploading" class="file-item-status uploading-status">
                  <div class="spinner"></div>
                  <span>上传中...</span>
                </div>
                
                <div v-if="item.uploaded" class="file-item-status success-status">
                  <span>✓ 上传成功</span>
                </div>
                
                <div v-if="item.error" class="file-item-status error-status">
                  <span>✗ {{ item.error }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <span v-if="errors.batchFiles" class="error-message">请选择至少一个文件</span>
      </div>
      
      <div v-if="uploadProgress > 0 && isLoading" class="progress-container">
        <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
      
      <button 
        type="submit" 
        class="btn-submit" 
        :disabled="isLoading || batchFiles.length === 0"
      >
        {{ isLoading ? '批量上传中...' : `批量上传 (${batchFiles.length} 个文件)` }}
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

.mode-switch {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.mode-btn {
  padding: 0.75rem 1.5rem;
  background-color: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
}

.mode-btn.active {
  background-color: #42b883;
  color: white;
  transform: translateY(-2px);
}

.mode-btn:hover:not(.active) {
  background-color: #d0d0d0;
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

.batch {
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

.batch:hover {
  border-color: #42b883;
  background-color: #f0f7f4;
}

.batch-file-list {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  max-height: 500px;
  overflow-y: auto;
  width: 100%;
}

.batch-file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.batch-file-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #343a40;
}

.btn-clear-all {
  padding: 0.3rem 0.8rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

.btn-clear-all:hover {
  background-color: #c82333;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-item-card {
  padding: 1rem;
  background-color: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.file-item-card.uploading {
  border-color: #007bff;
  background-color: #e7f3ff;
}

.file-item-card.uploaded {
  border-color: #28a745;
  background-color: #e7f5e9;
}

.file-item-card.error {
  border-color: #dc3545;
  background-color: #ffe7e7;
}

.file-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.file-basic-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.file-original-name {
  font-weight: 500;
  color: #495057;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.file-size {
  color: #6c757d;
  font-size: 0.85rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.file-item-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.field-group input {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.field-group input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.field-group input:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.field-group input.field-error {
  border-color: #dc3545;
}

.file-item-status {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.uploading-status {
  background-color: #cce5ff;
  color: #004085;
}

.success-status {
  background-color: #d4edda;
  color: #155724;
}

.error-status {
  background-color: #f8d7da;
  color: #721c24;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #004085;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.batch-tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.btn-apply-tags {
  padding: 0.4rem 0.8rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.btn-apply-tags:hover {
  background-color: #0056b3;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #6c757d;
  font-size: 0.8rem;
}

.btn-remove-file {
  padding: 0.2rem 0.6rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.3s ease;
}

.btn-remove-file:hover {
  background-color: #c82333;
}

.help-text {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .card {
    padding: 1.5rem;
  }
  
  .card h2 {
    font-size: 1.5rem;
  }
  
  .mode-switch {
    flex-direction: column;
    gap: 0.5rem;
  }

  .mode-btn {
    width: 100%;
    padding: 0.8rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .upload-drop-zone {
    min-height: 150px;
    padding: 1.5rem;
  }
  
  .upload-icon {
    font-size: 2rem;
  }
  
  .btn-submit {
    width: 100%;
    padding: 1rem;
  }

  .batch {
    min-height: 150px;
    padding: 1.5rem;
  }

  .batch-file-list {
    max-height: 400px;
  }

  .file-item-fields {
    grid-template-columns: 1fr;
  }

  .file-item-card {
    padding: 0.8rem;
  }

  .file-basic-info {
    flex-wrap: wrap;
  }

  .field-group input {
    font-size: 0.85rem;
  }

  .btn-clear-all {
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
  }

  .batch-tags-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .btn-apply-tags {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 1rem;
  }
  
  .card h2 {
    font-size: 1.3rem;
  }
  
  .form-grid {
    gap: 0.8rem;
  }
  
  .upload-drop-zone {
    min-height: 120px;
    padding: 1rem;
  }
  
  .upload-icon {
    font-size: 1.8rem;
  }
  
  input[type="text"] {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }
  
  .btn-submit {
    padding: 0.8rem;
    font-size: 0.9rem;
  }

  .batch {
    min-height: 120px;
    padding: 1rem;
  }

  .batch-file-list {
    max-height: 120px;
  }

  .file-item {
    padding: 0.3rem 0.5rem;
  }

  .file-icon {
    font-size: 0.9rem;
  }

  .file-name {
    font-size: 0.8rem;
  }

  .file-size {
    font-size: 0.6rem;
  }

  .btn-clear-all {
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
  }
}
</style>