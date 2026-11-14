const express = require('express');
const rateLimit = require('express-rate-limit');
const { BotConversationService, validSessionId } = require('../services/BotConversationService');
const { createFeedbackGuard } = require('../middleware/feedbackGuard');

/**
 * 前台机器人「小度」（公开）
 * GET  /status        是否启用 AI 及欢迎语
 * POST /chat          一次性 AI 对话；未启用时返回 ai:false，由前端回退到普通留言
 * POST /chat/stream   流式 AI 对话（SSE）；未启用时返回 ai:false
 * POST /chat/end      结束本次会话并异步整理反馈
 * POST /feedback      AI 未启用时的普通留言，仅保留到后台
 * POST /request       明确提交找图需求，返回一次性查询码并按既有服务推送飞书
 * POST /request/lookup 凭查询码跨设备查询这一条需求与回复
 * POST /request/by-email 按主动填写的查询邮箱查看需求列表与回复
 *
 * 新客户端传随机 sessionId：收集成功的 AI 对话，关闭或空闲后只落一条值得处理的总结。
 * 未传 sessionId 的旧客户端仍按原有话题留言方式工作。
 */
module.exports = function createBotChatRoutes(service, deps = {}) {
  const router = express.Router();
  const feedbackService = deps.feedbackService || null;
  const materialSearch = deps.materialSearch || null;
  const conversations = deps.conversations || (feedbackService ? new BotConversationService(service, feedbackService) : null);

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
      const { message, userId, history, topicLabel, sessionId } = req.body || {};
      if (sessionId != null && !validSessionId(sessionId)) return res.status(400).json({ success: false, message: '会话标识无效' });
      const result = await service.chat({ message, userId, history, topicLabel, materialSearch });
      if (!result.enabled) return res.json({ success: true, data: { ai: false, reply: null } });
      if (sessionId && conversations && topicLabel) conversations.record({ sessionId, message, userId, topicLabel });
      else if (!sessionId) await logFeedback({ message, userId, topicLabel });
      res.json({ success: true, data: { ai: true, reply: result.reply } });
    } catch (error) {
      const known = error.status === 400 || error.status === 429;
      res.status(known ? error.status : 502).json({ success: false, message: error.status ? error.message : 'AI 服务暂时不可用，请稍后再试' });
    }
  });

  router.post('/chat/stream', chatLimiter, async (req, res) => {
    const { message, userId, history, topicLabel, sessionId } = req.body || {};
    if (sessionId != null && !validSessionId(sessionId)) return res.status(400).json({ success: false, message: '会话标识无效' });
    let config;
    try { config = await service.get(); }
    catch (_) { return res.status(502).json({ success: false, message: 'AI 服务暂时不可用，请稍后再试' }); }
    if (!config.enabled || !config.apiKey) {
      return res.json({ success: true, data: { ai: false, reply: null } });
    }

    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();

    let full = '';
    let completed = false;
    let failed = false;
    try {
      for await (const ev of service.streamChat({ message, history, topicLabel, materialSearch })) {
        if (ev.type === 'delta') {
          full += ev.content;
          res.write(`data: ${JSON.stringify({ delta: ev.content })}\n\n`);
        } else if (ev.type === 'done') {
          completed = true;
          break;
        } else if (ev.type === 'disabled') {
          failed = true;
          res.write(`data: ${JSON.stringify({ disabled: true })}\n\n`);
          break;
        } else if (ev.type === 'error') {
          failed = true;
          res.write(`data: ${JSON.stringify({ error: ev.message, status: ev.status })}\n\n`);
          break;
        }
      }
      if (completed && full.trim()) {
        if (sessionId && conversations && topicLabel) conversations.record({ sessionId, message, userId, topicLabel });
        else if (!sessionId) await logFeedback({ message, userId, topicLabel });
        res.write(`data: ${JSON.stringify({ done: true, full })}\n\n`);
      } else if (!failed && !completed) {
        res.write(`data: ${JSON.stringify({ error: '回复中断了，请稍后重试' })}\n\n`);
      }
    } catch (error) {
      console.error('[bot] 流式响应失败:', error?.message);
      res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用，请稍后再试' })}\n\n`);
    }
    res.end();
  });

  router.post('/request', ...createFeedbackGuard(), async (req, res) => {
    if (!feedbackService) return res.status(503).json({ success: false, message: '留言暂不可用' });
    res.set('Cache-Control', 'no-store');
    try {
      const result = await feedbackService.submitFeedback(
        { message: req.body.message, user_id: req.body.user_id, lookup_email: req.body.lookupEmail }, {}, { issueAccessCode: true }
      );
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message || '留言提交失败' });
    }
  });

  router.post('/request/by-email', rateLimit({
    windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: '查询太频繁，请稍后再试' }
  }), async (req, res) => {
    if (!feedbackService) return res.status(503).json({ success: false, message: '查询暂不可用' });
    res.set('Cache-Control', 'no-store');
    try {
      const result = await feedbackService.getFeedbacksByLookupEmail(req.body?.email, req.body?.page);
      return res.json({ success: true, ...result });
    } catch (error) {
      if (error.message === '请输入有效的查询邮箱') return res.status(400).json({ success: false, message: error.message });
      console.error('[bot] 邮箱查询失败:', error?.message);
      return res.status(503).json({ success: false, message: '查询暂不可用，请稍后再试' });
    }
  });

  router.post('/request/lookup', rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
    if (!feedbackService) return res.status(503).json({ success: false, message: '查询暂不可用' });
    res.set('Cache-Control', 'no-store');
    try {
      const feedback = await feedbackService.getFeedbackByAccessCode(req.body?.accessCode);
      if (!feedback) return res.status(404).json({ success: false, message: '查询码无效，请核对后重试' });
      return res.json({ success: true, data: feedback });
    } catch (error) {
      console.error('[bot] 查询反馈回复失败:', error?.message);
      return res.status(503).json({ success: false, message: '查询暂不可用，请稍后再试' });
    }
  });

  router.post('/feedback', ...createFeedbackGuard(), async (req, res) => {
    if (!feedbackService) return res.status(503).json({ success: false, message: '留言暂不可用' });
    try {
      const result = await feedbackService.submitFeedback(
        { message: req.body.message, user_id: req.body.user_id }, {}, { notify: false }
      );
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message || '留言提交失败' });
    }
  });

  router.post('/chat/end', chatLimiter, (req, res) => {
    const sessionId = req.body?.sessionId;
    if (!validSessionId(sessionId)) return res.status(400).json({ success: false, message: '会话标识无效' });
    if (conversations) conversations.finish(sessionId).catch(error => console.error('[bot] 整理会话失败:', error?.message));
    return res.json({ success: true, data: { queued: true } });
  });

  return router;
};
