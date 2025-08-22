<script setup>
import { ref, reactive, onMounted,computed  } from 'vue'; // 引入 reactive
import apiClient from '../axiosConfig.js';
import { useToast } from 'vue-toastification'; // 1. 引入 useToast
import FloatingLabelInput from '../components/FloatingLabelInput.vue'; // 引入 FloatingLabelInput 组件

const toast = useToast(); // 2. 获取 toast 实例

// --- State ---
const materials = ref([]);
const newMaterial = ref({ name: '', tags: '', file: null });
const editingMaterial = ref(null); // 正在编辑的素材对象
const message = ref('');
const isLoading = ref(false);
const uploadProgress = ref(0); // 新增：用于存储上传进度
// 新增：用于跟踪表单错误
const errors = reactive({
  name: false,
  tags: false,
  file: false
});

// --- 新增：分页状态 ---
const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20); // 和后端保持一致

// --- 新增：留言相关状态 ---
const feedbacks = ref([]);
const isFeedbacksLoading = ref(false);
const pendingFeedbacksCount = ref(0); // 新增：未处理留言数量

// --- 新增：计算属性来判断按钮是否应该禁用 ---
const isPrevDisabled = computed(() => currentPage.value <= 1);
const isNextDisabled = computed(() => currentPage.value >= totalPages.value);

// --- 修改：让 fetchMaterials 支持分页 ---
const fetchMaterials = async () => {
  isLoading.value = true;
  try {
    const response = await apiClient.get('/materials', {
      params: {
        page: currentPage.value,
        limit: limit.value
      }
    });
    materials.value = response.data.data;
    // 更新总页数
    totalPages.value = response.data.meta.totalPages;
  } catch (error) {
    console.error('获取后台素材列表失败:', error);
    toast.error('获取素材失败');
  } finally {
    isLoading.value = false;
  }
};

// ***** START OF FIX *****
// --- 新增：处理分页的函数 ---
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchMaterials();
  }
};
// ***** END OF FIX *****

// --- 新增：获取未处理留言数量 ---
const fetchPendingFeedbacksCount = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/feedbacks/pending/count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    pendingFeedbacksCount.value = response.data.count;
  } catch (error) {
    console.error('获取未处理留言数量失败:', error);
  }
};

// --- 新增：获取留言列表 ---
const fetchFeedbacks = async () => {
  isFeedbacksLoading.value = true;
  try {
    const token = localStorage.getItem('authToken'); // 获取认证令牌
    const response = await apiClient.get('/feedbacks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    feedbacks.value = response.data.data;
    fetchPendingFeedbacksCount(); // 刷新留言列表后更新未处理数量
  } catch (error) {
    console.error('获取留言列表失败:', error);
    toast.error('获取留言失败');
  } finally {
    isFeedbacksLoading.value = false;
  }
};

// --- 新增：更新留言状态 ---
const updateFeedbackStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('authToken');
    await apiClient.put(`/feedbacks/${id}`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success('留言状态更新成功！');
    fetchFeedbacks(); // 刷新列表
  } catch (error) {
    console.error('更新留言状态失败:', error);
    toast.error('更新留言状态失败');
  }
};

// --- 新增：删除留言 ---
const deleteFeedback = async (id) => {
  if (!confirm('确定要删除这条留言吗？此操作不可撤销！')) return;
  try {
    const token = localStorage.getItem('authToken');
    await apiClient.delete(`/feedbacks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success('留言删除成功！');
    fetchFeedbacks(); // 刷新列表
  } catch (error) {
    console.error('删除留言失败:', error);
    toast.error('删除留言失败');
  }
};

// --- 新增：格式化日期 ---
const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleString();
};

// 校验表单函数
const validateForm = () => {
  errors.name = !newMaterial.value.name;
  errors.tags = !newMaterial.value.tags;
  errors.file = !newMaterial.value.file;
  
  // 如果有任何一个字段为true (即有错误)，则返回false
  return !Object.values(errors).some(isError => isError);
};

const handleFileChange = (e) => { newMaterial.value.file = e.target.files[0]; };

// --- CRUD Operations (用toast替换message) ---
const handleUpload = async () => {
  if (!validateForm()) { // 使用新的校验函数
    toast.error('请填写所有必填项！');
    return;
  }
  
  isLoading.value = true;
  uploadProgress.value = 0;

  const formData = new FormData();
  formData.append('name', newMaterial.value.name);
  formData.append('tags', newMaterial.value.tags);
  formData.append('imageFile', newMaterial.value.file);

  try {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    };
    await apiClient.post('/materials', formData, config);
    toast.success('上传成功!');
    await fetchMaterials();
    newMaterial.value = { name: '', tags: '', file: null };
    document.getElementById('file-input').value = null;
  } catch (error) {
    toast.error(`上传失败: ${error.response?.data?.error || error.message}`);
  } finally {
    isLoading.value = false;
    setTimeout(() => { uploadProgress.value = 0; }, 1000);
  }
};

const deleteMaterial = async (id) => {
  if (!confirm('确定要删除这个素材吗？此操作不可撤销！')) return;
  try {
    await apiClient.delete(`/materials/${id}`);
    toast.success('删除成功!'); // 替换
    materials.value = materials.value.filter(m => m.id !== id);
  } catch (error) {
    toast.error(`删除失败: ${error.response?.data?.error || '未知错误'}`); // 替换
    console.error("删除请求失败:", error);
  }
};

const startEditing = (material) => { editingMaterial.value = { ...material }; };

const saveEdit = async () => {
  if (!editingMaterial.value) return;
  const { id, name, tags } = editingMaterial.value;
  try {
    await apiClient.put(`/materials/${id}`, { name, tags });
    toast.success('修改成功!'); // 替换
    await fetchMaterials();
    editingMaterial.value = null;
  } catch (error) {
    toast.error(`修改失败: ${error.response?.data?.error || '请检查网络或联系管理员'}`); // 替换
    console.error("修改请求失败:", error);
  }
};

// 新增：拖拽上传
const handleFileDrop = (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
        newMaterial.value.file = file;
    }
};

onMounted(() => {
  fetchMaterials();
  fetchFeedbacks(); // 页面加载时获取留言列表
  fetchPendingFeedbacksCount(); // 页面加载时获取未处理留言数量
});
</script>

<template>
  <div class="admin-container">
    <div class="card">
      <h2>上传新素材</h2>
      <form @submit.prevent="handleUpload">
        <label
          class="upload-drop-zone"
          :class="{ 'has-error': errors.file }"
          @dragover.prevent @dragenter.prevent @drop.prevent="handleFileDrop"
        >
        <input type="file" id="file-input" @change="handleFileChange" hidden accept="image/*,video/*">
          <div v-if="!newMaterial.file" class="upload-prompt">
            <p>将文件拖拽到此处，或<span>点击选择</span></p>
          </div>
          <div v-else class="file-preview">
            <p>已选择文件: <strong>{{ newMaterial.file.name }}</strong></p>
          </div>
        </label>
        
        <div class="form-grid">
          <FloatingLabelInput 
            v-model="newMaterial.name" 
            label="素材名称"
            :hasError="errors.name"
            @input="errors.name = false"
          />
          <FloatingLabelInput 
            v-model="newMaterial.tags" 
            label="标签,用空格或逗号隔开"
            :hasError="errors.tags"
            @input="errors.tags = false"
          />
        </div>

        <div v-if="isLoading" class="progress-bar-container">
          <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? `上传中... ${uploadProgress}%` : '确认上传' }}
        </button>
      </form>
    </div>

    <template v-if="pendingFeedbacksCount > 0">
      <div class="card">
        <h2>
          用户留言管理
          <span v-if="pendingFeedbacksCount > 0" class="pending-count-badge">
            {{ pendingFeedbacksCount }}
          </span>
        </h2>
        <div v-if="isFeedbacksLoading" class="loading-feedback">加载中...</div>
        <div v-else-if="feedbacks.length === 0" class="no-feedbacks">暂无用户留言。</div>
        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>留言内容</th>
              <th>状态</th>
              <th>留言时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feedback in feedbacks" :key="feedback.id">
              <td>{{ feedback.id }}</td>
              <td>{{ feedback.message }}</td>
              <td>
                <span :class="{ 'status-pending': feedback.status === 'pending', 'status-resolved': feedback.status === 'resolved'}">
                  {{ feedback.status === 'pending' ? '待处理' : '已处理' }}
                </span>
              </td>
              <td>{{ formatDateTime(feedback.created_at) }}</td>
              <td>
                <button 
                  v-if="feedback.status === 'pending'"
                  @click="updateFeedbackStatus(feedback.id, 'resolved')"
                  class="btn-resolve"
                >
                  标记为已处理
                </button>
                <button @click="deleteFeedback(feedback.id)" class="btn-delete">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>素材管理</h2>
        <table>
          <thead>
            <tr>
              <th>预览</th>
              <th>名称</th>
              <th>标签</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="material in materials" :key="material.id">
              <td>
                <img 
                  v-if="material.media_type === 'image'" 
                  :src="material.file_path" 
                  :alt="material.name" 
                  class="preview-img">
                <img 
                  v-else-if="material.media_type === 'video' && material.cover_image_path"
                  :src="material.cover_image_path"
                  :alt="material.name + ' 封面'"
                  class="preview-img">
                <div 
                  v-else-if="material.media_type === 'video' && !material.cover_image_path"
                  class="preview-img-placeholder">
                  ▶
                </div>
              </td>
              <td>
                <FloatingLabelInput 
                  v-if="editingMaterial && editingMaterial.id === material.id" 
                  v-model="editingMaterial.name"
                  label="名称" 
                />
                <span v-else>{{ material.name }}</span>
              </td>
              <td>
                <FloatingLabelInput 
                  v-if="editingMaterial && editingMaterial.id === material.id" 
                  v-model="editingMaterial.tags"
                  label="标签" 
                />
                <span v-else>{{ material.tags }}</span>
              </td>
              <td>
                <div v-if="editingMaterial && editingMaterial.id === material.id">
                  <button @click="saveEdit" class="btn-save">保存</button>
                  <button @click="editingMaterial = null" class="btn-cancel">取消</button>
                </div>
                <div v-else>
                  <button @click="startEditing(material)" class="btn-edit">编辑</button>
                  <button @click="deleteMaterial(material.id)" class="btn-delete">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination-container">
          <button @click="goToPage(currentPage - 1)" :disabled="isPrevDisabled" class="btn-page">
            &lt; 上一页
          </button>
          <span>
            第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
          </span>
          <button @click="goToPage(currentPage + 1)" :disabled="isNextDisabled" class="btn-page">
            下一页 &gt;
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="card">
        <h2>素材管理</h2>
        <table>
          <thead>
            <tr>
              <th>预览</th>
              <th>名称</th>
              <th>标签</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="material in materials" :key="material.id">
              <td>
                <img 
                  v-if="material.media_type === 'image'" 
                  :src="material.file_path" 
                  :alt="material.name" 
                  class="preview-img">
                <img 
                  v-else-if="material.media_type === 'video' && material.cover_image_path"
                  :src="material.cover_image_path"
                  :alt="material.name + ' 封面'"
                  class="preview-img">
                <div 
                  v-else-if="material.media_type === 'video' && !material.cover_image_path"
                  class="preview-img-placeholder">
                  ▶
                </div>
              </td>
              <td>
                <FloatingLabelInput 
                  v-if="editingMaterial && editingMaterial.id === material.id" 
                  v-model="editingMaterial.name"
                  label="名称" 
                />
                <span v-else>{{ material.name }}</span>
              </td>
              <td>
                <FloatingLabelInput 
                  v-if="editingMaterial && editingMaterial.id === material.id" 
                  v-model="editingMaterial.tags"
                  label="标签" 
                />
                <span v-else>{{ material.tags }}</span>
              </td>
              <td>
                <div v-if="editingMaterial && editingMaterial.id === material.id">
                  <button @click="saveEdit" class="btn-save">保存</button>
                  <button @click="editingMaterial = null" class="btn-cancel">取消</button>
                </div>
                <div v-else>
                  <button @click="startEditing(material)" class="btn-edit">编辑</button>
                  <button @click="deleteMaterial(material.id)" class="btn-delete">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination-container">
          <button @click="goToPage(currentPage - 1)" :disabled="isPrevDisabled" class="btn-page">
            &lt; 上一页
          </button>
          <span>
            第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
          </span>
          <button @click="goToPage(currentPage + 1)" :disabled="isNextDisabled" class="btn-page">
            下一页 &gt;
          </button>
        </div>
      </div>
      <div class="card">
        <h2>
          用户留言管理
          <span v-if="pendingFeedbacksCount > 0" class="pending-count-badge">
            {{ pendingFeedbacksCount }}
          </span>
        </h2>
        <div v-if="isFeedbacksLoading" class="loading-feedback">加载中...</div>
        <div v-else-if="feedbacks.length === 0" class="no-feedbacks">暂无用户留言。</div>
        <table v-else>
          <thead>
            <tr>
              <th>ID</th>
              <th>留言内容</th>
              <th>状态</th>
              <th>留言时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feedback in feedbacks" :key="feedback.id">
              <td>{{ feedback.id }}</td>
              <td>{{ feedback.message }}</td>
              <td>
                <span :class="{ 'status-pending': feedback.status === 'pending', 'status-resolved': feedback.status === 'resolved'}">
                  {{ feedback.status === 'pending' ? '待处理' : '已处理' }}
                </span>
              </td>
              <td>{{ formatDateTime(feedback.created_at) }}</td>
              <td>
                <button 
                  v-if="feedback.status === 'pending'"
                  @click="updateFeedbackStatus(feedback.id, 'resolved')"
                  class="btn-resolve"
                >
                  标记为已处理
                </button>
                <button @click="deleteFeedback(feedback.id)" class="btn-delete">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>


<style scoped>
.admin-container { 
  max-width: 1000px; /* 增加最大宽度 */
  margin: 2.5rem auto; /* 调整外边距 */
  display: flex; 
  flex-direction: column; 
  gap: 2.5rem; /* 增加卡片间距 */
  padding: 0 1.5rem; /* 增加左右内边距 */
}
.card {
  background: linear-gradient(-45deg, #f8f8f8, #f0f0f0); /* 柔和渐变作为卡片背景 */
  background-size: 200% 200%; /* 扩大背景尺寸，为动画做准备 */
  animation: gradient-animation 20s ease infinite; /* 渐变动画 */
  border-radius: 15px; /* 更大圆角 */
  padding: 2.5rem; /* 增加内边距 */
  box-shadow: 0 8px 30px rgba(0,0,0,0.08); /* 更柔和更深阴影 */
  border: 1px solid #e0e0e0; /* 柔和边框 */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.12);
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

/* ... (可以复用之前的表单样式) ... */
table { 
  width: 100%; 
  border-collapse: separate; /* 使用分离边框 */
  border-spacing: 0; /* 移除单元格间距 */
  margin-top: 1.5rem; 
  border-radius: 10px; /* 圆角表格 */
  overflow: hidden; /* 隐藏超出内容 */
  box-shadow: 0 4px 20px rgba(0,0,0,0.05); /* 柔和阴影 */
}
th, td {
  text-align: left; 
  padding: 1.2rem 1.5rem; /* 增加内边距 */
  border-bottom: 1px solid #f0f0f0; /* 柔和分隔线 */
  color: #495057;
  font-size: 0.95em;
}
th {
  font-weight: 600; 
  background-color: #f8f9fa; /* 表头背景色 */
  color: #343a40;
  position: sticky;
  top: 0;
  z-index: 2;
}
tr:last-child td { border-bottom: none; }
tr:hover { background-color: #f0f7ff; /* 悬浮高亮 */ }

.preview-img, .preview-img-placeholder {
  width: 70px; /* 调整预览图大小 */
  height: 70px; 
  object-fit: cover; 
  border-radius: 8px; /* 圆角 */
  background-color: #e9ecef; 
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5em;
  color: #6c757d;
}

button {
  cursor: pointer; 
  border: none; 
  padding: 0.8rem 1.2rem; /* 调整按钮内边距 */
  border-radius: 8px; /* 按钮圆角 */
  margin: 0 0.4rem; 
  transition: all 0.3s ease;
  font-weight: 500;
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); /* 新的动感渐变色 */
  background-size: 400% 400%; /* 扩大背景尺寸，为动画做准备 */
  animation: gradient-animation 15s ease infinite; /* 渐变动画 */
}
.btn-edit { 
  box-shadow: 0 4px 10px rgba(240,173,78,0.2);
}
.btn-edit:hover {
  background: linear-gradient(-45deg, #e73c7e, #ee7752, #23a6d5, #23d5ab); /* 悬停时渐变方向或颜色微调 */
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-2px); 
  box-shadow: 0 6px 15px rgba(240,173,78,0.3);
}
.btn-delete { 
  box-shadow: 0 4px 10px rgba(217,83,79,0.2);
}
.btn-delete:hover {
  background: linear-gradient(-45deg, #23a6d5, #e73c7e, #ee7752, #23d5ab); /* 悬停时渐变方向或颜色微调 */
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-2px); 
  box-shadow: 0 6px 15px rgba(217,83,79,0.3);
}
.btn-save { 
  box-shadow: 0 4px 10px rgba(92,184,92,0.2);
}
.btn-save:hover {
  background: linear-gradient(-45deg, #23d5ab, #23a6d5, #e73c7e, #ee7752); /* 悬停时渐变方向或颜色微调 */
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-2px); 
  box-shadow: 0 6px 15px rgba(92,184,92,0.3);
}
.btn-cancel { 
  box-shadow: 0 4px 10px rgba(108,117,125,0.2);
}
.btn-cancel:hover {
  background: linear-gradient(-45deg, #6c757d, #5a6268, #ee7752, #e73c7e); /* 悬停时渐变方向或颜色微调 */
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-2px); 
  box-shadow: 0 6px 15px rgba(108,117,125,0.3);
}
.btn-resolve { 
  box-shadow: 0 4px 10px rgba(138,43,226,0.2);
}
.btn-resolve:hover {
  background: linear-gradient(-45deg, #8a2be2, #6a00b6, #ee7752, #e73c7e); /* 悬停时渐变方向或颜色微调 */
  animation: gradient-animation 10s ease infinite; /* 悬停时动画速度变化 */
  transform: translateY(-2px); 
  box-shadow: 0 6px 15px rgba(138,43,226,0.3);
}
.message { margin-top: 1.5rem; text-align: center; }

.upload-drop-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 180px; /* 增加高度 */
  border: 2px dashed #a0a0a0; /* 柔和边框 */
  border-radius: 12px;
  margin-bottom: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fdfdfd;
}
.upload-drop-zone:hover {
  border-color: #8a2be2; /* 调整 hover 边框颜色 */
  background-color: #f0e6fa; /* 柔和紫色背景 */
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.progress-bar-container {
  width: 100%;
  background-color: #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  height: 12px; /* 进度条高度 */
}
.progress-bar {
  height: 100%;
  background-color: #5cb85c; /* 调整进度条颜色 */
  transition: width 0.3s ease;
  border-radius: 8px;
}

.has-error {
  border-color: #d9534f !important; 
  background-color: #fff8f8;
}

/* --- 新增：分页容器和按钮的样式 --- */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2.5rem;
  gap: 1.2rem;
}

.pagination-container span {
  font-weight: 500;
  color: #555;
  font-size: 1.05em;
}

.btn-page {
  background-color: #e0e0e0;
  color: #495057;
  border: 1px solid #c0c0c0;
  padding: 0.7rem 1.1rem;
  border-radius: 8px;
}

.btn-page:hover:not(:disabled) {
  background-color: #d0d0d0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn-page:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f0f0f0;
}

/* 新增：留言管理相关样式 */
.loading-feedback, .no-feedbacks {
  text-align: center;
  color: #888;
  padding: 2.5rem;
  border: 1px dashed #e0e0e0;
  border-radius: 10px;
  margin-top: 1.5rem;
  background-color: #fdfdfd;
}

.status-pending {
  color: #f0ad4e; /* 警告色 */
  font-weight: bold;
}

.status-resolved {
  color: #5cb85c; /* 成功色 */
  font-weight: bold;
}

.pending-count-badge {
  display: inline-block;
  background-color: #d9534f; /* 红色 */
  color: white;
  border-radius: 50%;
  padding: 0.2em 0.6em;
  font-size: 0.75em;
  font-weight: bold;
  margin-left: 0.5rem;
  vertical-align: super;
  line-height: 1;
  min-width: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .admin-container {
    margin: 1.5rem auto;
    padding: 0 1rem;
    gap: 1.5rem;
  }
  .card {
    padding: 1.5rem;
  }
  .card h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  th, td {
    padding: 0.8rem 1rem;
    font-size: 0.9em;
  }
  .preview-img, .preview-img-placeholder {
    width: 50px;
    height: 50px;
  }
  button {
    padding: 0.6rem 0.8rem;
    margin: 0 0.2rem;
    font-size: 0.9em;
    background-size: 400% 400%; /* 确保移动端按钮也应用背景尺寸 */
    animation: gradient-animation 15s ease infinite; /* 确保移动端按钮也应用动画 */
  }
  button:hover {
    animation: gradient-animation 10s ease infinite; /* 确保移动端按钮 hover 动画 */
  }
  .upload-drop-zone {
    height: 150px;
    margin-bottom: 1.5rem;
  }
  .upload-prompt {
    font-size: 1em;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .pagination-container {
    margin-top: 1.5rem;
    gap: 0.8rem;
  }
  .pagination-container span {
    font-size: 0.9em;
  }
  .btn-page {
    padding: 0.5rem 0.9rem;
  }
  .loading-feedback, .no-feedbacks {
    padding: 1.5rem;
    margin-top: 1rem;
  }
}
</style>