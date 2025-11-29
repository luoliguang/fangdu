const express = require('express');
const router = express.Router();
const DrawerConfigController = require('../controllers/DrawerConfigController');

// 获取完整的抽屉配置
router.get('/config', DrawerConfigController.getDrawerConfig);

// 公告相关路由
router.get('/announcements', DrawerConfigController.getAnnouncements);
router.get('/top-announcement', DrawerConfigController.getTopAnnouncement);
router.post('/announcements', DrawerConfigController.createAnnouncement);
router.put('/announcements/:id', DrawerConfigController.updateAnnouncement);
router.delete('/announcements/:id', DrawerConfigController.deleteAnnouncement);

// 教程步骤相关路由
router.get('/tutorials', DrawerConfigController.getTutorialSteps);
router.post('/tutorials', DrawerConfigController.createTutorialStep);
router.put('/tutorials/:id', DrawerConfigController.updateTutorialStep);
router.delete('/tutorials/:id', DrawerConfigController.deleteTutorialStep);

// 快速筛选选项相关路由
router.get('/filters', DrawerConfigController.getQuickFilters);
router.post('/filters', DrawerConfigController.createQuickFilter);
router.put('/filters/:id', DrawerConfigController.updateQuickFilter);
router.delete('/filters/:id', DrawerConfigController.deleteQuickFilter);

// 抽屉标签页相关路由
router.get('/tabs', DrawerConfigController.getDrawerTabs);

// 联系信息相关路由
router.get('/contacts', DrawerConfigController.getContactInfos);
router.post('/contacts', DrawerConfigController.createContactInfo);
router.put('/contacts/:id', DrawerConfigController.updateContactInfo);
router.delete('/contacts/:id', DrawerConfigController.deleteContactInfo);

// 批量更新排序
router.put('/sort-order', DrawerConfigController.updateSortOrder);

module.exports = router;