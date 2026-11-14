<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { DataTable, ConfirmDialog } from '@/components/common';
import { useFeedbackStore } from '@/stores/feedback';
import { ElMessage } from 'element-plus';
import apiClient from '@/axiosConfig';

const feedbackStore = useFeedbackStore();
const confirmDialog = ref(null);
const deleteItemId = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');
const replyOpen = ref(false);
const replyItem = ref(null);
const replyText = ref('');
const isReplying = ref(false);

const { feedbacks, isLoading: isFeedbacksLoading } = storeToRefs(feedbackStore);

const listCounts = computed(() => {
  const total = feedbacks.value.length;
  const pending = feedbacks.value.filter(f => f.status === 'pending').length;
  return { total, pending, processed: total - pending };
});

const statusTabs = computed(() => [
  { key: 'all', label: '全部', count: listCounts.value.total },
  { key: 'pending', label: '待处理', count: listCounts.value.pending },
  { key: 'processed', label: '已处理', count: listCounts.value.processed }
]);

const statusClass = status => (status === 'pending' ? 'pending' : status === 'replied' ? 'replied' : 'processed');

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
  { key: 'created_at', title: '提交时间', width: '180px' },
  { key: 'status', title: '状态', width: '110px', align: 'center' },
];

const updateFeedbackStatus = async (id, status) => {
  await feedbackStore.updateFeedbackStatus(id, status);
};

const isPhotoRequest = item => /【(?:想要新素材|没找到想要的|素材需求)】/.test(item.message);

const openReply = item => {
  replyItem.value = item;
  replyText.value = item.admin_reply || '';
  replyOpen.value = true;
};

const submitReply = async () => {
  const content = replyText.value.trim();
  if (!content) return ElMessage.warning('请先填写给客户的回复');
  if (!replyItem.value || isReplying.value) return;
  isReplying.value = true;
  try {
    const token = localStorage.getItem('authToken');
    await apiClient.post(`/api/v1/feedbacks/${replyItem.value.id}/reply`, { adminReply: content }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    replyOpen.value = false;
    ElMessage.success('已保存回复，客户回到网站后可查看');
    await Promise.all([feedbackStore.fetchFeedbacks(), feedbackStore.fetchPendingCount()]);
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '回复失败，请稍后重试');
  } finally {
    isReplying.value = false;
  }
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
        <p class="page-description">查看搜索实拍图的需求和网站反馈；找到素材后回复名称或链接，客户可在小度查看。</p>
      </div>

      <!-- 筛选工具栏 -->
      <div class="filter-bar">
        <div class="filter-tabs" role="group" aria-label="按状态筛选留言">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            type="button"
            class="filter-tab"
            :class="{ active: statusFilter === tab.key }"
            :aria-pressed="statusFilter === tab.key"
            @click="statusFilter = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span class="filter-tab-count">{{ tab.count }}</span>
          </button>
        </div>
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" aria-label="搜索留言内容" placeholder="搜索留言内容…" class="search-input" />
          <button v-if="searchQuery" type="button" class="search-clear" aria-label="清除搜索" @click="searchQuery = ''">×</button>
        </div>
      </div>

      <!-- 表格 -->
      <DataTable
        class="fm-table"
        :data="filteredFeedbacks"
        :columns="columns"
        :loading="isFeedbacksLoading && !feedbacks.length"
        :empty-text="searchQuery || statusFilter !== 'all' ? '没有符合条件的留言' : '暂无留言数据'"
      >
        <template #column-message="{ item }">
          <div class="fm-ticket" :class="`fm-ticket--${statusClass(item.status)}`">
            <div class="feedback-content" :title="item.message">{{ item.message }}</div>
            <div v-if="item.admin_reply" class="feedback-receipt">↳ 已回复 · {{ item.admin_reply }}</div>
            <div v-else-if="item.status === 'pending'" class="feedback-receipt feedback-receipt--pending">待回复</div>
          </div>
        </template>

        <template #column-created_at="{ item }">
          <span class="date-text">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #column-status="{ item }">
          <span class="status-badge" :class="`status-${statusClass(item.status)}`">
            <span class="status-dot" aria-hidden="true"></span>
            {{ item.status === 'pending' ? '待处理' : item.status === 'replied' ? '已回复' : '已处理' }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="action-buttons">
            <button v-if="item.user_id" type="button" class="btn-action btn-primary" @click="openReply(item)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M20 20v-4a6 6 0 0 0-6-6H4"/></svg>
              <span>回复客户</span>
            </button>
            <button
              v-if="item.status === 'pending' && (!isPhotoRequest(item) || !item.user_id)"
              type="button"
              class="btn-action btn-ghost"
              @click="updateFeedbackStatus(item.id, 'approved')"
            >标记已处理</button>
            <button
              v-else-if="item.status !== 'pending' && item.status !== 'replied'"
              type="button"
              class="btn-action btn-ghost"
              @click="updateFeedbackStatus(item.id, 'pending')"
            >恢复待处理</button>
            <button type="button" class="btn-action btn-ghost-danger" @click="showDeleteConfirm(item.id)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>删除</span>
            </button>
          </div>
        </template>
      </DataTable>

      <el-dialog v-model="replyOpen" class="fm-reply-dialog" title="回复客户的找图需求" width="min(480px, 90vw)" top="6vh" :close-on-click-modal="false">
        <p v-if="replyItem" class="reply-source">{{ replyItem.message }}</p>
        <el-input v-model="replyText" type="textarea" :rows="5" maxlength="500" show-word-limit placeholder="填写找到的实拍图名称、搜索词或可打开的链接…" />
        <template #footer>
          <el-button @click="replyOpen = false">取消</el-button>
          <el-button type="primary" :loading="isReplying" @click="submitReply">发送回复</el-button>
        </template>
      </el-dialog>

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
  padding: 8px 4px 40px;
}

.page-config-container {
  background: #fff;
  border: 1px solid rgba(10, 61, 34, 0.12);
  border-radius: 14px;
  padding: 22px 24px 24px;
}

.page-header {
  margin-bottom: 18px;
}

.page-header h1 {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #0a3d22;
  margin: 0 0 6px;
}

.page-description {
  color: #5b6d63;
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 0;
}

/* 筛选工具栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: inline-flex;
  gap: 2px;
  background: #f1f5f2;
  border: 1px solid rgba(10, 61, 34, 0.1);
  padding: 3px;
  border-radius: 10px;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #5b6d63;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.filter-tab:hover { color: #0a3d22; }
.filter-tab:focus-visible { outline: 2px solid #5a8f73; outline-offset: 2px; }

.filter-tab.active {
  background: #fff;
  color: #0a3d22;
  box-shadow: 0 1px 3px rgba(10, 61, 34, 0.14);
  font-weight: 600;
}

.filter-tab-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(10, 61, 34, 0.08);
  color: #0a3d22;
}

.filter-tab.active .filter-tab-count {
  background: #0a3d22;
  color: #fff;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #fff;
  border: 1px solid rgba(10, 61, 34, 0.32);
  border-radius: 9px;
  padding: 0 10px;
  height: 36px;
  min-width: 220px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-box svg { color: #5b6d63; flex-shrink: 0; }
.search-box:focus-within {
  border-color: #5a8f73;
  box-shadow: 0 0 0 3px rgba(90, 143, 115, 0.18);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: #20342b;
  outline: none;
}

.search-input::placeholder { color: #5b6d63; }

.search-clear {
  border: none;
  background: none;
  color: #5b6d63;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}

.search-clear:hover { color: #0a3d22; }
.search-clear:focus-visible { outline: 2px solid #5a8f73; outline-offset: 1px; }

/* 表格 */
.fm-table :deep(.table-wrapper) {
  border-radius: 12px;
  border: 1px solid rgba(10, 61, 34, 0.12);
  overflow: hidden;
}

.fm-table :deep(.data-table) { background: #fff; }

.fm-table :deep(th) {
  background: #eef5f0;
  color: #0a3d22;
  font-weight: 700;
  font-size: 0.82rem;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(10, 61, 34, 0.14);
  white-space: nowrap;
}

.fm-table :deep(td) {
  padding: 13px 14px;
  border-bottom: 1px solid rgba(10, 61, 34, 0.08);
  vertical-align: middle;
  font-size: 0.88rem;
}

.fm-table :deep(tr:last-child td) { border-bottom: none; }
.fm-table :deep(tbody tr) { transition: background 0.12s ease; }
.fm-table :deep(tbody tr:hover) { background: #f4f9f6; }

/* 需求票据：留言 + 回执条（签名元素） */
.fm-ticket {
  position: relative;
  padding-left: 12px;
  border-left: 3px solid transparent;
}

.fm-ticket--pending { border-left-color: #d97706; }
.fm-ticket--replied { border-left-color: #0a3d22; }
.fm-ticket--processed { border-left-color: #8aa597; }

.feedback-content {
  word-break: break-word;
  line-height: 1.55;
  font-size: 0.9rem;
  color: #20342b;
}

.feedback-receipt {
  margin-top: 8px;
  padding: 7px 10px;
  background: #eef5f0;
  border-top: 1px dashed rgba(10, 61, 34, 0.28);
  border-radius: 0 0 8px 8px;
  color: #0a3d22;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.feedback-receipt--pending {
  background: #fff7ed;
  border-top-color: rgba(217, 119, 6, 0.4);
  color: #b45309;
}

.reply-source {
  margin: 0 0 14px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #20342b;
}

.date-text {
  font-size: 0.82rem;
  color: #5b6d63;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.status-pending { background: #fff7ed; color: #b45309; }
.status-pending .status-dot { background: #d97706; }
.status-replied { background: #eef5f0; color: #0a3d22; }
.status-replied .status-dot { background: #0a3d22; }
.status-processed { background: #f1f5f2; color: #4a5d53; }
.status-processed .status-dot { background: #8aa597; }

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  min-height: 32px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-action:focus-visible { outline: 2px solid #5a8f73; outline-offset: 2px; }

.btn-primary { background: #0a3d22; color: #fff; }
.btn-primary:hover { background: #16492c; }
.btn-ghost { background: transparent; color: #0a3d22; }
.btn-ghost:hover { background: #eef5f0; }
.btn-ghost-danger { background: transparent; color: #b3261e; }
.btn-ghost-danger:hover { background: #fdf0ef; }

/* 回复弹窗 */
:deep(.fm-reply-dialog) {
  --el-color-primary: #0a3d22;
  --el-color-primary-light-3: #5a8f73;
  --el-color-primary-light-5: #8fb5a2;
  --el-color-primary-light-7: #d7e7de;
  --el-color-primary-light-8: #e8f1ec;
  --el-color-primary-light-9: #f3f8f5;
  --el-color-primary-dark-2: #062b18;
  border-radius: 14px;
  overflow: hidden;
}

:deep(.fm-reply-dialog .el-dialog__header) {
  padding: 16px 20px 14px;
  border-bottom: 1px solid rgba(10, 61, 34, 0.12);
  background: #fff;
}

:deep(.fm-reply-dialog .el-dialog__title) {
  color: #0a3d22;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
}

:deep(.fm-reply-dialog .el-dialog__body) { padding: 18px 20px; }
:deep(.fm-reply-dialog .el-dialog__footer) { padding: 10px 20px 18px; }

/* 空状态 */
.fm-table :deep(.empty-state) { padding: 40px 16px; color: #5b6d63; }
.fm-table :deep(.empty-icon) { font-size: 2.4rem; }
.fm-table :deep(.empty-text) { font-size: 0.95rem; }

@media (max-width: 640px) {
  .page-config-container { padding: 18px 14px 20px; border-radius: 12px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .filter-tabs { width: 100%; }
  .filter-tab { flex: 1; justify-content: center; }
  .search-box { min-width: unset; width: 100%; }
  .fm-table :deep(th),
  .fm-table :deep(td) { padding: 10px 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .filter-tab,
  .search-box,
  .btn-action,
  .fm-table :deep(tbody tr) { transition: none; }
}
</style>
