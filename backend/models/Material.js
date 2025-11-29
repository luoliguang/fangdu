/**
 * Material 数据模型
 * 处理素材相关的数据库操作
 */
class Material {
  constructor(db) {
    this.db = db;
  }

  /**
   * 获取素材列表（支持搜索、标签过滤和分页）
   */
  async getAll(options = {}) {
    const {
      search = '',
      tag = '',
      page = 1,
      limit = 20
    } = options;

    const offset = (page - 1) * limit;
    const keywords = search.split(' ').filter(k => k);
    
    let whereClause = ` WHERE 1=1`;
    const params = [];
    
    // 添加搜索条件
    keywords.forEach(keyword => {
      whereClause += ` AND name LIKE ?`;
      params.push(`%${keyword}%`);
    });
    
    // 添加标签过滤
    if (tag) {
      whereClause += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM materials` + whereClause;
    const total = await this.queryOne(countSql, params);

    // 获取分页数据
    const dataSql = `
      SELECT id, name, file_path, tags, media_type, cover_image_path 
      FROM materials${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;
    
    const materials = await this.queryAll(dataSql, [...params, limit, offset]);
    
    // 处理缩略图URL
    const processedMaterials = materials.map(material => {
      let thumbnailUrl = null;
      if (material.media_type === 'image') {
        thumbnailUrl = `${material.file_path}?x-oss-process=image/resize,w_200`;
      } else if (material.media_type === 'video' && material.cover_image_path) {
        thumbnailUrl = material.cover_image_path;
      }
      return { ...material, thumbnail_url: thumbnailUrl };
    });

    return {
      data: processedMaterials,
      meta: {
        total: total.total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total.total / limit)
      }
    };
  }

  /**
   * 根据ID获取单个素材
   */
  async getById(id) {
    const sql = `SELECT * FROM materials WHERE id = ?`;
    return await this.queryOne(sql, [id]);
  }

  /**
   * 创建新素材
   */
  async create(materialData) {
    const {
      name,
      filePath,
      tags,
      mediaType,
      coverImagePath = null
    } = materialData;

    // 格式化标签
    const formattedTags = this.formatTags(tags);

    const sql = `
      INSERT INTO materials (name, file_path, tags, media_type, cover_image_path) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await this.run(sql, [name, filePath, formattedTags, mediaType, coverImagePath]);
    return { id: result.lastID, ...materialData };
  }

  /**
   * 更新素材信息
   */
  async update(id, updateData) {
    const { name, tags } = updateData;
    
    if (!name || !tags) {
      throw new Error('名称和标签不能为空');
    }

    const formattedTags = this.formatTags(tags);
    const sql = `UPDATE materials SET name = ?, tags = ? WHERE id = ?`;
    
    const result = await this.run(sql, [name, formattedTags, id]);
    
    if (result.changes === 0) {
      throw new Error('素材不存在');
    }
    
    return await this.getById(id);
  }

  /**
   * 删除素材
   */
  async delete(id) {
    const material = await this.getById(id);
    if (!material) {
      throw new Error('素材不存在');
    }

    const sql = `DELETE FROM materials WHERE id = ?`;
    const result = await this.run(sql, [id]);
    
    if (result.changes === 0) {
      throw new Error('删除失败');
    }

    return material;
  }

  /**
   * 获取所有唯一标签
   */
  async getAllTags() {
    const sql = "SELECT tags FROM materials";
    const rows = await this.queryAll(sql);
    
    const allTags = rows
      .map(row => row.tags ? row.tags.split(',') : [])
      .flat()
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags;
  }

  /**
   * 获取所有关键词（标签 + 名称中的关键词）
   * 用于搜索建议功能
   */
  async getAllKeywords() {
    const sql = "SELECT DISTINCT tags, name FROM materials";
    const rows = await this.queryAll(sql);
    
    const keywords = new Set();
    
    rows.forEach(row => {
      // 添加所有标签
      if (row.tags) {
        row.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            keywords.add(trimmedTag);
          }
        });
      }
      
      // 从名称中提取关键词（按空格分割）
      if (row.name) {
        row.name.split(/\s+/).forEach(word => {
          const trimmedWord = word.trim();
          // 只添加长度大于1的词，避免单字符
          if (trimmedWord && trimmedWord.length > 1) {
            keywords.add(trimmedWord);
          }
        });
      }
    });
    
    return Array.from(keywords);
  }

  /**
   * 格式化标签字符串
   */
  formatTags(tags) {
    if (!tags || !tags.trim()) {
      return '';
    }
    
    return tags
      .trim()
      .replace(/\s+/g, ',')
      .replace(/,+/g, ',')
      .split(',')
      .filter(Boolean)
      .join(',');
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
   * 批量删除素材
   */
  async batchDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('请提供要删除的素材ID');
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM materials WHERE id IN (${placeholders})`;
    
    return await this.run(sql, ids);
  }

  /**
   * 搜索素材
   */
  async search(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      mediaType = null,
      tags = null
    } = options;

    let sql = `
      SELECT * FROM materials 
      WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?)
    `;
    
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (mediaType) {
      sql += ` AND media_type = ?`;
      params.push(mediaType);
    }

    if (tags) {
      sql += ` AND tags LIKE ?`;
      params.push(`%${tags}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    if (limit > 0) {
      const offset = (page - 1) * limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const materials = await this.queryAll(sql, params);
    
    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total FROM materials 
      WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?)
    `;
    
    const countParams = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (mediaType) {
      countSql += ` AND media_type = ?`;
      countParams.push(mediaType);
    }

    if (tags) {
      countSql += ` AND tags LIKE ?`;
      countParams.push(`%${tags}%`);
    }

    const countResult = await this.queryOne(countSql, countParams);
    const total = countResult ? countResult.total : 0;

    return {
      materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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

module.exports = Material;