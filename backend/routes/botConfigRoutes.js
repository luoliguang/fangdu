const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/auth');

/**
 * 机器人（DeepSeek）配置（仅管理员）
 * GET  /      读取（不含 API Key）
 * PUT  /      保存
 * POST /test  测试对话（可带未保存的草稿）
 */
module.exports = function createBotConfigRoutes(service) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // 测试会真实请求 DeepSeek，限制频率避免被连点
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '测试过于频繁，请稍后再试' }
  });

  const fail = (res, error, fallback) => {
    const known = [400, 429, 502].includes(error.status);
    res.status(known ? error.status : 500).json({ success: false, message: known ? error.message : fallback });
  };

  router.get('/', requireAdmin, async (req, res) => {
    try { res.json({ success: true, data: await service.getPublic() }); }
    catch (error) { fail(res, error, '读取机器人配置失败'); }
  });

  router.put('/', requireAdmin, async (req, res) => {
    try { res.json({ success: true, data: await service.save(req.body) }); }
    catch (error) { fail(res, error, '保存机器人配置失败'); }
  });

  router.post('/test', requireAdmin, testLimiter, async (req, res) => {
    try { res.json({ success: true, data: await service.test(req.body || {}) }); }
    catch (error) { fail(res, error, '测试对话失败'); }
  });

  return router;
};
