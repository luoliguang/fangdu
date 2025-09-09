// 统一错误处理中间件
const { getConfig } = require('../config/env')

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

// 常见错误类型
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

class AuthenticationError extends AppError {
  constructor(message = '身份验证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

// 错误处理函数
const handleCastErrorDB = (err) => {
  const message = `无效的 ${err.path}: ${err.value}`
  return new ValidationError(message)
}

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["])(\\?.)*?\1/)[0]
  const message = `重复的字段值: ${value}. 请使用其他值！`
  return new ValidationError(message)
}

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message)
  const message = `无效的输入数据. ${errors.join('. ')}`
  return new ValidationError(message, errors)
}

const handleJWTError = () =>
  new AuthenticationError('无效的token，请重新登录！')

const handleJWTExpiredError = () =>
  new AuthenticationError('您的token已过期！请重新登录。')

// 发送错误响应
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
      stack: err.stack,
      details: err.details || null
    }
  })
}

const sendErrorProd = (err, res) => {
  // 操作性错误，可以信任的错误：发送消息给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null
      }
    })
  } else {
    // 编程错误：不要泄露错误详情
    console.error('ERROR 💥', err)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      }
    })
  }
}

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.code = err.code || 'INTERNAL_ERROR'
  
  const config = getConfig()
  
  if (config.app.env === 'development') {
    sendErrorDev(err, res)
  } else {
    let error = { ...err }
    error.message = err.message
    
    // 处理特定类型的错误
    if (error.name === 'CastError') error = handleCastErrorDB(error)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error)
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error)
    if (error.name === 'JsonWebTokenError') error = handleJWTError()
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
    
    sendErrorProd(error, res)
  }
}

// 异步错误捕获包装器
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// 404错误处理中间件
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`无法找到 ${req.originalUrl} 路由`)
  next(err)
}

// 未捕获异常处理
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...')
    console.log(err.name, err.message)
    process.exit(1)
  })
}

// 未处理的Promise拒绝
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...')
    console.log(err.name, err.message)
    server.close(() => {
      process.exit(1)
    })
  })
}

module.exports = {
  // 错误类
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // 中间件
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  
  // 进程错误处理
  handleUncaughtException,
  handleUnhandledRejection
}