import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/axiosConfig'
import { useToast } from 'vue-toastification'

export const useUserStore = defineStore('user', () => {
  const toast = useToast()
  
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('authToken') || null)
  const isLoading = ref(false)
  
  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  
  // 设置认证信息
  const setAuth = (userData, authToken) => {
    user.value = userData
    token.value = authToken
    localStorage.setItem('authToken', authToken)
    // 触发storage事件通知其他组件更新登录状态
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authToken',
      newValue: authToken,
      storageArea: localStorage
    }))
  }
  
  // 清除认证信息
  const clearAuth = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('authToken')
    // 触发storage事件通知其他组件更新登录状态
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'authToken',
      newValue: null,
      storageArea: localStorage
    }))
  }
  
  // 登录
  const login = async (credentials) => {
    isLoading.value = true
    try {
      const response = await apiClient.post('/api/auth/login', credentials)
      const { user: userData, token: authToken } = response.data
      
      setAuth(userData, authToken)
      toast.success('登录成功')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || '登录失败'
      toast.error(message)
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }
  
  // 登出
  const logout = () => {
    clearAuth()
    toast.success('已退出登录')
  }
  
  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return
    
    try {
      const response = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      user.value = response.data.user
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果token无效，清除认证信息
      if (error.response?.status === 401) {
        clearAuth()
      }
    }
  }
  
  // 初始化时获取用户信息
  if (token.value) {
    fetchUserInfo()
  }
  
  return {
    // 状态
    user,
    token,
    isLoading,
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    
    // 方法
    login,
    logout,
    fetchUserInfo,
    setAuth,
    clearAuth
  }
})