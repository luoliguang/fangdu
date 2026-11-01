<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useApi } from '../../composables/useApi.js';
import { siteModules, useSiteControlStore } from '../../stores/siteControl.js';
import SiteClosed from '../../components/SiteClosed.vue';

const site = useSiteControlStore();
const api = useApi();
const form = ref(null);
const saved = ref(null);
const loadError = ref(false);
const preview = ref(false);
const saving = ref(false);
const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(saved.value));
const clone = value => JSON.parse(JSON.stringify(value));
async function load() {
  loadError.value = false;
  const result = await api.get('/api/v1/site-control');
  if (result.success) { form.value = clone(result.data.data); saved.value = clone(form.value); }
  else loadError.value = true;
}
async function save(mode) {
  const next = clone(form.value);
  if (mode === 'stop') { next.enabled = false; next.notice.enabled = true; }
  if (mode === 'open') { next.enabled = true; next.notice.enabled = false; }
  if (!next.notice.title.trim() || !next.notice.content.trim()) return ElMessage.error('请填写公告标题和内容');
  try {
    await ElMessageBox.confirm(
      next.enabled ? (mode === 'open' ? '恢复网站开放并关闭停用公告弹窗，保留各模块原有开关设置。' : '保存后，访客将按当前模块开关访问网站。') : '保存后，访客将停止访问网站并看到停止服务页面。管理员仍可登录后台恢复。',
      next.enabled ? '确认发布设置' : '确认停用网站',
      { type: 'warning', confirmButtonText: next.enabled ? '保存并生效' : '停用并发布公告', cancelButtonText: '取消' }
    );
  } catch (_) { return; }
  saving.value = true;
  try {
    const result = await api.put('/api/v1/site-control', next);
    if (result.success) {
      form.value = clone(result.data.data);
      saved.value = clone(form.value);
      await site.refresh();
      ElMessage.success('站点设置已生效');
    }
  } finally { saving.value = false; }
}
onMounted(load);
</script>

<template>
  <div class="site-control" v-loading="api.isLoading.value">
    <header class="control-header"><div><span class="eyebrow">站点运营</span><h1>站点控制</h1><p>管理网站开放状态、模块入口与访客通知。</p></div><el-tag v-if="saved" :type="saved.enabled ? 'success' : 'info'">{{ saved.enabled ? '当前已开放' : '当前已停用' }}</el-tag></header>
    <el-alert v-if="loadError" title="配置加载失败，请重试后再编辑" type="error" :closable="false"><el-button @click="load">重新加载</el-button></el-alert>
    <template v-if="form">
      <section class="control-card control-status">
        <div><h2>网站开放状态</h2><p>一键停用保留后台入口，不会删除任何素材。</p></div>
        <el-button :type="saved.enabled ? 'danger' : 'success'" :loading="saving" @click="save(saved.enabled ? 'stop' : 'open')">{{ saved.enabled ? '一键停用并发布公告' : '恢复网站开放' }}</el-button>
      </section>
      <div class="control-grid">
        <section class="control-card"><h2>模块开关</h2><p>停用整站时，所有模块统一关闭；恢复开放后沿用以下设置。</p>
          <div v-for="module in siteModules" :key="module.key" class="module-row"><div><h3>{{ module.label }}</h3><p>{{ module.description }}</p></div><el-switch v-model="form.modules[module.key]" :aria-label="module.label" /></div>
          <el-alert title="外链开关控制本站入口，不会关闭外部网站；已知 OSS/CDN 文件地址不受此开关控制。" type="info" :closable="false" />
        </section>
        <section class="control-card"><h2>访客公告</h2><p>停用时直接显示公告页面，不重复弹窗；开放时可启用进入通知，每次发布设置后每个浏览器会话展示一次。</p>
          <el-form label-position="top">
            <el-form-item label="正常开放时弹出公告"><el-switch v-model="form.notice.enabled" aria-label="正常开放时弹出公告" /></el-form-item>
            <el-form-item label="公告标题"><el-input v-model="form.notice.title" maxlength="80" show-word-limit /></el-form-item>
            <el-form-item label="公告内容"><el-input v-model="form.notice.content" type="textarea" :rows="10" maxlength="3000" show-word-limit /></el-form-item>
          </el-form>
          <el-button @click="preview = true">预览停用页面</el-button>
        </section>
      </div>
      <footer class="control-footer"><span>{{ dirty ? '有未保存的修改' : '设置已与服务器同步' }}</span><div><el-button :disabled="!dirty || saving" @click="form = clone(saved)">撤销修改</el-button><el-button type="success" :disabled="!dirty" :loading="saving" @click="save()">保存设置</el-button></div></footer>
    </template>
    <el-dialog v-model="preview" title="停用页面预览 · 不影响实际开放状态" width="min(760px, 94vw)" append-to-body>
      <SiteClosed v-if="form" stopped class="control-preview" :title="form.notice.title" :content="form.notice.content" />
      <template #footer><el-button @click="preview = false">关闭预览</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.control-preview { min-height: 0; padding: 12px 0; }
.site-control, .site-control :deep(*) { box-sizing: border-box; }
.control-grid > * { min-width: 0; }
.site-control { --el-color-primary: #5a8f73; color: #1a1a1a; max-width: 1160px; margin: 0 auto; }
.control-header,.control-status,.module-row,.control-footer { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.control-header { margin: 10px 0 24px; }.eyebrow { font-size: 12px; color: #5a8f73; letter-spacing: .1em; }
.site-control h1 { font-size: 26px; font-weight: 650; margin: 6px 0; }.site-control h2 { font-size: 18px; font-weight: 650; margin: 0 0 8px; }.site-control h3 { font-size: 14px; font-weight: 600; margin: 0; }
.site-control p { color: #64748b; font-size: 13px; line-height: 1.7; margin: 4px 0 12px; }
.control-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
.control-status { border-left: 4px solid #5a8f73; }.control-status p { margin-bottom: 0; }
.control-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px; }.module-row { padding: 17px 0; border-top: 1px solid #e5e7eb; }.module-row p { margin: 3px 0 0; }.module-row :deep(.el-switch) { flex-shrink: 0; }
.control-footer { padding: 16px 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; font-size: 13px; color: #64748b; }
@media(max-width:850px) { .control-grid { grid-template-columns: 1fr; gap: 0; }.control-status,.control-footer { align-items: flex-start; flex-direction: column; }.control-card { padding: 18px; }.control-header { gap: 10px; }.site-control h1 { font-size: 23px; } }
</style>
