<template>
  <div class="admin-page-shell">
    <div class="page-config-container">
      <div class="page-header">
        <h1>面料细节图配置</h1>
        <p class="page-description">配置点击导航栏"面料细节"时弹窗展示的图片（如微信小程序二维码），支持随时替换。</p>
      </div>

      <div class="image-section">
        <div class="preview-area">
          <div class="preview-label">当前图片</div>
          <div class="preview-box">
            <img
              v-if="currentUrl"
              :src="currentUrl"
              class="preview-img"
              alt="当前面料细节图"
            />
            <div v-else class="preview-empty">
              <span>暂未配置图片，将使用默认图</span>
            </div>
          </div>
        </div>

        <div class="upload-area">
          <div class="upload-label">替换图片</div>
          <div
            class="drop-zone"
            :class="{ 'is-over': isDragging }"
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <div v-if="previewFile" class="drop-preview">
              <img :src="previewFile" class="drop-preview-img" alt="待上传预览" />
              <span class="drop-preview-tip">点击或拖拽可重新选择</span>
            </div>
            <div v-else class="drop-hint">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M8 28 C8 20 14 14 20 14 C26 14 32 20 32 28" stroke="#5a8f73" stroke-width="2" stroke-linecap="round" fill="none"/>
                <path d="M20 14 L20 30 M16 18 L20 14 L24 18" stroke="#5a8f73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <p>点击选择或拖拽图片到此处</p>
              <span>支持 JPG / PNG / WEBP，最大 10MB</span>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            style="display:none"
            @change="handleFileChange"
          />

          <button
            class="upload-btn"
            :disabled="!selectedFile || uploading"
            @click="handleUpload"
          >
            <span v-if="uploading" class="btn-spinner"></span>
            {{ uploading ? '上传中…' : '确认上传替换' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import apiClient from '../../axiosConfig.js';
import defaultImg from '../../assets/fabricgo-qr.jpg';

const toCdnUrl = (url) => {
  if (!url) return url;
  return url.replace(/https?:\/\/[^/?#]+\.aliyuncs\.com/, 'https://assets.fangdutex.cn');
};

const currentUrl = ref(defaultImg);
const selectedFile = ref(null);
const previewFile = ref('');
const uploading = ref(false);
const isDragging = ref(false);
const fileInputRef = ref(null);

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchCurrentImage = async () => {
  try {
    const { data } = await apiClient.get('/api/v1/drawer-config/site-config/fabric_detail_image_url');
    if (data?.data) currentUrl.value = toCdnUrl(data.data);
  } catch {}
};

const triggerFileInput = () => fileInputRef.value?.click();

const readFile = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return;
  }
  selectedFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => { previewFile.value = e.target.result; };
  reader.readAsDataURL(file);
};

const handleFileChange = (e) => readFile(e.target.files[0]);
const handleDrop = (e) => { isDragging.value = false; readFile(e.dataTransfer.files[0]); };

const handleUpload = async () => {
  if (!selectedFile.value) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('image', selectedFile.value);
    const { data } = await apiClient.post(
      '/api/v1/drawer-config/site-config/fabric-detail-image',
      formData,
      { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } }
    );
    currentUrl.value = toCdnUrl(data.data.url);
    selectedFile.value = null;
    previewFile.value = '';
    ElMessage.success('图片已替换，弹窗将即时生效');
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
};

onMounted(fetchCurrentImage);
</script>

<style scoped>
.admin-page-shell {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.page-config-container {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a2332;
  margin: 0 0 6px;
}

.page-description {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.image-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

.preview-label,
.upload-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.preview-box {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-empty {
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  padding: 16px;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  overflow: hidden;
}

.drop-zone:hover,
.drop-zone.is-over {
  border-color: #5a8f73;
  background: #f0fdf4;
}

.drop-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  padding: 16px;
  text-align: center;
}

.drop-hint p {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
}

.drop-hint span {
  font-size: 0.78rem;
  color: #94a3b8;
}

.drop-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drop-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.drop-preview-tip {
  position: absolute;
  bottom: 8px;
  font-size: 0.75rem;
  color: #64748b;
  background: rgba(255,255,255,0.85);
  padding: 2px 8px;
  border-radius: 99px;
}

.upload-btn {
  margin-top: 14px;
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.upload-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.upload-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .image-section {
    grid-template-columns: 1fr;
  }

  .page-config-container {
    padding: 20px 16px;
  }
}
</style>
