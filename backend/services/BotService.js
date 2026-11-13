const KEY = 'chat_bot';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'; // 固定地址，不允许配置，避免 SSRF
const DEFAULT_MODEL = 'deepseek-chat';
const ALLOWED_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const API_KEY_MASK = '••••';
const PROMPT_VERSION = 2; // 提示词文案版本：升级后用于迁移「站长称呼 / Markdown 排版 / 可复制搜索词」等默认文案
const REQUEST_TIMEOUT_MS = 30000;
const MAX_HISTORY = 20;
const MAX_MESSAGE_LEN = 1000;
const MAX_HISTORY_CONTENT_LEN = 2000;

const DEFAULT_SYSTEM_PROMPT = '你是「小度」，方度素材库的智能助手。这个网站是站长「罗洋洋」（自称「洋洋大王」）一个人开发的。你的职责：1) 帮用户查找素材，了解想要的款式、面料、颜色、类别并给出查找建议；2) 解答网站使用问题（色卡、尺码、分类浏览等）；3) 收集用户对素材的反馈，引导用户把需求或问题描述清楚。回答要求：- 用简体中文口语，友好简洁，一般不超过 120 字；- 必须用 Markdown 排版：短段落、列表用「-」开头、重点用「**加粗**」、搜索关键词用反引号包裹，避免输出一整段没有换行的长文；- 教用户怎么搜索或给搜索建议时，把可直接复制的搜索关键词单独用反引号列出来，方便用户复制；- 不确定的事不要编造，建议用户联系站长罗洋洋确认；- 提到网站开发者时就说「罗洋洋」，也可以俏皮地叫他「洋洋大王」；- 严格遵守下方报价政策。';
const DEFAULT_QUOTE_POLICY = '本站不提供任何报价、价格咨询、接单或收费说明。当用户询问价格、报价、多少钱、费用、收费、能不能便宜点等，必须明确友好地说明：我们这里不报价，主要提供找素材和素材反馈服务；如需报价，请通过微信或其他渠道联系站长罗洋洋（洋洋大王）。不要猜测或给出任何价格数字，不要答应报价。';
const DEFAULT_WELCOME = '嗨，我是小度～ 这个网站是洋洋大王（罗洋洋）一个人折腾出来的，我可以帮你找素材、解答使用问题，也能把你的反馈转达给站长。想了解什么？';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

function defaults() {
  return {
    enabled: false,
    apiKey: '',
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 800,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    quotePolicy: DEFAULT_QUOTE_POLICY,
    welcomeMessage: DEFAULT_WELCOME,
    promptVersion: PROMPT_VERSION
  };
}

// 读取已存配置时逐字段兜底，损坏的值回退默认
function coerce(stored) {
  const base = defaults();
  const s = stored && typeof stored === 'object' ? stored : {};
  const text = (value, fallback, max) => (typeof value === 'string' && value.trim().length <= max ? value.trim() : fallback);
  return {
    enabled: s.enabled === true,
    apiKey: typeof s.apiKey === 'string' ? s.apiKey : '',
    model: ALLOWED_MODELS.includes(s.model) ? s.model : base.model,
    temperature: typeof s.temperature === 'number' && s.temperature >= 0 && s.temperature <= 2 ? s.temperature : base.temperature,
    maxTokens: Number.isInteger(s.maxTokens) && s.maxTokens >= 1 && s.maxTokens <= 4096 ? s.maxTokens : base.maxTokens,
    systemPrompt: text(s.systemPrompt, base.systemPrompt, 2000),
    quotePolicy: typeof s.quotePolicy === 'string' && s.quotePolicy.trim().length <= 1000 ? s.quotePolicy.trim() : base.quotePolicy,
    welcomeMessage: text(s.welcomeMessage, base.welcomeMessage, 300),
    promptVersion: Number.isInteger(s.promptVersion) && s.promptVersion >= 0 ? s.promptVersion : base.promptVersion
  };
}

function validateModel(value) {
  if (!ALLOWED_MODELS.includes(value)) throw fail('不支持的模型');
  return value;
}
function validateTemperature(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2) throw fail('温度需在 0 到 2 之间');
  return value;
}
function validateMaxTokens(value) {
  if (!Number.isInteger(value) || value < 1 || value > 4096) throw fail('最大回复长度需为 1 到 4096 的整数');
  return value;
}
function validateText(value, max, label, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') throw fail(`${label}格式无效`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw fail(`${label}过长（最多 ${max} 字）`);
  if (!trimmed && !allowEmpty) throw fail(`${label}不能为空`);
  return trimmed;
}
function validateApiKey(value) {
  const key = value.trim();
  if (key.length > 200) throw fail('API Key 过长');
  return key;
}

function normalizeChatInput(message, history) {
  if (typeof message !== 'string' || !message.trim() || message.trim().length > MAX_MESSAGE_LEN) throw fail('消息内容无效');
  if (history === undefined || history === null) history = [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY) throw fail('对话历史无效');
  const cleanHistory = history.map(item => {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string'
      || item.content.length > MAX_HISTORY_CONTENT_LEN) throw fail('对话历史无效');
    return { role: item.role, content: item.content };
  });
  return { message: message.trim(), history: cleanHistory };
}

function friendlyHttpError(status) {
  if (status === 401) return fail('API Key 无效，请在后台机器人配置里检查', 502);
  if (status === 402) return fail('DeepSeek 账户余额不足', 502);
  if (status === 429) return fail('AI 请求过于频繁，请稍后再试', 429);
  return fail('AI 服务暂时不可用，请稍后再试', 502);
}

class BotService {
  constructor(repository, { fetchImpl } = {}) {
    this.repository = repository;
    this.fetch = fetchImpl || ((...args) => fetch(...args));
  }

  async get() {
    const row = await this.repository.findOne({ where: { key: KEY } });
    if (!row) return defaults();
    let stored;
    try { stored = JSON.parse(row.value); } catch (_) { stored = null; }
    // 提示词版本迁移：旧配置未带 promptVersion 时，覆盖为最新默认文案（站长称呼、Markdown 排版、可复制搜索词）
    if (stored && (stored.promptVersion ?? 0) < PROMPT_VERSION) {
      stored = { ...stored, systemPrompt: DEFAULT_SYSTEM_PROMPT, quotePolicy: DEFAULT_QUOTE_POLICY, welcomeMessage: DEFAULT_WELCOME, promptVersion: PROMPT_VERSION };
      await this.repository.upsert({ key: KEY, value: JSON.stringify(stored) });
    }
    return coerce(stored);
  }

  // 对外永远不返回 apiKey
  async getPublic() {
    const config = await this.get();
    const hasApiKey = Boolean(config.apiKey);
    return {
      enabled: config.enabled,
      configured: hasApiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
      quotePolicy: config.quotePolicy,
      welcomeMessage: config.welcomeMessage,
      hasApiKey
    };
  }

  async save(input) {
    if (!input || typeof input.enabled !== 'boolean') throw fail('配置格式无效');
    const next = { ...(await this.get()), enabled: input.enabled };

    if (typeof input.apiKey === 'string' && input.apiKey.trim() && !input.apiKey.includes(API_KEY_MASK)) {
      next.apiKey = validateApiKey(input.apiKey);
    }
    if (input.clearApiKey === true && !(typeof input.apiKey === 'string' && input.apiKey.trim() && !input.apiKey.includes(API_KEY_MASK))) {
      next.apiKey = '';
    }
    if (input.model !== undefined) next.model = validateModel(input.model);
    if (input.temperature !== undefined) next.temperature = validateTemperature(input.temperature);
    if (input.maxTokens !== undefined) next.maxTokens = validateMaxTokens(input.maxTokens);
    if (input.systemPrompt !== undefined) next.systemPrompt = validateText(input.systemPrompt, 2000, '系统提示词');
    if (input.quotePolicy !== undefined) next.quotePolicy = validateText(input.quotePolicy, 1000, '报价政策', { allowEmpty: true });
    if (input.welcomeMessage !== undefined) next.welcomeMessage = validateText(input.welcomeMessage, 300, '欢迎语');

    if (next.enabled && !next.apiKey) throw fail('请先填写 API Key 再启用');
    await this.repository.upsert({ key: KEY, value: JSON.stringify(next) });
    return this.getPublic();
  }

  buildSystemMessage(config) {
    const { systemPrompt, quotePolicy } = config || defaults();
    return quotePolicy ? `${systemPrompt}\n\n【报价政策，必须严格遵守】\n${quotePolicy}` : systemPrompt;
  }

  async _complete(config, message, history) {
    const messages = [
      { role: 'system', content: this.buildSystemMessage(config) },
      ...history,
      { role: 'user', content: message }
    ];
    let res;
    try {
      res = await this.fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: false
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      console.error('[bot] 请求 DeepSeek 失败:', error?.name, error?.message);
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw timedOut ? fail('AI 响应超时，请稍后再试', 502) : fail('AI 服务暂时不可用，请稍后再试', 502);
    }
    if (!res.ok) {
      console.error('[bot] DeepSeek 返回错误状态:', res.status);
      throw friendlyHttpError(res.status);
    }
    let json;
    try { json = await res.json(); } catch (error) {
      console.error('[bot] DeepSeek 响应解析失败:', error.message);
      throw fail('AI 服务暂时不可用，请稍后再试', 502);
    }
    const reply = json?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      console.error('[bot] DeepSeek 响应缺少内容');
      throw fail('AI 服务暂时不可用，请稍后再试', 502);
    }
    return reply.trim();
  }

  // 未启用时返回 { enabled: false }，由前端回退到普通留言
  async chat({ userId, message, history } = {}) {
    const config = await this.get();
    if (!config.enabled || !config.apiKey) return { enabled: false, reply: null };
    const input = normalizeChatInput(message, history);
    const reply = await this._complete(config, input.message, input.history);
    return { enabled: true, reply };
  }

  // 管理员「测试对话」：可使用尚未保存的草稿
  async test(draft = {}) {
    const config = await this.get();
    if (typeof draft.apiKey === 'string' && draft.apiKey.trim() && !draft.apiKey.includes(API_KEY_MASK)) {
      config.apiKey = validateApiKey(draft.apiKey);
    }
    if (draft.model !== undefined) config.model = validateModel(draft.model);
    if (draft.temperature !== undefined) config.temperature = validateTemperature(draft.temperature);
    if (draft.maxTokens !== undefined) config.maxTokens = validateMaxTokens(draft.maxTokens);
    if (draft.systemPrompt !== undefined) config.systemPrompt = validateText(draft.systemPrompt, 2000, '系统提示词');
    if (draft.quotePolicy !== undefined) config.quotePolicy = validateText(draft.quotePolicy, 1000, '报价政策', { allowEmpty: true });
    if (!config.apiKey) throw fail('请先填写 API Key');
    const reply = await this._complete(config, '你好，请用一句话介绍你自己', []);
    return { reply };
  }
}

let shared;
function getShared() {
  if (!shared) shared = new BotService(require('../models/DrawerConfig').SiteConfig);
  return shared;
}

module.exports = {
  BotService, getShared, KEY, DEEPSEEK_URL, DEFAULT_MODEL, ALLOWED_MODELS, API_KEY_MASK,
  DEFAULT_SYSTEM_PROMPT, DEFAULT_QUOTE_POLICY, DEFAULT_WELCOME
};
