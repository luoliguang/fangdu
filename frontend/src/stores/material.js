import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/axiosConfig'
import { useToast } from 'vue-toastification'

export const useMaterialStore = defineStore('material', () => {
  const toast = useToast()
  
  // 状态
  const materials = ref([])
  const isLoading = ref(false)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const pageSize = ref(10)
  const totalCount = ref(0)
  
  // 计算属性
  const hasMaterials = computed(() => materials.value.length > 0)
  const isPrevDisabled = computed(() => currentPage.value <= 1)
  const isNextDisabled = computed(() => currentPage.value >= totalPages.value)
  
  // 获取素材列表
  const fetchMaterials = async (page = 1) => {
    isLoading.value = true
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.get(`/api/v1/materials`, {
        params: { page, limit: pageSize.value },
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const { data, meta } = response.data
      materials.value = data
      currentPage.value = meta.page
      totalPages.value = meta.totalPages
      totalCount.value = meta.total
      
      return { success: true }
    } catch (error) {
      console.error('获取素材列表失败:', error)
      const message = error.response?.data?.message || '获取素材列表失败'
      toast.error(message)
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }
  
  // 更新素材
  const updateMaterial = async (id, data) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.put(`/api/v1/materials/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // 更新本地数据
      const index = materials.value.findIndex(m => m.id === id)
      if (index !== -1) {
        materials.value[index] = { ...materials.value[index], ...response.data.data }
      }
      
      // 刷新当前页面数据以确保实时更新
      await refresh()
      toast.success('素材更新成功')
      return { success: true, material: response.data.material }
    } catch (error) {
      console.error('更新素材失败:', error)
      const message = error.response?.data?.message || '更新素材失败'
      toast.error(message)
      return { success: false, message }
    }
  }
  
  // 删除素材
  const deleteMaterial = async (id) => {
    try {
      const token = localStorage.getItem('authToken')
      await apiClient.delete(`/api/v1/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // 从本地数据中移除
      materials.value = materials.value.filter(m => m.id !== id)
      totalCount.value -= 1
      
      // 如果当前页没有数据且不是第一页，跳转到上一页
      if (materials.value.length === 0 && currentPage.value > 1) {
        await fetchMaterials(currentPage.value - 1)
      }
      
      toast.success('素材删除成功')
      return { success: true }
    } catch (error) {
      console.error('删除素材失败:', error)
      const message = error.response?.data?.message || '删除素材失败'
      toast.error(message)
      return { success: false, message }
    }
  }
  
  // 跳转到指定页面
  const goToPage = async (page) => {
    if (page < 1 || page > totalPages.value) return
    await fetchMaterials(page)
  }
  
  // 刷新当前页
  const refresh = async () => {
    await fetchMaterials(currentPage.value)
  }
  
  // 上传素材（单个）
  const uploadMaterial = async (formData, onUploadProgress) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.post('/api/v1/materials', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress
      })
      
      toast.success('素材上传成功')
      // 刷新素材列表
      await refresh()
      return { success: true, data: response.data }
    } catch (error) {
      console.error('上传素材失败:', error)
      const message = error.response?.data?.message || '上传素材失败'
      toast.error(message)
      return { success: false, message }
    }
  }

  // 批量上传素材
  const uploadMaterialsBatch = async (formData, onUploadProgress) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await apiClient.post('/api/v1/materials/batch/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress
      })
      
      const result = response.data
      if (result.success) {
        toast.success(result.message)
        // 刷新素材列表
        await refresh()
      }
      return result
    } catch (error) {
      console.error('批量上传素材失败:', error)
      const message = error.response?.data?.message || '批量上传素材失败'
      toast.error(message)
      return { success: false, message }
    }
  }
  
  // 重置状态
  const reset = () => {
    materials.value = []
    currentPage.value = 1
    totalPages.value = 1
    totalCount.value = 0
    isLoading.value = false
  }
  
  return {
    // 状态
    materials,
    isLoading,
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    
    // 计算属性
    hasMaterials,
    isPrevDisabled,
    isNextDisabled,
    
    // 方法
    fetchMaterials,
    updateMaterial,
    deleteMaterial,
    uploadMaterial,
    uploadMaterialsBatch,
    goToPage,
    refresh,
    reset
  }
})