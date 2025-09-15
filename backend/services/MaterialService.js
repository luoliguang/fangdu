const Material = require('../models/Material');
const ServerConfig = require('../config/server');

/**
 * Material 服务层
 * 处理素材相关的业务逻辑
 */
class MaterialService {
  constructor(db) {
    this.materialModel = new Material(db);
    const config = ServerConfig.getConfig();
    // 获取全局单例的OSS客户端实例
    this.ossClient = ServerConfig.getConfig().ossClient || new ServerConfig().getOSSClient();
    this.ossConfig = config.oss;
  }

  /**
   * 获取素材列表
   */
  async getMaterials(query) {
    try {
      const { search, tag, page, limit } = query;
      
      const options = {
        search: search || '',
        tag: tag || '',
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 20, 100) // 限制最大每页数量
      };

      const result = await this.materialModel.getAll(options);
      
      // 处理文件URL，确保使用HTTPS
      result.data = result.data.map(material => ({
        ...material,
        file_path: this.ensureHttpsUrl(material.file_path),
        thumbnail_url: material.thumbnail_url ? this.ensureHttpsUrl(material.thumbnail_url) : null,
        cover_image_path: material.cover_image_path ? this.ensureHttpsUrl(material.cover_image_path) : null
      }));

      return {
        success: true,
        data: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('获取素材列表失败:', error);
      throw new Error('获取素材列表失败');
    }
  }

  /**
   * 上传素材
   */
  async uploadMaterial(file, materialData) {
    try {
      const { name, tags } = materialData;
      
      if (!name || !tags) {
        throw new Error('素材名称和标签不能为空');
      }

      if (!file) {
        throw new Error('请选择要上传的文件');
      }

      // 验证文件类型
      const config = ServerConfig.getConfig();
      const allowedTypes = config.server.upload.allowedTypes;
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('不支持的文件类型');
      }

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileExtension = this.getFileExtension(file.originalname);
      const fileName = `${timestamp}_${randomStr}${fileExtension}`;
      
      // 确定媒体类型
      const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // 上传到OSS，设置正确的Content-Disposition头部
      const uploadOptions = {
        headers: {
          'Content-Type': file.mimetype,
          'Content-Disposition': 'inline' // 设置为inline，允许在浏览器中直接显示
        }
      };
      
      const uploadResult = await this.ossClient.put(fileName, file.buffer, uploadOptions);
      const fileUrl = this.ensureHttpsUrl(uploadResult.url);
      
      let coverImagePath = null;
      
      // 如果是视频，生成封面图
      if (mediaType === 'video') {
        try {
          coverImagePath = await this.generateVideoCover(fileName, fileUrl);
        } catch (coverError) {
          console.warn('生成视频封面失败:', coverError.message);
          // 视频封面生成失败不影响主流程
        }
      }

      // 保存到数据库
      const material = await this.materialModel.create({
        name,
        filePath: fileUrl,
        tags,
        mediaType,
        coverImagePath
      });

      return {
        success: true,
        message: '素材上传成功',
        data: {
          ...material,
          file_path: fileUrl,
          cover_image_path: coverImagePath
        }
      };
    } catch (error) {
      console.error('上传素材失败:', error);
      throw error;
    }
  }

  /**
   * 删除素材
   */
  async deleteMaterial(id) {
    try {
      // 获取素材信息
      const material = await this.materialModel.getById(id);
      if (!material) {
        throw new Error('素材不存在');
      }

      // 从OSS删除文件
      try {
        const fileName = this.extractFileNameFromUrl(material.file_path);
        await this.ossClient.delete(fileName);
        
        // 如果有封面图，也删除封面图
        if (material.cover_image_path) {
          const coverFileName = this.extractFileNameFromUrl(material.cover_image_path);
          await this.ossClient.delete(coverFileName);
        }
      } catch (ossError) {
        console.warn('从OSS删除文件失败:', ossError.message);
        // OSS删除失败不阻止数据库删除
      }

      // 从数据库删除
      await this.materialModel.delete(id);

      return {
        success: true,
        message: '素材删除成功'
      };
    } catch (error) {
      console.error('删除素材失败:', error);
      throw error;
    }
  }

  /**
   * 更新素材信息
   */
  async updateMaterial(id, updateData) {
    try {
      const updatedMaterial = await this.materialModel.update(id, updateData);
      
      return {
        success: true,
        message: '素材信息更新成功',
        data: {
          ...updatedMaterial,
          file_path: this.ensureHttpsUrl(updatedMaterial.file_path),
          cover_image_path: updatedMaterial.cover_image_path ? 
            this.ensureHttpsUrl(updatedMaterial.cover_image_path) : null
        }
      };
    } catch (error) {
      console.error('更新素材失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    try {
      const tags = await this.materialModel.getAllTags();
      
      return {
        success: true,
        data: tags
      };
    } catch (error) {
      console.error('获取标签失败:', error);
      throw new Error('获取标签失败');
    }
  }

  /**
   * 生成视频封面图（简化版本）
   */
  async generateVideoCover(fileName, videoUrl) {
    // 这里可以集成视频处理库来生成真实的封面图
    // 目前返回一个占位符或默认封面
    const coverFileName = fileName.replace(/\.[^/.]+$/, '_cover.jpg');
    
    // 可以使用 ffmpeg 或其他视频处理工具
    // 这里暂时返回 null，表示没有封面图
    return null;
  }

  /**
   * 确保URL使用HTTPS协议
   */
  ensureHttpsUrl(url) {
    if (!url) return url;
    return url.replace(/^http:/, 'https:');
  }

  /**
   * 从URL中提取文件名
   */
  extractFileNameFromUrl(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // 移除开头的 '/'
    } catch (error) {
      // 如果URL解析失败，尝试简单的字符串处理
      const parts = url.split('/');
      return parts[parts.length - 1];
    }
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(filename) {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * 验证文件大小
   */
  validateFileSize(fileSize, maxSize = '10MB') {
    const maxSizeBytes = this.parseSize(maxSize);
    return fileSize <= maxSizeBytes;
  }

  /**
   * 解析文件大小字符串
   */
  parseSize(sizeStr) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error('无效的文件大小格式');
    }
    
    const [, size, unit] = match;
    return parseFloat(size) * units[unit.toUpperCase()];
  }

  /**
   * 获取素材统计信息
   */
  async getMaterialStats() {
    try {
      // 这里可以添加更多统计逻辑
      const allMaterials = await this.materialModel.getAll({ limit: 1000 });
      
      const stats = {
        total: allMaterials.meta.total,
        images: 0,
        videos: 0,
        tags: await this.materialModel.getAllTags()
      };

      // 统计不同类型的素材数量
      allMaterials.data.forEach(material => {
        if (material.media_type === 'image') {
          stats.images++;
        } else if (material.media_type === 'video') {
          stats.videos++;
        }
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取素材统计失败:', error);
      throw new Error('获取素材统计失败');
    }
  }

  /**
   * 批量删除素材
   */
  async batchDeleteMaterials(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请选择要删除的素材');
      }

      const result = await this.materialModel.batchDelete(ids);
      
      return {
        success: true,
        message: `成功删除 ${result.changes} 个素材`,
        data: { deletedCount: result.changes }
      };
    } catch (error) {
      console.error('批量删除素材失败:', error);
      throw new Error('批量删除素材失败');
    }
  }

  /**
   * 搜索素材
   */
  async searchMaterials(query, options = {}) {
    try {
      const result = await this.materialModel.search(query, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('搜索素材失败:', error);
      throw new Error('搜索素材失败');
    }
  }
}

module.exports = MaterialService;