<template>
  <!-- 常驻帮助入口 -->
  <button v-if="!isActive" class="tutorial-fab" @click="openTutorial" aria-label="使用教程">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
    </svg>
    <span>教程</span>
  </button>

  <div v-if="isActive" class="tutorial-card-wrap">
        <div class="tutorial-card">

          <!-- 关闭 -->
          <button class="tutorial-close" @click="closeTutorial" aria-label="关闭教程">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- 插图区 -->
          <div class="tutorial-illo">

            <!-- Step 1: 欢迎 -->
            <svg v-if="stepIndex === 0" viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
              <rect width="280" height="140" fill="#f0fdf4" rx="12"/>
              <circle cx="56" cy="28" r="42" fill="#dcfce7" opacity="0.6"/>
              <circle cx="224" cy="112" r="32" fill="#bbf7d0" opacity="0.45"/>
              <!-- 织物格子图标 -->
              <rect x="90" y="22" width="100" height="90" rx="10" fill="white" stroke="#5a8f73" stroke-width="1.5"/>
              <line x1="100" y1="38" x2="182" y2="38" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="100" y1="52" x2="182" y2="52" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="100" y1="66" x2="182" y2="66" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="100" y1="80" x2="182" y2="80" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="100" y1="94" x2="182" y2="94" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="116" y1="30" x2="116" y2="104" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="136" y1="30" x2="136" y2="104" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="156" y1="30" x2="156" y2="104" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <line x1="172" y1="30" x2="172" y2="104" stroke="#5a8f73" stroke-width="1" opacity="0.4"/>
              <!-- 填色块 -->
              <rect x="100" y="30" width="32" height="22" rx="2" fill="#0a3d22" opacity="0.14"/>
              <rect x="140" y="52" width="32" height="22" rx="2" fill="#5a8f73" opacity="0.2"/>
              <rect x="100" y="74" width="56" height="22" rx="2" fill="#0a3d22" opacity="0.08"/>
              <!-- 星星 -->
              <g fill="#5a8f73">
                <polygon points="38,52 40,46 42,52 48,54 42,56 40,62 38,56 32,54" opacity="0.65"/>
                <polygon points="240,36 241.5,32 243,36 247,37.5 243,39 241.5,43 240,39 236,37.5" opacity="0.55"/>
                <polygon points="252,82 253,79 254,82 257,83 254,84 253,87 252,84 249,83" opacity="0.45"/>
              </g>
              <text x="140" y="130" text-anchor="middle" fill="#0a3d22" font-size="11" font-weight="600" font-family="system-ui,sans-serif">方度素材库</text>
            </svg>

            <!-- Step 2: 关键词搜索 -->
            <svg v-else-if="stepIndex === 1" viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
              <rect width="280" height="140" fill="#f0fdf4" rx="12"/>
              <circle cx="252" cy="22" r="32" fill="#dcfce7" opacity="0.5"/>
              <!-- 搜索框 -->
              <rect x="18" y="28" width="244" height="46" rx="23" fill="white" stroke="#d1d5db" stroke-width="1.5"/>
              <!-- 放大镜 -->
              <circle cx="44" cy="51" r="9" fill="none" stroke="#9ca3af" stroke-width="2"/>
              <line x1="50" y1="57" x2="57" y2="64" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
              <!-- 输入文字 -->
              <text x="68" y="56" fill="#1a2332" font-size="14" font-family="system-ui,sans-serif" font-weight="500">圆领短袖</text>
              <!-- 光标闪烁 -->
              <rect x="128" y="42" width="2" height="18" rx="1" fill="#5a8f73">
                <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite"/>
              </rect>
              <!-- 搜索按钮 -->
              <rect x="220" y="37" width="34" height="28" rx="14" fill="#0a3d22"/>
              <text x="237" y="56" text-anchor="middle" fill="white" font-size="11" font-family="system-ui,sans-serif" font-weight="600">搜索</text>
              <!-- 关键词示例气泡 -->
              <g transform="translate(18, 88)">
                <rect x="0" y="0" width="66" height="24" rx="12" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1"/>
                <text x="33" y="16.5" text-anchor="middle" fill="#0a3d22" font-size="11" font-family="system-ui,sans-serif">棉麻面料</text>
              </g>
              <g transform="translate(92, 88)">
                <rect x="0" y="0" width="66" height="24" rx="12" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1"/>
                <text x="33" y="16.5" text-anchor="middle" fill="#0a3d22" font-size="11" font-family="system-ui,sans-serif">连衣裙</text>
              </g>
              <g transform="translate(166, 88)">
                <rect x="0" y="0" width="80" height="24" rx="12" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1"/>
                <text x="40" y="16.5" text-anchor="middle" fill="#0a3d22" font-size="11" font-family="system-ui,sans-serif">插肩卫衣</text>
              </g>
              <text x="140" y="130" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui,sans-serif">输入关键词，点击搜索</text>
            </svg>

            <!-- Step 3: 标签筛选 -->
            <svg v-else-if="stepIndex === 2" viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
              <rect width="280" height="140" fill="#f0fdf4" rx="12"/>
              <circle cx="26" cy="112" r="28" fill="#dcfce7" opacity="0.5"/>
              <text x="140" y="22" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui,sans-serif">点击标签，即可一键筛选素材</text>
              <!-- 标签行 -->
              <rect x="16" y="30" width="40" height="26" rx="13" fill="white" stroke="#d1d5db" stroke-width="1.5"/>
              <text x="36" y="48" text-anchor="middle" fill="#64748b" font-size="12" font-family="system-ui,sans-serif">全部</text>
              <!-- 选中态标签 + 动画波纹 -->
              <rect x="64" y="30" width="74" height="26" rx="13" fill="#0a3d22"/>
              <text x="101" y="48" text-anchor="middle" fill="white" font-size="12" font-family="system-ui,sans-serif" font-weight="600">圆领短袖</text>
              <circle cx="101" cy="43" r="37" fill="none" stroke="#5a8f73" stroke-width="1.5" opacity="0.4">
                <animate attributeName="r" values="37;45;37" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
              </circle>
              <rect x="146" y="30" width="40" height="26" rx="13" fill="white" stroke="#d1d5db" stroke-width="1.5"/>
              <text x="166" y="48" text-anchor="middle" fill="#64748b" font-size="12" font-family="system-ui,sans-serif">T恤</text>
              <rect x="194" y="30" width="40" height="26" rx="13" fill="white" stroke="#d1d5db" stroke-width="1.5"/>
              <text x="214" y="48" text-anchor="middle" fill="#64748b" font-size="12" font-family="system-ui,sans-serif">棉麻</text>
              <!-- 结果卡片示意 -->
              <rect x="16" y="70" width="76" height="58" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
              <rect x="18" y="72" width="72" height="38" rx="6" fill="#dcfce7"/>
              <text x="54" y="98" text-anchor="middle" fill="#5a8f73" font-size="8.5" font-family="system-ui,sans-serif">圆领短袖</text>
              <rect x="100" y="70" width="76" height="58" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
              <rect x="102" y="72" width="72" height="38" rx="6" fill="#dcfce7"/>
              <text x="138" y="98" text-anchor="middle" fill="#5a8f73" font-size="8.5" font-family="system-ui,sans-serif">圆领短袖</text>
              <rect x="184" y="70" width="76" height="58" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
              <rect x="186" y="72" width="72" height="38" rx="6" fill="#dcfce7"/>
              <text x="222" y="98" text-anchor="middle" fill="#5a8f73" font-size="8.5" font-family="system-ui,sans-serif">圆领短袖</text>
            </svg>

            <!-- Step 4: 收藏与复制 -->
            <svg v-else-if="stepIndex === 3" viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="cs4">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.1"/>
                </filter>
              </defs>
              <rect width="280" height="140" fill="#f0fdf4" rx="12"/>
              <circle cx="238" cy="118" r="34" fill="#fce7f3" opacity="0.4"/>
              <!-- 素材卡片 -->
              <rect x="44" y="12" width="86" height="116" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1.5" filter="url(#cs4)"/>
              <rect x="46" y="14" width="82" height="76" rx="8" fill="#dcfce7"/>
              <!-- 面料纹理 -->
              <line x1="54" y1="26" x2="120" y2="26" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="54" y1="36" x2="120" y2="36" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="54" y1="46" x2="120" y2="46" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="54" y1="56" x2="120" y2="56" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="54" y1="66" x2="120" y2="66" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="66" y1="16" x2="66" y2="88" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="82" y1="16" x2="82" y2="88" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="98" y1="16" x2="98" y2="88" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <line x1="114" y1="16" x2="114" y2="88" stroke="#5a8f73" stroke-width="0.8" opacity="0.35"/>
              <text x="87" y="106" text-anchor="middle" fill="#64748b" font-size="8.5" font-family="system-ui,sans-serif">棉麻圆领 9012…</text>
              <!-- 收藏按钮（右上） -->
              <circle cx="122" cy="30" r="13" fill="white" filter="url(#cs4)"/>
              <path d="M122,36 C122,36 114,30 114,25.5 C114,23 117,21 122,24.5 C127,21 130,23 130,25.5 C130,30 122,36 122,36Z" fill="#ef4444">
                <animateTransform attributeName="transform" type="scale" values="1;1.18;1" dur="1.8s" repeatCount="indefinite" additive="sum" transformOrigin="122 29"/>
              </path>
              <!-- 复制按钮（右下） -->
              <circle cx="122" cy="80" r="13" fill="white" filter="url(#cs4)"/>
              <rect x="116" y="74" width="9" height="9" rx="2" fill="none" stroke="#5a8f73" stroke-width="1.5"/>
              <rect x="119" y="77" width="9" height="9" rx="2" fill="white" stroke="#5a8f73" stroke-width="1.5"/>

              <!-- 右侧说明列 -->
              <g transform="translate(150, 20)">
                <circle cx="11" cy="11" r="11" fill="#fef2f2"/>
                <path d="M11,16.5 C11,16.5 5,11 5,7 C5,4.8 8,3 11,6 C14,3 17,4.8 17,7 C17,11 11,16.5 11,16.5Z" fill="#ef4444"/>
                <text x="30" y="15" fill="#1a2332" font-size="11" font-family="system-ui,sans-serif">收藏到边栏</text>
                <text x="30" y="27" fill="#94a3b8" font-size="9.5" font-family="system-ui,sans-serif">随时查看已收藏</text>
              </g>
              <g transform="translate(150, 65)">
                <circle cx="11" cy="11" r="11" fill="#f0fdf4"/>
                <rect x="6" y="6" width="8" height="8" rx="1.5" fill="none" stroke="#5a8f73" stroke-width="1.5"/>
                <rect x="9" y="9" width="8" height="8" rx="1.5" fill="white" stroke="#5a8f73" stroke-width="1.5"/>
                <text x="30" y="15" fill="#1a2332" font-size="11" font-family="system-ui,sans-serif">复制图片链接</text>
                <text x="30" y="27" fill="#94a3b8" font-size="9.5" font-family="system-ui,sans-serif">快速用于设计工具</text>
              </g>
              <g transform="translate(150, 110)">
                <line x1="0" y1="0" x2="120" y2="0" stroke="#e2e8f0" stroke-width="1"/>
              </g>
              <text x="210" y="130" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="system-ui,sans-serif">悬停图片即可看到操作按钮</text>
            </svg>

            <!-- Step 5: 更多功能 -->
            <svg v-else viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
              <rect width="280" height="140" fill="#f0fdf4" rx="12"/>
              <circle cx="140" cy="70" r="58" fill="#dcfce7" opacity="0.3"/>
              <!-- 导航栏 -->
              <rect x="18" y="16" width="244" height="38" rx="19" fill="#0a3d22" opacity="0.92"/>
              <rect x="25" y="22" width="40" height="26" rx="13" fill="rgba(255,255,255,0.15)"/>
              <text x="45" y="39" text-anchor="middle" fill="white" font-size="10" font-family="system-ui,sans-serif" font-weight="600">实拍</text>
              <text x="90" y="39" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10" font-family="system-ui,sans-serif">杂款领口</text>
              <text x="138" y="39" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10" font-family="system-ui,sans-serif">面料细节</text>
              <text x="186" y="39" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10" font-family="system-ui,sans-serif">设计专用</text>
              <text x="240" y="39" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10" font-family="system-ui,sans-serif">更多…</text>
              <!-- 打色卡卡片 -->
              <rect x="18" y="66" width="114" height="60" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
              <rect x="18" y="66" width="114" height="28" rx="10" fill="#e0f2fe"/>
              <rect x="18" y="80" width="114" height="14" fill="#e0f2fe"/>
              <rect x="28" y="72" width="15" height="15" rx="3" fill="#ef4444"/>
              <rect x="47" y="72" width="15" height="15" rx="3" fill="#3b82f6"/>
              <rect x="66" y="72" width="15" height="15" rx="3" fill="#f59e0b"/>
              <rect x="85" y="72" width="15" height="15" rx="3" fill="#10b981"/>
              <text x="75" y="108" text-anchor="middle" fill="#475569" font-size="10.5" font-family="system-ui,sans-serif" font-weight="600">打色卡</text>
              <text x="75" y="120" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="system-ui,sans-serif">设计师配色工具</text>
              <!-- 尺码转换卡片 -->
              <rect x="148" y="66" width="114" height="60" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
              <rect x="148" y="66" width="114" height="28" rx="10" fill="#fef3c7"/>
              <rect x="148" y="80" width="114" height="14" fill="#fef3c7"/>
              <text x="160" y="82" fill="#92400e" font-size="12" font-family="system-ui,sans-serif" font-weight="700">S</text>
              <text x="178" y="82" fill="#92400e" font-size="12" font-family="system-ui,sans-serif" font-weight="700">M</text>
              <text x="198" y="82" fill="#92400e" font-size="12" font-family="system-ui,sans-serif" font-weight="700">L</text>
              <text x="218" y="82" fill="#92400e" font-size="12" font-family="system-ui,sans-serif" font-weight="700">XL</text>
              <text x="205" y="108" text-anchor="middle" fill="#475569" font-size="10.5" font-family="system-ui,sans-serif" font-weight="600">尺码转换</text>
              <text x="205" y="120" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="system-ui,sans-serif">中美欧码对照</text>
            </svg>

          </div>

          <!-- 内容 -->
          <div class="tutorial-body">
            <div class="tutorial-step-num">{{ stepIndex + 1 }} / {{ steps.length }}</div>
            <h3 class="tutorial-title">{{ currentStep.title }}</h3>
            <p class="tutorial-desc">{{ currentStep.desc }}</p>
          </div>

          <!-- 底部 -->
          <div class="tutorial-footer">
            <div class="tutorial-dots">
              <button
                v-for="(_, i) in steps"
                :key="i"
                :class="['dot', { active: i === stepIndex }]"
                @click="stepIndex = i"
                :aria-label="`第 ${i + 1} 步`"
              />
            </div>
            <div class="tutorial-nav">
              <button v-if="stepIndex > 0" class="btn-ghost" @click="prev">上一步</button>
              <button v-if="stepIndex < steps.length - 1" class="btn-primary" @click="next">下一步 →</button>
              <button v-else class="btn-primary btn-done" @click="closeTutorial">开始使用</button>
            </div>
          </div>

        </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isActive = ref(false);
const stepIndex = ref(0);

const steps = [
  {
    title: '欢迎使用方度素材库',
    desc: '这里汇聚了各类面料的实拍素材，涵盖圆领、棉麻、连衣裙等品类，支持关键词搜索与标签筛选，帮你快速找到所需素材。'
  },
  {
    title: '关键词搜索',
    desc: '在顶部搜索框输入关键词，如「圆领短袖」「棉麻」「连衣裙」，点击搜索即可获得精准结果。搜索词越具体，结果越精准。'
  },
  {
    title: '标签快速筛选',
    desc: '点击搜索框下方的标签，无需打字即可一键筛选对应分类的素材。再次点击同一标签可回到全部，支持与关键词搜索组合使用。'
  },
  {
    title: '收藏与快捷复制',
    desc: '悬停在图片上，点击右上角 ♡ 图标收藏素材，收藏夹可在页面左侧边栏查看。点击复制图标可快速获取图片链接，方便在设计工具中使用。'
  },
  {
    title: '探索更多功能',
    desc: '导航栏「打色卡」可辅助设计配色，「尺码转换」提供中美欧码对照，各独立分类页展示特定类型的专属素材。遇到问题随时点左下角「教程」重看。'
  }
];

const currentStep = computed(() => steps[stepIndex.value]);

const openTutorial = () => {
  stepIndex.value = 0;
  isActive.value = true;
};

const closeTutorial = () => {
  isActive.value = false;
  localStorage.setItem('tutorial_seen', '1');
};

const next = () => { if (stepIndex.value < steps.length - 1) stepIndex.value++; };
const prev = () => { if (stepIndex.value > 0) stepIndex.value--; };

onMounted(() => {
  if (!localStorage.getItem('tutorial_seen') && route.path === '/') {
    setTimeout(() => { isActive.value = true; }, 1800);
  }
});
</script>

<style scoped>
/* ── 常驻帮助入口 ── */
.tutorial-fab {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 0 10px;
  height: 38px;
  background: linear-gradient(135deg, #0a3d22, #1d6b43);
  color: rgba(255, 255, 255, 0.92);
  border: none;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(10, 61, 34, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tutorial-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(10, 61, 34, 0.45);
}

/* ── 卡片容器 ── */
.tutorial-card-wrap {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  width: min(440px, calc(100vw - 32px));
}

.tutorial-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.16),
    0 4px 16px rgba(0, 0, 0, 0.07);
}

/* ── 关闭 ── */
.tutorial-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.07);
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s;
}
.tutorial-close:hover { background: rgba(0, 0, 0, 0.13); }

/* ── 插图 ── */
.tutorial-illo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}
.tutorial-illo svg {
  width: 100%;
  height: auto;
  display: block;
}

/* ── 内容 ── */
.tutorial-body {
  padding: 18px 22px 10px;
}
.tutorial-step-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: #5a8f73;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.tutorial-title {
  font-size: 1.08rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
  line-height: 1.3;
}
.tutorial-desc {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.65;
  margin: 0;
}

/* ── 底部 ── */
.tutorial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px 18px;
}
.tutorial-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: #d1d5db;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}
.dot.active {
  background: #0a3d22;
  transform: scale(1.25);
}
.tutorial-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-ghost {
  padding: 0.46rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: transparent;
  color: #64748b;
  font-size: 0.84rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-ghost:hover { border-color: #94a3b8; color: #334155; }
.btn-primary {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #0a3d22, #1d6b43);
  color: #fff;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
}
.btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
.btn-done { background: linear-gradient(135deg, #0a3d22, #5a8f73); }

/* ── 进场动画 ── */
@keyframes tutorial-slide-up {
  from { opacity: 0; transform: translateX(-50%) translateY(28px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.tutorial-card-wrap {
  animation: tutorial-slide-up 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

/* ── 移动端 ── */
@media (max-width: 768px) {
  .tutorial-fab {
    bottom: 20px;
    left: 16px;
    height: 34px;
    padding: 0 12px 0 9px;
    font-size: 0.78rem;
  }
  .tutorial-card-wrap {
    bottom: 0;
    width: 100%;
    left: 0;
    transform: none;
  }
  .tutorial-card { border-radius: 20px 20px 0 0; }
  @keyframes tutorial-slide-up {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .tutorial-card-wrap { transform: none; }
}
</style>
