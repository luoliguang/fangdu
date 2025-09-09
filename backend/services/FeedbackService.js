const Feedback = require('../models/Feedback');

/**
 * Feedback 服务层
 * 处理留言反馈相关的业务逻辑
 */
class FeedbackService {
  constructor(db) {
    this.feedbackModel = new Feedback(db);
  }

  /**
   * 提交留言
   */
  async submitFeedback(feedbackData, clientInfo = {}) {
    try {
      const { message, user_id } = feedbackData;

      // 验证必填字段
      if (!message) {
        throw new Error('留言内容不能为空');
      }

      // 验证留言长度
      if (message.length > 1000) {
        throw new Error('留言内容不能超过1000个字符');
      }

      // 检查是否为垃圾留言
      if (this.isSpamContent(message)) {
        throw new Error('留言内容包含不当信息');
      }

      // 创建留言
      const feedback = await this.feedbackModel.create({
        message: this.sanitizeInput(message),
        user_id: user_id || null,
        status: 'pending'
      });

      return {
        success: true,
        message: '留言提交成功，我们会尽快回复您',
        data: {
          id: feedback.id,
          message: feedback.message,
          status: feedback.status,
          created_at: feedback.created_at,
          user_id: feedback.user_id
        }
      };
    } catch (error) {
      console.error('提交留言失败:', error);
      throw error;
    }
  }

  /**
   * 获取留言列表（管理员）
   */
  async getFeedbacks(query) {
    try {
      const { status, page, limit, orderBy, order } = query;
      
      const options = {
        status: status || null,
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 20, 100),
        orderBy: orderBy || 'created_at',
        order: order || 'DESC'
      };

      const result = await this.feedbackModel.getAll(options);
      
      return {
        success: true,
        data: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('获取留言列表失败:', error);
      throw new Error('获取留言列表失败');
    }
  }

  /**
   * 获取单个留言详情
   */
  async getFeedbackById(id) {
    try {
      const feedback = await this.feedbackModel.getById(id);
      
      if (!feedback) {
        throw new Error('留言不存在');
      }

      return {
        success: true,
        data: feedback
      };
    } catch (error) {
      console.error('获取留言详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新留言状态
   */
  async updateFeedbackStatus(id, status, adminReply = null) {
    try {
      const validStatuses = ['pending', 'approved', 'rejected', 'replied'];
      
      if (!validStatuses.includes(status)) {
        throw new Error('无效的状态值');
      }

      // 如果状态是已回复，必须提供回复内容
      if (status === 'replied' && !adminReply) {
        throw new Error('回复状态必须提供回复内容');
      }

      const updatedFeedback = await this.feedbackModel.updateStatus(id, status, adminReply);
      
      return {
        success: true,
        message: '留言状态更新成功',
        data: updatedFeedback
      };
    } catch (error) {
      console.error('更新留言状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除留言
   */
  async deleteFeedback(id) {
    try {
      await this.feedbackModel.delete(id);
      
      return {
        success: true,
        message: '留言删除成功'
      };
    } catch (error) {
      console.error('删除留言失败:', error);
      throw error;
    }
  }

  /**
   * 获取未处理留言数量
   */
  async getPendingCount() {
    try {
      const count = await this.feedbackModel.getPendingCount();
      
      return {
        success: true,
        data: { count }
      };
    } catch (error) {
      console.error('获取未处理留言数量失败:', error);
      throw new Error('获取未处理留言数量失败');
    }
  }

  /**
   * 根据用户ID获取留言列表
   */
  async getFeedbacksByUserId(userId, query = {}) {
    try {
      const { page, limit } = query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 10, 50)
      };

      const result = await this.feedbackModel.getByUserId(userId, options);
      
      return {
        success: true,
        data: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('获取用户留言列表失败:', error);
      throw new Error('获取用户留言列表失败');
    }
  }

  /**
   * 获取未处理留言数量
   */
  async getUnprocessedCount() {
    try {
      const count = await this.feedbackModel.getUnprocessedCount();
      
      return {
        success: true,
        data: { count }
      };
    } catch (error) {
      console.error('获取未处理留言数量失败:', error);
      throw new Error('获取未处理留言数量失败');
    }
  }

  /**
   * 获取留言统计信息
   */
  async getFeedbackStats() {
    try {
      const stats = await this.feedbackModel.getStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取留言统计失败:', error);
      throw new Error('获取留言统计失败');
    }
  }

  /**
   * 批量更新留言状态
   */
  async batchUpdateStatus(ids, status) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请选择要更新的留言');
      }

      const validStatuses = ['pending', 'approved', 'rejected', 'replied'];
      if (!validStatuses.includes(status)) {
        throw new Error('无效的状态值');
      }

      const updatedCount = await this.feedbackModel.batchUpdateStatus(ids, status);
      
      return {
        success: true,
        message: `成功更新 ${updatedCount} 条留言状态`,
        data: { updatedCount }
      };
    } catch (error) {
      console.error('批量更新留言状态失败:', error);
      throw error;
    }
  }

  /**
   * 回复留言
   */
  async replyToFeedback(id, adminReply) {
    try {
      if (!adminReply || !adminReply.trim()) {
        throw new Error('回复内容不能为空');
      }

      if (adminReply.length > 500) {
        throw new Error('回复内容不能超过500个字符');
      }

      const updatedFeedback = await this.feedbackModel.updateStatus(
        id, 
        'replied', 
        this.sanitizeInput(adminReply)
      );
      
      return {
        success: true,
        message: '回复成功',
        data: updatedFeedback
      };
    } catch (error) {
      console.error('回复留言失败:', error);
      throw error;
    }
  }

  /**
   * 验证邮箱格式
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 检查是否为垃圾内容
   */
  isSpamContent(content) {
    const spamKeywords = [
      '广告', '推广', '营销', '赚钱', '兼职',
      '加微信', 'QQ群', '免费领取', '点击链接',
      'http://', 'https://', 'www.'
    ];
    
    const lowerContent = content.toLowerCase();
    return spamKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
  }

  /**
   * 清理输入内容
   */
  sanitizeInput(input) {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除script标签
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, ''); // 移除事件处理器
  }

  /**
   * 检查留言频率限制
   */
  async checkRateLimit(ipAddress, timeWindow = 60, maxAttempts = 5) {
    // 这里可以实现基于IP的频率限制
    // 可以使用Redis或内存缓存来跟踪请求频率
    // 暂时返回true，表示允许提交
    return true;
  }

  /**
   * 发送邮件通知（可选功能）
   */
  async sendEmailNotification(feedback, type = 'new') {
    try {
      // 这里可以集成邮件服务
      // 比如使用 nodemailer 发送邮件通知
      console.log(`邮件通知: ${type} - 留言ID: ${feedback.id}`);
      
      return true;
    } catch (error) {
      console.error('发送邮件通知失败:', error);
      return false;
    }
  }

  /**
   * 导出留言数据
   */
  async exportFeedbacks(format = 'json', filters = {}) {
    try {
      const result = await this.feedbackModel.getAll({
        ...filters,
        limit: 10000 // 导出时不限制数量
      });

      if (format === 'csv') {
        return this.convertToCSV(result.data);
      }
      
      return {
        success: true,
        data: result.data,
        format: format
      };
    } catch (error) {
      console.error('导出留言数据失败:', error);
      throw new Error('导出留言数据失败');
    }
  }

  /**
   * 批量删除留言
   */
  async batchDeleteFeedbacks(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请选择要删除的留言');
      }

      const result = await this.feedbackModel.batchDelete(ids);
      
      return {
        success: true,
        message: `成功删除 ${result.changes} 条留言`,
        data: { deletedCount: result.changes }
      };
    } catch (error) {
      console.error('批量删除留言失败:', error);
      throw new Error('批量删除留言失败');
    }
  }

  /**
   * 搜索留言
   */
  async searchFeedbacks(query, options = {}) {
    try {
      const result = await this.feedbackModel.search(query, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('搜索留言失败:', error);
      throw new Error('搜索留言失败');
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = ['ID', '姓名', '邮箱', '留言内容', '状态', '创建时间', '更新时间'];
    const csvContent = [headers.join(',')];

    data.forEach(item => {
      const row = [
        item.id,
        `"${item.name}"`,
        item.email,
        `"${item.message.replace(/"/g, '""')}"`,
        item.status,
        item.created_at,
        item.updated_at || ''
      ];
      csvContent.push(row.join(','));
    });

    return csvContent.join('\n');
  }
}

module.exports = FeedbackService;