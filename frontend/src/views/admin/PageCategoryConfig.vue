<template>
  <div class="admin-page-shell">
    <div class="page-category-container">
      <div class="page-header">
        <h1>独立页面分类</h1>
        <p class="page-description">配置从主画廊独立出来的子页面（如"杂款领口"），每条记录会在导航栏生成一个独立链接，主画廊会自动过滤掉对应标签的素材</p>
      </div>

      <div class="section-header">
        <span class="count-badge">共 {{ categories.length }} 个分类</span>
        <button @click="openAdd" class="add-button">
          <el-icon><Plus /></el-icon>
          <span>新增分类</span>
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" style="font-size: 28px;"><Loading /></el-icon>
      </div>

      <div v-else-if="categories.length === 0" class="empty-state">
        <p>暂无分类配置，点击右上角"新增分类"开始创建</p>
      </div>

      <div v-else class="categories-list">
        <div v-for="cat in categories" :key="cat.id" class="category-card">
          <div class="card-header">
            <div class="card-meta">
              <h3>{{ cat.name }}</h3>
              <span class="slug-badge">/category/{{ cat.slug }}</span>
              <span v-if="!cat.is_active" class="inactive-badge">已停用</span>
            </div>
            <div class="card-actions">
              <el-button type="success" size="small" @click="openEdit(cat)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(cat.id)">删除</el-button>
            </div>
          </div>

          <p v-if="cat.description" class="cat-description">{{ cat.description }}</p>

          <div class="tags-preview">
            <span class="tags-label">关联标签：</span>
            <el-tag
              v-for="tag in cat.tags"
              :key="tag"
              type="success"
              size="small"
              style="margin: 2px 4px 2px 0"
            >{{ tag }}</el-tag>
            <span v-if="!cat.tags?.length" class="no-tags">（未设置标签）</span>
          </div>

          <div class="card-footer">
            <span class="sort-info">排序: {{ cat.sort_order }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑分类' : '新增分类'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="90px" label-position="left">
        <el-form-item label="显示名称" required>
          <el-input v-model="form.name" placeholder="如：杂款领口" />
        </el-form-item>

        <el-form-item label="URL 标识" required>
          <el-input v-model="form.slug" placeholder="如：special-necklines（英文、连字符）">
            <template #prepend>/category/</template>
          </el-input>
        </el-form-item>

        <el-form-item label="副标题">
          <el-input v-model="form.description" placeholder="页面副标题（可选）" />
        </el-form-item>

        <el-form-item label="关联标签">
          <div class="tag-input-area">
            <div class="tag-list">
              <el-tag
                v-for="tag in form.tags"
                :key="tag"
                closable
                type="success"
                size="small"
                @close="removeTag(tag)"
                style="margin: 2px 4px 2px 0"
              >{{ tag }}</el-tag>
            </div>
            <div class="tag-input-row">
              <el-input
                v-model="newTag"
                placeholder="输入标签后按 Enter 添加"
                size="small"
                style="flex: 1"
                @keydown.enter.prevent="addTag"
              />
              <el-button size="small" @click="addTag">添加</el-button>
            </div>
            <p class="tag-hint">主画廊会自动排除这些标签的素材，该页面则专门展示它们</p>
          </div>
        </el-form-item>

        <el-form-item label="排列顺序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
        </el-form-item>

        <el-form-item label="是否启用">
          <el-switch v-model="form.is_active" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Loading } from '@element-plus/icons-vue';
import apiClient from '../../axiosConfig.js';

const categories = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref(null);
const newTag = ref('');

const defaultForm = () => ({
  name: '',
  slug: '',
  description: '',
  tags: [],
  is_active: true,
  sort_order: 0
});
const form = ref(defaultForm());

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchCategories = async () => {
  loading.value = true;
  try {
    const { data: res } = await apiClient.get('/api/v1/drawer-config/page-categories');
    categories.value = res?.data ?? [];
  } catch (err) {
    ElMessage.error('加载分类失败');
  } finally {
    loading.value = false;
  }
};

const openAdd = () => {
  editingId.value = null;
  form.value = defaultForm();
  newTag.value = '';
  dialogVisible.value = true;
};

const openEdit = (cat) => {
  editingId.value = cat.id;
  form.value = {
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? '',
    tags: Array.isArray(cat.tags) ? [...cat.tags] : [],
    is_active: Boolean(cat.is_active),
    sort_order: cat.sort_order ?? 0
  };
  newTag.value = '';
  dialogVisible.value = true;
};

const addTag = () => {
  const tag = newTag.value.trim();
  if (!tag) return;
  if (!form.value.tags.includes(tag)) form.value.tags.push(tag);
  newTag.value = '';
};

const removeTag = (tag) => {
  form.value.tags = form.value.tags.filter(t => t !== tag);
};

const handleSave = async () => {
  if (!form.value.name.trim()) return ElMessage.warning('请填写显示名称');
  if (!form.value.slug.trim()) return ElMessage.warning('请填写 URL 标识');
  saving.value = true;
  try {
    if (editingId.value) {
      await apiClient.put(
        `/api/v1/drawer-config/page-categories/${editingId.value}`,
        form.value,
        { headers: authHeaders() }
      );
      ElMessage.success('已保存');
    } else {
      await apiClient.post('/api/v1/drawer-config/page-categories', form.value, {
        headers: authHeaders()
      });
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    fetchCategories();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('删除后该页面将从导航栏移除，是否确认？', '删除分类', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await apiClient.delete(`/api/v1/drawer-config/page-categories/${id}`, {
      headers: authHeaders()
    });
    ElMessage.success('已删除');
    fetchCategories();
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败');
  }
};

onMounted(fetchCategories);
</script>

<style scoped>
.admin-page-shell {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.page-category-container {
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.count-badge {
  font-size: 0.85rem;
  color: #64748b;
}

.add-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
}

.add-button:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px;
  color: #5a8f73;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px 20px;
  transition: box-shadow 0.2s;
}

.category-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.card-meta h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a2332;
  margin: 0;
}

.slug-badge {
  font-size: 0.78rem;
  padding: 2px 8px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 99px;
  border: 1px solid #bbf7d0;
  font-family: monospace;
}

.inactive-badge {
  font-size: 0.78rem;
  padding: 2px 8px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 99px;
  border: 1px solid #fecaca;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.cat-description {
  font-size: 0.88rem;
  color: #475569;
  margin: 0 0 10px;
}

.tags-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 10px;
}

.tags-label {
  font-size: 0.82rem;
  color: #64748b;
  margin-right: 4px;
}

.no-tags {
  font-size: 0.82rem;
  color: #94a3b8;
}

.card-footer {
  font-size: 0.78rem;
  color: #94a3b8;
}

.tag-input-area {
  width: 100%;
}

.tag-list {
  min-height: 32px;
  margin-bottom: 8px;
}

.tag-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 6px 0 0;
}
</style>
