// 环境配置管理

// 获取当前环境
const getEnv = () => {
  return import.meta.env.MODE || 'development'
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
    name: '方度素材管理系统',
    version: '1.0.0',
    description: '方度素材管理系统前端应用'
  },
  
  // 分页配置
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  },
  
  // 上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  
  // UI配置
  ui: {
    theme: 'light',
    primaryColor: '#3b82f6',
    borderRadius: '8px'
  },
  
  // 缓存配置
  cache: {
    tokenKey: 'auth_token',
    userKey: 'user_info',
    themeKey: 'app_theme'
  }
}

// 开发环境配置
const developmentConfig = {
  ...baseConfig,
  
  // API配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
    timeout: 10000,
    enableMock: false
  },
  
  // 调试配置
  debug: {
    enabled: true,
    logLevel: 'debug',
    showApiLogs: true,
    showStateChanges: true
  },
  
  // 性能配置
  performance: {
    enableDevtools: true,
    enableHMR: true
  }
}

// 生产环境配置
const productionConfig = {
  ...baseConfig,
  
  // API配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.fangdu.com',
    timeout: 30000,
    enableMock: false
  },
  
  // 调试配置
  debug: {
    enabled: false,
    logLevel: 'error',
    showApiLogs: false,
    showStateChanges: false
  },
  
  // 性能配置
  performance: {
    enableDevtools: false,
    enableHMR: false
  },
  
  // 安全配置
  security: {
    enableCSP: true,
    enableHTTPS: true
  }
}

// 测试环境配置
const testConfig = {
  ...baseConfig,
  
  // API配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
    timeout: 5000,
    enableMock: true
  },
  
  // 调试配置
  debug: {
    enabled: true,
    logLevel: 'info',
    showApiLogs: true,
    showStateChanges: false
  },
  
  // 性能配置
  performance: {
    enableDevtools: true,
    enableHMR: false
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

// 获取API基础URL
const getApiBaseURL = () => {
  return getConfig().api.baseURL
}

// 获取调试配置
const getDebugConfig = () => {
  return getConfig().debug
}

// 是否启用调试
const isDebugEnabled = () => {
  return getDebugConfig().enabled
}

// 导出配置
export {
  getEnv,
  isDev,
  isProd,
  isTest,
  getConfig,
  getApiBaseURL,
  getDebugConfig,
  isDebugEnabled,
  baseConfig,
  developmentConfig,
  productionConfig,
  testConfig
}

// 默认导出当前环境配置
export default getConfig()