// 前端统一错误处理工具
import { ElMessage, ElNotification } from 'element-plus'
import { getDebugConfig } from '@/config/env'

// 错误类型枚举
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

// 错误消息映射
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ERROR_TYPES.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ERROR_TYPES.VALIDATION_ERROR]: '输入数据格式不正确',
  [ERROR_TYPES.AUTHENTICATION_ERROR]: '身份验证失败，请重新登录',
  [ERROR_TYPES.AUTHORIZATION_ERROR]: '权限不足，无法执行此操作',
  [ERROR_TYPES.NOT_FOUND_ERROR]: '请求的资源不存在',
  [ERROR_TYPES.SERVER_ERROR]: '服务器内部错误，请稍后重试',
  [ERROR_TYPES.UNKNOWN_ERROR]: '未知错误，请联系管理员'
}

// 自定义错误类
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN_ERROR, statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

// HTTP状态码到错误类型的映射
const STATUS_CODE_MAP = {
  400: ERROR_TYPES.VALIDATION_ERROR,
  401: ERROR_TYPES.AUTHENTICATION_ERROR,
  403: ERROR_TYPES.AUTHORIZATION_ERROR,
  404: ERROR_TYPES.NOT_FOUND_ERROR,
  408: ERROR_TYPES.TIMEOUT_ERROR,
  429: ERROR_TYPES.NETWORK_ERROR,
  500: ERROR_TYPES.SERVER_ERROR,
  502: ERROR_TYPES.SERVER_ERROR,
  503: ERROR_TYPES.SERVER_ERROR,
  504: ERROR_TYPES.TIMEOUT_ERROR
}

// 解析API错误响应
export function parseApiError(error) {
  // 网络错误
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new AppError(
        ERROR_MESSAGES[ERROR_TYPES.TIMEOUT_ERROR],
        ERROR_TYPES.TIMEOUT_ERROR,
        408
      )
    }
    return new AppError(
      ERROR_MESSAGES[ERROR_TYPES.NETWORK_ERROR],
      ERROR_TYPES.NETWORK_ERROR,
      0
    )
  }

  const { status, data } = error.response
  const errorType = STATUS_CODE_MAP[status] || ERROR_TYPES.UNKNOWN_ERROR
  
  // 从响应中提取错误信息
  let message = ERROR_MESSAGES[errorType]
  let details = null
  
  if (data && data.error) {
    message = data.error.message || message
    details = data.error.details || null
  }
  
  return new AppError(message, errorType, status, details)
}

// 错误显示配置
const DISPLAY_CONFIG = {
  [ERROR_TYPES.VALIDATION_ERROR]: {
    type: 'message',
    messageType: 'warning',
    duration: 3000
  },
  [ERROR_TYPES.AUTHENTICATION_ERROR]: {
    type: 'notification',
    messageType: 'error',
    duration: 5000
  },
  [ERROR_TYPES.AUTHORIZATION_ERROR]: {
    type: 'notification',
    messageType: 'error',
    duration: 5000
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    type: 'notification',
    messageType: 'error',
    duration: 0 // 不自动关闭
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    type: 'notification',
    messageType: 'error',
    duration: 5000
  }
}

// 显示错误消息
export function showError(error, options = {}) {
  const appError = error instanceof AppError ? error : parseApiError(error)
  const config = DISPLAY_CONFIG[appError.type] || DISPLAY_CONFIG[ERROR_TYPES.UNKNOWN_ERROR]
  
  const displayOptions = {
    ...config,
    ...options
  }
  
  const messageContent = {
    message: appError.message,
    type: displayOptions.messageType,
    duration: displayOptions.duration
  }
  
  // 添加详细信息
  if (appError.details && Array.isArray(appError.details)) {
    messageContent.message += '\n' + appError.details.join('\n')
  }
  
  // 根据配置选择显示方式
  if (displayOptions.type === 'notification') {
    ElNotification({
      title: '错误提示',
      ...messageContent,
      position: 'top-right'
    })
  } else {
    ElMessage(messageContent)
  }
  
  // 开发环境下打印详细错误信息
  const debugConfig = getDebugConfig()
  if (debugConfig.enabled) {
    console.error('Error Details:', {
      message: appError.message,
      type: appError.type,
      statusCode: appError.statusCode,
      details: appError.details,
      timestamp: appError.timestamp,
      originalError: error
    })
  }
}

// 成功消息显示
export function showSuccess(message, options = {}) {
  const defaultOptions = {
    type: 'success',
    duration: 3000
  }
  
  ElMessage({
    message,
    ...defaultOptions,
    ...options
  })
}

// 警告消息显示
export function showWarning(message, options = {}) {
  const defaultOptions = {
    type: 'warning',
    duration: 3000
  }
  
  ElMessage({
    message,
    ...defaultOptions,
    ...options
  })
}

// 信息消息显示
export function showInfo(message, options = {}) {
  const defaultOptions = {
    type: 'info',
    duration: 3000
  }
  
  ElMessage({
    message,
    ...defaultOptions,
    ...options
  })
}

// 错误边界处理
export function handleGlobalError(error, vm, info) {
  console.error('Global Error:', error, info)
  
  // 显示用户友好的错误消息
  showError(new AppError(
    '应用程序遇到了一个错误，请刷新页面重试',
    ERROR_TYPES.UNKNOWN_ERROR
  ))
}

// 异步操作错误处理包装器
export function withErrorHandling(asyncFn, options = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args)
    } catch (error) {
      if (!options.silent) {
        showError(error, options.displayOptions)
      }
      
      if (options.rethrow) {
        throw error
      }
      
      return options.fallback || null
    }
  }
}

// 表单验证错误处理
export function handleValidationErrors(errors) {
  if (Array.isArray(errors)) {
    const messages = errors.map(err => err.message || err).join('\n')
    showError(new AppError(
      messages,
      ERROR_TYPES.VALIDATION_ERROR,
      400,
      errors
    ))
  } else if (typeof errors === 'object') {
    const messages = Object.values(errors).flat().join('\n')
    showError(new AppError(
      messages,
      ERROR_TYPES.VALIDATION_ERROR,
      400,
      errors
    ))
  } else {
    showError(new AppError(
      errors || '表单验证失败',
      ERROR_TYPES.VALIDATION_ERROR
    ))
  }
}

// 导出默认错误处理器
export default {
  AppError,
  ERROR_TYPES,
  parseApiError,
  showError,
  showSuccess,
  showWarning,
  showInfo,
  handleGlobalError,
  withErrorHandling,
  handleValidationErrors
}