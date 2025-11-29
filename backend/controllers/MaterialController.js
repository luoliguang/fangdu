const MaterialService = require('../services/MaterialService');
const multer = require('multer');
const ServerConfig = require('../config/server');

/**
 * Material 控制器
 * 处理素材相关的HTTP请求
 */
class MaterialController {
  constructor(db) {
    this.materialService = new MaterialService(db);
    this.setupMulter();
  }

  /**
   * 配置Multer文件上传
   */
  setupMulter() {
    const config = ServerConfig.getConfig();
    const serverConf = config.server;
    
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.parseFileSize(serverConf.upload.maxFileSize),
        files: 20 // 最多同时上传20个文件
      },
      fileFilter: (req, file, cb) => {
        if (serverConf.upload.allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型'), false);
        }
      }
    });
  }

  /**
   * 获取素材列表
   */
  async getMaterials(req, res) {
    try {
      const result = await this.materialService.getMaterials(req.query);
      res.json(result);
    } catch (error) {
      console.error('获取素材列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取素材列表失败'
      });
    }
  }

  /**
   * 上传素材（单个）
   */
  async uploadMaterial(req, res) {
    try {
      const { name, tags } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件'
        });
      }

      if (!name || !tags) {
        return res.status(400).json({
          success: false,
          message: '素材名称和标签不能为空'
        });
      }

      const result = await this.materialService.uploadMaterial(file, { name, tags });
      res.status(201).json(result);
    } catch (error) {
      console.error('上传素材失败:', error);
      
      // 根据错误类型返回不同的状态码
      let statusCode = 500;
      if (error.message.includes('文件类型') || error.message.includes('文件大小')) {
        statusCode = 400;
      } else if (error.message.includes('OSS') || error.message.includes('网络')) {
        statusCode = 503;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '上传素材失败'
      });
    }
  }

  /**
   * 批量上传素材
   */
  async uploadMaterialsBatch(req, res) {
    try {
      const files = req.files;
      const { tags } = req.body; // 所有文件共享的标签

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件'
        });
      }

      if (!tags) {
        return res.status(400).json({
          success: false,
          message: '标签不能为空'
        });
      }

      const results = {
        success: [],
        failed: []
      };

      // 逐个上传文件
      for (const file of files) {
        try {
          // 使用文件名作为素材名称（去除扩展名）
          const name = file.originalname.replace(/\.[^/.]+$/, '');
          const result = await this.materialService.uploadMaterial(file, { name, tags });
          
          results.success.push({
            name: file.originalname,
            message: '上传成功',
            data: result.data
          });
        } catch (error) {
          console.error(`上传文件 ${file.originalname} 失败:`, error);
          results.failed.push({
            name: file.originalname,
            message: error.message || '上传失败'
          });
        }
      }

      // 返回批量上传结果
      res.status(200).json({
        success: true,
        data: {
          total: files.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          results
        },
        message: `成功上传 ${results.success.length} 个文件，失败 ${results.failed.length} 个`
      });
    } catch (error) {
      console.error('批量上传素材失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量上传素材失败'
      });
    }
  }

  /**
   * 删除素材
   */
  async deleteMaterial(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的素材ID'
        });
      }

      const result = await this.materialService.deleteMaterial(parseInt(id));
      res.json(result);
    } catch (error) {
      console.error('删除素材失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不存在')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '删除素材失败'
      });
    }
  }

  /**
   * 更新素材信息
   */
  async updateMaterial(req, res) {
    try {
      const { id } = req.params;
      const { name, tags } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的素材ID'
        });
      }

      if (!name || !tags) {
        return res.status(400).json({
          success: false,
          message: '素材名称和标签不能为空'
        });
      }

      const result = await this.materialService.updateMaterial(parseInt(id), { name, tags });
      res.json(result);
    } catch (error) {
      console.error('更新素材失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不存在')) {
        statusCode = 404;
      } else if (error.message.includes('不能为空')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '更新素材失败'
      });
    }
  }

  /**
   * 获取所有标签
   */
  async getAllTags(req, res) {
    try {
      const result = await this.materialService.getAllTags();
      res.json(result);
    } catch (error) {
      console.error('获取标签失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取标签失败'
      });
    }
  }

  /**
   * 获取搜索关键词建议
   */
  async getSearchSuggestions(req, res) {
    try {
      const { q: query, limit } = req.query;
      
      if (!query || query.trim().length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }

      const suggestionLimit = parseInt(limit) || 5;
      const result = await this.materialService.getSearchSuggestions(query, suggestionLimit);
      res.json(result);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取搜索建议失败'
      });
    }
  }

  /**
   * 获取素材统计信息
   */
  async getMaterialStats(req, res) {
    try {
      const result = await this.materialService.getMaterialStats();
      res.json(result);
    } catch (error) {
      console.error('获取素材统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取素材统计失败'
      });
    }
  }

  /**
   * 批量删除素材
   */
  async batchDeleteMaterials(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要删除的素材'
        });
      }

      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          await this.materialService.deleteMaterial(parseInt(id));
          results.push({ id, success: true });
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `成功删除 ${results.length} 个素材${errors.length > 0 ? `，${errors.length} 个失败` : ''}`,
        data: {
          successful: results,
          failed: errors
        }
      });
    } catch (error) {
      console.error('批量删除素材失败:', error);
      res.status(500).json({
        success: false,
        message: '批量删除素材失败'
      });
    }
  }

  /**
   * 搜索素材
   */
  async searchMaterials(req, res) {
    try {
      const { q: search, tag, type, page, limit } = req.query;
      
      if (!search && !tag && !type) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词、标签或类型'
        });
      }

      const query = {
        search: search || '',
        tag: tag || '',
        page: page || 1,
        limit: limit || 20
      };

      // 如果指定了类型，可以在这里添加类型过滤逻辑
      if (type && ['image', 'video'].includes(type)) {
        // 这里可以扩展搜索逻辑以支持类型过滤
      }

      const result = await this.materialService.getMaterials(query);
      res.json(result);
    } catch (error) {
      console.error('搜索素材失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索素材失败'
      });
    }
  }

  /**
   * 获取单个素材详情
   */
  async getMaterialById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的素材ID'
        });
      }

      // 这里需要在MaterialService中添加getById方法
      const material = await this.materialService.materialModel.getById(parseInt(id));
      
      if (!material) {
        return res.status(404).json({
          success: false,
          message: '素材不存在'
        });
      }

      res.json({
        success: true,
        data: {
          ...material,
          file_path: this.materialService.ensureHttpsUrl(material.file_path),
          cover_image_path: material.cover_image_path ? 
            this.materialService.ensureHttpsUrl(material.cover_image_path) : null
        }
      });
    } catch (error) {
      console.error('获取素材详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取素材详情失败'
      });
    }
  }

  /**
   * 解析文件大小字符串
   */
  parseFileSize(sizeStr) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      return 50 * 1024 * 1024; // 默认50MB
    }
    
    const [, size, unit] = match;
    return parseFloat(size) * units[unit.toUpperCase()];
  }

  /**
   * 获取上传中间件
   */
  getUploadMiddleware() {
    return this.upload.single('file');
  }

  /**
   * 处理上传错误的中间件
   */
  handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: '文件大小超出限制'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: '文件数量超出限制'
        });
      }
    }
    
    if (error.message.includes('不支持的文件类型')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }

  /**
   * 验证请求参数的中间件
   */
  validateMaterialData(req, res, next) {
    const { name, tags } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '素材名称不能为空'
      });
    }
    
    if (!tags || typeof tags !== 'string' || tags.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '标签不能为空'
      });
    }
    
    // 清理和验证数据
    req.body.name = name.trim().substring(0, 100);
    req.body.tags = tags.trim().substring(0, 200);
    
    next();
  }
}

module.exports = MaterialController;