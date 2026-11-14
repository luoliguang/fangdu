<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import MarkdownIt from 'markdown-it';
import apiClient, { resolveApiUrl } from '../axiosConfig.js';
import { ElMessage } from 'element-plus';
import { useTheme } from '../composables/useTheme.js';

const { isDark } = useTheme();

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
md.validateLink = url => /^(https?:|mailto:)/i.test(url);
// 不渲染图片，避免加载外部资源；只显示占位符
md.renderer.rules.image = (tokens, idx) => `<span class="fbot-md-img">🖼 ${md.utils.escapeHtml(tokens[idx].content || '图片')}</span>`;
// 只有行内关键词提供复制入口，普通回复和代码块不显示复制按钮。
md.renderer.rules.code_inline = (tokens, idx) => `<code class="fbot-keyword" role="button" tabindex="0" title="点击复制">${md.utils.escapeHtml(tokens[idx].content)}</code>`;

const MAX_LEN = 1000;
const COOLDOWN_MS = 10000;

const quickTopics = [
  { key: 'material', label: '想要新素材', icon: 'sparkle', hint: '说说需要什么实拍图，发送后交给掌柜的查找~' },
  { key: 'notfound', label: '没找到想要的', icon: 'search', hint: '说说想找的实拍图和试过的关键词，我会转给掌柜的~' },
  { key: 'bug', label: '网站有问题', icon: 'bug', hint: '哪里不对劲啦？描述一下，我马上转告~' },
  { key: 'other', label: '其他想说的', icon: 'chat', hint: '想说什么都可以，我在听~' }
];

// 猜你想问：点一下直接作为问题发出，帮助新用户快速进入对话
const quickQuestions = [
  '怎么搜索实拍图？',
  '怎么拆搜索关键词？',
  '没搜到图怎么办？',
  '你能做什么？'
];

// 线性图标（Lucide 风格路径），随文字颜色走，亮/暗色都协调
const topicIcons = {
  sparkle: ['M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z', 'M19 3v4M17 5h4'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  bug: ['M9 7.5a3 3 0 0 1 6 0V9H9z', 'M8 9h8v6a4 4 0 0 1-8 0z', 'M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2'],
  chat: ['M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z']
};

const open = ref(false);
const text = ref('');
const topic = ref(null);
const sending = ref(false);
const streaming = ref(false);
const panelView = ref('chat');
const checkingReplies = ref(false);
const showCodeLookup = ref(false);
const showSubmitEmail = ref(Boolean(localStorage.getItem('fbot-lookup-email')));
const lookupCode = ref('');
const lookupEmail = ref(localStorage.getItem('fbot-lookup-email') || '');
const lookingUpCode = ref(false);
const codeLookupResult = ref(null);
const codeLookupMessage = ref('');
const emailLookupMode = ref(false);
const activeLookupEmail = ref('');
const feedbackRecords = ref([]);
const feedbackTotal = ref(0);
const feedbackPages = ref({});
const showFeedbackRecords = ref(false);
const feedbackLookupDone = ref(false);
const feedbackLookupMessage = ref('');
const feedbackSearch = ref('');
const activeFeedbackSearch = ref('');
const bodyRef = ref(null);
const inputRef = ref(null);

// 发送冷却：按钮上显示倒计时，不再往聊天里追加提示；刷新页面后仍然有效
const COOLDOWN_KEY = 'fbot-cooldown-until';
const readCooldown = () => { try { return Number(sessionStorage.getItem(COOLDOWN_KEY)) || 0; } catch (_) { return 0; } };
const cooldownUntil = ref(readCooldown());
const nowTick = ref(Date.now());
let tickTimer;
const cooldownLeft = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - nowTick.value) / 1000)));
const cooldownLabel = computed(() => cooldownLeft.value >= 60 ? `稍等 ${Math.ceil(cooldownLeft.value / 60)} 分钟` : `稍等 ${cooldownLeft.value}s`);
function runTicker() {
  clearInterval(tickTimer);
  nowTick.value = Date.now();
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
    if (cooldownUntil.value <= nowTick.value) clearInterval(tickTimer);
  }, 500);
}
function startCooldown(ms) {
  cooldownUntil.value = Date.now() + ms;
  try { sessionStorage.setItem(COOLDOWN_KEY, String(cooldownUntil.value)); } catch (_) { /* Storage may be disabled. */ }
  runTicker();
}
const aiEnabled = ref(false);
const welcomeText = ref('嗨，我是小度。这里可以搜索实拍图；不知道怎么搜，就告诉我颜色、花型或用途，我帮你拆关键词。找不到想要的图，也可以直接提交需求给掌柜的。');
const messages = ref([
  { id: 1, from: 'bot', text: welcomeText.value }
]);
let nextId = 2;

function newSessionId() {
  if (!globalThis.crypto?.getRandomValues) return null;
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const sessionId = ref(newSessionId());
const sessionHasAiMessages = ref(false);
let pendingFinishId = null;

const remaining = computed(() => MAX_LEN - text.value.length);
const canSend = computed(() => text.value.trim().length > 0 && !sending.value && remaining.value >= 0 && cooldownLeft.value === 0);

// 眼睛跟随鼠标
const eye = ref({ x: 0, y: 0 });
const botRef = ref(null);
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function onPointerMove(e) {
  if (reduceMotion || !botRef.value) return;
  const r = botRef.value.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / 160) * 3;
  eye.value = { x: (dx / d) * k, y: (dy / d) * k };
}
// 外部唤起：window.dispatchEvent(new CustomEvent('fbot:open', { detail: { topic: 'notfound', text: '关键词' } }))
function onExternalOpen(e) {
  const { topic: key, text: prefill } = e.detail || {};
  const t = quickTopics.find(q => q.key === key);
  if (!open.value) toggle();
  if (t && topic.value?.key !== t.key) pickTopic(t);
  if (prefill && !text.value.trim()) text.value = String(prefill).slice(0, MAX_LEN);
}
onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('fbot:open', onExternalOpen);
  if (cooldownLeft.value > 0) runTicker();
  // AI 状态只影响展示，失败时保持普通留言模式
  apiClient.get('/api/v1/bot/status').then(res => {
    aiEnabled.value = res.data?.data?.aiEnabled === true;
    const welcome = res.data?.data?.welcomeMessage;
    if (typeof welcome === 'string' && welcome.trim()) {
      welcomeText.value = welcome;
      if (messages.value[0]?.id === 1) messages.value[0].text = welcome;
    }
  }).catch(() => {});
});
onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('fbot:open', onExternalOpen);
  clearInterval(tickTimer);
  if (open.value) finishConversation();
});

function scrollBottom() {
  nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight; });
}
function pushBot(t, tone, opts = {}) {
  // 机器人连续两条一模一样的话没有意义，直接忽略，避免刷屏
  const last = messages.value[messages.value.length - 1];
  if (last && last.from === 'bot' && last.text === t) return;
  messages.value.push({ id: nextId++, from: 'bot', text: t, tone, md: opts.md === true, aiReply: opts.aiReply === true, animate: opts.animate === true });
  scrollBottom();
}
function pushUser(t) {
  messages.value.push({ id: nextId++, from: 'user', text: t });
  scrollBottom();
}

function finishConversation() {
  const closingId = sessionId.value;
  if (closingId && (sessionHasAiMessages.value || sending.value)) {
    // 正在流式回复时等这次请求完成，避免一段对话被拆成两条总结。
    if (sending.value) pendingFinishId = closingId;
    else apiClient.post('/api/v1/bot/chat/end', { sessionId: closingId }).catch(() => {});
  }
  sessionId.value = newSessionId();
  sessionHasAiMessages.value = false;
}
function closePanel() {
  open.value = false;
  panelView.value = 'chat';
  finishConversation();
}
function onPanelEscape() {
  if (panelView.value === 'requests') panelView.value = 'chat';
  else closePanel();
}
function openRequests() {
  panelView.value = 'requests';
  feedbackLookupMessage.value = '';
  if (window.matchMedia?.('(pointer: fine)').matches) nextTick(() => document.getElementById('fbot-lookup-email')?.focus());
}
function toggle() {
  if (open.value) return closePanel();
  open.value = true;
  scrollBottom();
  // 仅在有鼠标的设备上自动聚焦，避免手机上一打开就弹出键盘遮住面板
  if (window.matchMedia?.('(pointer: fine)').matches) nextTick(() => inputRef.value?.focus());
}

function pickTopic(t) {
  topic.value = t;
  pushUser(t.label);
  setTimeout(() => pushBot(t.hint), 350);
}

const USER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function getUserId() {
  let id = localStorage.getItem('user_id');
  if (!USER_ID_RE.test(id || '')) {
    id = newSessionId();
    if (id) localStorage.setItem('user_id', id);
  }
  return id;
}
function formatFeedbackTime(value) {
  if (!value) return '时间未知';
  const source = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}
// —— AI 回复的 Markdown 渲染与复制 ——
function renderMarkdown(text) {
  return md.render(String(text ?? ''));
}
function getKeywords(text) {
  const words = md.parse(String(text ?? ''), {}).flatMap(token =>
    token.type === 'inline' ? (token.children || []).filter(child => child.type === 'code_inline').map(child => child.content.trim()) : []
  );
  return [...new Set(words.filter(word => word.length > 0 && word.length <= 40))].slice(0, 4);
}
async function copyRecommendations(text) {
  const words = getKeywords(text);
  if (words.length < 2) return;
  if (await copyText(words.join('\n'))) ElMessage.success('推荐词已复制');
  else ElMessage.error('复制失败，请手动选中关键词');
}
async function copyText(t) {
  const s = String(t ?? '');
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(s); return true; } catch (_) {}
  }
  const ta = document.createElement('textarea');
  ta.value = s;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { return document.execCommand('copy'); }
  catch (_) { return false; }
  finally { document.body.removeChild(ta); }
}
async function copyKeyword(e) {
  const code = e.target?.closest?.('.fbot-keyword');
  if (!code) return;
  e.preventDefault();
  const copied = await copyText(code.textContent);
  if (copied) ElMessage.success('关键词已复制');
  else ElMessage.error('复制失败，请手动选中关键词');
}
function onMdKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') copyKeyword(e);
}
function onReplyAnimationEnd(e, m) {
  if (e.target.classList.contains('fbot-bubble') && e.animationName === 'fbot-reply-enter') m.animate = false;
}

function pushStreaming() {
  const m = { id: nextId++, from: 'bot', text: '', md: true, aiReply: true, streaming: true, animate: true };
  messages.value.push(m);
  scrollBottom();
  return m;
}
function updateStreaming(m, text) {
  m.text = text;
  scrollBottom();
}
function finalizeStreaming(m) {
  m.streaming = false;
}
function removeStreaming(m) {
  const i = messages.value.findIndex(x => x.id === m.id);
  if (i >= 0) messages.value.splice(i, 1);
}
function askQuick(q) {
  if (sending.value || cooldownLeft.value > 0) return;
  text.value = q;
  send();
}
function isExplicitFeedback(content) {
  return /^(?:我想反馈|我要反馈|反馈一下|我有个建议|我想提建议|我要提建议|我想投诉|我要投诉|我想提交需求|我要提交需求|提交找图需求|建议新增|建议增加|希望新增|希望增加)/.test(content)
    || /(?:网站|页面).{0,8}(?:有问题|出错|打不开|白屏|报错)/.test(content);
}
function startFeedbackLookup(useDevice = false) {
  feedbackSearch.value = '';
  checkReplies(useDevice);
}
function searchFeedbackRecords() {
  checkReplies(!emailLookupMode.value);
}
async function checkReplies(useDevice = false) {
  if (checkingReplies.value) return;
  showFeedbackRecords.value = false;
  feedbackLookupDone.value = false;
  const email = useDevice ? '' : lookupEmail.value.trim();
  const search = feedbackSearch.value.trim();
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      feedbackLookupDone.value = true;
      feedbackLookupMessage.value = '请输入有效的查询邮箱。';
      return;
    }
    checkingReplies.value = true;
    feedbackLookupMessage.value = '';
    try {
      const response = await apiClient.post('/api/v1/bot/request/by-email', { email, ...(search ? { search } : {}) });
      feedbackRecords.value = Array.isArray(response.data?.data) ? response.data.data : [];
      feedbackTotal.value = Number(response.data?.meta?.total) || 0;
      feedbackPages.value = { email: { page: 1, totalPages: Number(response.data?.meta?.totalPages) || 1 } };
      emailLookupMode.value = true;
      activeLookupEmail.value = email;
      activeFeedbackSearch.value = search;
      localStorage.setItem('fbot-lookup-email', email);
      showFeedbackRecords.value = true;
      feedbackLookupDone.value = true;
      if (!feedbackRecords.value.length) feedbackLookupMessage.value = search
        ? `没有找到包含“${search}”的需求或回复。`
        : '这个邮箱下还没有新需求。提交找图需求时填写同一个邮箱，之后就能在这里查到。';
    } catch (error) {
      feedbackLookupDone.value = true;
      feedbackLookupMessage.value = error?.response?.data?.message || '邮箱查询暂时不可用，请稍后再试。';
    } finally {
      checkingReplies.value = false;
    }
    return;
  }
  emailLookupMode.value = false;
  const activeId = getUserId();
  if (!activeId) {
    feedbackLookupDone.value = true;
    feedbackLookupMessage.value = '当前浏览器无法保存需求身份，请用提交时保存的查询码查询。';
    return;
  }
  checkingReplies.value = true;
  feedbackLookupMessage.value = '';
  try {
    const response = await apiClient.get(`/api/v1/feedbacks/user/${activeId}`, { params: { limit: 50, ...(search ? { search } : {}) } });
    feedbackRecords.value = Array.isArray(response.data?.data) ? response.data.data : [];
    feedbackTotal.value = Number(response.data?.meta?.total) || 0;
    feedbackPages.value = { [activeId]: { page: 1, totalPages: Number(response.data?.meta?.totalPages) || 1 } };
    activeFeedbackSearch.value = search;
    showFeedbackRecords.value = true;
    feedbackLookupDone.value = true;
    if (!feedbackRecords.value.length) feedbackLookupMessage.value = search
      ? `没有找到包含“${search}”的需求或回复。`
      : '这台设备还没有需求记录。提交找图需求后可在这里查看处理状态和跟单回复。';
  } catch (_) {
    feedbackLookupDone.value = true;
    feedbackLookupMessage.value = '暂时无法读取需求回复，请稍后再试。';
  } finally {
    checkingReplies.value = false;
  }
}
async function loadMoreFeedbackRecords() {
  if (checkingReplies.value) return;
  const entries = Object.entries(feedbackPages.value).filter(([, state]) => state.page < state.totalPages);
  if (!entries.length) return;
  checkingReplies.value = true;
  try {
    const responses = await Promise.all(entries.map(([id, state]) => emailLookupMode.value
      ? apiClient.post('/api/v1/bot/request/by-email', { email: activeLookupEmail.value, page: state.page + 1, ...(activeFeedbackSearch.value ? { search: activeFeedbackSearch.value } : {}) })
      : apiClient.get(`/api/v1/feedbacks/user/${id}`, { params: { limit: 50, page: state.page + 1, ...(activeFeedbackSearch.value ? { search: activeFeedbackSearch.value } : {}) } })
    ));
    feedbackRecords.value = [...feedbackRecords.value, ...responses.flatMap(res => res.data?.data || [])]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.id - a.id);
    feedbackPages.value = Object.fromEntries(Object.entries(feedbackPages.value).map(([id, state]) =>
      [id, entries.some(([nextId]) => nextId === id) ? { ...state, page: state.page + 1 } : state]
    ));
  } catch (_) {
    feedbackLookupMessage.value = '暂时无法加载更多需求，请稍后再试。';
  } finally {
    checkingReplies.value = false;
  }
}
async function lookupReply() {
  const accessCode = lookupCode.value.trim();
  if (!/^[A-Za-z0-9_-]{32}$/.test(accessCode)) {
    codeLookupResult.value = null;
    codeLookupMessage.value = '查询码格式不正确，请粘贴提交需求时保存的完整查询码。';
    return;
  }
  if (lookingUpCode.value) return;
  lookingUpCode.value = true;
  codeLookupMessage.value = '';
  try {
    const response = await apiClient.post('/api/v1/bot/request/lookup', { accessCode });
    const feedback = response.data?.data;
    codeLookupResult.value = feedback || null;
    if (!feedback?.admin_reply) codeLookupMessage.value = '这条需求还在处理中。请保留查询码，稍后再来查看。';
  } catch (error) {
    codeLookupResult.value = null;
    codeLookupMessage.value = error?.response?.data?.message || '暂时查不到这条需求，请稍后再试。';
  } finally {
    lookingUpCode.value = false;
  }
}
function fallbackAck(content) {
  const t = String(content || '');
  if (/你能做什么|你会做什么|你能干啥|你会啥|你是谁|介绍一下/.test(t)) {
    return '这个网站用来搜索实拍图。现在是留言模式，你可以在顶部搜索栏试短关键词，找不到的图可以提交需求给掌柜的。';
  }
  if (/价格|报价|多少钱|收费|便宜/.test(t)) {
    return '这里不报价哦～ 我们主要帮你找素材和反馈素材，报价请微信联系掌柜的。';
  }
  if (/棉/.test(t) && /能做|加工|工艺|生产/.test(t)) {
    return '含棉和纯棉工艺做不了。这里主要是实拍图搜索，图片检索不代表能够加工。';
  }
  return '可以在顶部搜索栏分别试颜色、花型或用途等短关键词，再把有用的词组合起来搜。找不到时点“没找到想要的”，掌柜的会收到具体需求。';
}
// 流式：用原生 fetch 读 SSE，边返回边渲染到气泡；AI 不可用时返回 null 由 send() 回退留言
async function streamAiReply(content, history, topicLabel, currentSessionId) {
  const payload = { message: content, userId: getUserId(), history, topicLabel, sessionId: currentSessionId };
  const token = localStorage.getItem('authToken') || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(resolveApiUrl('/api/v1/bot/chat/stream'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  // 服务端尚未提供流式路由时，沿用已存在的聊天接口。
  if (res.status === 404 || res.status === 405) {
    const fallback = await apiClient.post('/api/v1/bot/chat', payload);
    return fallback.data?.data?.ai === true ? fallback.data.data.reply : null;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await res.json();
    if (!res.ok) {
      const e = new Error(j?.message || 'AI 服务暂时不可用，请稍后再试');
      e.status = res.status;
      e.retryAfter = res.headers.get('retry-after');
      throw e;
    }
    return j?.data?.ai === true ? j.data.reply : null;
  }
  if (!res.ok) throw new Error('AI 服务暂时不可用，请稍后再试');

  if (!res.body) throw new Error('当前浏览器暂不支持流式回复，请稍后再试');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const m = pushStreaming();
  streaming.value = true;
  let buffer = '';
  let full = '';
  let completed = false;
  let doneReceived = false;
  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let ev;
        try { ev = JSON.parse(payload); } catch (_) { continue; }
        if (ev.delta) { full += ev.delta; updateStreaming(m, full); }
        else if (ev.disabled) { completed = true; removeStreaming(m); full = null; break; }
        else if (ev.error) {
          completed = true;
          removeStreaming(m);
          const e = new Error(ev.error || 'AI 服务暂时不可用，请稍后再试');
          e.status = ev.status;
          throw e;
        } else if (ev.done) { completed = true; doneReceived = true; break; }
      }
    }
  } catch (error) {
    removeStreaming(m);
    throw error;
  } finally {
    reader.cancel().catch(() => {});
    streaming.value = false;
  }
  if (full === null) return null;
  if (!doneReceived || !full.trim()) {
    removeStreaming(m);
    throw new Error('回复中断了，请稍后重试');
  }
  finalizeStreaming(m);
  return full;
}

async function send() {
  if (!canSend.value) return;
  const content = text.value.trim();
  const requestEmail = lookupEmail.value.trim();
  if ((topic.value || isExplicitFeedback(content)) && requestEmail &&
    (requestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestEmail))) {
    ElMessage.warning('请输入有效的查询邮箱，或清空邮箱后匿名提交');
    return;
  }
  const currentSessionId = sessionId.value;
  // 取历史要在把本条消息放进列表之前，服务端会单独追加当前消息；话题卡片不带历史，避免上下文干扰
  const history = topic.value ? [] : messages.value
    .filter(m => m.from === 'bot' || m.from === 'user')
    .slice(-8)
    .map(m => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text }));
  pushUser(content);
  text.value = '';
  sending.value = true;
  try {
    if (topic.value || isExplicitFeedback(content)) {
      const message = topic.value ? `【${topic.value.label}】${content}` : content;
      let submitted;
      try {
        submitted = await apiClient.post('/api/v1/bot/request', { message, user_id: getUserId(), ...(requestEmail ? { lookupEmail: requestEmail } : {}) });
      } catch (error) {
        if (error?.response?.status !== 404) throw error;
        submitted = await apiClient.post('/api/v1/feedbacks', { message, user_id: getUserId() });
      }
      startCooldown(COOLDOWN_MS);
      topic.value = null;
      const accessCode = submitted.data?.data?.accessCode;
      if (requestEmail && accessCode) localStorage.setItem('fbot-lookup-email', requestEmail);
      showFeedbackRecords.value = false;
      pushBot(requestEmail && accessCode
        ? `需求已提交。换设备时输入同一个邮箱，在“我的需求”查看这组需求和跟单回复。`
        : accessCode
          ? `匿名需求已提交。换设备查询这条需求，请保存并点击复制查询码：\`${accessCode}\`。`
          : '需求已经提交。处理后可在这台设备点“我的需求”查看结果。', undefined, { md: true });
      return;
    }
    if (aiEnabled.value) {
      const topicLabel = topic.value?.label || null;
      const beforeReplyCount = messages.value.length;
      const reply = await streamAiReply(content, history, topicLabel, currentSessionId);
      if (reply) {
        // 流式气泡由 streamAiReply 更新；旧接口一次性返回时需显式展示。
        if (messages.value.length === beforeReplyCount) pushBot(reply, undefined, { md: true, aiReply: true, animate: true });
        startCooldown(COOLDOWN_MS);
        if (currentSessionId === sessionId.value) sessionHasAiMessages.value = true;
        topic.value = null;
        return;
      }
      // AI 中途变为不可用 → 落到下方普通留言
    }
    // AI 不可用时只给搜索指引；明确需求已在上方单独提交。
    startCooldown(COOLDOWN_MS);
    pushBot(fallbackAck(content), undefined, { md: true });
  } catch (err) {
    const status = err?.response?.status || err?.status;
    const serverMsg = err?.response?.data?.message || err?.message;
    let restore = status !== 400;
    if (status === 429) {
      const retry = Number(err.retryAfter || err?.response?.headers?.['retry-after']);
      startCooldown((Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : COOLDOWN_MS / 1000) * 1000);
      pushBot(serverMsg || '发得有点频繁，稍等一会儿再试试~');
      if (/已经收到/.test(serverMsg || '')) restore = false;
    } else if (status === 503) pushBot('留言功能暂时关闭了，晚点再来找我吧~');
    else if (status === 404 || status === 405) pushBot('聊天接口暂时不可用，请稍后重试');
    else if (status === 400) pushBot(serverMsg || '内容好像不太对，换个说法试试？');
    else if (status === 502 && serverMsg) pushBot(serverMsg, undefined, { md: true });
    else pushBot(serverMsg || '网络开小差了，你的话还在输入框里，再点一次发送吧');
    if (restore) text.value = content;
  } finally {
    sending.value = false;
    streaming.value = false;
    if (pendingFinishId === currentSessionId) {
      pendingFinishId = null;
      apiClient.post('/api/v1/bot/chat/end', { sessionId: currentSessionId }).catch(() => {});
    }
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send();
  }
}
</script>

<template>
  <div class="fbot" :class="{ 'is-dark': isDark, 'is-open': open }">
    <Transition name="fbot-panel">
      <section v-if="open" class="fbot-panel" :class="{ 'is-requests': panelView === 'requests' }" role="dialog" :aria-label="panelView === 'chat' ? '小度实拍图助手' : '我的需求'" @keydown.esc="onPanelEscape">
        <header class="fbot-head">
          <button v-if="panelView === 'requests'" class="fbot-head-back" type="button" aria-label="返回聊天" @click="panelView = 'chat'">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </button>
          <span v-else class="fbot-head-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 5 5 1.7-5 1.7L12 16.4l-1.7-5-5-1.7 5-1.7z"/><path d="M19 15v4M17 17h4"/></svg>
          </span>
          <span class="fbot-head-meta">
            <strong>{{ panelView === 'chat' ? '小度' : '我的需求' }}</strong>
            <span class="fbot-head-sub">{{ panelView === 'chat' ? (aiEnabled ? '实拍图搜索与反馈' : '反馈小助手') : '查看处理进度与跟单回复' }}</span>
          </span>
          <button v-if="panelView === 'chat'" class="fbot-head-action" type="button" @click="openRequests">我的需求</button>
          <button class="fbot-close" type="button" aria-label="关闭" @click="closePanel">×</button>
        </header>

        <div v-if="panelView === 'chat'" ref="bodyRef" class="fbot-body" role="log" aria-live="polite">
          <div v-for="m in messages" :key="m.id" class="fbot-msg" :class="[`from-${m.from}`, { 'is-ai-reply': m.animate }]">
            <div class="fbot-bubble" :class="{ 'is-ok': m.tone === 'ok', 'is-ai': m.md, 'is-streaming': m.streaming }" @animationend="onReplyAnimationEnd($event, m)">
              <svg v-if="m.tone === 'ok'" class="fbot-ok" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M7.8 12.4l3 3 5.4-6"/></svg>
              <span v-if="m.streaming && !m.text" class="fbot-stream-wait" role="status"><span class="fbot-wait-pulse"></span>正在生成回复…</span>
              <div v-if="m.md && m.text" class="fbot-md" v-html="renderMarkdown(m.text)" @click="copyKeyword" @keydown="onMdKeydown"></div>
              <template v-else-if="!m.md">{{ m.text }}</template>
              <button v-if="m.aiReply && !m.streaming && getKeywords(m.text).length > 1" class="fbot-copy-terms" type="button" title="每行一个；也可点上方关键词单独复制" @click="copyRecommendations(m.text)">复制全部推荐词</button>
            </div>
          </div>
          <div v-if="sending && !streaming" class="fbot-msg from-bot" role="status">
            <div class="fbot-bubble fbot-typing"><i></i><i></i><i></i><span>{{ aiEnabled ? '正在生成回复…' : '正在发送…' }}</span></div>
          </div>
          <div v-if="!sending && !topic && messages.length === 1" class="fbot-suggestions">
            <div v-if="aiEnabled" class="fbot-asks">
              <span class="fbot-asks-label">猜你想问</span>
              <div class="fbot-asks-grid">
                <button v-for="(q, i) in quickQuestions" :key="i" type="button" @click="askQuick(q)">{{ q }}</button>
              </div>
            </div>
            <div class="fbot-chips">
              <button v-for="t in quickTopics" :key="t.key" type="button" @click="pickTopic(t)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="(d, i) in topicIcons[t.icon]" :key="i" :d="d"/></svg>{{ t.label }}</button>
            </div>
          </div>
          <div v-else-if="!sending && !topic" class="fbot-followup">
            <button type="button" @click="pickTopic(quickTopics[1])">没找到实拍图？提交需求</button>
          </div>
        </div>

        <template v-if="panelView === 'chat'">
          <div v-if="topic" class="fbot-submit-email">
            <button v-if="!showSubmitEmail" type="button" @click="showSubmitEmail = true">需要换设备看回复？添加邮箱（选填）</button>
            <template v-else>
              <label for="fbot-submit-email">跨设备查看回复（选填）</label>
              <input id="fbot-submit-email" v-model="lookupEmail" type="email" maxlength="254" autocomplete="email" placeholder="填写你的查询邮箱" />
              <small>邮箱无需验证，请勿填写私人信息。</small>
            </template>
          </div>
          <footer class="fbot-foot">
            <textarea
              ref="inputRef"
              v-model="text"
              rows="2"
              :maxlength="MAX_LEN"
              placeholder="描述要找的实拍图，或提交需求…"
              aria-label="反馈内容"
              @keydown="onKeydown"
            ></textarea>
            <button class="fbot-send" :disabled="!canSend" @click="send">
              <svg v-if="cooldownLeft === 0" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
              <span>{{ cooldownLeft > 0 ? cooldownLabel : '发送' }}</span>
            </button>
          </footer>
          <div class="fbot-hint">
            <span>Enter 发送 · Shift+Enter 换行</span>
            <span v-if="text.length > MAX_LEN * 0.8" :class="{ 'is-warn': remaining < 50 }">{{ text.length }}/{{ MAX_LEN }}</span>
          </div>
        </template>

        <div v-else class="fbot-requests-view">
          <section class="fbot-lookup-card" aria-labelledby="fbot-lookup-title">
            <div class="fbot-lookup-intro">
              <strong id="fbot-lookup-title">跨设备查询</strong>
              <span>输入提交需求时填写的邮箱</span>
            </div>
            <div class="fbot-email-entry-row">
              <input id="fbot-lookup-email" v-model="lookupEmail" type="email" maxlength="254" autocomplete="email" placeholder="查询邮箱" aria-describedby="fbot-email-note" @keydown.enter.prevent="startFeedbackLookup(false)" />
              <button type="button" :disabled="checkingReplies" @click="startFeedbackLookup(false)">{{ checkingReplies ? '查询中…' : '查询' }}</button>
            </div>
            <small id="fbot-email-note">邮箱无需验证，知道邮箱的人也能查看关联的新需求和回复，请勿填写私人信息。</small>
            <button class="fbot-local-lookup" type="button" :disabled="checkingReplies" @click="startFeedbackLookup(true)">查看这台设备提交的需求</button>
          </section>

          <p v-if="feedbackLookupMessage" class="fbot-lookup-state" role="status">{{ feedbackLookupMessage }}</p>
          <section v-if="showFeedbackRecords && (feedbackRecords.length || activeFeedbackSearch)" class="fbot-record-list" aria-label="需求查询结果">
            <form class="fbot-record-search" role="search" @submit.prevent="searchFeedbackRecords">
              <label class="sr-only" for="fbot-record-search">搜索需求和回复</label>
              <input id="fbot-record-search" v-model="feedbackSearch" type="search" maxlength="100" placeholder="搜索需求或跟单回复" />
              <button type="submit" :disabled="checkingReplies">{{ checkingReplies ? '搜索中…' : '搜索' }}</button>
            </form>
            <div class="fbot-record-summary"><strong>{{ activeFeedbackSearch ? '搜索结果' : '查询结果' }}</strong><span>共 {{ feedbackTotal }} 条</span></div>
            <article v-for="item in feedbackRecords" :key="item.id" class="fbot-record">
              <div class="fbot-record-head"><span>需求 #{{ item.id }} · 提交于 {{ formatFeedbackTime(item.created_at) }}</span><span :class="{ 'is-replied': item.admin_reply }">{{ item.admin_reply ? '已回复' : item.status === 'pending' ? '待处理' : '已处理' }}</span></div>
              <p>{{ item.message }}</p>
              <p v-if="item.admin_reply" class="fbot-record-reply"><strong>跟单回复</strong>{{ item.admin_reply }}</p>
            </article>
            <button v-if="feedbackTotal > feedbackRecords.length" class="fbot-record-more" type="button" :disabled="checkingReplies" @click="loadMoreFeedbackRecords">{{ checkingReplies ? '加载中…' : '加载更多需求' }}</button>
          </section>
          <div v-else-if="!feedbackLookupDone" class="fbot-requests-empty">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/></svg>
            <strong>跟单回复会显示在这里</strong>
            <span>可以用邮箱跨设备查询，也可以查看本机记录。</span>
          </div>

          <section class="fbot-code-section">
            <button class="fbot-code-toggle" type="button" :aria-expanded="showCodeLookup" @click="showCodeLookup = !showCodeLookup">
              <span>有匿名需求查询码？</span><span>{{ showCodeLookup ? '收起' : '使用查询码' }}</span>
            </button>
            <div v-if="showCodeLookup" class="fbot-code-lookup">
              <label for="fbot-access-code">查询码</label>
              <div><input id="fbot-access-code" v-model="lookupCode" maxlength="32" autocomplete="off" placeholder="粘贴 32 位查询码" @keydown.enter.prevent="lookupReply" /><button type="button" :disabled="lookingUpCode" @click="lookupReply">{{ lookingUpCode ? '查询中…' : '查询' }}</button></div>
              <p v-if="codeLookupMessage" class="fbot-code-message" role="status">{{ codeLookupMessage }}</p>
              <article v-if="codeLookupResult?.admin_reply" class="fbot-record">
                <div class="fbot-record-head"><span>需求 #{{ codeLookupResult.id }} · 提交于 {{ formatFeedbackTime(codeLookupResult.created_at) }}</span><span class="is-replied">已回复</span></div>
                <p class="fbot-record-reply"><strong>跟单回复</strong>{{ codeLookupResult.admin_reply }}</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </Transition>

    <button ref="botRef" class="fbot-avatar" :aria-label="open ? '收起小助手' : '打开反馈小助手'" @click="toggle">
      <span v-if="!open" class="fbot-tip">找实拍图？问小度~</span>
      <svg viewBox="0 0 80 80" width="64" height="64" aria-hidden="true">
        <defs>
          <linearGradient id="fbotBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7bc49a" />
            <stop offset="1" stop-color="#3f7a5c" />
          </linearGradient>
        </defs>
        <ellipse cx="40" cy="74" rx="18" ry="3.5" fill="rgba(0,0,0,.18)" class="fbot-shadow" />
        <g class="fbot-float">
          <line x1="40" y1="10" x2="40" y2="20" stroke="#0a3d22" stroke-width="3" stroke-linecap="round" />
          <circle cx="40" cy="8" r="4.5" fill="#ffd36e" class="fbot-light" />
          <rect x="10" y="40" width="6" height="12" rx="3" fill="#0a3d22" />
          <rect x="64" y="40" width="6" height="12" rx="3" fill="#0a3d22" />
          <rect x="14" y="19" width="52" height="46" rx="22" fill="url(#fbotBody)" stroke="#0a3d22" stroke-width="2.5" />
          <rect x="21" y="29" width="38" height="25" rx="12.5" fill="#f4fbf7" />
          <g :transform="`translate(${eye.x} ${eye.y})`">
            <g class="fbot-eyes">
              <ellipse cx="32" cy="40" rx="3.6" ry="4.6" fill="#0a3d22" />
              <ellipse cx="48" cy="40" rx="3.6" ry="4.6" fill="#0a3d22" />
              <circle cx="33.2" cy="38.4" r="1.2" fill="#fff" />
              <circle cx="49.2" cy="38.4" r="1.2" fill="#fff" />
            </g>
          </g>
          <ellipse cx="26" cy="48" rx="3.4" ry="2.2" fill="#ffb4b4" opacity=".75" />
          <ellipse cx="54" cy="48" rx="3.4" ry="2.2" fill="#ffb4b4" opacity=".75" />
          <path d="M36 48 Q40 52 44 48" fill="none" stroke="#0a3d22" stroke-width="2" stroke-linecap="round" />
        </g>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.fbot {
  position: fixed;
  right: 24px;
  bottom: 96px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  --fb-bg: rgba(251, 253, 252, 0.96);
  --fb-text: #20342b;
  --fb-sub: #6f857a;
  --fb-line: rgba(90, 143, 115, 0.24);
  --fb-bot-bubble: #eaf4ee;
  --fb-input: #f3f8f5;
  --fb-accent: #5a8f73;
  --fb-deep: #0a3d22;
}
.fbot.is-dark {
  --fb-bg: rgba(15, 24, 19, 0.97);
  --fb-text: #e7f0ea;
  --fb-sub: #93a99d;
  --fb-line: rgba(90, 143, 115, 0.34);
  --fb-bot-bubble: rgba(90, 143, 115, 0.16);
  --fb-input: rgba(255, 255, 255, 0.06);
  --fb-accent: #6ba284;
  --fb-deep: #0a3d22;
}

.fbot-avatar {
  position: relative;
  width: 64px;
  height: 64px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 8px 14px rgba(10, 61, 34, 0.35));
  transition: transform 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.fbot-avatar:hover { transform: scale(1.08) rotate(-3deg); }
.fbot-avatar:active { transform: scale(0.96); }
.fbot-avatar:focus-visible { outline: 2px solid #5a8f73; outline-offset: 4px; border-radius: 50%; }

.fbot-tip {
  position: absolute;
  right: 70px;
  top: 14px;
  white-space: nowrap;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--fb-text);
  background: var(--fb-bg);
  border: 1px solid var(--fb-line);
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  opacity: 0;
  transform: translateX(6px);
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
.fbot-avatar:hover .fbot-tip { opacity: 1; transform: none; }

.fbot-float { animation: fbot-float 3.2s ease-in-out infinite; }
.fbot-shadow { transform-origin: 40px 74px; animation: fbot-shadow 3.2s ease-in-out infinite; }
.fbot-light { animation: fbot-blink-light 1.8s ease-in-out infinite; }
.fbot-eyes { transform-box: fill-box; transform-origin: center; animation: fbot-blink 4.5s infinite; }

@keyframes fbot-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes fbot-shadow { 0%, 100% { transform: scaleX(1); opacity: 1; } 50% { transform: scaleX(0.82); opacity: 0.7; } }
@keyframes fbot-blink-light { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes fbot-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }

.fbot-panel {
  width: min(352px, calc(100vw - 32px));
  height: min(480px, calc(100vh - 220px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--fb-text);
  background: var(--fb-bg);
  border: 1px solid var(--fb-line);
  border-radius: 22px;
  box-shadow:
    0 0 0 1px rgba(10, 61, 34, 0.05),
    0 24px 60px rgba(10, 61, 34, 0.30),
    0 6px 18px rgba(10, 61, 34, 0.16);
  backdrop-filter: blur(14px);
  transform-origin: bottom right;
}
.fbot-panel.is-requests {
  width: min(420px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 210px));
}
.fbot-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  color: #fff;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.055) 0 8px, rgba(255, 255, 255, 0) 8px 16px),
    linear-gradient(135deg, #0a3d22, #5a8f73);
  border-bottom: 1px dashed rgba(255, 255, 255, 0.42);
}
.fbot-head-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #0a3d22;
  background: linear-gradient(135deg, #d9f2e3, #9ef0c0);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55), 0 2px 6px rgba(0, 0, 0, 0.18);
}
.fbot-head-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.fbot-head-meta strong { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
.fbot-head-sub { font-size: 11px; opacity: 0.85; font-weight: 500; }
.fbot-head-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: #9ef0c0; box-shadow: 0 0 0 0 rgba(158, 240, 192, 0.6); animation: fbot-pulse 2s ease-in-out infinite; }
.fbot-head-dot.is-off { background: rgba(255, 255, 255, 0.5); box-shadow: none; animation: none; }
.fbot-head-back, .fbot-head-action {
  flex-shrink: 0;
  border: 0;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  cursor: pointer;
}
.fbot-head-back { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border-radius: 50%; }
.fbot-head-action { padding: 6px 9px; border-radius: 999px; font: inherit; font-size: 11px; font-weight: 600; }
.fbot-head-back:hover, .fbot-head-action:hover { background: rgba(255, 255, 255, 0.25); }
.fbot-head-back:focus-visible, .fbot-head-action:focus-visible, .fbot-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@keyframes fbot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(158, 240, 192, 0.55); }
  50% { box-shadow: 0 0 0 5px rgba(158, 240, 192, 0); }
}
.fbot-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}
.fbot-close:hover { background: rgba(255, 255, 255, 0.28); transform: rotate(90deg); }

.fbot-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-image: radial-gradient(rgba(90, 143, 115, 0.07) 1px, transparent 1px);
  background-size: 18px 18px;
}
.fbot-msg { display: flex; flex-shrink: 0; }
.fbot-msg.from-user { justify-content: flex-end; }
@media (prefers-reduced-motion: no-preference) {
  .fbot-msg.is-ai-reply .fbot-bubble { animation: fbot-reply-enter 520ms cubic-bezier(.2, .85, .25, 1) both; }
  .fbot-msg.is-ai-reply .fbot-md { animation: fbot-reply-text 320ms ease-out both; }
}
@keyframes fbot-reply-enter {
  0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(.97); box-shadow: 0 0 0 0 rgba(90, 143, 115, 0); }
  65% { opacity: 1; transform: translate3d(0, -2px, 0) scale(1.005); box-shadow: 0 0 0 4px rgba(90, 143, 115, .13); }
  100% { opacity: 1; transform: none; box-shadow: 0 1px 2px rgba(10, 61, 34, .06); }
}
@keyframes fbot-reply-text {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
.fbot-bubble {
  max-width: 84%;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-radius: 16px;
  background: var(--fb-bot-bubble);
  border: 1px solid var(--fb-line);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(10, 61, 34, 0.06);
}
.from-user .fbot-bubble {
  color: #fff;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(10, 61, 34, 0.22);
}
.fbot-bubble.is-ok { display: flex; align-items: flex-start; gap: 6px; }
.fbot-ok { flex-shrink: 0; margin-top: 3px; color: #3f9a6b; }
.fbot-bubble.is-ai { display: flex; flex-direction: column; align-items: stretch; }
.fbot-stream-wait { display: inline-flex; align-items: center; gap: 8px; color: var(--fb-sub); font-size: 12px; }
.fbot-wait-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--fb-accent); animation: fbot-pulse 2s ease-in-out infinite; }
.fbot-bubble.is-streaming .fbot-md::after {
  content: '▍';
  margin-left: 1px;
  color: var(--fb-accent);
  animation: fbot-caret 0.8s steps(2, start) infinite;
}
@keyframes fbot-caret { 50% { opacity: 0; } }
.fbot-md { white-space: normal; overflow-wrap: break-word; }
.fbot-md > :first-child { margin-top: 0; }
.fbot-md > :last-child { margin-bottom: 0; }
.fbot-md p { margin: 0 0 6px; }
.fbot-md ul, .fbot-md ol { margin: 2px 0 6px; padding-left: 18px; }
.fbot-md li { margin: 2px 0; }
.fbot-md li::marker { color: var(--fb-accent); }
.fbot-md strong { font-weight: 700; }
.fbot-md em { font-style: italic; }
.fbot-md a { color: var(--fb-accent); text-decoration: underline; text-underline-offset: 2px; }
.fbot-md h1, .fbot-md h2, .fbot-md h3, .fbot-md h4, .fbot-md h5, .fbot-md h6 { margin: 8px 0 4px; font-size: 14px; font-weight: 700; line-height: 1.4; }
.fbot-md hr { border: none; border-top: 1px dashed var(--fb-line); margin: 8px 0; }
.fbot-md blockquote {
  margin: 4px 0 8px;
  padding: 4px 10px;
  border-left: 3px solid var(--fb-accent);
  color: var(--fb-sub);
  background: rgba(90, 143, 115, 0.08);
  border-radius: 0 8px 8px 0;
}
.fbot-md code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(90, 143, 115, 0.16);
  color: #0a3d22;
  border: 1px solid rgba(90, 143, 115, 0.28);
  cursor: pointer;
}
.fbot-md :deep(.fbot-keyword) {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid var(--fb-line);
  border-bottom: 1px dashed var(--fb-accent);
  border-radius: 5px;
  background: rgba(90, 143, 115, 0.15);
  color: var(--fb-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .92em;
  cursor: pointer;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: normal;
}
.fbot-copy-terms { align-self: flex-end; margin-top: 6px; padding: 3px 10px; border: 1px solid var(--fb-line); border-radius: 999px; background: transparent; color: var(--fb-accent); font-size: 11px; cursor: pointer; }
.fbot-copy-terms:hover, .fbot-copy-terms:focus-visible { border-color: var(--fb-accent); outline: 2px solid var(--fb-accent); outline-offset: 2px; }
.fbot-md :deep(.fbot-keyword:hover), .fbot-md :deep(.fbot-keyword:focus-visible) {
  background: rgba(90, 143, 115, 0.28);
  outline: 2px solid var(--fb-accent);
  outline-offset: 2px;
}
.fbot-md code:hover { background: rgba(90, 143, 115, 0.28); }
.fbot-md pre {
  margin: 4px 0 8px;
  padding: 10px 12px;
  background: rgba(10, 61, 34, 0.05);
  border: 1px solid var(--fb-line);
  border-radius: 10px;
  overflow-x: auto;
}
.fbot-md pre code { background: transparent; border: none; padding: 0; color: inherit; font-size: 12.5px; }
.fbot-md table { border-collapse: collapse; margin: 4px 0 8px; width: 100%; font-size: 12.5px; }
.fbot-md th, .fbot-md td { border: 1px solid var(--fb-line); padding: 4px 8px; text-align: left; }
.fbot-md th { background: rgba(90, 143, 115, 0.1); }
.fbot-md-img { opacity: 0.7; }
.is-dark .fbot-md code { color: #b7e6c9; background: rgba(90, 143, 115, 0.22); border-color: rgba(90, 143, 115, 0.4); }
.is-dark .fbot-md pre { background: rgba(255, 255, 255, 0.04); }
.fbot-typing { display: inline-flex; align-items: center; gap: 4px; padding: 12px 14px; }
.fbot-typing span { margin-left: 6px; font-size: 12px; color: var(--fb-sub); }
.fbot-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--fb-sub); animation: fbot-dot 1s infinite; }
.fbot-typing i:nth-child(2) { animation-delay: 0.15s; }
.fbot-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes fbot-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

.fbot-suggestions { flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; }
.fbot-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0; }
.fbot-chips button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  font-size: 13px;
  color: var(--fb-text);
  background: var(--fb-bot-bubble);
  border: 1px solid var(--fb-line);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.fbot-chips button:hover { border-color: var(--fb-accent); transform: translateY(-1px); box-shadow: 0 3px 8px rgba(10, 61, 34, 0.1); }
.fbot-asks { display: flex; flex-direction: column; gap: 6px; padding: 2px 0 8px; }
.fbot-asks-label { font-size: 11px; color: var(--fb-sub); letter-spacing: 0.02em; }
.fbot-asks-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.fbot-asks button {
  min-width: 0;
  padding: 7px 8px;
  font-size: 13px;
  color: var(--fb-text);
  background: transparent;
  border: 1px dashed var(--fb-line);
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}
.fbot-asks button:focus-visible { outline: 2px solid var(--fb-accent); outline-offset: 2px; }
.fbot-asks button:hover { border-color: var(--fb-accent); background: var(--fb-bot-bubble); transform: translateY(-1px); }

.fbot-foot { display: flex; gap: 8px; align-items: flex-end; padding: 10px 12px 6px; border-top: 1px dashed var(--fb-line); background: var(--fb-bg); }
.fbot-hint { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 0 14px 10px; font-size: 11px; color: var(--fb-sub); }
.fbot-hint .is-warn { color: #d9534f; }
.fbot-submit-email { padding: 8px 12px 0; border-top: 1px solid var(--fb-line); background: var(--fb-bg); }
.fbot-submit-email button { border: 0; padding: 2px 0; color: var(--fb-accent); background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
.fbot-submit-email label { display: block; margin-bottom: 4px; color: var(--fb-sub); font-size: 11px; }
.fbot-submit-email input { width: 100%; box-sizing: border-box; border: 1px solid var(--fb-line); border-radius: 9px; padding: 7px 9px; color: var(--fb-text); background: var(--fb-input); font: inherit; font-size: 12px; }
.fbot-submit-email small { display: block; margin-top: 4px; color: var(--fb-sub); font-size: 10px; }
.fbot-followup { padding: 6px 12px 12px; text-align: right; }
.fbot-followup button { border: 1px solid var(--fb-line); border-radius: 12px; background: var(--fb-bg); color: var(--fb-accent); padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; }
.fbot-followup button:hover, .fbot-followup button:focus-visible { border-color: var(--fb-accent); }

.fbot-requests-view { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 12px 18px; background-image: radial-gradient(rgba(90, 143, 115, 0.07) 1px, transparent 1px); background-size: 18px 18px; }
.fbot-lookup-card { padding: 13px; border: 1px solid var(--fb-line); border-radius: 15px; background: var(--fb-bg); box-shadow: 0 5px 18px rgba(10, 61, 34, 0.07); }
.fbot-lookup-intro { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.fbot-lookup-intro strong { font-size: 14px; color: var(--fb-text); }
.fbot-lookup-intro span, .fbot-lookup-card small { color: var(--fb-sub); font-size: 11px; line-height: 1.45; }
.fbot-email-entry-row { display: flex; gap: 7px; }
.fbot-email-entry-row input { min-width: 0; flex: 1; border: 1px solid var(--fb-line); border-radius: 9px; padding: 8px 9px; color: var(--fb-text); background: var(--fb-input); font: inherit; font-size: 12px; }
.fbot-email-entry-row button { border: 0; border-radius: 9px; background: linear-gradient(135deg, #0a3d22, #5a8f73); color: #fff; padding: 7px 13px; cursor: pointer; white-space: nowrap; font: inherit; font-size: 12px; }
.fbot-email-entry-row button:disabled { opacity: .6; cursor: wait; }
.fbot-lookup-card small { display: block; margin-top: 7px; }
.fbot-local-lookup { width: 100%; margin-top: 9px; padding: 7px; border: 1px solid var(--fb-line); border-radius: 9px; color: var(--fb-accent); background: var(--fb-bot-bubble); font: inherit; font-size: 12px; cursor: pointer; }
.fbot-lookup-state { margin: 12px 2px 0; padding: 10px 12px; border-radius: 10px; color: var(--fb-sub); background: var(--fb-bot-bubble); font-size: 12px; line-height: 1.5; }
.fbot-requests-empty { min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--fb-sub); text-align: center; }
.fbot-requests-empty svg { color: var(--fb-accent); }
.fbot-requests-empty strong { color: var(--fb-text); font-size: 13px; }
.fbot-requests-empty span { max-width: 240px; font-size: 11px; line-height: 1.5; }
.fbot-record-list { margin-top: 14px; display: grid; gap: 9px; }
.fbot-record-search { display: flex; gap: 7px; }
.fbot-record-search input { flex: 1; min-width: 0; border: 1px solid var(--fb-line); border-radius: 9px; padding: 8px 9px; color: var(--fb-text); background: var(--fb-bg); font: inherit; font-size: 12px; }
.fbot-record-search button { border: 1px solid var(--fb-line); border-radius: 9px; padding: 7px 12px; color: var(--fb-accent); background: var(--fb-bot-bubble); font: inherit; font-size: 12px; cursor: pointer; }
.fbot-record-search button:disabled { opacity: .6; cursor: wait; }
.fbot-record-search input:focus { outline: 2px solid rgba(90, 143, 115, .35); border-color: var(--fb-accent); }
.fbot-record-summary { display: flex; align-items: center; justify-content: space-between; color: var(--fb-sub); font-size: 12px; }
.fbot-record-summary strong { color: var(--fb-text); font-size: 13px; }
.fbot-record-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 11px; line-height: 1.45; color: var(--fb-sub); }
.fbot-record-head > span:first-child { min-width: 0; }
.fbot-record-head > span:last-child { flex-shrink: 0; }
.fbot-record-head .is-replied { color: #357b56; font-weight: 700; }
.fbot-record { border: 1px solid var(--fb-line); border-radius: 12px; background: var(--fb-bg); padding: 11px; overflow-wrap: anywhere; box-shadow: 0 3px 12px rgba(10, 61, 34, 0.05); }
.fbot-record p { margin: 7px 0 0; white-space: pre-wrap; font-size: 13px; line-height: 1.55; color: var(--fb-text); }
.fbot-record .fbot-record-reply { display: flex; flex-direction: column; gap: 4px; padding-top: 9px; border-top: 1px solid var(--fb-line); color: var(--fb-text); }
.fbot-record-reply strong { color: var(--fb-accent); font-size: 11px; }
.fbot-record-more { border: 1px solid var(--fb-line); border-radius: 9px; padding: 8px; background: var(--fb-bg); color: var(--fb-accent); font: inherit; cursor: pointer; }
.fbot-record-more:disabled { opacity: .6; cursor: wait; }
.fbot-code-section { margin-top: 12px; border-top: 1px solid var(--fb-line); }
.fbot-code-toggle { width: 100%; display: flex; justify-content: space-between; gap: 8px; padding: 12px 2px 4px; border: 0; color: var(--fb-sub); background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
.fbot-code-toggle span:last-child { color: var(--fb-accent); font-weight: 600; }
.fbot-code-lookup { padding: 9px 0 0; color: var(--fb-sub); font-size: 12px; }
.fbot-code-lookup label { display: block; margin-bottom: 5px; }
.fbot-code-lookup > div { display: flex; gap: 6px; }
.fbot-code-lookup input { flex: 1; min-width: 0; border: 1px solid var(--fb-line); border-radius: 8px; padding: 7px; color: var(--fb-text); background: var(--fb-input); }
.fbot-code-lookup button { border: 0; border-radius: 8px; padding: 7px 11px; background: var(--fb-accent); color: #fff; white-space: nowrap; cursor: pointer; }
.fbot-code-lookup button:disabled { opacity: .6; }
.fbot-code-message { margin: 8px 0 0; font-size: 11px; line-height: 1.45; }
.fbot-code-lookup .fbot-record { margin-top: 9px; }
.fbot-submit-email input:focus, .fbot-email-entry-row input:focus, .fbot-code-lookup input:focus { outline: 2px solid rgba(90, 143, 115, .35); border-color: var(--fb-accent); }
.fbot-requests-view::-webkit-scrollbar { width: 6px; }
.fbot-requests-view::-webkit-scrollbar-thumb { background: rgba(90, 143, 115, 0.35); border-radius: 999px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.fbot-foot textarea {
  flex: 1;
  min-width: 0;
  width: 0;
  height: 54px;
  resize: none;
  box-sizing: border-box;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fb-text);
  background: var(--fb-input);
  border: 1px solid var(--fb-line);
  border-radius: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.fbot-foot textarea:focus { border-color: var(--fb-accent); box-shadow: 0 0 0 3px rgba(90, 143, 115, 0.14); }
.fbot-send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 68px;
  height: 54px;
  white-space: nowrap;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: filter 0.15s, opacity 0.15s, transform 0.15s;
}
.fbot-send:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.fbot-send:disabled { opacity: 0.45; cursor: not-allowed; }

.fbot-body::-webkit-scrollbar { width: 6px; }
.fbot-body::-webkit-scrollbar-thumb { background: rgba(90, 143, 115, 0.35); border-radius: 999px; }
.fbot-body::-webkit-scrollbar-thumb:hover { background: rgba(90, 143, 115, 0.5); }
.fbot-body::-webkit-scrollbar-track { background: transparent; }

.fbot-panel-enter-active { transition: opacity 0.22s ease, transform 0.25s cubic-bezier(0.34, 1.3, 0.64, 1); }
.fbot-panel-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fbot-panel-enter-from, .fbot-panel-leave-to { opacity: 0; transform: translateY(10px) scale(0.92); }

@media (max-width: 768px) {
  .fbot { right: 14px; bottom: 124px; }
  .fbot-tip { display: none; }
  .fbot-panel { width: min(352px, calc(100vw - 28px)); height: min(440px, calc(100vh - 260px)); }
  .fbot-panel.is-requests { width: calc(100vw - 28px); height: min(560px, calc(100vh - 210px)); }
}

@media (prefers-reduced-motion: reduce) {
  .fbot-float, .fbot-shadow, .fbot-light, .fbot-eyes, .fbot-typing i, .fbot-head-dot, .fbot-wait-pulse { animation: none; }
  .fbot-bubble.is-streaming .fbot-md::after { content: none; }
}
</style>
