<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../axiosConfig.js';
import { useToast } from 'vue-toastification';

const toast = useToast();

// --- 留言相关状态 ---
const feedbacks = ref([]);
const isFeedbacksLoading = ref(false);
const pendingFeedbacksCount = ref(0); // 未处理留言数量

// --- 获取未处理留言数量 ---
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

// --- 获取留言列表 ---
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

// --- 更新留言状态 ---
const updateFeedbackStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('authToken');
    await apiClient.put(`/feedbacks/${id}`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 更新本地数据
    const index = feedbacks.value.findIndex(f => f.id === id);
    if (index !== -1) {
      feedbacks.value[index].status = status;
    }
    
    fetchPendingFeedbacksCount(); // 更新未处理数量
    toast.success('留言状态更新成功');
  } catch (error) {
    console.error('更新留言状态失败:', error);
    toast.error('更新留言状态失败');
  }
};

// --- 删除留言 ---
const deleteFeedback = async (id) => {
  if (!confirm('确定要删除这条留言吗？')) return;
  
  try {
    const token = localStorage.getItem('authToken');
    await apiClient.delete(`/feedbacks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    feedbacks.value = feedbacks.value.filter(f => f.id !== id);
    fetchPendingFeedbacksCount(); // 更新未处理数量
    toast.success('留言删除成功');
  } catch (error) {
    console.error('删除留言失败:', error);
    toast.error('删除留言失败');
  }
};

// --- 格式化日期 ---
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  fetchFeedbacks();
  fetchPendingFeedbacksCount();
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
    
    <div v-if="isFeedbacksLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="feedbacks.length === 0" class="no-data">
      <p>暂无留言数据</p>
    </div>
    
    <table v-else>
      <thead>
        <tr>
          <th>用户</th>
          <th>留言内容</th>
          <th>提交时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="feedback in feedbacks" :key="feedback.id">
          <td>{{ feedback.name }}</td>
          <td class="feedback-content">{{ feedback.message }}</td>
          <td>{{ formatDate(feedback.created_at) }}</td>
          <td>
            <span 
              class="status-badge" 
              :class="{
                'status-pending': feedback.status === 'pending',
                'status-processed': feedback.status === 'resolved'
              }"
            >
              {{ feedback.status === 'pending' ? '未处理' : '已处理' }}
            </span>
          </td>
          <td>
            <button 
              v-if="feedback.status === 'pending'"
              @click="updateFeedbackStatus(feedback.id, 'resolved')"
              class="btn-process"
            >
              标记为已处理
            </button>
            <button 
              v-else
              @click="updateFeedbackStatus(feedback.id, 'pending')"
              class="btn-revert"
            >
              恢复为未处理
            </button>
            <button @click="deleteFeedback(feedback.id)" class="btn-delete">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
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

.pending-badge {
  background-color: #ff4757;
  color: white;
  font-size: 0.9rem;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  margin-left: 1rem;
  font-weight: 500;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #42b883;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-data {
  text-align: center;
  padding: 3rem 0;
  color: #6c757d;
  font-size: 1.1rem;
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

.feedback-content {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.btn-process, .btn-revert, .btn-delete {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-right: 0.5rem;
  font-size: 0.9rem;
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

@media (max-width: 768px) {
  th, td {
    padding: 0.75rem 0.5rem;
  }
  
  .feedback-content {
    max-width: 150px;
  }
  
  .btn-process, .btn-revert, .btn-delete {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    display: block;
  }
}
</style>