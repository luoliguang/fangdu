const express = require('express');
const rateLimit = require('express-rate-limit');

/**
 * 前台机器人「小度」（公开）
 * GET  /status        是否启用 AI 及欢迎语
 * POST /chat          一次性 AI 对话；未启用时返回 ai:false，由前端回退到普通留言
 * POST /chat/stream   流式 AI 对话（SSE）；未启用时返回 ai:false
 *
 * deps.feedbackService：可选，传入后话题卡片（topicLabel）内容会同步落库为留言，
 * 保证「反馈素材」在 AI 接管回复后仍然可达掌柜的。
 */
module.exports = function createBotChatRoutes(service, deps = {}) {
  const router = express.Router();
  const feedbackService = deps.feedbackService || null;

  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '发送太频繁，请稍后再试' }
  });

  async function logFeedback({ message, userId, topicLabel }) {
    if (!topicLabel || !feedbackService) return;
    try {
      await feedbackService.submitFeedback({ message: `【${topicLabel}】${message}`, user_id: userId });
    } catch (error) {
      console.error('[bot] 记录反馈失败:', error?.message);
    }
  }

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
      const { message, userId, history, topicLabel } = req.body || {};
      const result = await service.chat({ message, userId, history, topicLabel });
      if (!result.enabled) return res.json({ success: true, data: { ai: false, reply: null } });
      await logFeedback({ message, userId, topicLabel });
      res.json({ success: true, data: { ai: true, reply: result.reply } });
    } catch (error) {
      const known = error.status === 400 || error.status === 429;
      res.status(known ? error.status : 502).json({ success: false, message: error.status ? error.message : 'AI 服务暂时不可用，请稍后再试' });
    }
  });

  router.post('/chat/stream', chatLimiter, async (req, res) => {
    const { message, userId, history, topicLabel } = req.body || {};

    const config = await service.get();
    if (!config.enabled || !config.apiKey) {
      return res.json({ success: true, data: { ai: false, reply: null } });
    }

    // 反馈落库放在流式开始前，保证失败也能留存
    await logFeedback({ message, userId, topicLabel });

    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();

    let full = '';
    try {
      for await (const ev of service.streamChat({ message, history, topicLabel })) {
        if (ev.type === 'delta') {
          full += ev.content;
          res.write(`data: ${JSON.stringify({ delta: ev.content })}\n\n`);
        } else if (ev.type === 'done') {
          break;
        } else if (ev.type === 'disabled') {
          res.write(`data: ${JSON.stringify({ disabled: true })}\n\n`);
          break;
        } else if (ev.type === 'error') {
          res.write(`data: ${JSON.stringify({ error: ev.message, status: ev.status })}\n\n`);
          break;
        }
      }
      if (full) res.write(`data: ${JSON.stringify({ done: true, full })}\n\n`);
    } catch (error) {
      console.error('[bot] 流式响应失败:', error?.message);
      res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用，请稍后再试' })}\n\n`);
    }
    res.end();
  });

  return router;
};
