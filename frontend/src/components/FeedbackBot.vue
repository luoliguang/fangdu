<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import apiClient from '../axiosConfig.js';
import { useTheme } from '../composables/useTheme.js';

const { isDark } = useTheme();

const MAX_LEN = 1000;
const COOLDOWN_MS = 10000;

const quickTopics = [
  { key: 'material', label: '想要新素材', icon: 'sparkle', hint: '告诉我你想要的款式、面料或颜色吧~' },
  { key: 'notfound', label: '没找到想要的', icon: 'search', hint: '你在找什么呢？说说关键词，我帮你记下来~' },
  { key: 'bug', label: '网站有问题', icon: 'bug', hint: '哪里不对劲啦？描述一下，我马上转告~' },
  { key: 'other', label: '其他想说的', icon: 'chat', hint: '想说什么都可以，我在听~' }
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
const messages = ref([
  { id: 1, from: 'bot', text: '嗨，我是小度，想要什么素材，或者遇到了什么问题，都可以告诉我，我会帮你转达给团队~' }
]);
let nextId = 2;

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
onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  if (cooldownLeft.value > 0) runTicker();
});
onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove);
  clearInterval(tickTimer);
});

function scrollBottom() {
  nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight; });
}
function pushBot(t, tone) {
  // 机器人连续两条一模一样的话没有意义，直接忽略，避免刷屏
  const last = messages.value[messages.value.length - 1];
  if (last && last.from === 'bot' && last.text === t) return;
  messages.value.push({ id: nextId++, from: 'bot', text: t, tone });
  scrollBottom();
}
function pushUser(t) {
  messages.value.push({ id: nextId++, from: 'user', text: t });
  scrollBottom();
}

function toggle() {
  open.value = !open.value;
  if (open.value) {
    scrollBottom();
    // 仅在有鼠标的设备上自动聚焦，避免手机上一打开就弹出键盘遮住面板
    if (window.matchMedia?.('(pointer: fine)').matches) nextTick(() => inputRef.value?.focus());
  }
}

function pickTopic(t) {
  topic.value = t;
  pushUser(t.label);
  setTimeout(() => pushBot(t.hint), 350);
}

function getUserId() {
  let id = localStorage.getItem('user_id');
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem('user_id', id);
  }
  return id;
}

async function send() {
  if (!canSend.value) return;
  const content = text.value.trim();
  const message = topic.value ? `【${topic.value.label}】${content}` : content;
  pushUser(content);
  text.value = '';
  sending.value = true;
  try {
    await apiClient.post('/api/v1/feedbacks', { message, user_id: getUserId() });
    startCooldown(COOLDOWN_MS);
    topic.value = null;
    pushBot('收到啦！已经帮你转给团队了，谢谢你', 'ok');
  } catch (err) {
    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message;
    let restore = status !== 400;
    if (status === 429) {
      // 服务端限流时按它给的等待时间走，没有就用默认冷却
      const retry = Number(err.response?.headers?.['retry-after']);
      startCooldown((Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : COOLDOWN_MS / 1000) * 1000);
      pushBot(serverMsg || '发得有点频繁，稍等一会儿再试试~');
      if (/已经收到/.test(serverMsg || '')) restore = false; // 重复内容不用放回输入框
    } else if (status === 503) pushBot('留言功能暂时关闭了，晚点再来找我吧~');
    else if (status === 400) pushBot(serverMsg || '内容好像不太对，换个说法试试？');
    else pushBot('网络开小差了，你的话还在输入框里，再点一次发送吧');
    if (restore) text.value = content;
  } finally {
    sending.value = false;
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
      <section v-if="open" class="fbot-panel" role="dialog" aria-label="反馈小助手" @keydown.esc="open = false">
        <header class="fbot-head">
          <span class="fbot-head-dot"></span>
          <strong>小度</strong>
          <span class="fbot-head-sub">反馈小助手</span>
          <button class="fbot-close" aria-label="关闭" @click="open = false">×</button>
        </header>

        <div ref="bodyRef" class="fbot-body" role="log" aria-live="polite">
          <div v-for="m in messages" :key="m.id" class="fbot-msg" :class="`from-${m.from}`">
            <div class="fbot-bubble" :class="{ 'is-ok': m.tone === 'ok' }"><svg v-if="m.tone === 'ok'" class="fbot-ok" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M7.8 12.4l3 3 5.4-6"/></svg>{{ m.text }}</div>
          </div>
          <div v-if="sending" class="fbot-msg from-bot">
            <div class="fbot-bubble fbot-typing"><i></i><i></i><i></i></div>
          </div>
        </div>

        <div v-if="!topic && messages.length <= 2" class="fbot-chips">
          <button v-for="t in quickTopics" :key="t.key" @click="pickTopic(t)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="(d, i) in topicIcons[t.icon]" :key="i" :d="d"/></svg>{{ t.label }}</button>
        </div>

        <footer class="fbot-foot">
          <textarea
            ref="inputRef"
            v-model="text"
            rows="2"
            :maxlength="MAX_LEN"
            placeholder="想说点什么…"
            aria-label="反馈内容"
            @keydown="onKeydown"
          ></textarea>
          <button class="fbot-send" :disabled="!canSend" @click="send">{{ cooldownLeft > 0 ? cooldownLabel : '发送' }}</button>
        </footer>
        <div class="fbot-hint">
          <span>Enter 发送 · Shift+Enter 换行</span>
          <span v-if="text.length > MAX_LEN * 0.8" :class="{ 'is-warn': remaining < 50 }">{{ text.length }}/{{ MAX_LEN }}</span>
        </div>
      </section>
    </Transition>

    <button ref="botRef" class="fbot-avatar" :aria-label="open ? '收起小助手' : '打开反馈小助手'" @click="toggle">
      <span v-if="!open" class="fbot-tip">有想法？告诉我~</span>
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
  gap: 10px;
  --fb-bg: #ffffff;
  --fb-text: #1f2d26;
  --fb-sub: #6b7f74;
  --fb-line: rgba(90, 143, 115, 0.22);
  --fb-bot-bubble: #eef6f1;
  --fb-input: #f6faf8;
}
.fbot.is-dark {
  --fb-bg: rgba(14, 22, 18, 0.96);
  --fb-text: #e6efe9;
  --fb-sub: #92a89b;
  --fb-line: rgba(90, 143, 115, 0.32);
  --fb-bot-bubble: rgba(90, 143, 115, 0.18);
  --fb-input: rgba(255, 255, 255, 0.06);
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
  width: min(340px, calc(100vw - 32px));
  height: min(460px, calc(100vh - 220px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--fb-text);
  background: var(--fb-bg);
  border: 1px solid var(--fb-line);
  border-radius: 20px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.25);
  transform-origin: bottom right;
}
.fbot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  color: #fff;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
}
.fbot-head-dot { width: 8px; height: 8px; border-radius: 50%; background: #9ef0c0; box-shadow: 0 0 8px #9ef0c0; animation: fbot-pulse 1.6s ease-in-out infinite; }
@keyframes fbot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px #9ef0c0, 0 0 0 0 rgba(158, 240, 192, 0.55); }
  50% { opacity: 0.35; transform: scale(0.8); box-shadow: 0 0 3px #9ef0c0, 0 0 0 5px rgba(158, 240, 192, 0); }
}
.fbot-head-sub { font-size: 12px; opacity: 0.8; }
.fbot-close {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  cursor: pointer;
}
.fbot-close:hover { background: rgba(255, 255, 255, 0.28); }

.fbot-body { flex: 1; overflow-y: auto; padding: 14px 12px 6px; display: flex; flex-direction: column; gap: 8px; }
.fbot-msg { display: flex; }
.fbot-msg.from-user { justify-content: flex-end; }
.fbot-bubble {
  max-width: 82%;
  padding: 9px 13px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-radius: 16px;
  background: var(--fb-bot-bubble);
  border-bottom-left-radius: 4px;
}
.from-user .fbot-bubble {
  color: #fff;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
}
.fbot-bubble.is-ok { display: flex; align-items: flex-start; gap: 6px; }
.fbot-ok { flex-shrink: 0; margin-top: 3px; color: #3f9a6b; }
.fbot-typing { display: inline-flex; gap: 4px; padding: 12px 14px; }
.fbot-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--fb-sub); animation: fbot-dot 1s infinite; }
.fbot-typing i:nth-child(2) { animation-delay: 0.15s; }
.fbot-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes fbot-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

.fbot-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 12px 8px; }
.fbot-chips button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--fb-text);
  background: transparent;
  border: 1px solid var(--fb-line);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.fbot-chips button:hover { background: var(--fb-bot-bubble); border-color: #5a8f73; }

.fbot-foot { display: flex; gap: 8px; align-items: flex-end; padding: 10px 12px 4px; border-top: 1px solid var(--fb-line); }
.fbot-hint { display: flex; justify-content: space-between; gap: 8px; padding: 0 14px 10px; font-size: 11px; color: var(--fb-sub); }
.fbot-hint .is-warn { color: #d9534f; }
.fbot-foot textarea {
  flex: 1;
  min-width: 0;
  width: 0;
  height: 56px;
  resize: none;
  box-sizing: border-box;
  padding: 8px 10px;
  font: inherit;
  font-size: 14px;
  color: var(--fb-text);
  background: var(--fb-input);
  border: 1px solid var(--fb-line);
  border-radius: 12px;
  outline: none;
}
.fbot-foot textarea:focus { border-color: #5a8f73; }
.fbot-send {
  flex-shrink: 0;
  min-width: 68px;
  white-space: nowrap;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: filter 0.15s, opacity 0.15s;
}
.fbot-send:hover:not(:disabled) { filter: brightness(1.12); }
.fbot-send:disabled { opacity: 0.45; cursor: not-allowed; }

.fbot-panel-enter-active { transition: opacity 0.22s ease, transform 0.25s cubic-bezier(0.34, 1.3, 0.64, 1); }
.fbot-panel-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fbot-panel-enter-from, .fbot-panel-leave-to { opacity: 0; transform: translateY(10px) scale(0.92); }

@media (max-width: 768px) {
  .fbot { right: 14px; bottom: 124px; }
  .fbot-tip { display: none; }
  .fbot-panel { height: min(440px, calc(100vh - 260px)); }
}

@media (prefers-reduced-motion: reduce) {
  .fbot-float, .fbot-shadow, .fbot-light, .fbot-eyes, .fbot-typing i, .fbot-head-dot { animation: none; }
}
</style>
