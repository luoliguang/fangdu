const { 
  DrawerConfig, 
  Announcement, 
  TutorialStep, 
  QuickFilter, 
  DrawerTab, 
  ContactInfo 
} = require('../models/DrawerConfig');

async function initDrawerConfig() {
  try {
    console.log('开始初始化抽屉配置数据...');

    // 创建抽屉标签页
    const tabs = [
      { key: 'announcement', label: '公告', icon: '📢', sort_order: 1 },
      { key: 'tutorial', label: '教程', icon: '📚', sort_order: 2 },
      { key: 'filter', label: '筛选', icon: '🔍', sort_order: 3 },
      { key: 'favorites', label: '收藏', icon: '❤️', sort_order: 4 }
    ];

    for (const tab of tabs) {
      await DrawerTab.findOrCreate({
        where: { key: tab.key },
        defaults: tab
      });
    }
    console.log('✅ 抽屉标签页初始化完成');

    // 创建默认公告
    const announcements = [
      {
        title: '🎉 新增视频素材功能',
        content: '现在您可以浏览和下载高质量的视频素材了！',
        type: 'feature',
        is_new: true,
        sort_order: 1
      },
      {
        title: '📢 素材库更新通知',
        content: '本周新增了200+春季新款面料素材，快来探索吧！',
        type: 'update',
        is_new: false,
        sort_order: 2
      },
      {
        title: '⚡ 系统优化完成',
        content: '搜索速度提升50%，图片加载更快更稳定。',
        type: 'improvement',
        is_new: false,
        sort_order: 3
      }
    ];

    for (const announcement of announcements) {
      await Announcement.findOrCreate({
        where: { title: announcement.title },
        defaults: announcement
      });
    }
    console.log('✅ 公告数据初始化完成');

    // 创建教程步骤
    const tutorialSteps = [
      {
        title: '🔍 如何搜索素材',
        content: '在搜索框中输入关键词，如"圆领短袖"、"插肩"等，系统会智能匹配相关素材。',
        icon: '🔍',
        step_number: 1,
        sort_order: 1
      },
      {
        title: '🏷️ 使用标签筛选',
        content: '点击下方的标签按钮可以快速筛选特定类型的素材，支持多标签组合。',
        icon: '🏷️',
        step_number: 2,
        sort_order: 2
      },
      {
        title: '📱 查看素材详情',
        content: '点击任意素材可以查看大图或播放视频，支持全屏浏览。',
        icon: '📱',
        step_number: 3,
        sort_order: 3
      },
      {
        title: '💬 提交需求',
        content: '找不到想要的素材？在页面底部提交您的需求，我们会尽快为您添加。',
        icon: '💬',
        step_number: 4,
        sort_order: 4
      }
    ];

    for (const step of tutorialSteps) {
      await TutorialStep.findOrCreate({
        where: { step_number: step.step_number },
        defaults: step
      });
    }
    console.log('✅ 教程步骤初始化完成');

    // 创建快速筛选选项
    const quickFilters = [
      { name: '最新上传', value: 'latest', icon: '🆕', filter_type: 'sort', sort_order: 1 },
      { name: '热门素材', value: 'popular', icon: '🔥', filter_type: 'sort', sort_order: 2 },
      { name: '高清图片', value: 'hd', icon: '📸', filter_type: 'tag', sort_order: 3 },
      { name: '视频素材', value: 'video', icon: '🎬', filter_type: 'media_type', sort_order: 4 },
      { name: '春季新款', value: 'spring', icon: '🌸', filter_type: 'tag', sort_order: 5 },
      { name: '夏季清爽', value: 'summer', icon: '☀️', filter_type: 'tag', sort_order: 6 }
    ];

    for (const filter of quickFilters) {
      await QuickFilter.findOrCreate({
        where: { value: filter.value },
        defaults: filter
      });
    }
    console.log('✅ 快速筛选选项初始化完成');

    // 创建联系信息
    const contactInfos = [
      { type: 'email', label: '邮箱', value: 'support@fangdu.com', icon: '📧', sort_order: 1 },
      { type: 'wechat', label: '微信', value: 'fangdu_support', icon: '📱', sort_order: 2 },
      { type: 'other', label: '工作时间', value: '周一至周五 9:00-18:00', icon: '⏰', sort_order: 3 }
    ];

    for (const contact of contactInfos) {
      await ContactInfo.findOrCreate({
        where: { type: contact.type, label: contact.label },
        defaults: contact
      });
    }
    console.log('✅ 联系信息初始化完成');

    console.log('🎉 抽屉配置数据初始化完成！');
  } catch (error) {
    console.error('❌ 初始化抽屉配置数据失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { sequelize } = require('../config/sequelize');
  
  sequelize.authenticate()
    .then(() => {
      console.log('数据库连接成功');
      return initDrawerConfig();
    })
    .then(() => {
      console.log('初始化完成，退出程序');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = initDrawerConfig;