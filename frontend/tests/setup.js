import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// 全局配置
config.global.mocks = {
  // 模拟路由
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    name: 'home',
    params: {},
    query: {},
    meta: {}
  },
  // 模拟国际化
  $t: (key) => key,
  $tc: (key) => key,
  $te: () => true,
  $d: (value) => value,
  $n: (value) => value
}

// 全局插件
config.global.plugins = []

// 模拟全局属性
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟 ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver

// 模拟 IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// 模拟 fetch
global.fetch = vi.fn()

// 模拟 URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'mocked-url')
URL.revokeObjectURL = vi.fn()

// 模拟 File 和 FileReader
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks
    this.name = filename
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
}

global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.error = null
    this.onload = null
    this.onerror = null
    this.onabort = null
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = `data:${file.type};base64,mock-base64-data`
      if (this.onload) this.onload()
    }, 0)
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'mock-text-content'
      if (this.onload) this.onload()
    }, 0)
  }
  
  abort() {
    this.readyState = 2
    if (this.onabort) this.onabort()
  }
}

// 模拟 console 方法（避免测试时的日志输出）
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

// 清理函数
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})

// 全局测试工具函数
global.createMockRouter = (options = {}) => {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: {
      value: {
        path: '/',
        name: 'home',
        params: {},
        query: {},
        meta: {},
        ...options.currentRoute
      }
    },
    ...options
  }
}

global.createMockStore = (initialState = {}) => {
  return {
    state: { ...initialState },
    getters: {},
    commit: vi.fn(),
    dispatch: vi.fn()
  }
}

// 异步测试工具
global.flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// 等待 Vue 更新
global.nextTick = () => new Promise(resolve => setTimeout(resolve, 0))