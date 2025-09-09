import { ref, computed } from 'vue'

/**
 * 分页组合式函数
 * @param {Object} options - 配置选项
 * @param {number} options.initialPage - 初始页码，默认为1
 * @param {number} options.initialLimit - 每页数量，默认为10
 * @returns {Object} 分页相关的响应式数据和方法
 */
export function usePagination(options = {}) {
  const {
    initialPage = 1,
    initialLimit = 10
  } = options

  // 响应式状态
  const currentPage = ref(initialPage)
  const totalPages = ref(1)
  const totalCount = ref(0)
  const limit = ref(initialLimit)

  // 计算属性
  const isPrevDisabled = computed(() => currentPage.value <= 1)
  const isNextDisabled = computed(() => currentPage.value >= totalPages.value)
  const hasData = computed(() => totalCount.value > 0)
  const startIndex = computed(() => (currentPage.value - 1) * limit.value + 1)
  const endIndex = computed(() => {
    const end = currentPage.value * limit.value
    return end > totalCount.value ? totalCount.value : end
  })

  // 分页信息文本
  const paginationInfo = computed(() => {
    if (totalCount.value === 0) return '暂无数据'
    return `显示第 ${startIndex.value} - ${endIndex.value} 条，共 ${totalCount.value} 条`
  })

  // 页码范围（用于显示页码按钮）
  const pageRange = computed(() => {
    const range = []
    const maxVisible = 5 // 最多显示5个页码按钮
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages.value, start + maxVisible - 1)
    
    // 调整起始位置
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i)
    }
    return range
  })

  // 方法
  const goToPage = (page) => {
    if (page < 1 || page > totalPages.value || page === currentPage.value) {
      return false
    }
    currentPage.value = page
    return true
  }

  const goToPrevPage = () => {
    return goToPage(currentPage.value - 1)
  }

  const goToNextPage = () => {
    return goToPage(currentPage.value + 1)
  }

  const goToFirstPage = () => {
    return goToPage(1)
  }

  const goToLastPage = () => {
    return goToPage(totalPages.value)
  }

  // 更新分页数据
  const updatePagination = (data) => {
    if (data.currentPage !== undefined) currentPage.value = data.currentPage
    if (data.totalPages !== undefined) totalPages.value = data.totalPages
    if (data.totalCount !== undefined) totalCount.value = data.totalCount
    if (data.limit !== undefined) limit.value = data.limit
  }

  // 重置分页
  const resetPagination = () => {
    currentPage.value = initialPage
    totalPages.value = 1
    totalCount.value = 0
    limit.value = initialLimit
  }

  // 设置每页数量
  const setLimit = (newLimit) => {
    limit.value = newLimit
    // 重新计算当前页，确保不超出范围
    const newTotalPages = Math.ceil(totalCount.value / newLimit)
    if (currentPage.value > newTotalPages) {
      currentPage.value = Math.max(1, newTotalPages)
    }
    totalPages.value = newTotalPages
  }

  return {
    // 响应式状态
    currentPage,
    totalPages,
    totalCount,
    limit,
    
    // 计算属性
    isPrevDisabled,
    isNextDisabled,
    hasData,
    startIndex,
    endIndex,
    paginationInfo,
    pageRange,
    
    // 方法
    goToPage,
    goToPrevPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    updatePagination,
    resetPagination,
    setLimit
  }
}