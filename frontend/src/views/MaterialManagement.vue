<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '../axiosConfig.js';
import { useToast } from 'vue-toastification';
import FloatingLabelInput from '../components/FloatingLabelInput.vue';

const toast = useToast();

// --- State ---
const materials = ref([]);
const editingMaterial = ref(null); // 正在编辑的素材对象
const isLoading = ref(false);

// --- 分页状态 ---
const currentPage = ref(1);
const totalPages = ref(1);
const limit = ref(20); // 和后端保持一致

// --- 计算属性来判断按钮是否应该禁用 ---
const isPrevDisabled = computed(() => currentPage.value <= 1);
const isNextDisabled = computed(() => currentPage.value >= totalPages.value);

// --- 让 fetchMaterials 支持分页 ---
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

// --- 处理分页的函数 ---
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchMaterials();
  }
};

// --- 编辑素材 ---
const startEditing = (material) => {
  editingMaterial.value = { ...material };
};

const saveEdit = async () => {
  if (!editingMaterial.value) return;
  
  try {
    await apiClient.put(`/materials/${editingMaterial.value.id}`, {
      name: editingMaterial.value.name,
      tags: editingMaterial.value.tags
    });
    
    // 更新本地数据
    const index = materials.value.findIndex(m => m.id === editingMaterial.value.id);
    if (index !== -1) {
      materials.value[index].name = editingMaterial.value.name;
      materials.value[index].tags = editingMaterial.value.tags;
    }
    
    editingMaterial.value = null;
    toast.success('素材更新成功');
  } catch (error) {
    console.error('更新素材失败:', error);
    toast.error('更新素材失败');
  }
};

// --- 删除素材 ---
const deleteMaterial = async (id) => {
  if (!confirm('确定要删除这个素材吗？')) return;
  
  try {
    await apiClient.delete(`/materials/${id}`);
    materials.value = materials.value.filter(m => m.id !== id);
    toast.success('素材删除成功');
    
    // 如果当前页没有数据了，且不是第一页，则返回上一页
    if (materials.value.length === 0 && currentPage.value > 1) {
      goToPage(currentPage.value - 1);
    } else {
      // 否则刷新当前页
      fetchMaterials();
    }
  } catch (error) {
    console.error('删除素材失败:', error);
    toast.error('删除素材失败');
  }
};

onMounted(() => {
  fetchMaterials();
});
</script>

<template>
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

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background-color: #f8f9fa;
}

.preview-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-img-placeholder {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e9ecef;
  border-radius: 8px;
  font-size: 1.5rem;
  color: #6c757d;
}

.btn-edit, .btn-delete, .btn-save, .btn-cancel {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-right: 0.5rem;
}

.btn-edit {
  background-color: #42b883;
  color: white;
}

.btn-edit:hover {
  background-color: #3aa876;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
}

.btn-save {
  background-color: #007bff;
  color: white;
}

.btn-save:hover {
  background-color: #0069d9;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background-color: #5a6268;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-page {
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-page:hover:not(:disabled) {
  background-color: #e9ecef;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  th, td {
    padding: 0.75rem 0.5rem;
  }
  
  .preview-img, .preview-img-placeholder {
    width: 60px;
    height: 60px;
  }
  
  .btn-edit, .btn-delete, .btn-save, .btn-cancel {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>