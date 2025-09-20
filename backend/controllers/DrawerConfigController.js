const { 
  DrawerConfig, 
  Announcement, 
  TutorialStep, 
  QuickFilter, 
  DrawerTab, 
  ContactInfo 
} = require('../models/DrawerConfig');
const { Op } = require('sequelize');

class DrawerConfigController {
  // 获取完整的抽屉配置
  static async getDrawerConfig(req, res) {
    try {
      const [tabs, announcements, tutorials, quickFilters, contactInfos] = await Promise.all([
        DrawerTab.findAll({
          where: { is_active: true },
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        }),
        Announcement.findAll({
          where: { 
            is_active: true,
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: new Date() } }
            ],
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: new Date() } }
            ]
          },
          order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
        }),
        TutorialStep.findAll({
          where: { is_active: true },
          order: [['sort_order', 'ASC'], ['step_number', 'ASC']]
        }),
        QuickFilter.findAll({
          where: { is_active: true },
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        }),
        ContactInfo.findAll({
          where: { is_active: true },
          order: [['sort_order', 'ASC'], ['id', 'ASC']]
        })
      ]);

      res.json({
        success: true,
        data: {
          tabs,
          announcements,
          tutorials,
          quickFilters,
          contactInfos
        }
      });
    } catch (error) {
      console.error('获取抽屉配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取抽屉配置失败',
        error: error.message
      });
    }
  }

  // 获取公告列表
  static async getAnnouncements(req, res) {
    try {
      const announcements = await Announcement.findAll({
        where: { 
          is_active: true,
          [Op.or]: [
            { start_date: null },
            { start_date: { [Op.lte]: new Date() } }
          ],
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: new Date() } }
          ]
        },
        order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: announcements
      });
    } catch (error) {
      console.error('获取公告失败:', error);
      res.status(500).json({
        success: false,
        message: '获取公告失败',
        error: error.message
      });
    }
  }

  // 创建公告
  static async createAnnouncement(req, res) {
    try {
      const { title, content, type, is_new, start_date, end_date, sort_order } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: '标题和内容不能为空'
        });
      }

      const announcement = await Announcement.create({
        title,
        content,
        type: type || 'notice',
        is_new: is_new !== undefined ? is_new : true,
        start_date,
        end_date,
        sort_order: sort_order || 0
      });

      res.status(201).json({
        success: true,
        data: announcement,
        message: '公告创建成功'
      });
    } catch (error) {
      console.error('创建公告失败:', error);
      res.status(500).json({
        success: false,
        message: '创建公告失败',
        error: error.message
      });
    }
  }

  // 更新公告
  static async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedRows] = await Announcement.update(updateData, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      const announcement = await Announcement.findByPk(id);
      res.json({
        success: true,
        data: announcement,
        message: '公告更新成功'
      });
    } catch (error) {
      console.error('更新公告失败:', error);
      res.status(500).json({
        success: false,
        message: '更新公告失败',
        error: error.message
      });
    }
  }

  // 删除公告
  static async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;

      const deletedRows = await Announcement.destroy({
        where: { id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      res.json({
        success: true,
        message: '公告删除成功'
      });
    } catch (error) {
      console.error('删除公告失败:', error);
      res.status(500).json({
        success: false,
        message: '删除公告失败',
        error: error.message
      });
    }
  }

  // 获取教程步骤
  static async getTutorialSteps(req, res) {
    try {
      const steps = await TutorialStep.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['step_number', 'ASC']]
      });

      res.json({
        success: true,
        data: steps
      });
    } catch (error) {
      console.error('获取教程步骤失败:', error);
      res.status(500).json({
        success: false,
        message: '获取教程步骤失败',
        error: error.message
      });
    }
  }

  // 创建教程步骤
  static async createTutorialStep(req, res) {
    try {
      const { title, content, icon, step_number, sort_order } = req.body;

      if (!title || !content || !step_number) {
        return res.status(400).json({
          success: false,
          message: '标题、内容和步骤序号不能为空'
        });
      }

      const step = await TutorialStep.create({
        title,
        content,
        icon,
        step_number,
        sort_order: sort_order || 0
      });

      res.status(201).json({
        success: true,
        data: step,
        message: '教程步骤创建成功'
      });
    } catch (error) {
      console.error('创建教程步骤失败:', error);
      res.status(500).json({
        success: false,
        message: '创建教程步骤失败',
        error: error.message
      });
    }
  }

  // 更新教程步骤
  static async updateTutorialStep(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedRows] = await TutorialStep.update(updateData, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '教程步骤不存在'
        });
      }

      const tutorial = await TutorialStep.findByPk(id);
      res.json({
        success: true,
        data: tutorial,
        message: '教程步骤更新成功'
      });
    } catch (error) {
      console.error('更新教程步骤失败:', error);
      res.status(500).json({
        success: false,
        message: '更新教程步骤失败',
        error: error.message
      });
    }
  }

  // 删除教程步骤
  static async deleteTutorialStep(req, res) {
    try {
      const { id } = req.params;

      const deletedRows = await TutorialStep.destroy({
        where: { id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '教程步骤不存在'
        });
      }

      res.json({
        success: true,
        message: '教程步骤删除成功'
      });
    } catch (error) {
      console.error('删除教程步骤失败:', error);
      res.status(500).json({
        success: false,
        message: '删除教程步骤失败',
        error: error.message
      });
    }
  }

  // 获取快速筛选选项
  static async getQuickFilters(req, res) {
    try {
      const filters = await QuickFilter.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });

      res.json({
        success: true,
        data: filters
      });
    } catch (error) {
      console.error('获取快速筛选选项失败:', error);
      res.status(500).json({
        success: false,
        message: '获取快速筛选选项失败',
        error: error.message
      });
    }
  }

  // 创建快速筛选选项
  static async createQuickFilter(req, res) {
    try {
      const { name, value, icon, filter_type, filter_params, sort_order } = req.body;

      if (!name || !value) {
        return res.status(400).json({
          success: false,
          message: '名称和值不能为空'
        });
      }

      const filter = await QuickFilter.create({
        name,
        value,
        icon,
        filter_type: filter_type || 'tag',
        filter_params,
        sort_order: sort_order || 0
      });

      res.status(201).json({
        success: true,
        data: filter,
        message: '快速筛选选项创建成功'
      });
    } catch (error) {
      console.error('创建快速筛选选项失败:', error);
      res.status(500).json({
        success: false,
        message: '创建快速筛选选项失败',
        error: error.message
      });
    }
  }

  // 更新快速筛选选项
  static async updateQuickFilter(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedRows] = await QuickFilter.update(updateData, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '筛选选项不存在'
        });
      }

      const filter = await QuickFilter.findByPk(id);
      res.json({
        success: true,
        data: filter,
        message: '筛选选项更新成功'
      });
    } catch (error) {
      console.error('更新筛选选项失败:', error);
      res.status(500).json({
        success: false,
        message: '更新筛选选项失败',
        error: error.message
      });
    }
  }

  // 删除快速筛选选项
  static async deleteQuickFilter(req, res) {
    try {
      const { id } = req.params;

      const deletedRows = await QuickFilter.destroy({
        where: { id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '筛选选项不存在'
        });
      }

      res.json({
        success: true,
        message: '筛选选项删除成功'
      });
    } catch (error) {
      console.error('删除筛选选项失败:', error);
      res.status(500).json({
        success: false,
        message: '删除筛选选项失败',
        error: error.message
      });
    }
  }

  // 获取抽屉标签页
  static async getDrawerTabs(req, res) {
    try {
      const tabs = await DrawerTab.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });

      res.json({
        success: true,
        data: tabs
      });
    } catch (error) {
      console.error('获取抽屉标签页失败:', error);
      res.status(500).json({
        success: false,
        message: '获取抽屉标签页失败',
        error: error.message
      });
    }
  }

  // 获取联系信息
  static async getContactInfos(req, res) {
    try {
      const contacts = await ContactInfo.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });

      res.json({
        success: true,
        data: contacts
      });
    } catch (error) {
      console.error('获取联系信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取联系信息失败',
        error: error.message
      });
    }
  }

  // 创建联系信息
  static async createContactInfo(req, res) {
    try {
      const contactData = req.body;
      const contact = await ContactInfo.create(contactData);
      
      res.status(201).json({
        success: true,
        data: contact,
        message: '联系信息创建成功'
      });
    } catch (error) {
      console.error('创建联系信息失败:', error);
      res.status(500).json({
        success: false,
        message: '创建联系信息失败',
        error: error.message
      });
    }
  }

  // 更新联系信息
  static async updateContactInfo(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updatedRows] = await ContactInfo.update(updateData, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '联系信息不存在'
        });
      }

      const contact = await ContactInfo.findByPk(id);
      res.json({
        success: true,
        data: contact,
        message: '联系信息更新成功'
      });
    } catch (error) {
      console.error('更新联系信息失败:', error);
      res.status(500).json({
        success: false,
        message: '更新联系信息失败',
        error: error.message
      });
    }
  }

  // 删除联系信息
  static async deleteContactInfo(req, res) {
    try {
      const { id } = req.params;

      const deletedRows = await ContactInfo.destroy({
        where: { id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          message: '联系信息不存在'
        });
      }

      res.json({
        success: true,
        message: '联系信息删除成功'
      });
    } catch (error) {
      console.error('删除联系信息失败:', error);
      res.status(500).json({
        success: false,
        message: '删除联系信息失败',
        error: error.message
      });
    }
  }

  // 批量更新排序
  static async updateSortOrder(req, res) {
    try {
      const { type, items } = req.body; // type: 'announcements', 'tutorials', 'filters', 'tabs'
      
      if (!type || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: '参数格式错误'
        });
      }

      let Model;
      switch (type) {
        case 'announcements':
          Model = Announcement;
          break;
        case 'tutorials':
          Model = TutorialStep;
          break;
        case 'filters':
          Model = QuickFilter;
          break;
        case 'tabs':
          Model = DrawerTab;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: '不支持的类型'
          });
      }

      // 批量更新排序
      const updatePromises = items.map((item, index) => 
        Model.update(
          { sort_order: index },
          { where: { id: item.id } }
        )
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: '排序更新成功'
      });
    } catch (error) {
      console.error('更新排序失败:', error);
      res.status(500).json({
        success: false,
        message: '更新排序失败',
        error: error.message
      });
    }
  }
}

module.exports = DrawerConfigController;