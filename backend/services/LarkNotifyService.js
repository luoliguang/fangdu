const crypto = require('crypto');

const KEY = 'lark_webhook';
// 只允许飞书/Lark 官方机器人地址，防止管理员账号被盗后把服务器当跳板请求内网（SSRF）
const ALLOWED_HOSTS = ['open.feishu.cn', 'open.larksuite.com'];
const PATH_PREFIX = '/open-apis/bot/v2/hook/';
const MASK = '••••';
// 推送节流：10 分钟内最多推 20 条，超出的只计数，下一条成功推送时附带提示
const PUSH_WINDOW_MS = 10 * 60 * 1000;
const PUSH_MAX = 20;
const REQUEST_TIMEOUT_MS = 8000;

const bad = (message) => Object.assign(new Error(message), { status: 400 });

function normalizeWebhookUrl(raw) {
  let url;
  try { url = new URL(raw); } catch (_) { throw bad('Webhook 地址格式不正确'); }
  const token = url.pathname.slice(PATH_PREFIX.length);
  if (
    url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname) || url.port ||
    url.username || url.password || !url.pathname.startsWith(PATH_PREFIX) || !/^[\w-]{8,}$/.test(token)
  ) {
    throw bad('请填写飞书自定义机器人的 Webhook 地址（https://open.feishu.cn/open-apis/bot/v2/hook/…）');
  }
  return url.origin + url.pathname;
}

function maskWebhookUrl(url) {
  if (!url) return '';
  const token = url.slice(url.lastIndexOf('/') + 1);
  const shown = token.length > 12 ? `${token.slice(0, 4)}${MASK}${token.slice(-4)}` : MASK;
  return url.slice(0, url.lastIndexOf('/') + 1) + shown;
}

function friendlyError(code, msg = '') {
  const text = String(msg).toLowerCase();
  if (code === 19021 || text.includes('sign match fail') || text.includes('timestamp')) return '签名校验失败，请检查「签名密钥」是否与飞书机器人设置一致';
  if (code === 19022 || text.includes('ip')) return '当前服务器 IP 不在机器人的 IP 白名单内';
  if (code === 19024 || text.includes('keywords')) return '消息未包含机器人设置的自定义关键词，请在飞书里取消关键词校验或改用签名校验';
  if (code === 19002 || text.includes('not found') || text.includes('invalid')) return 'Webhook 地址无效或机器人已被移除';
  return msg || '飞书返回了未知错误';
}

class LarkNotifyService {
  constructor(repository, { fetchImpl } = {}) {
    this.repository = repository;
    this.fetch = fetchImpl || ((...args) => fetch(...args));
    this.recent = [];
    this.dropped = 0;
  }

  async get() {
    const row = await this.repository.findOne({ where: { key: KEY } });
    if (!row) return { enabled: false, webhookUrl: '', secret: '' };
    const stored = JSON.parse(row.value);
    return {
      enabled: stored.enabled === true,
      webhookUrl: typeof stored.webhookUrl === 'string' ? stored.webhookUrl : '',
      secret: typeof stored.secret === 'string' ? stored.secret : ''
    };
  }

  // 对外只返回脱敏信息，完整地址和密钥永远不会回传给前端
  async getPublic() {
    const config = await this.get();
    return {
      enabled: config.enabled,
      configured: Boolean(config.webhookUrl),
      webhookUrlMasked: maskWebhookUrl(config.webhookUrl),
      hasSecret: Boolean(config.secret)
    };
  }

  async save(input) {
    if (!input || typeof input.enabled !== 'boolean') throw bad('配置格式无效');
    const current = await this.get();
    const next = { enabled: input.enabled, webhookUrl: current.webhookUrl, secret: current.secret };

    const rawUrl = typeof input.webhookUrl === 'string' ? input.webhookUrl.trim() : '';
    if (rawUrl && !rawUrl.includes(MASK)) next.webhookUrl = normalizeWebhookUrl(rawUrl);

    if (input.clearSecret === true) next.secret = '';
    if (typeof input.secret === 'string' && input.secret.trim()) {
      if (input.secret.trim().length > 100) throw bad('签名密钥过长');
      next.secret = input.secret.trim();
    }

    if (next.enabled && !next.webhookUrl) throw bad('请先填写 Webhook 地址再启用通知');
    await this.repository.upsert({ key: KEY, value: JSON.stringify(next) });
    return this.getPublic();
  }

  async _post(url, secret, body) {
    const payload = { ...body };
    if (secret) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      payload.timestamp = timestamp;
      payload.sign = crypto.createHmac('sha256', `${timestamp}\n${secret}`).update('').digest('base64');
    }
    let res;
    try {
      res = await this.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new Error(timedOut ? '请求飞书超时，请检查服务器网络' : '无法连接飞书，请检查服务器网络');
    }
    const json = await res.json().catch(() => ({}));
    const code = json.code ?? json.StatusCode ?? (res.ok ? 0 : -1);
    if (!res.ok || code !== 0) throw new Error(friendlyError(code, json.msg || json.StatusMessage));
  }

  _card({ title, template, body, note }) {
    return {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: { title: { tag: 'plain_text', content: title }, template },
        elements: [
          { tag: 'div', text: { tag: 'plain_text', content: body } },
          { tag: 'hr' },
          { tag: 'note', elements: [{ tag: 'plain_text', content: note }] }
        ]
      }
    };
  }

  _time() {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  }

  // 管理员「发送测试」：可使用尚未保存的草稿，便于保存前验证
  async sendTest(draft = {}) {
    const current = await this.get();
    let url = current.webhookUrl;
    let secret = current.secret;
    const rawUrl = typeof draft.webhookUrl === 'string' ? draft.webhookUrl.trim() : '';
    if (rawUrl && !rawUrl.includes(MASK)) url = normalizeWebhookUrl(rawUrl);
    if (draft.clearSecret === true) secret = '';
    if (typeof draft.secret === 'string' && draft.secret.trim()) secret = draft.secret.trim();
    if (!url) throw bad('请先填写 Webhook 地址');
    try {
      await this._post(url, secret, this._card({
        title: '测试消息 · 机器人连接成功',
        template: 'blue',
        body: '这是一条来自方度素材库的测试消息。收到它说明 Webhook 配置正确，用户在前台机器人留言后会推送到这里。',
        note: `发送时间：${this._time()}`
      }));
    } catch (error) {
      throw Object.assign(error, { status: 502 });
    }
  }

  _allowPush() {
    const now = Date.now();
    this.recent = this.recent.filter(t => now - t < PUSH_WINDOW_MS);
    if (this.recent.length >= PUSH_MAX) { this.dropped += 1; return false; }
    this.recent.push(now);
    return true;
  }

  // 永不抛错：飞书挂了不能影响用户提交留言
  async notifyFeedback({ id, message, user_id }) {
    try {
      const config = await this.get();
      if (!config.enabled || !config.webhookUrl) return;
      if (!this._allowPush()) return;
      const topic = (/^【(.{1,12})】/.exec(message) || [])[1] || '未分类';
      const content = message.replace(/^【.{1,12}】/, '').trim() || message;
      const missed = this.dropped;
      this.dropped = 0;
      const body = content.length > 800 ? `${content.slice(0, 800)}…` : content;
      await this._post(config.webhookUrl, config.secret, this._card({
        title: `新的用户反馈 · ${topic}`,
        template: 'green',
        body: missed ? `${body}\n\n（此前因推送过于频繁，有 ${missed} 条未推送，请到后台留言管理查看）` : body,
        note: `留言 #${id} · 用户 ${String(user_id || '匿名').slice(0, 8)} · ${this._time()}`
      }));
    } catch (error) {
      console.error('[lark] 推送反馈失败:', error.message);
    }
  }
}

let shared;
function getShared() {
  if (!shared) shared = new LarkNotifyService(require('../models/DrawerConfig').SiteConfig);
  return shared;
}

module.exports = { LarkNotifyService, getShared, normalizeWebhookUrl, maskWebhookUrl, KEY, MASK };
