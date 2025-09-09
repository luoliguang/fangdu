const { jest } = require('@jest/globals')
const path = require('path')

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '3306'
process.env.DB_NAME = 'fangdu_test'
process.env.DB_USER = 'test_user'
process.env.DB_PASSWORD = 'test_password'
process.env.JWT_SECRET = 'test_jwt_secret_key'
process.env.JWT_EXPIRES_IN = '1h'
process.env.UPLOAD_PATH = path.join(__dirname, '../test_uploads')
process.env.LOG_LEVEL = 'error'

// 模拟数据库连接
const mockConnection = {
  query: jest.fn(),
  execute: jest.fn(),
  end: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
}

// 模拟数据库池
const mockPool = {
  getConnection: jest.fn().mockResolvedValue(mockConnection),
  query: jest.fn(),
  execute: jest.fn(),
  end: jest.fn()
}

// 模拟 mysql2
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool),
  createConnection: jest.fn(() => mockConnection)
}))

// 模拟 bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt')
}))

// 模拟 jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ id: 1, username: 'testuser' }),
  decode: jest.fn().mockReturnValue({ id: 1, username: 'testuser' })
}))

// 模拟 multer
const mockMulter = {
  single: jest.fn(() => (req, res, next) => {
    req.file = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      size: 1024
    }
    next()
  }),
  array: jest.fn(() => (req, res, next) => {
    req.files = [{
      fieldname: 'files',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      size: 1024
    }]
    next()
  })
}

jest.mock('multer', () => jest.fn(() => mockMulter))

// 模拟 fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('file content'),
  writeFile: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue(),
  mkdir: jest.fn().mockResolvedValue(),
  access: jest.fn().mockResolvedValue(),
  stat: jest.fn().mockResolvedValue({ size: 1024, isFile: () => true })
}))

// 模拟 path
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  extname: jest.fn((filename) => {
    const parts = filename.split('.')
    return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
  })
}))

// 全局测试工具函数
global.createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, username: 'testuser' },
    file: null,
    files: null,
    ...overrides
  }
}

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    locals: {}
  }
  return res
}

global.createMockNext = () => jest.fn()

// 数据库测试工具
global.mockDbQuery = (result) => {
  mockConnection.query.mockResolvedValueOnce([result])
  mockPool.query.mockResolvedValueOnce([result])
}

global.mockDbExecute = (result) => {
  mockConnection.execute.mockResolvedValueOnce([result])
  mockPool.execute.mockResolvedValueOnce([result])
}

global.mockDbError = (error) => {
  mockConnection.query.mockRejectedValueOnce(error)
  mockConnection.execute.mockRejectedValueOnce(error)
  mockPool.query.mockRejectedValueOnce(error)
  mockPool.execute.mockRejectedValueOnce(error)
}

// 清理函数
beforeEach(() => {
  jest.clearAllMocks()
})

aftereEach(() => {
  jest.restoreAllMocks()
})

// 测试数据
global.testData = {
  user: {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed_password'
  },
  material: {
    id: 1,
    title: '测试素材',
    description: '测试描述',
    imageUrl: 'http://example.com/image.jpg',
    userId: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  feedback: {
    id: 1,
    materialId: 1,
    userId: 1,
    message: '测试反馈',
    createdAt: new Date('2024-01-01')
  },
  visit: {
    id: 1,
    materialId: 1,
    userId: 1,
    visitedAt: new Date('2024-01-01')
  }
}

// 导出模拟对象供测试使用
module.exports = {
  mockConnection,
  mockPool,
  mockMulter
}