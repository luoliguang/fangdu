<template>
  <div class="drawer-config-container">
    <div class="page-header">
      <h1>抽屉配置管理</h1>
      <p class="page-description">管理左侧抽屉的公告、教程、快速筛选器等内容</p>
    </div>

    <!-- 标签页导航 -->
    <div class="config-tabs">
      <button 
        v-for="tab in configTabs" 
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="{ active: activeTab === tab.key }"
        class="tab-button"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 公告管理 -->
    <div v-if="activeTab === 'announcements'" class="config-section">
      <div class="section-header">
        <h2>公告管理</h2>
        <button @click="showAnnouncementForm = true" class="add-button">
          <span>➕</span> 添加公告
        </button>
      </div>
      
      <div class="announcements-list">
        <div v-if="announcements.length === 0" class="empty-list">
          <p>📢 暂无公告，点击右上角"添加公告"开始创建</p>
        </div>
        <div v-for="announcement in announcements" :key="announcement.id" class="announcement-card">
          <div class="card-header">
            <h3>{{ announcement.title }}</h3>
            <div class="card-actions" style="display: flex !important; gap: 8px;">
              <button 
                @click="editAnnouncement(announcement)" 
                class="edit-btn" 
                title="编辑此公告"
                style="background: #4CAF50 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                ✏️ 编辑
              </button>
              <button 
                @click="deleteAnnouncement(announcement.id)" 
                class="delete-btn" 
                title="删除此公告"
                style="background: #f44336 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
          <div class="announcement-content markdown-content">
            <MdPreview 
              :modelValue="announcement.content" 
              language="zh-CN" 
              :showCodeRowNumber="false"
              previewTheme="default"
            />
          </div>
          <div class="announcement-meta">
            <span class="type-badge" :class="announcement.type">{{ getTypeLabel(announcement.type) }}</span>
            <span class="date">{{ formatDate(announcement.created_at) }}</span>
            <span class="status" :class="{ active: announcement.is_active }">
              {{ announcement.is_active ? '已发布' : '草稿' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 教程管理 -->
    <div v-if="activeTab === 'tutorials'" class="config-section">
      <div class="section-header">
        <h2>教程管理</h2>
        <button @click="showTutorialForm = true" class="add-button">
          <span>➕</span> 添加教程
        </button>
      </div>
      
      <div class="tutorials-list">
        <div v-if="tutorials.length === 0" class="empty-list">
          <p>📚 暂无教程，点击右上角"添加教程"开始创建</p>
        </div>
        <div v-for="tutorial in tutorials" :key="tutorial.id" class="tutorial-card">
          <div class="card-header">
            <div class="tutorial-title-row">
              <span class="tutorial-icon">{{ tutorial.icon }}</span>
              <h3>{{ tutorial.title }}</h3>
            </div>
            <div class="card-actions" style="display: flex !important; gap: 8px;">
              <button 
                @click="editTutorial(tutorial)" 
                class="edit-btn" 
                title="编辑此教程"
                style="background: #4CAF50 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                ✏️ 编辑
              </button>
              <button 
                @click="deleteTutorial(tutorial.id)" 
                class="delete-btn" 
                title="删除此教程"
                style="background: #f44336 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
          <div class="tutorial-content markdown-content">
            <MdPreview 
              :modelValue="tutorial.content" 
              language="zh-CN" 
              :showCodeRowNumber="false"
              previewTheme="default"
            />
          </div>
          <div class="tutorial-meta">
            <span class="order">排序: {{ tutorial.sort_order }}</span>
            <span class="status" :class="{ active: tutorial.is_active }">
              {{ tutorial.is_active ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速筛选器管理 -->
    <div v-if="activeTab === 'filters'" class="config-section">
      <div class="section-header">
        <h2>快速筛选器管理</h2>
        <button @click="showFilterForm = true" class="add-button">
          <span>➕</span> 添加筛选器
        </button>
      </div>
      
      <div class="filters-list">
        <div v-if="quickFilters.length === 0" class="empty-list">
          <p>🔍 暂无筛选器，点击右上角"添加筛选器"开始创建</p>
        </div>
        <div v-for="filter in quickFilters" :key="filter.id" class="filter-card">
          <div class="card-header">
            <div class="filter-title-row">
              <span class="filter-icon">{{ filter.icon }}</span>
              <h3>{{ filter.name }}</h3>
            </div>
            <div class="card-actions" style="display: flex !important; gap: 8px;">
              <button 
                @click="editFilter(filter)" 
                class="edit-btn" 
                title="编辑此筛选器"
                style="background: #4CAF50 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                ✏️ 编辑
              </button>
              <button 
                @click="deleteFilter(filter.id)" 
                class="delete-btn" 
                title="删除此筛选器"
                style="background: #f44336 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
          <div class="filter-details">
            <p><strong>筛选值:</strong> {{ filter.value }}</p>
            <p><strong>筛选类型:</strong> {{ filter.filter_type }}</p>
          </div>
          <div class="filter-meta">
            <span class="order">排序: {{ filter.sort_order }}</span>
            <span class="status" :class="{ active: filter.is_active }">
              {{ filter.is_active ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系信息管理 -->
    <div v-if="activeTab === 'contacts'" class="config-section">
      <div class="section-header">
        <h2>联系信息管理</h2>
        <button @click="showContactForm = true" class="add-button">
          <span>➕</span> 添加联系方式
        </button>
      </div>
      
      <div class="contacts-list">
        <div v-if="contactInfos.length === 0" class="empty-list">
          <p>📞 暂无联系方式，点击右上角"添加联系方式"开始创建</p>
        </div>
        <div v-for="contact in contactInfos" :key="contact.id" class="contact-card">
          <div class="card-header">
            <div class="contact-title-row">
              <span class="contact-icon">{{ contact.icon }}</span>
              <h3>{{ contact.label }}</h3>
            </div>
            <div class="card-actions" style="display: flex !important; gap: 8px;">
              <button 
                @click="editContact(contact)" 
                class="edit-btn" 
                title="编辑此联系方式"
                style="background: #4CAF50 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                ✏️ 编辑
              </button>
              <button 
                @click="deleteContact(contact.id)" 
                class="delete-btn" 
                title="删除此联系方式"
                style="background: #f44336 !important; color: white !important; padding: 8px 16px !important; border: none !important; border-radius: 6px; cursor: pointer; font-size: 13px;"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
          <p class="contact-value">{{ contact.value }}</p>
          <div class="contact-meta">
            <span class="type-badge">{{ contact.type }}</span>
            <span class="order">排序: {{ contact.sort_order }}</span>
            <span class="status" :class="{ active: contact.is_active }">
              {{ contact.is_active ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 公告表单弹窗 -->
    <div v-if="showAnnouncementForm" class="modal-overlay" @click="closeAnnouncementForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingAnnouncement ? '编辑公告' : '添加公告' }}</h3>
          <button @click="closeAnnouncementForm" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveAnnouncement" class="form-content">
          <div class="form-group">
            <label>标题</label>
            <input v-model="announcementForm.title" type="text" required>
          </div>
          <div class="form-group markdown-editor-wrapper">
            <label>内容（支持Markdown格式）</label>
            <MdEditor 
              v-model="announcementForm.content" 
              language="zh-CN"
              :preview="true"
              previewTheme="default"
              :toolbars="[
                'bold', 'italic', 'strikeThrough', '-',
                'title', 'unorderedList', 'orderedList', '-',
                'codeRow', 'code', 'quote', '-',
                'link', 'image', 'table', '-',
                'revoke', 'next', '=',
                'preview', 'fullscreen'
              ]"
              style="height: 450px;"
              placeholder="请输入公告内容，支持Markdown格式..."
            />
          </div>
          <div class="form-group">
            <label>类型</label>
            <select v-model="announcementForm.type" required>
              <option value="info">信息</option>
              <option value="feature">功能</option>
              <option value="update">更新</option>
              <option value="warning">警告</option>
            </select>
          </div>
          <div class="form-group">
            <label>
              <input v-model="announcementForm.is_active" type="checkbox">
              立即发布
            </label>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeAnnouncementForm" class="cancel-btn">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 教程表单弹窗 -->
    <div v-if="showTutorialForm" class="modal-overlay" @click="closeTutorialForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingTutorial ? '编辑教程' : '添加教程' }}</h3>
          <button @click="closeTutorialForm" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveTutorial" class="form-content">
          <div class="form-group">
            <label>标题</label>
            <input v-model="tutorialForm.title" type="text" required>
          </div>
          <div class="form-group markdown-editor-wrapper">
            <label>内容（支持Markdown格式）</label>
            <MdEditor 
              v-model="tutorialForm.content" 
              language="zh-CN"
              :preview="true"
              previewTheme="default"
              :toolbars="[
                'bold', 'italic', 'strikeThrough', '-',
                'title', 'unorderedList', 'orderedList', '-',
                'codeRow', 'code', 'quote', '-',
                'link', 'image', 'table', '-',
                'revoke', 'next', '=',
                'preview', 'fullscreen'
              ]"
              style="height: 450px;"
              placeholder="请输入教程内容，支持Markdown格式..."
            />
          </div>
          <div class="form-group">
            <label>图标</label>
            <input v-model="tutorialForm.icon" type="text" required>
          </div>
          <div class="form-group">
            <label>排序</label>
            <input v-model.number="tutorialForm.sort_order" type="number" required>
          </div>
          <div class="form-group">
            <label>
              <input v-model="tutorialForm.is_active" type="checkbox">
              启用
            </label>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeTutorialForm" class="cancel-btn">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 筛选器表单弹窗 -->
    <div v-if="showFilterForm" class="modal-overlay" @click="closeFilterForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingFilter ? '编辑筛选器' : '添加筛选器' }}</h3>
          <button @click="closeFilterForm" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveFilter" class="form-content">
          <div class="form-group">
            <label>名称</label>
            <input v-model="filterForm.name" type="text" required>
          </div>
          <div class="form-group">
            <label>筛选值</label>
            <input v-model="filterForm.value" type="text" required>
          </div>
          <div class="form-group">
            <label>图标</label>
            <input v-model="filterForm.icon" type="text" required>
          </div>
          <div class="form-group">
            <label>筛选类型</label>
            <select v-model="filterForm.filter_type" required>
              <option value="status">状态</option>
              <option value="category">分类</option>
              <option value="date">日期</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div class="form-group">
            <label>排序</label>
            <input v-model.number="filterForm.sort_order" type="number" required>
          </div>
          <div class="form-group">
            <label>
              <input v-model="filterForm.is_active" type="checkbox">
              启用
            </label>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeFilterForm" class="cancel-btn">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 联系方式表单弹窗 -->
    <div v-if="showContactForm" class="modal-overlay" @click="closeContactForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingContact ? '编辑联系方式' : '添加联系方式' }}</h3>
          <button @click="closeContactForm" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveContact" class="form-content">
          <div class="form-group">
            <label>标签</label>
            <input v-model="contactForm.label" type="text" required>
          </div>
          <div class="form-group">
            <label>值</label>
            <input v-model="contactForm.value" type="text" required>
          </div>
          <div class="form-group">
            <label>图标</label>
            <input v-model="contactForm.icon" type="text" required>
          </div>
          <div class="form-group">
            <label>类型</label>
            <select v-model="contactForm.type" required>
              <option value="phone">电话</option>
              <option value="email">邮箱</option>
              <option value="wechat">微信</option>
              <option value="address">地址</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>排序</label>
            <input v-model.number="contactForm.sort_order" type="number" required>
          </div>
          <div class="form-group">
            <label>
              <input v-model="contactForm.is_active" type="checkbox">
              启用
            </label>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeContactForm" class="cancel-btn">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../../axiosConfig.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import 'element-plus/dist/index.css';
import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

// 响应式数据
const activeTab = ref('announcements');
const loading = ref(false);

// 配置数据
const announcements = ref([]);
const tutorials = ref([]);
const quickFilters = ref([]);
const contactInfos = ref([]);

// 表单显示状态
const showAnnouncementForm = ref(false);
const showTutorialForm = ref(false);
const showFilterForm = ref(false);
const showContactForm = ref(false);

// 编辑状态
const editingAnnouncement = ref(null);
const editingTutorial = ref(null);
const editingFilter = ref(null);
const editingContact = ref(null);

// 表单数据
const announcementForm = ref({
  title: '',
  content: '',
  type: 'info',
  is_active: true
});

const tutorialForm = ref({
  title: '',
  content: '',
  icon: '📝',
  sort_order: 0,
  is_active: true
});

const filterForm = ref({
  name: '',
  value: '',
  icon: '🔍',
  filter_type: 'status',
  sort_order: 0,
  is_active: true
});

const contactForm = ref({
  label: '',
  value: '',
  icon: '📞',
  type: 'phone',
  sort_order: 0,
  is_active: true
});

// 标签页配置
const configTabs = [
  { key: 'announcements', label: '公告', icon: '📢' },
  { key: 'tutorials', label: '教程', icon: '📚' },
  { key: 'filters', label: '筛选器', icon: '🔍' },
  { key: 'contacts', label: '联系信息', icon: '📞' }
];

// 获取配置数据
const fetchConfig = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    // 使用实际API调用获取数据
    try {
      const [announcementsRes, tutorialsRes, filtersRes, contactsRes] = await Promise.all([
        apiClient.get('/api/v1/drawer-config/announcements', { headers }),
        apiClient.get('/api/v1/drawer-config/tutorials', { headers }),
        apiClient.get('/api/v1/drawer-config/filters', { headers }),
        apiClient.get('/api/v1/drawer-config/contacts', { headers })
      ]);
      
      // 确保数据结构正确，添加必要的字段
      announcements.value = Array.isArray(announcementsRes.data.data) 
        ? announcementsRes.data.data.map(item => ({
            id: item.id || null,
            title: item.title || '',
            content: item.content || '',
            type: item.type || 'info',
            is_active: item.is_active !== undefined ? item.is_active : true,
            created_at: item.created_at || new Date().toISOString()
          }))
        : [];
      
      tutorials.value = Array.isArray(tutorialsRes.data.data) ? tutorialsRes.data.data : [];
      quickFilters.value = Array.isArray(filtersRes.data.data) ? filtersRes.data.data : [];
      contactInfos.value = Array.isArray(contactsRes.data.data) ? contactsRes.data.data : [];
      
      // 调试信息
      console.log('✅ 配置数据加载成功:', {
        公告数量: announcements.value.length,
        教程数量: tutorials.value.length,
        筛选器数量: quickFilters.value.length,
        联系方式数量: contactInfos.value.length
      });
    } catch (apiError) {
      console.error('API调用失败:', apiError);
      ElMessage.warning('API调用失败，使用默认数据');
      
      // API调用失败时使用默认数据
      announcements.value = [
        { id: 1, title: '系统维护通知', content: '系统将于本周六进行维护升级', type: 'warning', is_active: true, created_at: '2023-10-01' },
        { id: 2, title: '新功能上线', content: '素材批量导入功能已上线', type: 'info', is_active: true, created_at: '2023-09-25' }
      ];
      tutorials.value = [
        { id: 1, title: '如何上传素材', content: '点击上传按钮，选择文件...', icon: '📝', sort_order: 1, is_active: true },
        { id: 2, title: '如何管理标签', content: '在标签管理页面，您可以...', icon: '📚', sort_order: 2, is_active: true }
      ];
      quickFilters.value = [
        { id: 1, name: '未处理', value: 'pending', icon: '🔍', filter_type: 'status', sort_order: 1, is_active: true },
        { id: 2, name: '已完成', value: 'completed', icon: '✅', filter_type: 'status', sort_order: 2, is_active: true }
      ];
      contactInfos.value = [
        { id: 1, label: '客服电话', value: '400-123-4567', icon: '📞', type: 'phone', sort_order: 1, is_active: true },
        { id: 2, label: '邮箱', value: 'support@example.com', icon: '📧', type: 'email', sort_order: 2, is_active: true }
      ];
    }
  } catch (error) {
    console.error('获取配置失败:', error);
    ElMessage.error('获取配置数据失败');
  } finally {
    loading.value = false;
  }
};

// 公告相关方法
const editAnnouncement = (announcement) => {
  editingAnnouncement.value = announcement;
  announcementForm.value = { ...announcement };
  showAnnouncementForm.value = true;
};

const closeAnnouncementForm = () => {
  showAnnouncementForm.value = false;
  editingAnnouncement.value = null;
  announcementForm.value = {
    title: '',
    content: '',
    type: 'info',
    is_active: true
  };
};

const saveAnnouncement = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    if (editingAnnouncement.value && editingAnnouncement.value.id) {
      // 更新公告
      await apiClient.put(`/api/v1/drawer-config/announcements/${editingAnnouncement.value.id}`, 
        announcementForm.value, { headers });
    } else {
      // 创建公告
      await apiClient.post('/api/v1/drawer-config/announcements', 
        announcementForm.value, { headers });
    }
    
    closeAnnouncementForm();
    await fetchConfig(); // 重新获取最新数据
    ElMessage.success('保存成功！');
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败，请重试');
  }
};

const deleteAnnouncement = async (id) => {
  // 检查ID是否有效
  if (!id) {
    ElMessage.error('无效的公告ID，无法删除');
    return;
  }
  
  ElMessageBox.confirm('确定要删除这条公告吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
        const token = localStorage.getItem('authToken');
        await apiClient.delete(`/api/v1/drawer-config/announcements/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchConfig(); // 修正函数名称
        ElMessage.success('公告删除成功');
      } catch (error) {
        console.error('删除公告失败:', error);
        ElMessage.error(`删除公告失败: ${error.message}`);
      }
  }).catch(() => {});
};

// 教程相关方法
const editTutorial = (tutorial) => {
  editingTutorial.value = tutorial;
  tutorialForm.value = { ...tutorial };
  showTutorialForm.value = true;
};

const closeTutorialForm = () => {
  showTutorialForm.value = false;
  editingTutorial.value = null;
  tutorialForm.value = {
    title: '',
    content: '',
    icon: '📝',
    sort_order: 0,
    is_active: true
  };
};

const saveTutorial = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    if (editingTutorial.value) {
      // 更新教程
      await apiClient.put(`/api/v1/drawer-config/tutorials/${editingTutorial.value.id}`, 
        tutorialForm.value, { headers });
    } else {
      // 创建教程
      await apiClient.post('/api/v1/drawer-config/tutorials', 
        tutorialForm.value, { headers });
    }
    
    closeTutorialForm();
    fetchConfig(); // 重新获取最新数据
    ElMessage.success('保存成功！');
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败，请重试');
  }
};

const deleteTutorial = async (id) => {
  ElMessageBox.confirm('确定要删除这个教程吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.delete(`/api/v1/drawer-config/tutorials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConfig();
      
      ElMessage.success('删除成功！');
    } catch (error) {
      console.error('删除失败:', error);
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};

// 筛选器相关方法
const editFilter = (filter) => {
  editingFilter.value = filter;
  filterForm.value = { ...filter };
  showFilterForm.value = true;
};

const closeFilterForm = () => {
  showFilterForm.value = false;
  editingFilter.value = null;
  filterForm.value = {
    name: '',
    value: '',
    icon: '🔍',
    filter_type: 'status',
    sort_order: 0,
    is_active: true
  };
};

const saveFilter = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    if (editingFilter.value) {
      // 更新筛选器
      await apiClient.put(`/api/v1/drawer-config/filters/${editingFilter.value.id}`, 
        filterForm.value, { headers });
    } else {
      // 创建筛选器
      await apiClient.post('/api/v1/drawer-config/filters', 
        filterForm.value, { headers });
    }
    
    closeFilterForm();
    fetchConfig(); // 重新获取最新数据
    ElMessage.success('保存成功！');
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败，请重试');
  }
};

const deleteFilter = async (id) => {
  ElMessageBox.confirm('确定要删除这个筛选器吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.delete(`/api/v1/drawer-config/filters/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConfig();
      
      ElMessage.success('删除成功！');
    } catch (error) {
      console.error('删除失败:', error);
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};

// 联系信息相关方法
const editContact = (contact) => {
  editingContact.value = contact;
  contactForm.value = { ...contact };
  showContactForm.value = true;
};

const closeContactForm = () => {
  showContactForm.value = false;
  editingContact.value = null;
  contactForm.value = {
    label: '',
    value: '',
    icon: '📞',
    type: 'phone',
    sort_order: 0,
    is_active: true
  };
};

const saveContact = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    
    if (editingContact.value) {
      // 更新联系方式
      await apiClient.put(`/api/v1/drawer-config/contacts/${editingContact.value.id}`, 
        contactForm.value, { headers });
    } else {
      // 创建联系方式
      await apiClient.post('/api/v1/drawer-config/contacts', 
        contactForm.value, { headers });
    }
    
    closeContactForm();
    fetchConfig(); // 重新获取最新数据
    ElMessage.success('保存成功！');
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败，请重试');
  }
};

const deleteContact = async (id) => {
  ElMessageBox.confirm('确定要删除这条联系信息吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.delete(`/api/v1/drawer-config/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConfig();
      
      ElMessage.success('删除成功！');
    } catch (error) {
      console.error('删除失败:', error);
      ElMessage.error('删除失败，请重试');
    }
  }).catch(() => {});
};





// 工具方法
const getTypeLabel = (type) => {
  const labels = {
    info: '信息',
    feature: '功能',
    update: '更新',
    warning: '警告'
  };
  return labels[type] || type;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchConfig();
});
</script>

<style scoped>
.drawer-config-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 28px;
}

.page-description {
  margin: 0;
  color: #666;
  font-size: 16px;
}

/* 标签页样式 */
.config-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f0f0;
}

.tab-button {
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
  font-size: 14px;
}

.tab-button:hover {
  background: #f5f5f5;
}

.tab-button.active {
  background: #667eea;
  color: white;
  border-bottom: 2px solid #667eea;
}

.tab-icon {
  font-size: 16px;
}

/* 配置区域样式 */
.config-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.add-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: transform 0.2s;
}

.add-button:hover {
  transform: translateY(-1px);
}

/* 卡片样式 */
.announcement-card,
.tutorial-card,
.filter-card,
.contact-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.2s;
  position: relative;
  overflow: visible;
}

.announcement-card:hover,
.tutorial-card:hover,
.filter-card:hover,
.contact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 12px;
  gap: 16px;
  position: relative;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 200px);
}

.tutorial-title-row,
.filter-title-row,
.contact-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(100% - 200px);
}

.tutorial-title-row h3,
.filter-title-row h3,
.contact-title-row h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tutorial-icon,
.filter-icon,
.contact-icon {
  font-size: 18px;
}

.card-actions {
  display: flex !important;
  gap: 8px;
  flex-shrink: 0 !important;
  align-items: center;
  opacity: 1 !important;
  visibility: visible !important;
  position: relative !important;
  margin-left: auto;
}

.edit-btn,
.delete-btn {
  padding: 8px 16px !important;
  border: none !important;
  border-radius: 6px;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 60px;
  display: inline-block !important;
  opacity: 1 !important;
  visibility: visible !important;
  position: static !important;
  float: none !important;
}

.edit-btn {
  background: #4CAF50 !important;
  color: white !important;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.edit-btn:hover {
  background: #45a049 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
}

.delete-btn {
  background: #f44336 !important;
  color: white !important;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
}

.delete-btn:hover {
  background: #da190b !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
}

/* 内容样式 */
.announcement-content,
.tutorial-content,
.contact-value {
  margin: 0 0 12px 0;
  color: #666;
  line-height: 1.5;
}

/* Markdown内容样式优化 */
.markdown-content {
  background: #fafafa;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
}

/* 隐藏默认容器样式 */
.markdown-content :deep(.md-editor) {
  background: transparent !important;
  box-shadow: none !important;
}

.markdown-content :deep(.md-editor-preview) {
  background: transparent !important;
  padding: 0 !important;
}

.markdown-content :deep(.md-editor-preview-wrapper) {
  padding: 0 !important;
  background: transparent !important;
}

/* 段落 */
.markdown-content :deep(p) {
  margin: 6px 0 !important;
  line-height: 1.6 !important;
  color: #666 !important;
  font-size: 14px !important;
}

/* 标题 */
.markdown-content :deep(h1) {
  font-size: 20px !important;
  margin: 16px 0 10px 0 !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 2px solid #667eea !important;
  padding-bottom: 6px !important;
}

.markdown-content :deep(h2) {
  font-size: 18px !important;
  margin: 14px 0 8px 0 !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid #e0e0e0 !important;
  padding-bottom: 4px !important;
}

.markdown-content :deep(h3) {
  font-size: 16px !important;
  margin: 12px 0 6px 0 !important;
  color: #333 !important;
  font-weight: 600 !important;
}

.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-size: 15px !important;
  margin: 10px 0 5px 0 !important;
  color: #333 !important;
  font-weight: 600 !important;
}

/* 列表 */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 24px !important;
  margin: 8px 0 !important;
}

.markdown-content :deep(li) {
  margin: 4px 0 !important;
  line-height: 1.6 !important;
  color: #666 !important;
  font-size: 14px !important;
}

.markdown-content :deep(ul > li) {
  list-style-type: disc !important;
}

.markdown-content :deep(ol > li) {
  list-style-type: decimal !important;
}

/* 行内代码 */
.markdown-content :deep(code) {
  background: rgba(102, 126, 234, 0.15) !important;
  color: #667eea !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
  font-size: 13px !important;
  font-family: 'Courier New', Courier, monospace !important;
}

/* 代码块 */
.markdown-content :deep(pre) {
  background: #2d2d2d !important;
  color: #f8f8f2 !important;
  padding: 12px !important;
  border-radius: 6px !important;
  overflow-x: auto !important;
  margin: 10px 0 !important;
  font-size: 13px !important;
}

.markdown-content :deep(pre code) {
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  font-size: inherit !important;
}

/* 引用 */
.markdown-content :deep(blockquote) {
  border-left: 4px solid #667eea !important;
  padding: 10px 12px !important;
  margin: 10px 0 !important;
  color: #666 !important;
  font-style: italic !important;
  background: rgba(102, 126, 234, 0.08) !important;
  border-radius: 4px !important;
}

.markdown-content :deep(blockquote p) {
  margin: 4px 0 !important;
}

/* 图片 */
.markdown-content :deep(img) {
  max-width: 100% !important;
  border-radius: 6px !important;
  margin: 10px 0 !important;
  display: block !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 链接 */
.markdown-content :deep(a) {
  color: #667eea !important;
  text-decoration: none !important;
  border-bottom: 1px solid rgba(102, 126, 234, 0.4) !important;
  transition: all 0.2s ease !important;
}

.markdown-content :deep(a:hover) {
  color: #5568d3 !important;
  border-bottom-color: #5568d3 !important;
}

/* 表格 */
.markdown-content :deep(table) {
  border-collapse: collapse !important;
  width: 100% !important;
  margin: 12px 0 !important;
  background: white !important;
  font-size: 13px !important;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  border: 1px solid #e0e0e0 !important;
  padding: 8px 12px !important;
  text-align: left !important;
}

.markdown-content :deep(table th) {
  background: #667eea !important;
  color: white !important;
  font-weight: 600 !important;
}

.markdown-content :deep(table td) {
  color: #666 !important;
}

.markdown-content :deep(table tr:nth-child(even)) {
  background: #f9f9f9 !important;
}

/* 水平线 */
.markdown-content :deep(hr) {
  border: none !important;
  border-top: 2px solid #e0e0e0 !important;
  margin: 16px 0 !important;
}

/* 粗体 */
.markdown-content :deep(strong) {
  font-weight: 600 !important;
  color: #333 !important;
}

/* 斜体 */
.markdown-content :deep(em) {
  font-style: italic !important;
  color: #666 !important;
}

/* 删除线 */
.markdown-content :deep(del) {
  text-decoration: line-through !important;
  opacity: 0.6 !important;
  color: #999 !important;
}

.filter-details {
  margin-bottom: 12px;
}

.filter-details p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

/* 元信息样式 */
.announcement-meta,
.tutorial-meta,
.filter-meta,
.contact-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  color: white;
}

.type-badge.info { background: #2196F3; }
.type-badge.feature { background: #4CAF50; }
.type-badge.update { background: #FF9800; }
.type-badge.warning { background: #f44336; }

.date,
.order {
  font-size: 12px;
  color: #999;
}

.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  background: #f0f0f0;
  color: #666;
}

.status.active {
  background: #4CAF50;
  color: white;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

/* 表单样式 */
.form-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.save-btn:hover {
  transform: translateY(-1px);
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: #666;
}

/* 空状态样式 */
.empty-list {
  padding: 60px 20px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px dashed #dee2e6;
}

.empty-list p {
  margin: 0;
  color: #6c757d;
  font-size: 16px;
}

/* Markdown编辑器包装样式 */
.markdown-editor-wrapper {
  margin-bottom: 20px;
}

.markdown-editor-wrapper :deep(.md-editor) {
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.markdown-editor-wrapper :deep(.md-editor:focus-within) {
  border-color: #667eea;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.2);
}

.markdown-editor-wrapper :deep(.md-editor-toolbar-wrapper) {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px;
}

.markdown-editor-wrapper :deep(.md-editor-toolbar-item) {
  color: #666;
  transition: all 0.2s;
}

.markdown-editor-wrapper :deep(.md-editor-toolbar-item:hover) {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.markdown-editor-wrapper :deep(.md-editor-input-wrapper),
.markdown-editor-wrapper :deep(.md-editor-preview-wrapper) {
  background: white;
  color: #333;
}

.markdown-editor-wrapper :deep(.md-editor-input) {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-editor-wrapper label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .card-header {
    flex-wrap: nowrap;
  }
  
  .card-header h3 {
    max-width: calc(100% - 180px);
    font-size: 14px;
  }
  
  .tutorial-title-row,
  .filter-title-row,
  .contact-title-row {
    max-width: calc(100% - 180px);
  }
  
  .edit-btn,
  .delete-btn {
    padding: 6px 12px !important;
    font-size: 12px !important;
    min-width: 50px;
  }
}

@media (max-width: 768px) {
  .drawer-config-container {
    padding: 16px;
  }
  
  .config-tabs {
    flex-wrap: wrap;
  }
  
  .tab-button {
    flex: 1;
    min-width: 120px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .card-header {
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px;
  }
  
  .card-header h3 {
    max-width: calc(100% - 150px) !important;
    font-size: 13px !important;
  }
  
  .tutorial-title-row,
  .filter-title-row,
  .contact-title-row {
    max-width: calc(100% - 150px) !important;
  }
  
  .card-actions {
    flex-direction: row !important;
    gap: 4px !important;
  }
  
  .edit-btn,
  .delete-btn {
    padding: 6px 10px !important;
    font-size: 11px !important;
    min-width: 45px !important;
  }
  
  .announcement-meta,
  .tutorial-meta,
  .filter-meta,
  .contact-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>