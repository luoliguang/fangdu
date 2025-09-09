/**
 * Feedback 数据模型
 * 处理留言反馈相关的数据库操作
 */
class Feedback {
  constructor(db) {
    this.db = db;
  }

  /**
   * 创建新留言
   */
  async create(feedbackData) {
    const {
      name,
      email,
      message,
      materialId = null,
      ipAddress = null,
      userAgent = null,
      user_id = null
    } = feedbackData;

    // 验证必填字段
    if (!message) {
      throw new Error('留言内容不能为空');
    }

    const sql = `
      INSERT INTO feedbacks (message, status, user_id, created_at) 
      VALUES (?, 'pending', ?, datetime('now'))
    `;
    
    const result = await this.run(sql, [message, user_id]);
    return { id: result.lastID, message, user_id, status: 'pending', created_at: new Date().toISOString() };
  }

  /**
   * 获取所有留言（支持分页和状态过滤）
   */
  async getAll(options = {}) {
    const {
      status = null,
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = ' WHERE 1=1';
    const params = [];

    // 添加状态过滤
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM feedbacks` + whereClause;
    const total = await this.queryOne(countSql, params);

    // 获取分页数据
    const dataSql = `
      SELECT * 
      FROM feedbacks
      ${whereClause} 
      ORDER BY ${orderBy} ${order} 
      LIMIT ? OFFSET ?
    `;
    
    const feedbacks = await this.queryAll(dataSql, [...params, limit, offset]);

    return {
      data: feedbacks,
      meta: {
        total: total.total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total.total / limit)
      }
    };
  }

  /**
   * 根据ID获取单个留言
   */
  async getById(id) {
    const sql = `
      SELECT * FROM feedbacks WHERE id = ?
    `;
    return await this.queryOne(sql, [id]);
  }

  /**
   * 根据用户ID获取留言列表
   */
  async getByUserId(userId, options = {}) {
    const {
      page = 1,
      limit = 10
    } = options;

    const offset = (page - 1) * limit;
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM feedbacks WHERE user_id = ?`;
    const total = await this.queryOne(countSql, [userId]);

    // 获取分页数据
    const dataSql = `
      SELECT f.* 
      FROM feedbacks f 
      WHERE f.user_id = ? 
      ORDER BY f.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const feedbacks = await this.queryAll(dataSql, [userId, limit, offset]);

    return {
      data: feedbacks,
      meta: {
        total: total.total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total.total / limit)
      }
    };
  }

  /**
   * 更新留言状态
   */
  async updateStatus(id, status, adminReply = null) {
    const validStatuses = ['pending', 'approved', 'rejected', 'replied'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('无效的状态值');
    }

    let sql = `UPDATE feedbacks SET status = ?, updated_at = datetime('now')`;
    const params = [status];

    if (adminReply) {
      sql += `, admin_reply = ?`;
      params.push(adminReply);
    }

    sql += ` WHERE id = ?`;
    params.push(id);
    
    const result = await this.run(sql, params);
    
    if (result.changes === 0) {
      throw new Error('留言不存在');
    }
    
    // 直接返回更新后的数据，避免额外查询
    const updatedData = {
      id: parseInt(id),
      status: status,
      updated_at: new Date().toISOString()
    };
    
    if (adminReply) {
      updatedData.admin_reply = adminReply;
    }
    
    return updatedData;
  }

  /**
   * 删除留言
   */
  async delete(id) {
    const feedback = await this.getById(id);
    if (!feedback) {
      throw new Error('留言不存在');
    }

    const sql = `DELETE FROM feedbacks WHERE id = ?`;
    const result = await this.run(sql, [id]);
    
    if (result.changes === 0) {
      throw new Error('删除失败');
    }

    return feedback;
  }

  /**
   * 获取未处理留言数量
   */
  async getPendingCount() {
    const sql = `SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'`;
    const result = await this.queryOne(sql);
    return result.count;
  }

  /**
   * 获取留言统计信息
   */
  async getStats() {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM feedbacks 
      GROUP BY status
    `;
    
    const stats = await this.queryAll(sql);
    
    // 转换为对象格式
    const result = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      replied: 0
    };

    stats.forEach(stat => {
      result[stat.status] = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  /**
   * 批量更新留言状态
   */
  async batchUpdateStatus(ids, status) {
    const validStatuses = ['pending', 'approved', 'rejected', 'replied'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('无效的状态值');
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('ID列表不能为空');
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE feedbacks 
      SET status = ?, updated_at = datetime('now') 
      WHERE id IN (${placeholders})
    `;
    
    const result = await this.run(sql, [status, ...ids]);
    return result.changes;
  }

  /**
   * 验证邮箱格式
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
   * 获取未处理留言数量
   */
  async getUnprocessedCount() {
    const sql = `SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'`;
    const result = await this.queryOne(sql);
    return result ? result.count : 0;
  }

  /**
   * 批量删除留言
   */
  async batchDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('请提供要删除的留言ID');
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM feedbacks WHERE id IN (${placeholders})`;
    
    return await this.run(sql, ids);
  }

  /**
   * 搜索留言
   */
  async search(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = null
    } = options;

    let sql = `
      SELECT * FROM feedbacks 
      WHERE (name LIKE ? OR email LIKE ? OR message LIKE ?)
    `;
    
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const feedbacks = await this.queryAll(sql, params);
    
    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total FROM feedbacks 
      WHERE (name LIKE ? OR email LIKE ? OR message LIKE ?)
    `;
    
    const countParams = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (status) {
      countSql += ` AND status = ?`;
      countParams.push(status);
    }

    const countResult = await this.queryOne(countSql, countParams);
    const total = countResult ? countResult.total : 0;

    return {
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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

module.exports = Feedback;