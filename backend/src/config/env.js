// 后端环境配置管理
const path = require('path')
const fs = require('fs')

// 获取当前环境
const getEnv = () => {
  return process.env.NODE_ENV || 'development'
}

// 判断是否为开发环境
const isDev = () => {
  return getEnv() === 'development'
}

// 判断是否为生产环境
const isProd = () => {
  return getEnv() === 'production'
}

// 判断是否为测试环境
const isTest = () => {
  return getEnv() === 'test'
}

// 基础配置
const baseConfig = {
  // 应用信息
  app: {
    name: '房屋租赁管理系统API',
    version: '1.0.0',
    description: '房屋租赁管理系统后端API服务'
  },
  
  // 服务器配置
  server: {
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT) || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // 上传配置
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
  },
  
  // 分页配置
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_LIMIT) || 10,
    maxLimit: parseInt(process.env.MAX_LIMIT) || 100
  }
}

// 开发环境配置
const developmentConfig = {
  ...baseConfig,
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'fangdu_dev',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    enableConsole: true,
    enableFile: false,
    logDir: path.join(__dirname, '../../logs')
  },
  
  // 缓存配置
  cache: {
    enabled: false,
    type: 'memory',
    ttl: 300 // 5分钟
  }
}

// 生产环境配置
const productionConfig = {
  ...baseConfig,
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'fangdu_prod',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: false,
    enableFile: true,
    logDir: process.env.LOG_DIR || '/var/log/fangdu'
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    type: 'redis',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD
    },
    ttl: 3600 // 1小时
  },
  
  // 安全配置
  security: {
    enableHelmet: true,
    enableRateLimit: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 限制每个IP 15分钟内最多100个请求
    }
  }
}

// 测试环境配置
const testConfig = {
  ...baseConfig,
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'fangdu_test',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'error',
    enableConsole: false,
    enableFile: false
  },
  
  // 缓存配置
  cache: {
    enabled: false,
    type: 'memory',
    ttl: 60 // 1分钟
  }
}

// 环境配置映射
const envConfigs = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig
}

// 获取当前环境配置
const getConfig = () => {
  const env = getEnv()
  return envConfigs[env] || developmentConfig
}

// 验证必需的环境变量
const validateEnv = () => {
  const config = getConfig()
  const requiredVars = []
  
  if (isProd()) {
    requiredVars.push(
      'DB_HOST',
      'DB_USERNAME', 
      'DB_PASSWORD',
      'DB_DATABASE',
      'JWT_SECRET'
    )
  }
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  return config
}

// 创建必要的目录
const createDirectories = () => {
  const config = getConfig()
  const dirs = [
    config.upload.uploadDir
  ]
  
  if (config.logging && config.logging.enableFile) {
    dirs.push(config.logging.logDir)
  }
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

module.exports = {
  getEnv,
  isDev,
  isProd,
  isTest,
  getConfig,
  validateEnv,
  createDirectories,
  baseConfig,
  developmentConfig,
  productionConfig,
  testConfig
}