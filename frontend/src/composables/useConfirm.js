import { ref } from 'vue'

/**
 * 确认对话框组合式函数
 * @param {Object} options - 配置选项
 * @returns {Object} 确认对话框相关的响应式数据和方法
 */
export function useConfirm(options = {}) {
  const {
    title = '确认操作',
    message = '您确定要执行此操作吗？',
    confirmText = '确认',
    cancelText = '取消',
    type = 'warning' // warning, danger, info, success
  } = options

  // 响应式状态
  const isVisible = ref(false)
  const isLoading = ref(false)
  const currentTitle = ref(title)
  const currentMessage = ref(message)
  const currentConfirmText = ref(confirmText)
  const currentCancelText = ref(cancelText)
  const currentType = ref(type)
  
  // 回调函数
  let resolveCallback = null
  let rejectCallback = null

  // 显示确认对话框
  const show = (customOptions = {}) => {
    const {
      title: customTitle,
      message: customMessage,
      confirmText: customConfirmText,
      cancelText: customCancelText,
      type: customType
    } = customOptions

    // 更新配置
    currentTitle.value = customTitle || title
    currentMessage.value = customMessage || message
    currentConfirmText.value = customConfirmText || confirmText
    currentCancelText.value = customCancelText || cancelText
    currentType.value = customType || type
    
    isVisible.value = true
    isLoading.value = false

    return new Promise((resolve, reject) => {
      resolveCallback = resolve
      rejectCallback = reject
    })
  }

  // 确认操作
  const confirm = async () => {
    if (resolveCallback) {
      isLoading.value = true
      try {
        await resolveCallback(true)
        hide()
      } catch (error) {
        isLoading.value = false
        throw error
      }
    }
  }

  // 取消操作
  const cancel = () => {
    if (rejectCallback) {
      rejectCallback(false)
    }
    hide()
  }

  // 隐藏对话框
  const hide = () => {
    isVisible.value = false
    isLoading.value = false
    resolveCallback = null
    rejectCallback = null
  }

  // 快捷方法
  const showWarning = (message, title = '警告') => {
    return show({
      title,
      message,
      type: 'warning'
    })
  }

  const showDanger = (message, title = '危险操作') => {
    return show({
      title,
      message,
      type: 'danger'
    })
  }

  const showInfo = (message, title = '提示') => {
    return show({
      title,
      message,
      type: 'info'
    })
  }

  const showSuccess = (message, title = '成功') => {
    return show({
      title,
      message,
      type: 'success'
    })
  }

  // 删除确认
  const confirmDelete = (itemName = '此项') => {
    return show({
      title: '确认删除',
      message: `您确定要删除${itemName}吗？此操作不可撤销。`,
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    })
  }

  return {
    // 响应式状态
    isVisible,
    isLoading,
    currentTitle,
    currentMessage,
    currentConfirmText,
    currentCancelText,
    currentType,
    
    // 方法
    show,
    confirm,
    cancel,
    hide,
    showWarning,
    showDanger,
    showInfo,
    showSuccess,
    confirmDelete
  }
}

/**
 * 全局确认对话框实例
 */
let globalConfirm = null

export function useGlobalConfirm() {
  if (!globalConfirm) {
    globalConfirm = useConfirm()
  }
  return globalConfirm
}

/**
 * 简化的确认函数
 * @param {string} message - 确认消息
 * @param {Object} options - 配置选项
 * @returns {Promise<boolean>} 用户选择结果
 */
export async function confirm(message, options = {}) {
  const confirmInstance = useGlobalConfirm()
  try {
    await confirmInstance.show({ message, ...options })
    return true
  } catch {
    return false
  }
}

/**
 * 删除确认函数
 * @param {string} itemName - 要删除的项目名称
 * @returns {Promise<boolean>} 用户选择结果
 */
export async function confirmDelete(itemName = '此项') {
  const confirmInstance = useGlobalConfirm()
  try {
    await confirmInstance.confirmDelete(itemName)
    return true
  } catch {
    return false
  }
}