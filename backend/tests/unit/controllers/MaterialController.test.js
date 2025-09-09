const { describe, it, expect, beforeEach, jest } = require('@jest/globals')
const MaterialController = require('../../../controllers/MaterialController')
const MaterialService = require('../../../services/MaterialService')

// 模拟 MaterialService
jest.mock('../../../services/MaterialService')

describe('MaterialController', () => {
  let req, res, next
  
  beforeEach(() => {
    req = createMockRequest()
    res = createMockResponse()
    next = createMockNext()
    
    // 清除所有模拟
    jest.clearAllMocks()
  })
  
  describe('getAllMaterials', () => {
    it('should return paginated materials successfully', async () => {
      const mockMaterials = [
        { id: 1, title: '素材1', description: '描述1' },
        { id: 2, title: '素材2', description: '描述2' }
      ]
      const mockResult = {
        materials: mockMaterials,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
      
      req.query = { page: '1', limit: '10' }
      MaterialService.getAllMaterials.mockResolvedValue(mockResult)
      
      await MaterialController.getAllMaterials(req, res, next)
      
      expect(MaterialService.getAllMaterials).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        userId: undefined
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      })
    })
    
    it('should handle search parameter', async () => {
      req.query = { page: '1', limit: '10', search: '测试' }
      MaterialService.getAllMaterials.mockResolvedValue({
        materials: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      })
      
      await MaterialController.getAllMaterials(req, res, next)
      
      expect(MaterialService.getAllMaterials).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: '测试',
        userId: undefined
      })
    })
    
    it('should handle service error', async () => {
      const error = new Error('Database error')
      MaterialService.getAllMaterials.mockRejectedValue(error)
      
      await MaterialController.getAllMaterials(req, res, next)
      
      expect(next).toHaveBeenCalledWith(error)
    })
    
    it('should use default pagination values', async () => {
      req.query = {}
      MaterialService.getAllMaterials.mockResolvedValue({
        materials: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      })
      
      await MaterialController.getAllMaterials(req, res, next)
      
      expect(MaterialService.getAllMaterials).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        userId: undefined
      })
    })
  })
  
  describe('getMaterialById', () => {
    it('should return material by id successfully', async () => {
      const mockMaterial = {
        id: 1,
        title: '测试素材',
        description: '测试描述'
      }
      
      req.params = { id: '1' }
      MaterialService.getMaterialById.mockResolvedValue(mockMaterial)
      
      await MaterialController.getMaterialById(req, res, next)
      
      expect(MaterialService.getMaterialById).toHaveBeenCalledWith(1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMaterial
      })
    })
    
    it('should handle material not found', async () => {
      req.params = { id: '999' }
      MaterialService.getMaterialById.mockResolvedValue(null)
      
      await MaterialController.getMaterialById(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '素材不存在'
      })
    })
    
    it('should handle invalid id parameter', async () => {
      req.params = { id: 'invalid' }
      
      await MaterialController.getMaterialById(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '无效的素材ID'
      })
    })
  })
  
  describe('createMaterial', () => {
    it('should create material successfully', async () => {
      const mockMaterial = {
        id: 1,
        title: '新素材',
        description: '新描述',
        userId: 1
      }
      
      req.body = {
        title: '新素材',
        description: '新描述'
      }
      req.user = { id: 1 }
      MaterialService.createMaterial.mockResolvedValue(mockMaterial)
      
      await MaterialController.createMaterial(req, res, next)
      
      expect(MaterialService.createMaterial).toHaveBeenCalledWith({
        title: '新素材',
        description: '新描述',
        userId: 1
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMaterial,
        message: '素材创建成功'
      })
    })
    
    it('should handle missing required fields', async () => {
      req.body = { description: '只有描述' }
      req.user = { id: 1 }
      
      await MaterialController.createMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '标题和描述不能为空'
      })
    })
    
    it('should handle unauthorized user', async () => {
      req.body = {
        title: '新素材',
        description: '新描述'
      }
      req.user = undefined
      
      await MaterialController.createMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '用户未认证'
      })
    })
  })
  
  describe('updateMaterial', () => {
    it('should update material successfully', async () => {
      const mockMaterial = {
        id: 1,
        title: '更新后的素材',
        description: '更新后的描述',
        userId: 1
      }
      
      req.params = { id: '1' }
      req.body = {
        title: '更新后的素材',
        description: '更新后的描述'
      }
      req.user = { id: 1 }
      MaterialService.updateMaterial.mockResolvedValue(mockMaterial)
      
      await MaterialController.updateMaterial(req, res, next)
      
      expect(MaterialService.updateMaterial).toHaveBeenCalledWith(1, {
        title: '更新后的素材',
        description: '更新后的描述'
      }, 1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMaterial,
        message: '素材更新成功'
      })
    })
    
    it('should handle material not found', async () => {
      req.params = { id: '999' }
      req.body = { title: '更新标题' }
      req.user = { id: 1 }
      MaterialService.updateMaterial.mockResolvedValue(null)
      
      await MaterialController.updateMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '素材不存在或无权限修改'
      })
    })
    
    it('should handle empty update data', async () => {
      req.params = { id: '1' }
      req.body = {}
      req.user = { id: 1 }
      
      await MaterialController.updateMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '没有提供更新数据'
      })
    })
  })
  
  describe('deleteMaterial', () => {
    it('should delete material successfully', async () => {
      req.params = { id: '1' }
      req.user = { id: 1 }
      MaterialService.deleteMaterial.mockResolvedValue(true)
      
      await MaterialController.deleteMaterial(req, res, next)
      
      expect(MaterialService.deleteMaterial).toHaveBeenCalledWith(1, 1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '素材删除成功'
      })
    })
    
    it('should handle material not found or no permission', async () => {
      req.params = { id: '999' }
      req.user = { id: 1 }
      MaterialService.deleteMaterial.mockResolvedValue(false)
      
      await MaterialController.deleteMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '素材不存在或无权限删除'
      })
    })
    
    it('should handle unauthorized user', async () => {
      req.params = { id: '1' }
      req.user = undefined
      
      await MaterialController.deleteMaterial(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '用户未认证'
      })
    })
  })
  
  describe('uploadMaterialImage', () => {
    it('should upload image successfully', async () => {
      const mockFile = {
        filename: 'test.jpg',
        path: '/uploads/test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      }
      
      req.file = mockFile
      req.params = { id: '1' }
      req.user = { id: 1 }
      
      const mockMaterial = {
        id: 1,
        title: '素材',
        imageUrl: '/uploads/test.jpg'
      }
      
      MaterialService.updateMaterialImage.mockResolvedValue(mockMaterial)
      
      await MaterialController.uploadMaterialImage(req, res, next)
      
      expect(MaterialService.updateMaterialImage).toHaveBeenCalledWith(1, '/uploads/test.jpg', 1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMaterial,
        message: '图片上传成功'
      })
    })
    
    it('should handle no file uploaded', async () => {
      req.file = undefined
      req.params = { id: '1' }
      req.user = { id: 1 }
      
      await MaterialController.uploadMaterialImage(req, res, next)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '请选择要上传的图片'
      })
    })
  })
})