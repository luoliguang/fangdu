const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

// 抽屉配置主表
const DrawerConfig = sequelize.define('DrawerConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '配置名称'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '配置描述'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'drawer_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 公告表
const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '公告标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '公告内容'
  },
  type: {
    type: DataTypes.ENUM('feature', 'update', 'improvement', 'notice'),
    defaultValue: 'notice',
    comment: '公告类型'
  },
  is_new: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否为新公告'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  start_date: {
    type: DataTypes.DATE,
    comment: '开始显示日期'
  },
  end_date: {
    type: DataTypes.DATE,
    comment: '结束显示日期'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  show_in_top: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否在顶部显示'
  }
}, {
  tableName: 'announcements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 教程步骤表
const TutorialStep = sequelize.define('TutorialStep', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '教程标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '教程内容'
  },
  icon: {
    type: DataTypes.STRING(50),
    comment: '图标'
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '步骤序号'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'tutorial_steps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 快速筛选选项表
const QuickFilter = sequelize.define('QuickFilter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '筛选名称'
  },
  value: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '筛选值'
  },
  icon: {
    type: DataTypes.STRING(50),
    comment: '图标'
  },
  filter_type: {
    type: DataTypes.ENUM('tag', 'search', 'sort', 'media_type'),
    defaultValue: 'tag',
    comment: '筛选类型'
  },
  filter_params: {
    type: DataTypes.JSON,
    comment: '筛选参数'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'quick_filters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 抽屉标签页配置表
const DrawerTab = sequelize.define('DrawerTab', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '标签页键值'
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '标签页显示名称'
  },
  icon: {
    type: DataTypes.STRING(50),
    comment: '图标'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'drawer_tabs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 联系信息配置表
const ContactInfo = sequelize.define('ContactInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('email', 'wechat', 'phone', 'qq', 'other'),
    allowNull: false,
    comment: '联系方式类型'
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '显示标签'
  },
  value: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '联系方式值'
  },
  icon: {
    type: DataTypes.STRING(50),
    comment: '图标'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'contact_infos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = {
  DrawerConfig,
  Announcement,
  TutorialStep,
  QuickFilter,
  DrawerTab,
  ContactInfo
};