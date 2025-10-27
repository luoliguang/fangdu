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
      sessionId = null,
      userAgent = null,
      page = '/',
      referrer = null
    } = visitData;

    if (!ipAddress) {
      throw new Error('IP地址不能为空');
    }

    const sql = `
      INSERT INTO visits (ip_address, session_id, user_agent, page, visit_time) 
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    const result = await this.run(sql, [ipAddress, sessionId, userAgent, page]);
    return { id: result.lastID, ...visitData };
  }

  /**
   * 更新心跳（用户在线状态）
   */
  async updateHeartbeat(sessionId, ipAddress, userAgent) {
    if (!sessionId) {
      throw new Error('会话ID不能为空');
    }

    const sql = `
      INSERT INTO online_sessions (session_id, ip_address, user_agent, last_heartbeat, first_seen)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(session_id) 
      DO UPDATE SET 
        last_heartbeat = datetime('now'),
        ip_address = excluded.ip_address,
        user_agent = excluded.user_agent
    `;
    
    await this.run(sql, [sessionId, ipAddress, userAgent]);
    return { success: true };
  }

  /**
   * 移除会话（用户离线）
   */
  async removeSession(sessionId) {
    if (!sessionId) {
      return { success: false, message: '会话ID不能为空' };
    }

    const sql = `DELETE FROM online_sessions WHERE session_id = ?`;
    await this.run(sql, [sessionId]);
    return { success: true };
  }

  /**
   * 获取当前在线人数（基于心跳机制，1分钟内有心跳算在线）
   */
  async getCurrentOnlineCount() {
    const sql = `
      SELECT COUNT(*) as count 
      FROM online_sessions 
      WHERE last_heartbeat >= datetime('now', '-1 minute')
    `;
    
    const result = await this.queryOne(sql);
    return result.count || 0;
  }

  /**
   * 获取访问趋势数据
   */
  async getVisitTrends(days = 7) {
    // 修复：访问量应该统计所有记录（包括无效IP），唯一访客才过滤无效IP
    // 这确保与 getOverallStats() 的逻辑一致
    const sql = `
      SELECT 
        DATE(visit_time) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT CASE 
          WHEN ip_address IS NOT NULL 
          AND ip_address != '' 
          AND ip_address != 'unknown' 
          THEN ip_address 
        END) as unique_visitors
      FROM visits 
      WHERE visit_time >= datetime('now', '-${days} days')
      AND visit_time IS NOT NULL
      GROUP BY DATE(visit_time)
      ORDER BY date ASC
    `;
    
    return await this.queryAll(sql);
  }

  /**
   * 获取页面访问统计
   */
  async getPageStats(limit = 50) {
    // 获取所有页面的访问统计，按访问量排序
    // 修复：统一统计口径，访问量统计所有记录，唯一访客过滤无效IP
    const sql = `
      SELECT 
        page,
        COUNT(*) as visits,
        COUNT(DISTINCT CASE 
          WHEN ip_address IS NOT NULL 
          AND ip_address != '' 
          AND ip_address != 'unknown' 
          THEN ip_address 
        END) as unique_visitors
      FROM visits 
      WHERE page NOT LIKE '/api/%'
        AND page NOT LIKE '/stats/%'
        AND page NOT LIKE '/online%'
        AND page NOT LIKE '/record%'
        AND page NOT LIKE '/trends%'
        AND page NOT LIKE '/overview%'
        AND page NOT LIKE '/pages%'
        AND page NOT LIKE '/contacts%'
        AND page NOT LIKE '/config%'
        AND page NOT LIKE '/announcements%'
        AND page NOT LIKE '/tutorials%'
        AND page NOT LIKE '/tags/%'
        AND page NOT LIKE '/filters%'
        AND page NOT LIKE '/user/%'
        AND visit_time IS NOT NULL
      GROUP BY page 
      ORDER BY visits DESC
      LIMIT ?
    `;
    
    const results = await this.queryAll(sql, [limit]);
    return results;
  }

  /**
   * 获取访问统计总览
   */
  async getOverallStats() {
    try {
      // 总访问量 - 确保数据一致性
      const totalVisitsSql = `SELECT COUNT(*) as total FROM visits WHERE visit_time IS NOT NULL`;
      const totalVisits = await this.queryOne(totalVisitsSql);

      // 唯一访客数 - 使用更稳定的计算方式
      const uniqueVisitorsSql = `
        SELECT COUNT(DISTINCT ip_address) as unique_visitors 
        FROM visits 
        WHERE ip_address IS NOT NULL AND ip_address != '' AND ip_address != 'unknown'
      `;
      const uniqueVisitors = await this.queryOne(uniqueVisitorsSql);

      // 今日访问量 - 使用当天的00:00作为起始时间
      const todayVisitsSql = `
        SELECT COUNT(*) as today 
        FROM visits 
        WHERE visit_time >= datetime('now', 'start of day')
        AND visit_time IS NOT NULL
      `;
      const todayVisits = await this.queryOne(todayVisitsSql);

      // 今日唯一访客 - 使用当天的00:00作为起始时间
      const todayUniqueVisitorsSql = `
        SELECT COUNT(DISTINCT ip_address) as today_unique 
        FROM visits 
        WHERE visit_time >= datetime('now', 'start of day')
        AND ip_address IS NOT NULL AND ip_address != '' AND ip_address != 'unknown'
      `;
      const todayUniqueVisitors = await this.queryOne(todayUniqueVisitorsSql);

      // 本周访问量
      const weekVisitsSql = `
        SELECT COUNT(*) as week 
        FROM visits 
        WHERE visit_time >= datetime('now', '-7 days')
        AND visit_time IS NOT NULL
      `;
      const weekVisits = await this.queryOne(weekVisitsSql);

      // 本月访问量
      const monthVisitsSql = `
        SELECT COUNT(*) as month 
        FROM visits 
        WHERE visit_time >= datetime('now', 'start of month')
        AND visit_time IS NOT NULL
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
    } catch (error) {
      console.error('获取访问统计总览失败:', error);
      // 返回默认值，确保不会因为数据库错误导致统计页面崩溃
      return {
        total: { visits: 0, uniqueVisitors: 0 },
        today: { visits: 0, uniqueVisitors: 0 },
        week: { visits: 0 },
        month: { visits: 0 }
      };
    }
  }

  /**
   * 获取热门页面
   */
  async getPopularPages(limit = 5) {
    // 修复：统一统计口径，访问量统计所有记录，唯一访客过滤无效IP
    const sql = `
      SELECT 
        page,
        COUNT(*) as visits,
        COUNT(DISTINCT CASE 
          WHEN ip_address IS NOT NULL 
          AND ip_address != '' 
          AND ip_address != 'unknown' 
          THEN ip_address 
        END) as unique_visitors,
        MAX(visit_time) as last_visit
      FROM visits 
      WHERE visit_time >= datetime('now', '-30 days')
      AND visit_time IS NOT NULL
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
    // 修复：添加时间有效性检查
    const sql = `
      SELECT 
        '直接访问' as source,
        COUNT(*) as visits
      FROM visits 
      WHERE visit_time >= datetime('now', '-30 days')
      AND visit_time IS NOT NULL
      ORDER BY visits DESC 
      LIMIT ?
    `;
    
    return await this.queryAll(sql, [limit]);
  }

  /**
   * 获取访问时段分布
   */
  async getHourlyDistribution() {
    // 修复：添加时间有效性检查，确保只统计有效访问
    const sql = `
      SELECT 
        CAST(strftime('%H', visit_time) AS INTEGER) as hour,
        COUNT(*) as visits
      FROM visits 
      WHERE visit_time >= datetime('now', '-7 days')
      AND visit_time IS NOT NULL
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
      WHERE visit_time < datetime('now', '-${daysToKeep} days')
    `;
    
    const result = await this.run(sql);
    return result.changes;
  }

  /**
   * 数据一致性检查和修复
   */
  async checkDataConsistency() {
    try {
      // 检查并修复无效的访问记录
      const invalidRecordsSql = `
        SELECT COUNT(*) as count 
        FROM visits 
        WHERE visit_time IS NULL 
        OR ip_address IS NULL 
        OR ip_address = '' 
        OR ip_address = 'unknown'
      `;
      
      const invalidCount = await this.queryOne(invalidRecordsSql);
      
      if (invalidCount.count > 0) {
        console.log(`发现 ${invalidCount.count} 条无效访问记录`);
        
        // 可以选择删除无效记录或修复它们
        // 这里我们选择删除无效记录
        const cleanupSql = `
          DELETE FROM visits 
          WHERE visit_time IS NULL 
          OR ip_address IS NULL 
          OR ip_address = '' 
          OR ip_address = 'unknown'
        `;
        
        const cleanupResult = await this.run(cleanupSql);
        console.log(`已清理 ${cleanupResult.changes} 条无效访问记录`);
        
        return {
          success: true,
          cleanedRecords: cleanupResult.changes,
          message: `已清理 ${cleanupResult.changes} 条无效访问记录`
        };
      }
      
      return {
        success: true,
        cleanedRecords: 0,
        message: '数据一致性检查通过，无需清理'
      };
    } catch (error) {
      console.error('数据一致性检查失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查是否在指定时间内有重复访问
   * 优先使用 sessionId，其次使用 ipAddress
   */
  async hasRecentVisit(ipAddress, minutes = 1, page = null, sessionId = null) {
    let sql, params;
    
    if (sessionId) {
      // 如果有 sessionId，使用 sessionId 判断
      if (page) {
        sql = `
          SELECT COUNT(*) as count 
          FROM visits 
          WHERE session_id = ? 
          AND page = ?
          AND visit_time >= datetime('now', '-${minutes} minutes')
        `;
        params = [sessionId, page];
      } else {
        sql = `
          SELECT COUNT(*) as count 
          FROM visits 
          WHERE session_id = ? 
          AND visit_time >= datetime('now', '-${minutes} minutes')
        `;
        params = [sessionId];
      }
    } else {
      // 没有 sessionId，使用 IP 判断
      if (page) {
        sql = `
          SELECT COUNT(*) as count 
          FROM visits 
          WHERE ip_address = ? 
          AND page = ?
          AND visit_time >= datetime('now', '-${minutes} minutes')
        `;
        params = [ipAddress, page];
      } else {
        sql = `
          SELECT COUNT(*) as count 
          FROM visits 
          WHERE ip_address = ? 
          AND visit_time >= datetime('now', '-${minutes} minutes')
        `;
        params = [ipAddress];
      }
    }
    
    const result = await this.queryOne(sql, params);
    return result.count > 0;
  }

  /**
   * 获取IP访问频率
   */
  async getIPVisitFrequency(ipAddress, hours = 24) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM visits 
      WHERE ip_address = ? 
      AND visit_time >= datetime('now', '-${hours} hours')
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
      whereClause += ' AND ip_address = ?';
      params.push(ipAddress);
    }

    if (startDate) {
      whereClause += ' AND visit_time >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND visit_time <= ?';
      params.push(endDate);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM visits` + whereClause;
    const total = await this.queryOne(countSql, params);

    // 获取分页数据
    const dataSql = `
      SELECT * FROM visits
      ${whereClause} 
      ORDER BY visit_time DESC 
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