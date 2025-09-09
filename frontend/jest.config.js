module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'vue',
    'ts',
    'tsx'
  ],
  
  // 转换配置
  transform: {
    '^.+\.vue$': '@vue/vue3-jest',
    '^.+\.(js|jsx)$': 'babel-jest',
    '^.+\.(ts|tsx)$': 'ts-jest'
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@vue|vue-router|pinia)/)',
  ],
  
  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  
  // 测试匹配模式
  testMatch: [
    '**/tests/unit/**/*.spec.(js|jsx|ts|tsx)|**/__tests__/*.(js|jsx|ts|tsx)',
    '**/src/**/*.test.(js|jsx|ts|tsx)'
  ],
  
  // 收集覆盖率的文件
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!src/router/index.js',
    '!**/node_modules/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // 全局变量
  globals: {
    'vue-jest': {
      pug: {
        doctype: 'html'
      }
    }
  },
  
  // 清除模拟
  clearMocks: true,
  
  // 重置模拟
  resetMocks: true,
  
  // 恢复模拟
  restoreMocks: true,
  
  // 测试超时
  testTimeout: 10000,
  
  // 详细输出
  verbose: true
}