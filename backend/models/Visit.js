/**
 * Visit 数据模型
 * 处理访问统计相关的数据库操作
 */
class Visit {
  constructor(db) {
    this.db = db;
  }

  /**
   * 记录访问
   */
  async recordVisit(visitData) {
    const {
      ipAddress,
      userAgent = null,
      page = '/',
      referrer = null
    } = visitData;

    if (!ipAddress) {
      throw new Error('IP地址不能为空');
    }

    const sql = `
      INSERT INTO visits (ip, user_agent, page, visited_at) 
      VALUES (?, ?, ?, datetime('now'))
    `;
    
    const result = await this.run(sql, [ipAddress, userAgent, page]);
    return { id: result.lastID, ...visitData };
  }

  /**
   * 获取当前在线人数（最近5分钟内的唯一IP）
   */
  async getCurrentOnlineCount() {
    const sql = `
      SELECT COUNT(DISTINCT ip) as count 
      FROM visits 
      WHERE visited_at >= datetime('now', '-5 minutes')
    `;
    
    const result = await this.queryOne(sql);
    return result.count || 0;
  }

  /**
   * 获取访问趋势数据
   */
  async getVisitTrends(days = 7) {
    const sql = `
      SELECT 
        DATE(visited_at) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT ip) as unique_visitors
      FROM visits 
      WHERE visited_at >= datetime('now', '-${days} days')
      GROUP BY DATE(visited_at)
      ORDER BY date ASC
    `;
    
    return await this.queryAll(sql);
  }

  /**
   * 获取页面访问统计
   */
  async getPageStats(limit = 10) {
    const sql = `
      SELECT 
        page,
        COUNT(*) as visits,
        COUNT(DISTINCT ip) as unique_visitors
      FROM visits 
      GROUP BY page 
      ORDER BY visits DESC 
      LIMIT ?
    `;
    
    return await this.queryAll(sql, [limit]);
  }

  /**
   * 获取访问统计总览
   */
  async getOverallStats() {
    // 总访问量
    const totalVisitsSql = `SELECT COUNT(*) as total FROM visits`;
    const totalVisits = await this.queryOne(totalVisitsSql);

    // 唯一访客数
    const uniqueVisitorsSql = `SELECT COUNT(DISTINCT ip) as unique_visitors FROM visits`;
    const uniqueVisitors = await this.queryOne(uniqueVisitorsSql);

    // 今日访问量
    const todayVisitsSql = `
      SELECT COUNT(*) as today 
      FROM visits 
      WHERE DATE(visited_at) = DATE('now')
    `;
    const todayVisits = await this.queryOne(todayVisitsSql);

    // 今日唯一访客
    const todayUniqueVisitorsSql = `
      SELECT COUNT(DISTINCT ip) as today_unique 
      FROM visits 
      WHERE DATE(visited_at) = DATE('now')
    `;
    const todayUniqueVisitors = await this.queryOne(todayUniqueVisitorsSql);

    // 本周访问量
    const weekVisitsSql = `
      SELECT COUNT(*) as week 
      FROM visits 
      WHERE visited_at >= datetime('now', '-7 days')
    `;
    const weekVisits = await this.queryOne(weekVisitsSql);

    // 本月访问量
    const monthVisitsSql = `
      SELECT COUNT(*) as month 
      FROM visits 
      WHERE visited_at >= datetime('now', 'start of month')
    `;
    const monthVisits = await this.queryOne(monthVisitsSql);

    return {
      total: {
        visits: totalVisits.total || 0,
        uniqueVisitors: uniqueVisitors.unique_visitors || 0
      },
      today: {
        visits: todayVisits.today || 0,
        uniqueVisitors: todayUniqueVisitors.today_unique || 0
      },
      week: {
        visits: weekVisits.week || 0
      },
      month: {
        visits: monthVisits.month || 0
      }
    };
  }

  /**
   * 获取热门页面
   */
  async getPopularPages(limit = 5) {
    const sql = `
      SELECT 
        page,
        COUNT(*) as visits,
        COUNT(DISTINCT ip) as unique_visitors,
        MAX(visited_at) as last_visit
      FROM visits 
      WHERE visited_at >= datetime('now', '-30 days')
      GROUP BY page 
      ORDER BY visits DESC 
      LIMIT ?
    `;
    
    return await this.queryAll(sql, [limit]);
  }

  /**
   * 获取访问来源统计
   */
  async getReferrerStats(limit = 10) {
    const sql = `
      SELECT 
        '直接访问' as source,
        COUNT(*) as visits
      FROM visits 
      WHERE visited_at >= datetime('now', '-30 days')
      ORDER BY visits DESC 
      LIMIT ?
    `;
    
    return await this.queryAll(sql, [limit]);
  }

  /**
   * 获取访问时段分布
   */
  async getHourlyDistribution() {
    const sql = `
      SELECT 
        CAST(strftime('%H', visited_at) AS INTEGER) as hour,
        COUNT(*) as visits
      FROM visits 
      WHERE visited_at >= datetime('now', '-7 days')
      GROUP BY hour 
      ORDER BY hour ASC
    `;
    
    const result = await this.queryAll(sql);
    
    // 填充缺失的小时数据
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, visits: 0 }));
    result.forEach(row => {
      hourlyData[row.hour].visits = row.visits;
    });
    
    return hourlyData;
  }

  /**
   * 清理过期访问记录
   */
  async cleanupOldVisits(daysToKeep = 30) {
    const sql = `
      DELETE FROM visits 
      WHERE visited_at < datetime('now', '-${daysToKeep} days')
    `;
    
    const result = await this.run(sql);
    return result.changes;
  }

  /**
   * 检查IP是否在指定时间内访问过
   */
  async hasRecentVisit(ipAddress, minutes = 1) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM visits 
      WHERE ip = ? 
      AND visited_at >= datetime('now', '-${minutes} minutes')
    `;
    
    const result = await this.queryOne(sql, [ipAddress]);
    return result.count > 0;
  }

  /**
   * 获取IP访问频率
   */
  async getIPVisitFrequency(ipAddress, hours = 24) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM visits 
      WHERE ip = ? 
      AND visited_at >= datetime('now', '-${hours} hours')
    `;
    
    const result = await this.queryOne(sql, [ipAddress]);
    return result.count || 0;
  }

  /**
   * 获取访问详情（分页）
   */
  async getVisitDetails(options = {}) {
    const {
      page = 1,
      limit = 50,
      ipAddress = null,
      startDate = null,
      endDate = null
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = ' WHERE 1=1';
    const params = [];

    if (ipAddress) {
      whereClause += ' AND ip = ?';
      params.push(ipAddress);
    }

    if (startDate) {
      whereClause += ' AND visited_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND visited_at <= ?';
      params.push(endDate);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM visits` + whereClause;
    const total = await this.queryOne(countSql, params);

    // 获取分页数据
    const dataSql = `
      SELECT * FROM visits
      ${whereClause} 
      ORDER BY visited_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const visits = await this.queryAll(dataSql, [...params, limit, offset]);

    return {
      data: visits,
      meta: {
        total: total.total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total.total / limit)
      }
    };
  }

  /**
   * 执行查询并返回单个结果
   */
  queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * 执行查询并返回所有结果
   */
  queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * 执行SQL语句（INSERT, UPDATE, DELETE）
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }
}

module.exports = Visit;