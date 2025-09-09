<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'vue-toastification';
import FloatingLabelInput from '../components/FloatingLabelInput.vue';
import { DataTable, Pagination, ConfirmDialog } from '../components/common';
import { useMaterialStore } from '@/stores/material';

const toast = useToast();
const materialStore = useMaterialStore();
const editingMaterial = ref(null); // 正在编辑的素材对象

// 从store中获取状态 - 使用storeToRefs保持响应性
const { materials, isLoading, currentPage, totalPages, totalCount, pageSize, isPrevDisabled, isNextDisabled } = storeToRefs(materialStore);

// --- 分页跳转 ---
const goToPage = (page) => {
  materialStore.goToPage(page);
};

// --- 编辑素材 ---
const startEditing = (material) => {
  editingMaterial.value = { ...material };
};

const saveEdit = async () => {
  if (!editingMaterial.value) return;
  
  try {
    await materialStore.updateMaterial(editingMaterial.value.id, {
      name: editingMaterial.value.name,
      tags: editingMaterial.value.tags
    });
    
    editingMaterial.value = null;
  } catch (error) {
    console.error('更新素材失败:', error);
  }
};

// --- 文件上传处理 ---
const handleFileChange = async (event, item) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', item.name);
  formData.append('tags', item.tags);
  
  try {
    toast.info('正在上传文件...');
    const result = await materialStore.uploadMaterial(formData);
    if (result.success) {
      // 刷新当前页面数据
      await materialStore.fetchMaterials(materialStore.currentPage);
      editingMaterial.value = null;
    }
  } catch (error) {
    console.error('文件上传失败:', error);
  }
};

// --- 确认对话框 ---
const confirmDialog = ref(null);
const deleteItemId = ref(null);

// --- 删除素材 ---
const showDeleteConfirm = (id) => {
  deleteItemId.value = id;
  confirmDialog.value.show();
};

const deleteMaterial = async () => {
  if (!deleteItemId.value) return;
  
  try {
    await materialStore.deleteMaterial(deleteItemId.value);
  } catch (error) {
    console.error('删除素材失败:', error);
    throw error; // 重新抛出错误，让确认对话框知道操作失败
  } finally {
    deleteItemId.value = null;
  }
};

// --- 表格列配置 ---
const columns = [
  {
    key: 'preview',
    title: '预览',
    width: '100px',
    align: 'center'
  },
  {
    key: 'name',
    title: '名称',
    sortable: true
  },
  {
    key: 'tags',
    title: '标签'
  }
];

// --- 分页配置 ---
const paginationConfig = computed(() => ({
  currentPage: currentPage.value || 1,
  totalPages: totalPages.value || 1,
  totalItems: totalCount.value || 0,
  pageSize: pageSize.value || 10,
  showPageNumbers: true,
  showTotal: true
}));

// 定时器引用
let refreshTimer = null;

onMounted(() => {
  materialStore.fetchMaterials();
  
  // 每60秒刷新一次数据
  refreshTimer = setInterval(() => {
    materialStore.fetchMaterials(materialStore.currentPage);
  }, 60000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="card">
    <h2>素材管理</h2>
    
    <DataTable 
      :data="materials"
      :columns="columns"
      :loading="isLoading"
      :pagination="paginationConfig"
      @page-change="goToPage"
    >
      <!-- 预览列 -->
      <template #column-preview="{ item }">
        <div class="preview-container">
          <img 
            v-if="item.media_type === 'image'" 
            :src="item.file_path" 
            :alt="item.name" 
            class="preview-img">
          <img 
            v-else-if="item.media_type === 'video' && item.cover_image_path"
            :src="item.cover_image_path"
            :alt="item.name + ' 封面'"
            class="preview-img">
          <div 
            v-else-if="item.media_type === 'video' && !item.cover_image_path"
            class="preview-img-placeholder">
            ▶
          </div>
          
          <!-- 编辑模式下的图片上传 -->
          <div v-if="editingMaterial && editingMaterial.id === item.id" class="image-upload-overlay">
            <input 
              type="file" 
              accept="image/*,video/*"
              @change="handleFileChange($event, item)"
              class="file-input"
              :id="`file-${item.id}`">
            <label :for="`file-${item.id}`" class="upload-btn">
              📷
            </label>
          </div>
        </div>
      </template>
      
      <!-- 名称列 -->
      <template #column-name="{ item }">
        <FloatingLabelInput 
          v-if="editingMaterial && editingMaterial.id === item.id" 
          v-model="editingMaterial.name"
          label="名称" 
        />
        <span v-else>{{ item.name }}</span>
      </template>
      
      <!-- 标签列 -->
      <template #column-tags="{ item }">
        <FloatingLabelInput 
          v-if="editingMaterial && editingMaterial.id === item.id" 
          v-model="editingMaterial.tags"
          label="标签" 
        />
        <span v-else>{{ item.tags }}</span>
      </template>
      
      <!-- 操作列 -->
      <template #actions="{ item }">
        <div v-if="editingMaterial && editingMaterial.id === item.id" class="action-buttons">
          <button @click="saveEdit" class="btn-save">保存</button>
          <button @click="editingMaterial = null" class="btn-cancel">取消</button>
        </div>
        <div v-else class="action-buttons">
          <button @click="startEditing(item)" class="btn-edit">编辑</button>
          <button @click="showDeleteConfirm(item.id)" class="btn-delete">删除</button>
        </div>
      </template>
    </DataTable>
    
    <!-- 确认删除对话框 -->
    <ConfirmDialog 
      ref="confirmDialog"
      title="确认删除"
      message="确定要删除这个素材吗？此操作不可撤销。"
      type="danger"
      @confirm="deleteMaterial"
    />
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

.preview-container {
  position: relative;
  display: inline-block;
}

.preview-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.preview-img-placeholder {
  width: 60px;
  height: 60px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #666;
}

.image-upload-overlay {
  position: absolute;
  top: 0;
  right: -8px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-input {
  display: none;
}

.upload-btn {
  cursor: pointer;
  font-size: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.upload-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.btn-edit, .btn-delete, .btn-save, .btn-cancel {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-edit {
  background-color: #007bff;
  color: white;
}

.btn-edit:hover {
  background-color: #0056b3;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
}

.btn-save {
  background-color: #28a745;
  color: white;
}

.btn-save:hover {
  background-color: #218838;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background-color: #5a6268;
}

/* 表格样式优化 */
:deep(.data-table) {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

:deep(.data-table th) {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
}

:deep(.data-table td) {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
}

:deep(.data-table tr:hover) {
  background-color: #f8f9fa;
}

:deep(.actions-column) {
  width: 120px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card {
    padding: 15px;
    margin: 10px;
  }
  
  .preview-img, .preview-img-placeholder {
    width: 40px;
    height: 40px;
  }
  
  .btn-edit, .btn-delete, .btn-save, .btn-cancel {
    padding: 4px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 10px;
    margin: 5px;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 15px;
  }
  
  .preview-img, .preview-img-placeholder {
    width: 30px;
    height: 30px;
  }
  
  .btn-edit, .btn-delete, .btn-save, .btn-cancel {
    padding: 3px 6px;
    font-size: 11px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}
</style>