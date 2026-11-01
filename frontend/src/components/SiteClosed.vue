<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '网站已停止服务' },
  content: { type: String, default: '' },
  recovery: Boolean,
  stopped: Boolean
});
defineEmits(['retry']);

// Preserve custom text; move an existing cost disclosure into the footnote.
const paragraphs = computed(() => props.content.split(/\n\s*\n/).filter(text => text.trim()));
const isCostDisclosure = text => props.stopped && /服务器/.test(text) && /工厂/.test(text) && /个人|自费/.test(text);
const bodyParagraphs = computed(() => paragraphs.value.filter(text => !isCostDisclosure(text)));
const footnotes = computed(() => paragraphs.value.filter(isCostDisclosure));
</script>

<template>
  <section class="site-closed" aria-live="polite">
    <article class="site-closed__card">
      <header class="site-closed__header">
        <span class="site-closed__brand">方度 <span aria-hidden="true">/</span> 服务通知</span>
        <span v-if="stopped" class="site-closed__status"><span aria-hidden="true"></span>已停止服务</span>
      </header>
      <h1>{{ title }}</h1>
      <div class="site-closed__content"><p v-for="(paragraph, index) in bodyParagraphs" :key="index">{{ paragraph }}</p></div>
      <aside v-if="footnotes.length" class="site-closed__note" aria-label="费用说明"><p v-for="(note, index) in footnotes" :key="index">{{ note }}</p></aside>
    </article>
    <footer v-if="recovery" class="site-closed__actions">
      <router-link to="/login">管理员登录</router-link>
      <span aria-hidden="true">·</span>
      <button type="button" @click="$emit('retry')">重新检查状态</button>
    </footer>
  </section>
</template>

<style scoped>
.site-closed, .site-closed * { box-sizing: border-box; min-width: 0; }
.site-closed { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; color: #374151; }
.site-closed__card { width: 100%; max-width: 640px; padding: 36px 40px; border: 1px solid #e5e7eb; border-radius: 18px; background: #fff; box-shadow: 0 12px 40px rgba(10,61,34,.045); }
.site-closed__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 30px; }
.site-closed__brand { font-size: 13px; color: #5a8f73; letter-spacing: .06em; }
.site-closed__brand > span { margin: 0 8px; opacity: .4; }
.site-closed__status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
.site-closed__status > span { width: 6px; height: 6px; border-radius: 50%; background: #5a8f73; }
.site-closed h1 { font-size: clamp(23px,5vw,28px); color: #0a3d22; line-height: 1.4; margin: 0 0 22px; font-weight: 650; overflow-wrap: anywhere; }
.site-closed__content { font-size: 15px; line-height: 1.9; }
.site-closed__content p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 16px; }
.site-closed__content p:last-child { margin-bottom: 0; }
.site-closed__note { margin-top: 26px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; line-height: 1.85; color: #64748b; }
.site-closed__note p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.site-closed__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin-top: 22px; font-size: 12px; color: #64748b; }
.site-closed__actions a, .site-closed__actions button { color: inherit; text-decoration: none; transition: color .2s ease; }
.site-closed__actions button { border: 0; padding: 4px 0; background: none; font: inherit; cursor: pointer; }
.site-closed__actions a:hover, .site-closed__actions button:hover { color: #5a8f73; }
.site-closed__actions a:focus-visible, .site-closed__actions button:focus-visible { outline: 2px solid #5a8f73; outline-offset: 4px; }
:global(body:not(.theme-light)) .site-closed__card { background: #0c1912; color: #e2e8f0; border-color: rgba(255,255,255,.14); }
:global(body:not(.theme-light)) .site-closed h1 { color: #f8fafc; }
:global(body:not(.theme-light)) .site-closed__note { border-color: rgba(255,255,255,.14); color: #94a3b8; }
@media(max-width:600px) { .site-closed { padding: 32px 18px; }.site-closed__card { padding: 28px 24px; }.site-closed__header { margin-bottom: 24px; } }
</style>
