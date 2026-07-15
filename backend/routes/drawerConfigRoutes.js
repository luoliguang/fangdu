const express = require('express');
const router = express.Router();
const multer = require('multer');
const DrawerConfigController = require('../controllers/DrawerConfigController');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  }
});

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

// 页面分类配置（独立子页面管理）
router.get('/page-categories', DrawerConfigController.getPageCategories);
router.post('/page-categories', DrawerConfigController.createPageCategory);
router.put('/page-categories/:id', DrawerConfigController.updatePageCategory);
router.delete('/page-categories/:id', DrawerConfigController.deletePageCategory);

// 站点配置（面料细节图等）
router.get('/site-config/:key', DrawerConfigController.getSiteConfig);
router.post('/site-config/fabric-detail-image', imageUpload.single('image'), DrawerConfigController.uploadFabricDetailImage);

module.exports = router;