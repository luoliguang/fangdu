<script setup>
import { ref, reactive, onMounted } from 'vue'; // 引入 reactive
import apiClient from '../axiosConfig.js';
import { useToast } from 'vue-toastification'; // 1. 引入 useToast

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

// --- Functions ---
const fetchMaterials = async () => {
  try {
    const response = await apiClient.get('/materials');
    materials.value = response.data.data;
  } catch (error) { console.error('获取后台素材列表失败:', error); }
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

onMounted(fetchMaterials);
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
      <input 
        type="text" 
        v-model="newMaterial.name" 
        placeholder="素材名称"
        :class="{ 'has-error': errors.name }"
        @input="errors.name = false"
      >
      <input 
        type="text" 
        v-model="newMaterial.tags" 
        placeholder="标签,用逗号隔开"
        :class="{ 'has-error': errors.tags }"
        @input="errors.tags = false"
      >
    </div>

    <div v-if="isLoading" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
    </div>

    <button type="submit" :disabled="isLoading">
      {{ isLoading ? `上传中... ${uploadProgress}%` : '确认上传' }}
    </button>
  </form>
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
            <td><img :src="material.file_path" class="preview-img"></td>
            <td>
              <input v-if="editingMaterial && editingMaterial.id === material.id" v-model="editingMaterial.name">
              <span v-else>{{ material.name }}</span>
            </td>
            <td>
              <input v-if="editingMaterial && editingMaterial.id === material.id" v-model="editingMaterial.tags">
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
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 960px; margin: 2rem auto; display: flex; flex-direction: column; gap: 2rem; }
.card { background: #fff; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
/* ... (可以复用之前的表单样式) ... */
table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
th, td { text-align: left; padding: 0.8rem; border-bottom: 1px solid #eee; }
th { font-weight: bold; }
.preview-img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
button { cursor: pointer; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin: 0 0.2rem; }
.btn-edit { background-color: #ffc107; }
.btn-delete { background-color: #dc3545; color: white; }
.btn-save { background-color: #28a745; color: white; }
.btn-cancel { background-color: #6c757d; color: white; }
.message { margin-top: 1.5rem; text-align: center; }

.upload-drop-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.upload-drop-zone:hover {
  border-color: #3498db;
  background-color: #f9f9f9;
}
.upload-prompt { text-align: center; color: #888; }
.upload-prompt span { color: #3498db; font-weight: bold; }
.file-preview { font-weight: 500; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.form-grid input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.progress-bar-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.progress-bar {
  height: 10px;
  background-color: #42b983;
  transition: width 0.3s ease;
}

.has-error {
  border-color: #dc3545 !important; /* 使用 !important 确保覆盖默认样式 */
  background-color: #fff8f8;
}
</style>