const VisitService = require('../services/VisitService');

/**
 * Visit 控制器
 * 处理访问统计相关的HTTP请求
 */
class VisitController {
  constructor(db) {
    this.visitService = new VisitService(db);
  }

  /**
   * 记录访问
   */
  async recordVisit(req, res) {
    try {
      // 从请求体或URL获取页面路径和会话ID
      const { page, sessionId, referrer } = req.body;
      const visitData = {
        ipAddress: this.getClientIP(req),
        sessionId: sessionId || null,
        userAgent: req.get('User-Agent'),
        page: page || req.path || '/',
        referrer: referrer || req.get('Referer')
      };

      const result = await this.visitService.recordVisit(visitData);
      res.json(result);
    } catch (error) {
      console.error('记录访问失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '记录访问失败'
      });
    }
  }

  /**
   * 心跳接口（更新在线状态）
   */
  async heartbeat(req, res) {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: '会话ID不能为空'
        });
      }

      const visitData = {
        sessionId,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent')
      };

      const result = await this.visitService.updateHeartbeat(visitData);
      res.json(result);
    } catch (error) {
      console.error('心跳更新失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '心跳更新失败'
      });
    }
  }

  /**
   * 离线接口（用户主动离开）
   */
  async offline(req, res) {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: '会话ID不能为空'
        });
      }

      const result = await this.visitService.removeSession(sessionId);
      res.json(result);
    } catch (error) {
      console.error('离线处理失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '离线处理失败'
      });
    }
  }

  /**
   * 获取当前在线人数
   */
  async getCurrentOnlineCount(req, res) {
    try {
      const result = await this.visitService.getCurrentOnlineCount();
      res.json(result);
    } catch (error) {
      console.error('获取在线人数失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取在线人数失败'
      });
    }
  }

  /**
   * 获取访问趋势数据
   */
  async getVisitTrends(req, res) {
    try {
      const { days = 7 } = req.query;
      const daysNum = parseInt(days);
      
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return res.status(400).json({
          success: false,
          message: '天数范围应在1-365之间'
        });
      }

      const result = await this.visitService.getVisitTrends(daysNum);
      res.json(result);
    } catch (error) {
      console.error('获取访问趋势失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取访问趋势失败'
      });
    }
  }

  /**
   * 获取页面访问统计
   */
  async getPageStats(req, res) {
    try {
      const { limit = 10 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 10, 50);

      const result = await this.visitService.getPageStats(limitNum);
      res.json(result);
    } catch (error) {
      console.error('获取页面统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取页面统计失败'
      });
    }
  }

  /**
   * 获取访问统计总览
   */
  async getOverallStats(req, res) {
    try {
      const result = await this.visitService.getOverallStats();
      res.json(result);
    } catch (error) {
      console.error('获取访问统计总览失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取访问统计总览失败'
      });
    }
  }

  /**
   * 获取热门页面
   */
  async getPopularPages(req, res) {
    try {
      const { limit = 5 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 5, 20);

      const result = await this.visitService.getPopularPages(limitNum);
      res.json(result);
    } catch (error) {
      console.error('获取热门页面失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取热门页面失败'
      });
    }
  }

  /**
   * 获取访问来源统计
   */
  async getReferrerStats(req, res) {
    try {
      const { limit = 10 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 10, 20);

      const result = await this.visitService.getReferrerStats(limitNum);
      res.json(result);
    } catch (error) {
      console.error('获取访问来源统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取访问来源统计失败'
      });
    }
  }

  /**
   * 获取访问时段分布
   */
  async getHourlyDistribution(req, res) {
    try {
      const result = await this.visitService.getHourlyDistribution();
      res.json(result);
    } catch (error) {
      console.error('获取访问时段分布失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取访问时段分布失败'
      });
    }
  }

  /**
   * 获取访问详情
   */
  async getVisitDetails(req, res) {
    try {
      const { page, limit, ipAddress, startDate, endDate } = req.query;
      
      const query = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 50, 200),
        ipAddress: ipAddress || null,
        startDate: startDate || null,
        endDate: endDate || null
      };

      const result = await this.visitService.getVisitDetails(query);
      res.json(result);
    } catch (error) {
      console.error('获取访问详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取访问详情失败'
      });
    }
  }

  /**
   * 清理过期访问记录
   */
  async cleanupOldVisits(req, res) {
    try {
      const { daysToKeep = 30 } = req.body;
      const days = parseInt(daysToKeep);
      
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          message: '保留天数应在1-365之间'
        });
      }

      const result = await this.visitService.cleanupOldVisits(days);
      res.json(result);
    } catch (error) {
      console.error('清理过期访问记录失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '清理过期访问记录失败'
      });
    }
  }

  /**
   * 获取IP访问频率
   */
  async getIPVisitFrequency(req, res) {
    try {
      const { ip } = req.params;
      const { hours = 24 } = req.query;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          message: 'IP地址不能为空'
        });
      }

      const hoursNum = parseInt(hours);
      if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
        return res.status(400).json({
          success: false,
          message: '小时数范围应在1-168之间'
        });
      }

      const result = await this.visitService.getIPVisitFrequency(ip, hoursNum);
      res.json(result);
    } catch (error) {
      console.error('获取IP访问频率失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取IP访问频率失败'
      });
    }
  }

  /**
   * 获取实时统计数据
   */
  async getRealTimeStats(req, res) {
    try {
      // 获取多个实时统计数据
      const [onlineCount, todayTrends, popularPages] = await Promise.all([
        this.visitService.getCurrentOnlineCount(),
        this.visitService.getVisitTrends(1),
        this.visitService.getPopularPages(5)
      ]);

      const result = {
        success: true,
        data: {
          onlineCount: onlineCount.data.onlineCount,
          todayVisits: todayTrends.data.length > 0 ? todayTrends.data[0].visits : 0,
          todayUniqueVisitors: todayTrends.data.length > 0 ? todayTrends.data[0].unique_visitors : 0,
          popularPages: popularPages.data,
          timestamp: new Date().toISOString()
        }
      };

      res.json(result);
    } catch (error) {
      console.error('获取实时统计数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取实时统计数据失败'
      });
    }
  }

  /**
   * 获取统计仪表板数据
   */
  async getDashboardStats(req, res) {
    try {
      const { period = '7' } = req.query;
      const days = Math.min(parseInt(period) || 7, 30);

      // 并行获取多个统计数据
      const [overallStats, visitTrends, pageStats, referrerStats, hourlyDistribution] = await Promise.all([
        this.visitService.getOverallStats(),
        this.visitService.getVisitTrends(days),
        this.visitService.getPageStats(10),
        this.visitService.getReferrerStats(10),
        this.visitService.getHourlyDistribution()
      ]);

      const result = {
        success: true,
        data: {
          overview: overallStats.data,
          trends: visitTrends.data,
          pages: pageStats.data,
          referrers: referrerStats.data,
          hourly: hourlyDistribution.data,
          period: days
        }
      };

      res.json(result);
    } catch (error) {
      console.error('获取统计仪表板数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计仪表板数据失败'
      });
    }
  }

  /**
   * 数据一致性检查和修复
   */
  async checkDataConsistency(req, res) {
    try {
      const result = await this.visitService.checkDataConsistency();
      res.json(result);
    } catch (error) {
      console.error('数据一致性检查失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '数据一致性检查失败'
      });
    }
  }

  /**
   * 导出访问数据
   */
  async exportVisitData(req, res) {
    try {
      const { format = 'json', startDate, endDate, limit = 1000 } = req.query;
      
      const query = {
        startDate: startDate || null,
        endDate: endDate || null,
        limit: Math.min(parseInt(limit) || 1000, 10000)
      };

      const result = await this.visitService.getVisitDetails(query);
      
      if (format === 'csv') {
        const csvData = this.convertToCSV(result.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=visits.csv');
        res.send(csvData);
      } else {
        res.json({
          success: true,
          data: result.data,
          meta: result.meta,
          format: format
        });
      }
    } catch (error) {
      console.error('导出访问数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出访问数据失败'
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
   * 转换为CSV格式
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = ['ID', 'IP地址', 'User Agent', '页面', '来源', '访问时间'];
    const csvContent = [headers.join(',')];

    data.forEach(item => {
      const row = [
        item.id,
        item.ip_address,
        `"${(item.user_agent || '').replace(/"/g, '""')}"`,
        item.page,
        item.referrer || '',
        item.visit_time
      ];
      csvContent.push(row.join(','));
    });

    return csvContent.join('\n');
  }

  /**
   * 访问记录中间件
   */
  visitTrackingMiddleware(req, res, next) {
    // 异步记录访问，不阻塞主要请求
    setImmediate(async () => {
      try {
        // 只记录主要页面的访问，过滤掉子路由和API调用
        const path = req.path;
        const shouldRecord = this.shouldRecordVisit(path);
        
        if (shouldRecord) {
          const visitData = {
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            page: this.normalizePagePath(path),
            referrer: req.get('Referer')
          };

          await this.visitService.recordVisit(visitData, { skipRateLimit: false });
        }
      } catch (error) {
        console.error('访问记录中间件错误:', error);
        // 不影响主要请求
      }
    });

    next();
  }

  /**
   * 判断是否应该记录访问
   * 中间件不记录访问，因为前端已通过路由守卫主动调用record接口
   */
  shouldRecordVisit(path) {
    // 中间件不记录任何访问，避免与前端路由守卫重复记录
    // 所有访问记录由前端主动调用 /api/v1/visits/record 接口完成
      return false;
  }

  /**
   * 标准化页面路径
   * 改为保留完整路径，不再合并
   */
  normalizePagePath(path) {
    // 移除末尾的斜杠（除了根路径）
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // 返回标准化后的路径
    return path || '/';
  }

  /**
   * 验证统计查询参数的中间件
   */
  validateStatsQuery(req, res, next) {
    const { startDate, endDate } = req.query;
    
    if (startDate && !this.isValidDate(startDate)) {
      return res.status(400).json({
        success: false,
        message: '开始日期格式不正确'
      });
    }
    
    if (endDate && !this.isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: '结束日期格式不正确'
      });
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: '开始日期不能晚于结束日期'
      });
    }
    
    next();
  }

  /**
   * 验证日期格式
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

module.exports = VisitController;