const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const request = require('supertest')
const app = require('../../server')
const db = require('../../config/database')

describe('Materials API Integration Tests', () => {
  let authToken
  let testUserId
  let testMaterialId
  
  beforeAll(async () => {
    // 等待数据库连接
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 创建测试用户并获取认证令牌
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })
    
    testUserId = userResponse.body.data.user.id
    authToken = userResponse.body.data.token
  })
  
  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await db.query('DELETE FROM materials WHERE userId = ?', [testUserId])
      await db.query('DELETE FROM users WHERE id = ?', [testUserId])
    }
    
    // 关闭数据库连接
    await db.end()
  })
  
  beforeEach(async () => {
    // 清理测试素材数据
    if (testUserId) {
      await db.query('DELETE FROM materials WHERE userId = ?', [testUserId])
    }
  })
  
  describe('POST /api/materials', () => {
    it('should create a new material successfully', async () => {
      const materialData = {
        title: '测试素材',
        description: '这是一个测试素材的描述'
      }
      
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send(materialData)
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.title).toBe(materialData.title)
      expect(response.body.data.description).toBe(materialData.description)
      expect(response.body.data.userId).toBe(testUserId)
      
      testMaterialId = response.body.data.id
    })
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '只有描述，没有标题'
        })
      
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('标题')
    })
    
    it('should return 401 for unauthorized request', async () => {
      const response = await request(app)
        .post('/api/materials')
        .send({
          title: '测试素材',
          description: '测试描述'
        })
      
      expect(response.status).toBe(401)
    })
  })
  
  describe('GET /api/materials', () => {
    beforeEach(async () => {
      // 创建测试素材
      const materials = [
        { title: '素材1', description: '描述1' },
        { title: '素材2', description: '描述2' },
        { title: '素材3', description: '描述3' }
      ]
      
      for (const material of materials) {
        await request(app)
          .post('/api/materials')
          .set('Authorization', `Bearer ${authToken}`)
          .send(material)
      }
    })
    
    it('should get all materials with pagination', async () => {
      const response = await request(app)
        .get('/api/materials')
        .query({ page: 1, limit: 2 })
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.materials).toHaveLength(2)
      expect(response.body.data.total).toBe(3)
      expect(response.body.data.page).toBe(1)
      expect(response.body.data.limit).toBe(2)
      expect(response.body.data.totalPages).toBe(2)
    })
    
    it('should search materials by title', async () => {
      const response = await request(app)
        .get('/api/materials')
        .query({ search: '素材1' })
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.materials).toHaveLength(1)
      expect(response.body.data.materials[0].title).toContain('素材1')
    })
    
    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/materials')
        .query({ search: '不存在的素材' })
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.materials).toHaveLength(0)
      expect(response.body.data.total).toBe(0)
    })
  })
  
  describe('GET /api/materials/:id', () => {
    beforeEach(async () => {
      // 创建测试素材
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试素材',
          description: '测试描述'
        })
      
      testMaterialId = response.body.data.id
    })
    
    it('should get material by id successfully', async () => {
      const response = await request(app)
        .get(`/api/materials/${testMaterialId}`)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testMaterialId)
      expect(response.body.data.title).toBe('测试素材')
    })
    
    it('should return 404 for non-existent material', async () => {
      const response = await request(app)
        .get('/api/materials/99999')
      
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
    
    it('should return 400 for invalid id', async () => {
      const response = await request(app)
        .get('/api/materials/invalid-id')
      
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })
  
  describe('PUT /api/materials/:id', () => {
    beforeEach(async () => {
      // 创建测试素材
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '原始标题',
          description: '原始描述'
        })
      
      testMaterialId = response.body.data.id
    })
    
    it('should update material successfully', async () => {
      const updateData = {
        title: '更新后的标题',
        description: '更新后的描述'
      }
      
      const response = await request(app)
        .put(`/api/materials/${testMaterialId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.description).toBe(updateData.description)
    })
    
    it('should return 404 for non-existent material', async () => {
      const response = await request(app)
        .put('/api/materials/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '更新标题'
        })
      
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
    
    it('should return 401 for unauthorized request', async () => {
      const response = await request(app)
        .put(`/api/materials/${testMaterialId}`)
        .send({
          title: '更新标题'
        })
      
      expect(response.status).toBe(401)
    })
  })
  
  describe('DELETE /api/materials/:id', () => {
    beforeEach(async () => {
      // 创建测试素材
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '待删除素材',
          description: '待删除描述'
        })
      
      testMaterialId = response.body.data.id
    })
    
    it('should delete material successfully', async () => {
      const response = await request(app)
        .delete(`/api/materials/${testMaterialId}`)
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('删除成功')
      
      // 验证素材已被删除
      const getResponse = await request(app)
        .get(`/api/materials/${testMaterialId}`)
      
      expect(getResponse.status).toBe(404)
    })
    
    it('should return 404 for non-existent material', async () => {
      const response = await request(app)
        .delete('/api/materials/99999')
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
    
    it('should return 401 for unauthorized request', async () => {
      const response = await request(app)
        .delete(`/api/materials/${testMaterialId}`)
      
      expect(response.status).toBe(401)
    })
  })
  
  describe('POST /api/materials/:id/upload', () => {
    beforeEach(async () => {
      // 创建测试素材
      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试素材',
          description: '测试描述'
        })
      
      testMaterialId = response.body.data.id
    })
    
    it('should upload image successfully', async () => {
      // 创建测试图片文件
      const testImageBuffer = Buffer.from('fake image data')
      
      const response = await request(app)
        .post(`/api/materials/${testMaterialId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'test.jpg')
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('imageUrl')
    })
    
    it('should return 400 for no file uploaded', async () => {
      const response = await request(app)
        .post(`/api/materials/${testMaterialId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })
})