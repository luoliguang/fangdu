const express = require('express');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

module.exports = function createSiteControlRoutes(service) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', optionalAuth, async (req, res) => {
    try {
      res.json({ success: true, data: await service.get(), isAdmin: req.user?.role === 'admin' });
    } catch (error) {
      res.status(503).json({ success: false, message: '读取站点控制配置失败' });
    }
  });
  router.put('/', requireAdmin, async (req, res) => {
    try {
      res.json({ success: true, data: await service.save(req.body) });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.status === 400 ? error.message : '保存站点控制配置失败' });
    }
  });
  return router;
};
