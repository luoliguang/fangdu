import { ref, computed } from 'vue'
import apiClient from '@/axiosConfig'
import { useToast } from 'vue-toastification'

/**
 * API请求组合式函数
 * @param {Object} options - 配置选项
 * @param {boolean} options.showSuccessToast - 是否显示成功提示，默认为false
 * @param {boolean} options.showErrorToast - 是否显示错误提示，默认为true
 * @param {string} options.successMessage - 成功提示消息
 * @param {string} options.errorMessage - 错误提示消息
 * @returns {Object} API相关的响应式数据和方法
 */
export function useApi(options = {}) {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = '操作成功',
    errorMessage = '操作失败'
  } = options

  const toast = useToast()
  
  // 响应式状态
  const isLoading = ref(false)
  const error = ref(null)
  const data = ref(null)

  // 计算属性
  const hasError = computed(() => error.value !== null)
  const hasData = computed(() => data.value !== null)

  // 清除错误
  const clearError = () => {
    error.value = null
  }

  // 清除数据
  const clearData = () => {
    data.value = null
  }

  // 重置状态
  const reset = () => {
    isLoading.value = false
    error.value = null
    data.value = null
  }

  // 通用请求方法
  const request = async (requestFn, options = {}) => {
    const {
      onSuccess,
      onError,
      showSuccess = showSuccessToast,
      showError = showErrorToast,
      successMsg = successMessage,
      errorMsg = errorMessage
    } = options

    try {
      isLoading.value = true
      clearError()
      
      const response = await requestFn()
      data.value = response.data
      
      if (showSuccess) {
        toast.success(successMsg)
      }
      
      if (onSuccess) {
        onSuccess(response.data)
      }
      
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err
      
      const message = err.response?.data?.message || errorMsg
      
      if (showError) {
        toast.error(message)
      }
      
      if (onError) {
        onError(err)
      }
      
      return { success: false, error: err, message }
    } finally {
      isLoading.value = false
    }
  }

  // GET 请求
  const get = (url, config = {}, options = {}) => {
    return request(() => apiClient.get(url, config), options)
  }

  // POST 请求
  const post = (url, data = {}, config = {}, options = {}) => {
    return request(() => apiClient.post(url, data, config), options)
  }

  // PUT 请求
  const put = (url, data = {}, config = {}, options = {}) => {
    return request(() => apiClient.put(url, data, config), options)
  }

  // DELETE 请求
  const del = (url, config = {}, options = {}) => {
    return request(() => apiClient.delete(url, config), options)
  }

  // PATCH 请求
  const patch = (url, data = {}, config = {}, options = {}) => {
    return request(() => apiClient.patch(url, data, config), options)
  }

  return {
    // 响应式状态
    isLoading,
    error,
    data,
    hasError,
    hasData,
    
    // 方法
    request,
    get,
    post,
    put,
    delete: del,
    patch,
    clearError,
    clearData,
    reset
  }
}

/**
 * 资源管理组合式函数
 * @param {string} baseUrl - 资源基础URL
 * @param {Object} options - 配置选项
 * @returns {Object} 资源管理相关的方法
 */
export function useResource(baseUrl, options = {}) {
  const api = useApi(options)
  
  // 获取列表
  const fetchList = (params = {}, requestOptions = {}) => {
    return api.get(baseUrl, { params }, requestOptions)
  }

  // 获取单个资源
  const fetchById = (id, requestOptions = {}) => {
    return api.get(`${baseUrl}/${id}`, {}, requestOptions)
  }

  // 创建资源
  const create = (data, requestOptions = {}) => {
    return api.post(baseUrl, data, {}, {
      showSuccess: true,
      successMsg: '创建成功',
      ...requestOptions
    })
  }

  // 更新资源
  const update = (id, data, requestOptions = {}) => {
    return api.put(`${baseUrl}/${id}`, data, {}, {
      showSuccess: true,
      successMsg: '更新成功',
      ...requestOptions
    })
  }

  // 删除资源
  const remove = (id, requestOptions = {}) => {
    return api.delete(`${baseUrl}/${id}`, {}, {
      showSuccess: true,
      successMsg: '删除成功',
      ...requestOptions
    })
  }

  return {
    ...api,
    fetchList,
    fetchById,
    create,
    update,
    remove
  }
}

/**
 * 带认证的API组合式函数
 * @param {Object} options - 配置选项
 * @returns {Object} 带认证的API方法
 */
export function useAuthApi(options = {}) {
  const api = useApi(options)
  
  // 获取认证头
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // 带认证的GET请求
  const authGet = (url, config = {}, options = {}) => {
    const headers = { ...getAuthHeaders(), ...config.headers }
    return api.get(url, { ...config, headers }, options)
  }

  // 带认证的POST请求
  const authPost = (url, data = {}, config = {}, options = {}) => {
    const headers = { ...getAuthHeaders(), ...config.headers }
    return api.post(url, data, { ...config, headers }, options)
  }

  // 带认证的PUT请求
  const authPut = (url, data = {}, config = {}, options = {}) => {
    const headers = { ...getAuthHeaders(), ...config.headers }
    return api.put(url, data, { ...config, headers }, options)
  }

  // 带认证的DELETE请求
  const authDelete = (url, config = {}, options = {}) => {
    const headers = { ...getAuthHeaders(), ...config.headers }
    return api.del(url, { ...config, headers }, options)
  }

  return {
    ...api,
    authGet,
    authPost,
    authPut,
    authDelete,
    getAuthHeaders
  }
}