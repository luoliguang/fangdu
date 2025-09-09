import { ref, computed } from 'vue'

/**
 * 加载状态组合式函数
 * @param {boolean} initialState - 初始加载状态，默认为false
 * @returns {Object} 加载相关的响应式数据和方法
 */
export function useLoading(initialState = false) {
  const isLoading = ref(initialState)
  const loadingTasks = ref(new Set())

  // 计算属性
  const hasActiveTasks = computed(() => loadingTasks.value.size > 0)

  // 开始加载
  const startLoading = (taskId = 'default') => {
    loadingTasks.value.add(taskId)
    isLoading.value = true
  }

  // 结束加载
  const stopLoading = (taskId = 'default') => {
    loadingTasks.value.delete(taskId)
    if (loadingTasks.value.size === 0) {
      isLoading.value = false
    }
  }

  // 切换加载状态
  const toggleLoading = (taskId = 'default') => {
    if (loadingTasks.value.has(taskId)) {
      stopLoading(taskId)
    } else {
      startLoading(taskId)
    }
  }

  // 清除所有加载任务
  const clearAllLoading = () => {
    loadingTasks.value.clear()
    isLoading.value = false
  }

  // 异步操作包装器
  const withLoading = async (asyncFn, taskId = 'default') => {
    try {
      startLoading(taskId)
      const result = await asyncFn()
      return result
    } finally {
      stopLoading(taskId)
    }
  }

  // 检查特定任务是否在加载中
  const isTaskLoading = (taskId) => {
    return loadingTasks.value.has(taskId)
  }

  return {
    // 响应式状态
    isLoading,
    hasActiveTasks,
    
    // 方法
    startLoading,
    stopLoading,
    toggleLoading,
    clearAllLoading,
    withLoading,
    isTaskLoading
  }
}

/**
 * 多个加载状态管理组合式函数
 * @param {Array<string>} taskNames - 任务名称数组
 * @returns {Object} 多个加载状态的响应式数据和方法
 */
export function useMultipleLoading(taskNames = []) {
  const loadingStates = ref({})
  
  // 初始化加载状态
  taskNames.forEach(name => {
    loadingStates.value[name] = false
  })

  // 全局加载状态
  const isAnyLoading = computed(() => {
    return Object.values(loadingStates.value).some(state => state)
  })

  // 设置特定任务的加载状态
  const setLoading = (taskName, state) => {
    if (loadingStates.value.hasOwnProperty(taskName)) {
      loadingStates.value[taskName] = state
    }
  }

  // 开始特定任务加载
  const startTask = (taskName) => {
    setLoading(taskName, true)
  }

  // 结束特定任务加载
  const stopTask = (taskName) => {
    setLoading(taskName, false)
  }

  // 获取特定任务的加载状态
  const isTaskLoading = (taskName) => {
    return loadingStates.value[taskName] || false
  }

  // 异步操作包装器
  const withTaskLoading = async (taskName, asyncFn) => {
    try {
      startTask(taskName)
      const result = await asyncFn()
      return result
    } finally {
      stopTask(taskName)
    }
  }

  // 清除所有加载状态
  const clearAll = () => {
    Object.keys(loadingStates.value).forEach(key => {
      loadingStates.value[key] = false
    })
  }

  return {
    // 响应式状态
    loadingStates,
    isAnyLoading,
    
    // 方法
    setLoading,
    startTask,
    stopTask,
    isTaskLoading,
    withTaskLoading,
    clearAll
  }
}