const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/auth');

/**
 * 飞书通知配置（仅管理员）
 * GET  /      读取（脱敏）
 * PUT  /      保存
 * POST /test  发送测试消息（可带未保存的草稿）
 */
module.exports = function createLarkConfigRoutes(service) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // 测试会真实请求飞书，限制频率避免被连点
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '测试过于频繁，请稍后再试' }
  });

  const fail = (res, error, fallback) => {
    const known = error.status === 400 || error.status === 502;
    res.status(known ? error.status : 500).json({ success: false, message: known ? error.message : fallback });
  };

  router.get('/', requireAdmin, async (req, res) => {
    try { res.json({ success: true, data: await service.getPublic() }); }
    catch (error) { fail(res, error, '读取飞书配置失败'); }
  });

  router.put('/', requireAdmin, async (req, res) => {
    try { res.json({ success: true, data: await service.save(req.body) }); }
    catch (error) { fail(res, error, '保存飞书配置失败'); }
  });

  router.post('/test', requireAdmin, testLimiter, async (req, res) => {
    try {
      await service.sendTest(req.body || {});
      res.json({ success: true, message: '测试消息已发送，请到飞书群查看' });
    } catch (error) { fail(res, error, '发送测试消息失败'); }
  });

  return router;
};
