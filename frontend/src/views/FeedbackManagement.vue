<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { DataTable, ConfirmDialog } from '@/components/common';
import { useFeedbackStore } from '@/stores/feedback';
import { ElMessage } from 'element-plus';

const feedbackStore = useFeedbackStore();
const confirmDialog = ref(null);
const deleteItemId = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');

const { feedbacks, isLoading: isFeedbacksLoading, pendingCount: pendingFeedbacksCount } = storeToRefs(feedbackStore);

const processedCount = computed(() => feedbacks.value.filter(f => f.status !== 'pending').length);

const filteredFeedbacks = computed(() => {
  return feedbacks.value.filter(f => {
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'pending' && f.status === 'pending') ||
      (statusFilter.value === 'processed' && f.status !== 'pending');
    const q = searchQuery.value.trim().toLowerCase();
    const matchesSearch = !q || f.message.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });
});

const columns = [
  { key: 'message', title: '留言内容', width: '50%' },
  { key: 'created_at', title: '提交时间', sortable: true, width: '180px' },
  { key: 'status', title: '状态', width: '110px', align: 'center' },
];

const updateFeedbackStatus = async (id, status) => {
  await feedbackStore.updateFeedbackStatus(id, status);
};

const showDeleteConfirm = (id) => {
  deleteItemId.value = id;
  confirmDialog.value.show();
};

const deleteFeedback = async () => {
  if (!deleteItemId.value) return;
  try {
    await feedbackStore.deleteFeedback(deleteItemId.value);
  } finally {
    deleteItemId.value = null;
  }
};

const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN');

let refreshTimer = null;

onMounted(() => {
  feedbackStore.fetchFeedbacks();
  feedbackStore.fetchPendingCount();
  refreshTimer = setInterval(() => {
    feedbackStore.fetchFeedbacks();
    feedbackStore.fetchPendingCount();
  }, 30000);
});

onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer); });
</script>

<template>
  <div class="admin-page-shell">
    <div class="page-config-container">
      <div class="page-header">
        <h1>留言管理</h1>
        <p class="page-description">查看并处理用户通过侧边抽屉提交的反馈留言。</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-num">{{ feedbacks.length }}</span>
          <span class="stat-label">全部留言</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-num">{{ pendingFeedbacksCount }}</span>
          <span class="stat-label">待处理</span>
        </div>
        <div class="stat-card processed">
          <span class="stat-num">{{ processedCount }}</span>
          <span class="stat-label">已处理</span>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <div class="filter-tabs">
          <button
            v-for="tab in [{ key:'all', label:'全部' }, { key:'pending', label:'待处理' }, { key:'processed', label:'已处理' }]"
            :key="tab.key"
            class="filter-tab"
            :class="{ active: statusFilter === tab.key }"
            @click="statusFilter = tab.key"
          >{{ tab.label }}</button>
        </div>
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" placeholder="搜索留言内容…" class="search-input" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
      </div>

      <!-- 表格 -->
      <DataTable
        :data="filteredFeedbacks"
        :columns="columns"
        :loading="isFeedbacksLoading"
        :empty-text="searchQuery || statusFilter !== 'all' ? '没有符合条件的留言' : '暂无留言数据'"
      >
        <template #column-message="{ item }">
          <div class="feedback-content" :title="item.message">{{ item.message }}</div>
        </template>

        <template #column-created_at="{ item }">
          <span class="date-text">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #column-status="{ item }">
          <span class="status-badge" :class="item.status === 'pending' ? 'status-pending' : 'status-processed'">
            {{ item.status === 'pending' ? '待处理' : '已处理' }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="action-buttons">
            <button
              v-if="item.status === 'pending'"
              class="btn-action btn-process"
              @click="updateFeedbackStatus(item.id, 'approved')"
            >标记已处理</button>
            <button
              v-else
              class="btn-action btn-revert"
              @click="updateFeedbackStatus(item.id, 'pending')"
            >恢复待处理</button>
            <button class="btn-action btn-delete" @click="showDeleteConfirm(item.id)">删除</button>
          </div>
        </template>
      </DataTable>

      <ConfirmDialog
        ref="confirmDialog"
        title="确认删除"
        message="确定要删除这条留言吗？此操作不可撤销。"
        type="danger"
        @confirm="deleteFeedback"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-page-shell {
  max-width: 960px;
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
  margin-bottom: 20px;
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

/* 统计卡片 */
.stat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.stat-card.pending { background: #fff7ed; border-color: #fed7aa; }
.stat-card.processed { background: #f0fdf4; border-color: #bbf7d0; }

.stat-num {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2332;
  line-height: 1;
}

.stat-card.pending .stat-num { color: #c2410c; }
.stat-card.processed .stat-num { color: #15803d; }

.stat-label {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 4px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
}

.filter-tab {
  padding: 5px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tab.active {
  background: #fff;
  color: #0a3d22;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 10px;
  height: 34px;
  min-width: 200px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: #374151;
  outline: none;
}

.search-input::placeholder { color: #94a3b8; }

.search-clear {
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

/* 表格 */
:deep(.data-table) {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

:deep(.data-table th) {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.85rem;
}

:deep(.data-table td) {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

:deep(.data-table tr:last-child td) { border-bottom: none; }
:deep(.data-table tr:hover td) { background: #f8fafc; }

.feedback-content {
  word-break: break-all;
  line-height: 1.5;
  font-size: 0.9rem;
  color: #374151;
}

.date-text { font-size: 0.85rem; color: #64748b; white-space: nowrap; }

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-pending { background: #fff7ed; color: #c2410c; }
.status-processed { background: #f0fdf4; color: #15803d; }

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.btn-action {
  padding: 5px 11px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
  white-space: nowrap;
}

.btn-action:hover { filter: brightness(0.92); }

.btn-process { background: linear-gradient(135deg, #0a3d22, #5a8f73); color: #fff; }
.btn-revert { background: #fef3c7; color: #92400e; }
.btn-delete { background: #fee2e2; color: #991b1b; }

@media (max-width: 640px) {
  .page-config-container { padding: 20px 16px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-box { min-width: unset; }
  .stat-row { gap: 8px; }
  .stat-num { font-size: 1.3rem; }
}
</style>
