import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/axiosConfig'
import { useToast } from 'vue-toastification'

export const useFeedbackStore = defineStore('feedback', () => {
  const toast = useToast()
  
  // 状态
  const feedbacks = ref([])
  const isLoading = ref(false)
  const pendingCount = ref(0)
  
  // 计算属性
  const hasFeedbacks = computed(() => feedbacks.value.length > 0)
  const pendingFeedbacks = computed(() => 
    feedbacks.value.filter(f => f.status === 'pending')
  )
  const processedFeedbacks = computed(() => 
    feedbacks.value.filter(f => f.status === 'resolved')
  )
  
  // 获取反馈列表
  const fetchFeedbacks = async () => {
    isLoading.value = true
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.get('/api/v1/feedbacks', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      feedbacks.value = response.data.data || []
      return { success: true }
    } catch (error) {
      console.error('获取反馈列表失败:', error)
      const message = error.response?.data?.message || '获取反馈列表失败'
      toast.error(message)
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }
  
  // 获取未处理反馈数量
  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.get('/api/v1/feedbacks/stats/unprocessed', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // 后端返回格式: { success: true, data: { count } }
      pendingCount.value = response.data.data?.count || 0
      return { success: true, count: pendingCount.value }
    } catch (error) {
      console.error('获取未处理反馈数量失败:', error)
      pendingCount.value = 0
      return { success: false, message: '获取未处理反馈数量失败' }
    }
  }
  
  // 更新反馈状态
  const updateFeedbackStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.put(`/api/v1/feedbacks/${id}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // 更新本地数据
      const index = feedbacks.value.findIndex(f => f.id === id)
      if (index !== -1) {
        feedbacks.value[index] = { ...feedbacks.value[index], status }
      }
      
      // 更新未处理数量
      await fetchPendingCount()
      
      // 触发状态更新事件，通知其他组件
      window.dispatchEvent(new CustomEvent('feedbackStatusUpdated', {
        detail: { id, status }
      }))
      
      const statusText = status === 'resolved' ? '已处理' : '未处理'
      toast.success(`反馈状态已更新为${statusText}`)
      return { success: true }
    } catch (error) {
      console.error('更新反馈状态失败:', error)
      const message = error.response?.data?.message || '更新反馈状态失败'
      toast.error(message)
      return { success: false, message }
    }
  }
  
  // 删除反馈
  const deleteFeedback = async (id) => {
    try {
      const token = localStorage.getItem('authToken')
      await apiClient.delete(`/api/v1/feedbacks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // 从本地数据中移除
      feedbacks.value = feedbacks.value.filter(f => f.id !== id)
      
      // 更新未处理数量
      await fetchPendingCount()
      
      // 触发删除事件，通知其他组件
      window.dispatchEvent(new CustomEvent('feedbackDeleted', {
        detail: { id }
      }))
      
      toast.success('反馈删除成功')
      return { success: true }
    } catch (error) {
      console.error('删除反馈失败:', error)
      const message = error.response?.data?.message || '删除反馈失败'
      toast.error(message)
      return { success: false, message }
    }
  }
  
  // 提交新反馈
  const submitFeedback = async (feedbackData) => {
    try {
      // 确保feedbackData包含必要的message字段
      if (!feedbackData.message || !feedbackData.message.trim()) {
        return { success: false, message: '留言内容不能为空' };
      }
      
      // 确保数据格式正确
      const formattedData = {
        message: feedbackData.message.trim(),
        user_id: feedbackData.user_id || null,
        materialId: feedbackData.materialId || null
      };
      
      const response = await apiClient.post('/api/v1/feedbacks', formattedData);
      
      return { success: true, feedback: response.data.data };
    } catch (error) {
      console.error('提交反馈失败:', error);
      const message = error.response?.data?.message || '提交反馈失败';
      return { success: false, message };
    }
  }
  
  // 刷新数据
  const refresh = async () => {
    await Promise.all([
      fetchFeedbacks(),
      fetchPendingCount()
    ])
  }
  
  // 重置状态
  const reset = () => {
    feedbacks.value = []
    pendingCount.value = 0
    isLoading.value = false
  }
  
  return {
    // 状态
    feedbacks,
    isLoading,
    pendingCount,
    
    // 计算属性
    hasFeedbacks,
    pendingFeedbacks,
    processedFeedbacks,
    
    // 方法
    fetchFeedbacks,
    fetchPendingCount,
    updateFeedbackStatus,
    deleteFeedback,
    submitFeedback,
    refresh,
    reset
  }
})