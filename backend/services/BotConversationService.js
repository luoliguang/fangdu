const IDLE_MS = 2 * 60 * 1000;
const MAX_SESSIONS = 200;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LEN = 1000;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOPIC_LABELS = new Set(['想要新素材', '没找到想要的', '网站有问题', '其他想说的']);

function validSessionId(value) {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

// 只在服务端内存中保存短时会话；页面关闭或 2 分钟无新消息后整理一次。
class BotConversationService {
  constructor(botService, feedbackService, { idleMs = IDLE_MS } = {}) {
    this.botService = botService;
    this.feedbackService = feedbackService;
    this.idleMs = idleMs;
    this.sessions = new Map();
  }

  record({ sessionId, message, userId, topicLabel }) {
    if (!validSessionId(sessionId) || typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LEN) return;
    let session = this.sessions.get(sessionId);
    if (!session) {
      if (this.sessions.size >= MAX_SESSIONS) {
        const oldest = this.sessions.keys().next().value;
        clearTimeout(this.sessions.get(oldest).timer);
        this.sessions.delete(oldest);
      }
      session = { messages: [], userId: typeof userId === 'string' && validSessionId(userId) ? userId : null, timer: null };
      this.sessions.set(sessionId, session);
    }
    if (session.messages.length >= MAX_MESSAGES) session.messages.splice(1, 1); // 保留首条背景及最近 11 条
    session.messages.push({ message: message.trim(), topic: TOPIC_LABELS.has(topicLabel) ? topicLabel : '' });
    clearTimeout(session.timer);
    session.timer = setTimeout(() => { this.finish(sessionId).catch(error => console.error('[bot] 整理会话失败:', error?.message)); }, this.idleMs);
    session.timer.unref?.();
  }

  async finish(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    clearTimeout(session.timer);
    this.sessions.delete(sessionId); // 先移除，关闭与空闲计时器只会处理一次
    if (!session.messages.length) return false;
    try {
      const decision = await this.botService.summarizeFeedback(session.messages);
      if (!decision?.notify) return false;
      await this.feedbackService.submitFeedback({
        message: `【${decision.topic}】${decision.summary}`,
        user_id: session.userId
      }); // 只落一条总结留言；原有服务负责飞书的唯一推送
      return true;
    } catch (error) {
      console.error('[bot] AI 反馈整理失败:', error?.message);
      // AI 无法判断时保留明确选择了反馈话题的原文供后台人工查看，不推送飞书。
      const explicit = session.messages.find(item => item.topic);
      if (explicit) {
        try {
          await this.feedbackService.submitFeedback({
            message: `【${explicit.topic}】${explicit.message}`.slice(0, 1000),
            user_id: session.userId
          }, {}, { notify: false });
        } catch (saveError) {
          console.error('[bot] 保存原始反馈失败:', saveError?.message);
        }
      }
      return false;
    }
  }
}

module.exports = { BotConversationService, validSessionId, IDLE_MS };
