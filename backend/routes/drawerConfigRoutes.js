const express = require('express');
const router = express.Router();
const multer = require('multer');
const DrawerConfigController = require('../controllers/DrawerConfigController');
const { requireAuth } = require('../middleware/auth');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  }
});

// ── 读取接口（公开，前台页面渲染需要）──

// 获取完整的抽屉配置
router.get('/config', DrawerConfigController.getDrawerConfig);

// 公告
router.get('/announcements', DrawerConfigController.getAnnouncements);
router.get('/top-announcement', DrawerConfigController.getTopAnnouncement);

// 教程步骤
router.get('/tutorials', DrawerConfigController.getTutorialSteps);

// 快速筛选选项
router.get('/filters', DrawerConfigController.getQuickFilters);

// 抽屉标签页
router.get('/tabs', DrawerConfigController.getDrawerTabs);

// 联系信息
router.get('/contacts', DrawerConfigController.getContactInfos);

// 页面分类配置
router.get('/page-categories', DrawerConfigController.getPageCategories);

// 站点配置（面料细节图等）
router.get('/site-config/:key', DrawerConfigController.getSiteConfig);

// ── 写入接口（管理员）──

// 公告
router.post('/announcements', requireAuth, DrawerConfigController.createAnnouncement);
router.put('/announcements/:id', requireAuth, DrawerConfigController.updateAnnouncement);
router.delete('/announcements/:id', requireAuth, DrawerConfigController.deleteAnnouncement);

// 教程步骤
router.post('/tutorials', requireAuth, DrawerConfigController.createTutorialStep);
router.put('/tutorials/:id', requireAuth, DrawerConfigController.updateTutorialStep);
router.delete('/tutorials/:id', requireAuth, DrawerConfigController.deleteTutorialStep);

// 快速筛选选项
router.post('/filters', requireAuth, DrawerConfigController.createQuickFilter);
router.put('/filters/:id', requireAuth, DrawerConfigController.updateQuickFilter);
router.delete('/filters/:id', requireAuth, DrawerConfigController.deleteQuickFilter);

// 联系信息
router.post('/contacts', requireAuth, DrawerConfigController.createContactInfo);
router.put('/contacts/:id', requireAuth, DrawerConfigController.updateContactInfo);
router.delete('/contacts/:id', requireAuth, DrawerConfigController.deleteContactInfo);

// 批量更新排序
router.put('/sort-order', requireAuth, DrawerConfigController.updateSortOrder);

// 页面分类配置
router.post('/page-categories', requireAuth, DrawerConfigController.createPageCategory);
router.put('/page-categories/:id', requireAuth, DrawerConfigController.updatePageCategory);
router.delete('/page-categories/:id', requireAuth, DrawerConfigController.deletePageCategory);

// 站点配置
router.put('/site-config/:key', requireAuth, DrawerConfigController.updateSiteConfig);
router.post('/site-config/fabric-detail-image', requireAuth, imageUpload.single('image'), DrawerConfigController.uploadFabricDetailImage);

module.exports = router;
