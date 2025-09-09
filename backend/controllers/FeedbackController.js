const FeedbackService = require('../services/FeedbackService');

/**
 * Feedback 控制器
 * 处理留言反馈相关的HTTP请求
 */
class FeedbackController {
  constructor(db) {
    this.feedbackService = new FeedbackService(db);
  }

  /**
   * 提交留言
   */
  async submitFeedback(req, res) {
    try {
      const { name, email, message, materialId, user_id } = req.body;
      const clientInfo = {
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent')
      };

      const result = await this.feedbackService.submitFeedback(
        { name, email, message, materialId, user_id },
        clientInfo
      );
      
      res.status(201).json(result);
    } catch (error) {
      console.error('提交留言失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不能为空') || 
          error.message.includes('格式不正确') ||
          error.message.includes('不能超过') ||
          error.message.includes('不当信息')) {
        statusCode = 400;
      } else if (error.message.includes('频繁')) {
        statusCode = 429;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '提交留言失败'
      });
    }
  }

  /**
   * 获取留言列表（管理员）
   */
  async getFeedbacks(req, res) {
    try {
      const result = await this.feedbackService.getFeedbacks(req.query);
      res.json(result);
    } catch (error) {
      console.error('获取留言列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取留言列表失败'
      });
    }
  }

  /**
   * 获取单个留言详情
   */
  async getFeedbackById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的留言ID'
        });
      }

      const result = await this.feedbackService.getFeedbackById(parseInt(id));
      res.json(result);
    } catch (error) {
      console.error('获取留言详情失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不存在')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '获取留言详情失败'
      });
    }
  }

  /**
   * 更新留言状态
   */
  async updateFeedbackStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, adminReply } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的留言ID'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: '状态不能为空'
        });
      }

      const result = await this.feedbackService.updateFeedbackStatus(
        parseInt(id), 
        status, 
        adminReply
      );
      
      res.json(result);
    } catch (error) {
      console.error('更新留言状态失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('无效的状态') || 
          error.message.includes('必须提供回复')) {
        statusCode = 400;
      } else if (error.message.includes('不存在')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '更新留言状态失败'
      });
    }
  }

  /**
   * 删除留言
   */
  async deleteFeedback(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的留言ID'
        });
      }

      const result = await this.feedbackService.deleteFeedback(parseInt(id));
      res.json(result);
    } catch (error) {
      console.error('删除留言失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不存在')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '删除留言失败'
      });
    }
  }

  /**
   * 获取未处理留言数量
   */
  async getPendingCount(req, res) {
    try {
      const result = await this.feedbackService.getPendingCount();
      res.json(result);
    } catch (error) {
      console.error('获取未处理留言数量失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取未处理留言数量失败'
      });
    }
  }

  /**
   * 根据用户ID获取留言列表
   */
  async getFeedbacksByUserId(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空'
        });
      }

      const result = await this.feedbackService.getFeedbacksByUserId(userId, req.query);
      res.json(result);
    } catch (error) {
      console.error('获取用户留言列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取用户留言列表失败'
      });
    }
  }

  /**
   * 获取未处理留言数量
   */
  async getUnprocessedCount(req, res) {
    try {
      const result = await this.feedbackService.getUnprocessedCount();
      res.json(result);
    } catch (error) {
      console.error('获取未处理留言数量失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取未处理留言数量失败'
      });
    }
  }

  /**
   * 获取留言统计信息
   */
  async getFeedbackStats(req, res) {
    try {
      const result = await this.feedbackService.getFeedbackStats();
      res.json(result);
    } catch (error) {
      console.error('获取留言统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取留言统计失败'
      });
    }
  }

  /**
   * 批量更新留言状态
   */
  async batchUpdateStatus(req, res) {
    try {
      const { ids, status } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要更新的留言'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: '状态不能为空'
        });
      }

      const result = await this.feedbackService.batchUpdateStatus(ids, status);
      res.json(result);
    } catch (error) {
      console.error('批量更新留言状态失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('无效的状态') || 
          error.message.includes('请选择')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '批量更新留言状态失败'
      });
    }
  }

  /**
   * 回复留言
   */
  async replyToFeedback(req, res) {
    try {
      const { id } = req.params;
      const { adminReply } = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的留言ID'
        });
      }

      if (!adminReply) {
        return res.status(400).json({
          success: false,
          message: '回复内容不能为空'
        });
      }

      const result = await this.feedbackService.replyToFeedback(parseInt(id), adminReply);
      res.json(result);
    } catch (error) {
      console.error('回复留言失败:', error);
      
      let statusCode = 500;
      if (error.message.includes('不能为空') || 
          error.message.includes('不能超过')) {
        statusCode = 400;
      } else if (error.message.includes('不存在')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message || '回复留言失败'
      });
    }
  }

  /**
   * 批量删除留言
   */
  async batchDeleteFeedbacks(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要删除的留言'
        });
      }

      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          await this.feedbackService.deleteFeedback(parseInt(id));
          results.push({ id, success: true });
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `成功删除 ${results.length} 条留言${errors.length > 0 ? `，${errors.length} 条失败` : ''}`,
        data: {
          successful: results,
          failed: errors
        }
      });
    } catch (error) {
      console.error('批量删除留言失败:', error);
      res.status(500).json({
        success: false,
        message: '批量删除留言失败'
      });
    }
  }

  /**
   * 导出留言数据
   */
  async exportFeedbacks(req, res) {
    try {
      const { format = 'json', ...filters } = req.query;
      
      const result = await this.feedbackService.exportFeedbacks(format, filters);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=feedbacks.csv');
        res.send(result);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error('导出留言数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出留言数据失败'
      });
    }
  }

  /**
   * 搜索留言
   */
  async searchFeedbacks(req, res) {
    try {
      const { q: search, status, startDate, endDate, page, limit } = req.query;
      
      if (!search && !status && !startDate) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索条件'
        });
      }

      // 这里可以扩展搜索逻辑
      const query = {
        status,
        page: page || 1,
        limit: limit || 20
      };

      const result = await this.feedbackService.getFeedbacks(query);
      
      // 如果有搜索关键词，可以在这里进行客户端过滤
      if (search) {
        const filteredData = result.data.filter(feedback => 
          feedback.name.toLowerCase().includes(search.toLowerCase()) ||
          feedback.email.toLowerCase().includes(search.toLowerCase()) ||
          feedback.message.toLowerCase().includes(search.toLowerCase())
        );
        
        result.data = filteredData;
        result.meta.total = filteredData.length;
      }
      
      res.json(result);
    } catch (error) {
      console.error('搜索留言失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索留言失败'
      });
    }
  }

  /**
   * 获取客户端IP地址
   */
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  /**
   * 验证留言数据的中间件
   */
  validateFeedbackData(req, res, next) {
    const { name, email, message } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '姓名不能为空'
      });
    }
    
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '邮箱不能为空'
      });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '留言内容不能为空'
      });
    }
    
    // 清理和验证数据
    req.body.name = name.trim().substring(0, 50);
    req.body.email = email.trim().toLowerCase().substring(0, 100);
    req.body.message = message.trim().substring(0, 1000);
    
    next();
  }

  /**
   * 频率限制中间件
   */
  rateLimitMiddleware(req, res, next) {
    // 这里可以实现更复杂的频率限制逻辑
    // 比如基于IP地址的请求频率限制
    const clientIP = this.getClientIP(req);
    
    // 简单的频率限制检查（可以使用Redis等更好的实现）
    // 这里暂时直接通过
    next();
  }
}

module.exports = FeedbackController;