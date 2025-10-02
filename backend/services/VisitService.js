const Visit = require('../models/Visit');

/**
 * Visit 服务层
 * 处理访问统计相关的业务逻辑
 */
class VisitService {
  constructor(db) {
    this.visitModel = new Visit(db);
    this.rateLimitCache = new Map(); // 简单的内存缓存用于频率限制
  }

  /**
   * 记录访问
   */
  async recordVisit(visitData, options = {}) {
    try {
      const { ipAddress, userAgent, page, referrer } = visitData;
      const { skipRateLimit = false } = options;

      if (!ipAddress) {
        throw new Error('IP地址不能为空');
      }

      // 检查频率限制（防刷机制）- 改为按页面+IP组合限制
      if (!skipRateLimit && !this.checkRateLimit(ipAddress, page)) {
        console.log(`IP ${ipAddress} 访问页面 ${page} 过于频繁，跳过记录`);
        return {
          success: true,
          message: '访问记录已跳过（频率限制）',
          rateLimited: true
        };
      }

      // 检查是否为重复访问（同一页面1分钟内）
      const hasRecentVisit = await this.visitModel.hasRecentVisit(ipAddress, 1, page);
      if (hasRecentVisit) {
        return {
          success: true,
          message: '访问记录已跳过（重复访问）',
          duplicate: true
        };
      }

      // 记录访问
      const visit = await this.visitModel.recordVisit({
        ipAddress: this.sanitizeIP(ipAddress),
        userAgent: this.sanitizeUserAgent(userAgent),
        page: this.sanitizePage(page),
        referrer: this.sanitizeReferrer(referrer)
      });

      // 更新频率限制缓存
      this.updateRateLimit(ipAddress);

      return {
        success: true,
        message: '访问记录成功',
        data: visit
      };
    } catch (error) {
      console.error('记录访问失败:', error);
      // 访问记录失败不应该影响主要功能
      return {
        success: false,
        message: '访问记录失败',
        error: error.message
      };
    }
  }

  /**
   * 获取当前在线人数
   */
  async getCurrentOnlineCount() {
    try {
      const count = await this.visitModel.getCurrentOnlineCount();
      
      return {
        success: true,
        data: { onlineCount: count }
      };
    } catch (error) {
      console.error('获取在线人数失败:', error);
      throw new Error('获取在线人数失败');
    }
  }

  /**
   * 获取访问趋势数据
   */
  async getVisitTrends(days = 7) {
    try {
      if (days < 1 || days > 365) {
        throw new Error('天数范围应在1-365之间');
      }

      const trends = await this.visitModel.getVisitTrends(days);
      
      // 填充缺失的日期数据
      const filledTrends = this.fillMissingDates(trends, days);
      
      return {
        success: true,
        data: filledTrends
      };
    } catch (error) {
      console.error('获取访问趋势失败:', error);
      throw error;
    }
  }

  /**
   * 获取页面访问统计
   */
  async getPageStats(limit = 10) {
    try {
      const stats = await this.visitModel.getPageStats(Math.min(limit, 50));
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取页面统计失败:', error);
      throw new Error('获取页面统计失败');
    }
  }

  /**
   * 获取访问统计总览
   */
  async getOverallStats() {
    try {
      const stats = await this.visitModel.getOverallStats();
      
      // 计算增长率
      const enrichedStats = await this.enrichStatsWithGrowth(stats);
      
      return {
        success: true,
        data: enrichedStats
      };
    } catch (error) {
      console.error('获取访问统计总览失败:', error);
      throw new Error('获取访问统计总览失败');
    }
  }

  /**
   * 获取热门页面
   */
  async getPopularPages(limit = 5) {
    try {
      const pages = await this.visitModel.getPopularPages(Math.min(limit, 20));
      
      return {
        success: true,
        data: pages
      };
    } catch (error) {
      console.error('获取热门页面失败:', error);
      throw new Error('获取热门页面失败');
    }
  }

  /**
   * 获取访问来源统计
   */
  async getReferrerStats(limit = 10) {
    try {
      const stats = await this.visitModel.getReferrerStats(Math.min(limit, 20));
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取访问来源统计失败:', error);
      throw new Error('获取访问来源统计失败');
    }
  }

  /**
   * 获取访问时段分布
   */
  async getHourlyDistribution() {
    try {
      const distribution = await this.visitModel.getHourlyDistribution();
      
      return {
        success: true,
        data: distribution
      };
    } catch (error) {
      console.error('获取访问时段分布失败:', error);
      throw new Error('获取访问时段分布失败');
    }
  }

  /**
   * 获取访问详情
   */
  async getVisitDetails(query = {}) {
    try {
      const { page, limit, ipAddress, startDate, endDate } = query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 50, 200),
        ipAddress: ipAddress || null,
        startDate: startDate || null,
        endDate: endDate || null
      };

      const result = await this.visitModel.getVisitDetails(options);
      
      return {
        success: true,
        data: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('获取访问详情失败:', error);
      throw new Error('获取访问详情失败');
    }
  }

  /**
   * 清理过期访问记录
   */
  async cleanupOldVisits(daysToKeep = 30) {
    try {
      if (daysToKeep < 1 || daysToKeep > 365) {
        throw new Error('保留天数应在1-365之间');
      }

      const deletedCount = await this.visitModel.cleanupOldVisits(daysToKeep);
      
      return {
        success: true,
        message: `成功清理 ${deletedCount} 条过期访问记录`,
        data: { deletedCount }
      };
    } catch (error) {
      console.error('清理过期访问记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取IP访问频率
   */
  async getIPVisitFrequency(ipAddress, hours = 24) {
    try {
      const frequency = await this.visitModel.getIPVisitFrequency(ipAddress, hours);
      
      return {
        success: true,
        data: { 
          ipAddress,
          frequency,
          hours
        }
      };
    } catch (error) {
      console.error('获取IP访问频率失败:', error);
      throw new Error('获取IP访问频率失败');
    }
  }

  /**
   * 检查频率限制
   */
  checkRateLimit(ipAddress, page = '/', maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    // 使用页面+IP作为key，每个页面独立计数
    const key = `${ipAddress}:${page}`;
    
    if (!this.rateLimitCache.has(key)) {
      this.rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    const record = this.rateLimitCache.get(key);
    
    if (now > record.resetTime) {
      // 重置计数器
      this.rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }

  /**
   * 更新频率限制缓存
   */
  updateRateLimit(ipAddress) {
    const now = Date.now();
    const key = ipAddress;
    
    if (this.rateLimitCache.has(key)) {
      const record = this.rateLimitCache.get(key);
      if (now <= record.resetTime) {
        record.count++;
      }
    }
  }

  /**
   * 清理过期的频率限制缓存
   */
  cleanupRateLimitCache() {
    const now = Date.now();
    
    for (const [key, record] of this.rateLimitCache.entries()) {
      if (now > record.resetTime) {
        this.rateLimitCache.delete(key);
      }
    }
  }

  /**
   * 填充缺失的日期数据
   */
  fillMissingDates(trends, days) {
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = trends.find(t => t.date === dateStr);
      result.push({
        date: dateStr,
        visits: existingData ? existingData.visits : 0,
        unique_visitors: existingData ? existingData.unique_visitors : 0
      });
    }
    
    return result;
  }

  /**
   * 丰富统计数据（添加增长率等）
   */
  async enrichStatsWithGrowth(stats) {
    try {
      // 获取昨天的数据用于计算增长率
      const yesterdayTrends = await this.visitModel.getVisitTrends(2);
      
      let todayGrowth = 0;
      if (yesterdayTrends.length >= 2) {
        const today = yesterdayTrends[1];
        const yesterday = yesterdayTrends[0];
        
        if (yesterday.visits > 0) {
          todayGrowth = ((today.visits - yesterday.visits) / yesterday.visits * 100).toFixed(1);
        }
      }
      
      return {
        ...stats,
        growth: {
          today: parseFloat(todayGrowth)
        }
      };
    } catch (error) {
      console.warn('计算增长率失败:', error);
      return stats;
    }
  }

  /**
   * 清理IP地址
   */
  sanitizeIP(ip) {
    if (!ip) return '';
    
    // 移除IPv6前缀
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    // 验证IP格式
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
      return ip;
    }
    
    return 'unknown';
  }

  /**
   * 清理User-Agent
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return '';
    
    // 限制长度并移除潜在的恶意内容
    return userAgent
      .substring(0, 500)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');
  }

  /**
   * 清理页面路径
   */
  sanitizePage(page) {
    if (!page) return '/';
    
    // 确保以/开头，限制长度
    let cleanPage = page.startsWith('/') ? page : '/' + page;
    return cleanPage.substring(0, 200);
  }

  /**
   * 清理引用页面
   */
  sanitizeReferrer(referrer) {
    if (!referrer) return null;
    
    // 限制长度
    return referrer.substring(0, 500);
  }

  /**
   * 定期清理任务
   */
  startCleanupTasks() {
    // 每小时清理一次频率限制缓存
    setInterval(() => {
      this.cleanupRateLimitCache();
    }, 60 * 60 * 1000);
    
    // 每天清理一次过期访问记录
    setInterval(async () => {
      try {
        await this.cleanupOldVisits(30);
        console.log('定期清理过期访问记录完成');
      } catch (error) {
        console.error('定期清理过期访问记录失败:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }
}

module.exports = VisitService;