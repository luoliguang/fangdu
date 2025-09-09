<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { DataTable, ConfirmDialog } from '@/components/common';
import { useFeedbackStore } from '@/stores/feedback';
import { useToast } from 'vue-toastification';

const toast = useToast();
const feedbackStore = useFeedbackStore();
const confirmDialog = ref(null);
const deleteItemId = ref(null);

// 从store中获取状态 - 使用storeToRefs保持响应性
const { feedbacks, isLoading: isFeedbacksLoading, pendingCount: pendingFeedbacksCount } = storeToRefs(feedbackStore); // 未处理留言数量

// --- 表格列配置 ---
const columns = [
  {
    key: 'message',
    title: '留言内容',
    width: '40%'
  },
  {
    key: 'created_at',
    title: '提交时间',
    sortable: true,
    width: '180px'
  },
  {
    key: 'status',
    title: '状态',
    width: '120px',
    align: 'center'
  }
];

// --- 更新留言状态 ---
const updateFeedbackStatus = async (id, status) => {
  await feedbackStore.updateFeedbackStatus(id, status);
};

// --- 显示删除确认对话框 ---
const showDeleteConfirm = (id) => {
  deleteItemId.value = id;
  confirmDialog.value.show();
};

// --- 删除留言 ---
const deleteFeedback = async () => {
  if (!deleteItemId.value) return;
  
  try {
    await feedbackStore.deleteFeedback(deleteItemId.value);
  } catch (error) {
    throw error;
  } finally {
    deleteItemId.value = null;
  }
};

// --- 格式化时间 ---
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// --- 获取状态标签类型 ---
const getStatusType = (status) => {
  return status === 'pending' ? 'warning' : 'success';
};

// --- 获取状态文本 ---
const getStatusText = (status) => {
  return status === 'pending' ? '未处理' : '已处理';
};

// 定时器引用
let refreshTimer = null;

onMounted(() => {
  feedbackStore.fetchFeedbacks();
  feedbackStore.fetchPendingCount();
  
  // 每30秒刷新一次数据
  refreshTimer = setInterval(() => {
    feedbackStore.fetchFeedbacks();
    feedbackStore.fetchPendingCount();
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="card">
    <h2>
      用户留言管理
      <span v-if="pendingFeedbacksCount > 0" class="pending-badge">
        {{ pendingFeedbacksCount }} 条未处理
      </span>
    </h2>
    
    <DataTable 
      :data="feedbacks"
      :columns="columns"
      :loading="isFeedbacksLoading"
      empty-text="暂无留言数据"
    >
      <!-- 留言内容列 -->
      <template #column-message="{ item }">
        <div class="feedback-content" :title="item.message">
          {{ item.message }}
        </div>
      </template>
      
      <!-- 提交时间列 -->
      <template #column-created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>
      
      <!-- 状态列 -->
      <template #column-status="{ item }">
        <span 
          class="status-badge" 
          :class="{
            'status-pending': item.status === 'pending',
            'status-processed': item.status === 'approved' || item.status === 'replied'
          }"
        >
          {{ item.status === 'pending' ? '未处理' : '已处理' }}
        </span>
      </template>
      
      <!-- 操作列 -->
      <template #actions="{ item }">
        <div class="action-buttons">
          <button 
            v-if="item.status === 'pending'"
            @click="updateFeedbackStatus(item.id, 'approved')"
            class="btn-process"
          >
            标记为已处理
          </button>
          <button 
            v-else
            @click="updateFeedbackStatus(item.id, 'pending')"
            class="btn-revert"
          >
            恢复为未处理
          </button>
          <button @click="showDeleteConfirm(item.id)" class="btn-delete">删除</button>
        </div>
      </template>
    </DataTable>
    
    <!-- 确认删除对话框 -->
    <ConfirmDialog 
      ref="confirmDialog"
      title="确认删除"
      message="确定要删除这条留言吗？此操作不可撤销。"
      type="danger"
      @confirm="deleteFeedback"
    />
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  border: 1px solid #f0f0f0;
}

h2 {
  color: #2c3e50;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.8rem;
}

/* 表格样式优化 */
:deep(.data-table) {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

:deep(.data-table th) {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  padding: 16px 12px;
  border-bottom: 2px solid #dee2e6;
}

:deep(.data-table td) {
  padding: 16px 12px;
  border-bottom: 1px solid #f1f3f4;
  vertical-align: middle;
}

:deep(.data-table tr:hover) {
  background-color: #f8f9fa;
}

.pending-badge {
  background-color: #ff4757;
  color: white;
  font-size: 0.9rem;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  margin-left: 1rem;
  font-weight: 500;
}

.feedback-content {
  max-width: 100%;
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.4;
  cursor: help;
  padding: 4px 0;
}

.status-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-pending {
  background-color: #ffc107;
  color: #212529;
}

.status-processed {
  background-color: #28a745;
  color: white;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
}

.btn-process, .btn-revert, .btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-process {
  background-color: #28a745;
  color: white;
}

.btn-process:hover {
  background-color: #218838;
}

.btn-revert {
  background-color: #ffc107;
  color: #212529;
}

.btn-revert:hover {
  background-color: #e0a800;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card {
    padding: 15px;
    margin: 10px;
  }
  
  h2 {
    font-size: 1.5rem;
  }
  
  .feedback-content {
    max-width: 200px;
    font-size: 14px;
  }
  
  .btn-process, .btn-revert, .btn-delete {
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
    font-size: 1.3rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .pending-badge {
    margin-left: 0;
  }
  
  .feedback-content {
    max-width: 150px;
    font-size: 13px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .btn-process, .btn-revert, .btn-delete {
    padding: 3px 6px;
    font-size: 11px;
    width: 100%;
  }
}
</style>