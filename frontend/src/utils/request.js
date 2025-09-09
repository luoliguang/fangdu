// HTTP请求工具，集成统一错误处理
import axios from 'axios'
import { getApiBaseURL, getDebugConfig } from '@/config/env'
import { showError, parseApiError, ERROR_TYPES } from './errorHandler'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建axios实例
const request = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加认证token
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    
    // 开发环境下打印请求信息
    const debugConfig = getDebugConfig()
    if (debugConfig.enabled && debugConfig.showApiLogs) {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        params: config.params
      })
    }
    
    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 开发环境下打印响应信息
    const debugConfig = getDebugConfig()
    if (debugConfig.enabled && debugConfig.showApiLogs) {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
    }
    
    return response
  },
  (error) => {
    // 解析错误
    const appError = parseApiError(error)
    
    // 开发环境下打印错误详情
    const debugConfig = getDebugConfig()
    if (debugConfig.enabled) {
      console.error('API Error:', {
        message: appError.message,
        type: appError.type,
        statusCode: appError.statusCode,
        url: error.config?.url,
        method: error.config?.method,
        originalError: error
      })
    }
    
    // 处理特定错误类型
    handleSpecificErrors(appError)
    
    return Promise.reject(appError)
  }
)

// 处理特定错误类型
function handleSpecificErrors(error) {
  const userStore = useUserStore()
  
  switch (error.type) {
    case ERROR_TYPES.AUTHENTICATION_ERROR:
      // 认证失败，清除用户信息并跳转到登录页
      userStore.logout()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
      break
      
    case ERROR_TYPES.AUTHORIZATION_ERROR:
      // 权限不足，可以跳转到无权限页面或显示错误
      showError(error)
      break
      
    case ERROR_TYPES.NETWORK_ERROR:
      // 网络错误，显示重试选项
      showError(error, {
        duration: 0, // 不自动关闭
        showClose: true
      })
      break
      
    default:
      // 其他错误，显示默认错误消息
      showError(error)
  }
}

// 请求方法封装
export const api = {
  // GET请求
  get(url, params = {}, config = {}) {
    return request({
      method: 'GET',
      url,
      params,
      ...config
    })
  },
  
  // POST请求
  post(url, data = {}, config = {}) {
    return request({
      method: 'POST',
      url,
      data,
      ...config
    })
  },
  
  // PUT请求
  put(url, data = {}, config = {}) {
    return request({
      method: 'PUT',
      url,
      data,
      ...config
    })
  },
  
  // DELETE请求
  delete(url, config = {}) {
    return request({
      method: 'DELETE',
      url,
      ...config
    })
  },
  
  // PATCH请求
  patch(url, data = {}, config = {}) {
    return request({
      method: 'PATCH',
      url,
      data,
      ...config
    })
  },
  
  // 文件上传
  upload(url, file, onProgress = null, config = {}) {
    const formData = new FormData()
    formData.append('file', file)
    
    return request({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && typeof onProgress === 'function') {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
      ...config
    })
  },
  
  // 下载文件
  download(url, filename, config = {}) {
    return request({
      method: 'GET',
      url,
      responseType: 'blob',
      ...config
    }).then(response => {
      // 创建下载链接
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      return response
    })
  }
}

// 取消请求的工具
export class RequestCanceler {
  constructor() {
    this.pendingRequests = new Map()
  }
  
  // 添加请求
  addRequest(config) {
    const requestKey = this.getRequestKey(config)
    
    // 如果已有相同请求，取消之前的请求
    if (this.pendingRequests.has(requestKey)) {
      const cancelToken = this.pendingRequests.get(requestKey)
      cancelToken.cancel('重复请求被取消')
    }
    
    // 创建新的取消token
    const source = axios.CancelToken.source()
    config.cancelToken = source.token
    this.pendingRequests.set(requestKey, source)
    
    return config
  }
  
  // 移除请求
  removeRequest(config) {
    const requestKey = this.getRequestKey(config)
    this.pendingRequests.delete(requestKey)
  }
  
  // 取消所有请求
  cancelAllRequests() {
    this.pendingRequests.forEach(source => {
      source.cancel('页面切换，取消所有请求')
    })
    this.pendingRequests.clear()
  }
  
  // 生成请求唯一标识
  getRequestKey(config) {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}:${JSON.stringify(config.data)}`
  }
}

// 全局请求取消器实例
export const requestCanceler = new RequestCanceler()

// 导出axios实例
export default request