const express = require('express');
const rateLimit = require('express-rate-limit');

/**
 * 前台机器人「小度」（公开）
 * GET  /status  是否启用 AI 及欢迎语
 * POST /chat    AI 对话；未启用时返回 ai:false，由前端回退到普通留言
 */
module.exports = function createBotChatRoutes(service) {
  const router = express.Router();

  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '发送太频繁，请稍后再试' }
  });

  router.get('/status', async (req, res) => {
    try {
      const config = await service.get();
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, data: { aiEnabled: Boolean(config.enabled && config.apiKey), welcomeMessage: config.welcomeMessage } });
    } catch (error) {
      res.status(500).json({ success: false, message: '读取机器人状态失败' });
    }
  });

  router.post('/chat', chatLimiter, async (req, res) => {
    try {
      const { message, userId, history } = req.body || {};
      const result = await service.chat({ message, userId, history });
      if (!result.enabled) return res.json({ success: true, data: { ai: false, reply: null } });
      res.json({ success: true, data: { ai: true, reply: result.reply } });
    } catch (error) {
      const known = error.status === 400 || error.status === 429;
      res.status(known ? error.status : 502).json({ success: false, message: error.status ? error.message : 'AI 服务暂时不可用，请稍后再试' });
    }
  });

  return router;
};
