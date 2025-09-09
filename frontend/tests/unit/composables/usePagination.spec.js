import { describe, it, expect, beforeEach } from 'vitest'
import { usePagination } from '@/composables/usePagination'

describe('usePagination', () => {
  let pagination
  
  beforeEach(() => {
    pagination = usePagination({
      initialPage: 1,
      initialPageSize: 10
    })
  })
  
  it('initializes with correct default values', () => {
    expect(pagination.currentPage.value).toBe(1)
    expect(pagination.pageSize.value).toBe(10)
    expect(pagination.totalItems.value).toBe(0)
    expect(pagination.totalPages.value).toBe(0)
  })
  
  it('calculates total pages correctly', () => {
    pagination.updatePagination({ totalItems: 25 })
    expect(pagination.totalPages.value).toBe(3)
    
    pagination.updatePagination({ totalItems: 30 })
    expect(pagination.totalPages.value).toBe(3)
    
    pagination.updatePagination({ totalItems: 31 })
    expect(pagination.totalPages.value).toBe(4)
  })
  
  it('handles zero total items', () => {
    pagination.updatePagination({ totalItems: 0 })
    expect(pagination.totalPages.value).toBe(0)
  })
  
  it('goes to specific page correctly', () => {
    pagination.updatePagination({ totalItems: 50 })
    
    pagination.goToPage(3)
    expect(pagination.currentPage.value).toBe(3)
  })
  
  it('prevents going to invalid pages', () => {
    pagination.updatePagination({ totalItems: 50 })
    
    // 尝试跳转到负数页
    pagination.goToPage(-1)
    expect(pagination.currentPage.value).toBe(1)
    
    // 尝试跳转到超出范围的页
    pagination.goToPage(10)
    expect(pagination.currentPage.value).toBe(1)
    
    // 跳转到有效页面
    pagination.goToPage(3)
    expect(pagination.currentPage.value).toBe(3)
    
    // 尝试跳转到超出范围的页
    pagination.goToPage(10)
    expect(pagination.currentPage.value).toBe(3)
  })
  
  it('goes to next page correctly', () => {
    pagination.updatePagination({ totalItems: 50 })
    
    pagination.nextPage()
    expect(pagination.currentPage.value).toBe(2)
    
    pagination.nextPage()
    expect(pagination.currentPage.value).toBe(3)
  })
  
  it('prevents going beyond last page', () => {
    pagination.updatePagination({ totalItems: 25 })
    pagination.goToPage(3) // 最后一页
    
    pagination.nextPage()
    expect(pagination.currentPage.value).toBe(3) // 应该保持在最后一页
  })
  
  it('goes to previous page correctly', () => {
    pagination.updatePagination({ totalItems: 50 })
    pagination.goToPage(3)
    
    pagination.prevPage()
    expect(pagination.currentPage.value).toBe(2)
    
    pagination.prevPage()
    expect(pagination.currentPage.value).toBe(1)
  })
  
  it('prevents going before first page', () => {
    pagination.updatePagination({ totalItems: 50 })
    
    pagination.prevPage()
    expect(pagination.currentPage.value).toBe(1) // 应该保持在第一页
  })
  
  it('updates pagination data correctly', () => {
    pagination.updatePagination({
      totalItems: 100,
      pageSize: 20
    })
    
    expect(pagination.totalItems.value).toBe(100)
    expect(pagination.pageSize.value).toBe(20)
    expect(pagination.totalPages.value).toBe(5)
  })
  
  it('resets to first page when total items change', () => {
    pagination.updatePagination({ totalItems: 50 })
    pagination.goToPage(3)
    
    pagination.updatePagination({ totalItems: 20 })
    expect(pagination.currentPage.value).toBe(1)
  })
  
  it('handles page size changes correctly', () => {
    pagination.updatePagination({ totalItems: 50 })
    pagination.goToPage(3)
    
    pagination.updatePagination({ pageSize: 25 })
    expect(pagination.totalPages.value).toBe(2)
    expect(pagination.currentPage.value).toBe(1) // 重置到第一页
  })
  
  it('provides correct pagination info', () => {
    pagination.updatePagination({ totalItems: 47, pageSize: 10 })
    pagination.goToPage(3)
    
    expect(pagination.currentPage.value).toBe(3)
    expect(pagination.pageSize.value).toBe(10)
    expect(pagination.totalItems.value).toBe(47)
    expect(pagination.totalPages.value).toBe(5)
  })
  
  it('works with different initial values', () => {
    const customPagination = usePagination({
      initialPage: 2,
      initialPageSize: 20
    })
    
    expect(customPagination.currentPage.value).toBe(2)
    expect(customPagination.pageSize.value).toBe(20)
  })
  
  it('handles edge case with single item', () => {
    pagination.updatePagination({ totalItems: 1 })
    
    expect(pagination.totalPages.value).toBe(1)
    expect(pagination.currentPage.value).toBe(1)
    
    pagination.nextPage()
    expect(pagination.currentPage.value).toBe(1)
    
    pagination.prevPage()
    expect(pagination.currentPage.value).toBe(1)
  })
  
  it('maintains reactivity', () => {
    const { currentPage, totalItems, totalPages } = pagination
    
    // 验证响应式
    expect(totalPages.value).toBe(0)
    
    totalItems.value = 50
    expect(totalPages.value).toBe(5)
    
    currentPage.value = 3
    expect(currentPage.value).toBe(3)
  })
})