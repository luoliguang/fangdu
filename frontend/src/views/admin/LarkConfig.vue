<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../../composables/useApi.js';

const api = useApi();
const status = ref(null);       // 服务器返回的脱敏状态
const loadError = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);   // { ok, message }

const form = ref({ enabled: false, webhookUrl: '', secret: '', clearSecret: false });

const urlTouched = computed(() => form.value.webhookUrl.trim() !== '');
const dirty = computed(() => {
  if (!status.value) return false;
  return form.value.enabled !== status.value.enabled || urlTouched.value
    || form.value.secret.trim() !== '' || form.value.clearSecret;
});
const urlPlaceholder = computed(() => status.value?.configured
  ? `已配置：${status.value.webhookUrlMasked}（留空则保持不变）`
  : 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx');
const secretPlaceholder = computed(() => status.value?.hasSecret ? '已设置（留空则保持不变）' : '可选：机器人开启「签名校验」时填写');
const canTest = computed(() => urlTouched.value || status.value?.configured);

function applyStatus(data) {
  status.value = data;
  form.value = { enabled: data.enabled, webhookUrl: '', secret: '', clearSecret: false };
}

async function load() {
  loadError.value = false;
  const result = await api.get('/api/v1/lark-config');
  if (result.success) applyStatus(result.data.data);
  else loadError.value = true;
}

function payload() {
  const { enabled, webhookUrl, secret, clearSecret } = form.value;
  return { enabled, webhookUrl: webhookUrl.trim(), secret: secret.trim(), clearSecret };
}

async function save() {
  saving.value = true;
  try {
    const result = await api.put('/api/v1/lark-config', payload());
    if (result.success) {
      applyStatus(result.data.data);
      ElMessage.success('飞书配置已保存');
    }
  } finally { saving.value = false; }
}

async function sendTest() {
  testing.value = true;
  testResult.value = null;
  try {
    // 测试用当前草稿，不必先保存；留空的字段沿用已保存的值
    const result = await api.post('/api/v1/lark-config/test', payload(), {}, { showError: false });
    testResult.value = result.success
      ? { ok: true, message: result.data.message || '测试消息已发送，请到飞书群查看' }
      : { ok: false, message: result.message || '测试失败' };
  } finally { testing.value = false; }
}

function revert() {
  applyStatus(status.value);
  testResult.value = null;
}

onMounted(load);
</script>

<template>
  <div class="lark-config" v-loading="api.isLoading.value && !status">
    <header class="lc-header">
      <div>
        <span class="eyebrow">反馈机器人</span>
        <h1>飞书通知</h1>
        <p>前台「小度」收到用户留言后，会通过飞书自定义机器人推送到你的群里。</p>
      </div>
      <el-tag v-if="status" :type="status.enabled && status.configured ? 'success' : 'info'">
        {{ status.enabled && status.configured ? '推送已开启' : '推送未开启' }}
      </el-tag>
    </header>

    <el-alert v-if="loadError" title="配置加载失败，请重试后再编辑" type="error" :closable="false">
      <el-button @click="load">重新加载</el-button>
    </el-alert>

    <template v-if="status">
      <section class="lc-card">
        <el-form label-position="top" @submit.prevent>
          <el-form-item label="启用飞书推送">
            <el-switch v-model="form.enabled" aria-label="启用飞书推送" />
          </el-form-item>
          <el-form-item label="Webhook 地址">
            <el-input v-model="form.webhookUrl" :placeholder="urlPlaceholder" autocomplete="off" clearable />
            <div class="lc-hint">在飞书群 → 设置 → 群机器人 → 添加「自定义机器人」后复制。地址已保存后不会再明文显示。</div>
          </el-form-item>
          <el-form-item label="签名密钥（可选）">
            <el-input v-model="form.secret" type="password" show-password :placeholder="secretPlaceholder" autocomplete="new-password" />
            <el-checkbox v-if="status.hasSecret" v-model="form.clearSecret" class="lc-clear">清除已保存的签名密钥</el-checkbox>
          </el-form-item>
        </el-form>

        <div class="lc-test">
          <el-button :loading="testing" :disabled="!canTest" @click="sendTest">发送测试消息</el-button>
          <span class="lc-hint">测试使用上方填写的内容，无需先保存。</span>
        </div>
        <el-alert v-if="testResult" class="lc-result" :type="testResult.ok ? 'success' : 'error'" :title="testResult.ok ? '测试成功' : '测试失败'" :description="testResult.message" show-icon :closable="false" />
      </section>

      <section class="lc-card lc-tips">
        <h2>安全与防刷说明</h2>
        <ul>
          <li>只接受飞书官方域名（open.feishu.cn / open.larksuite.com）的机器人地址。</li>
          <li>完整地址与密钥只保存在服务器，页面只显示脱敏内容。</li>
          <li>前台留言有多层限流与重复内容拦截；推送另有节流，10 分钟内最多推 20 条，超出的会在下一条消息里汇总提示。</li>
          <li>飞书推送失败不会影响用户提交，留言依然会进入「留言管理」。</li>
        </ul>
      </section>

      <footer class="lc-footer">
        <span>{{ dirty ? '有未保存的修改' : '设置已与服务器同步' }}</span>
        <div>
          <el-button :disabled="!dirty || saving" @click="revert">撤销修改</el-button>
          <el-button type="success" :disabled="!dirty" :loading="saving" @click="save">保存设置</el-button>
        </div>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.lark-config, .lark-config :deep(*) { box-sizing: border-box; }
.lark-config { --el-color-primary: #5a8f73; color: #1a1a1a; max-width: 820px; margin: 0 auto; }
.lc-header, .lc-footer, .lc-test { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.lc-header { margin: 10px 0 24px; }
.eyebrow { font-size: 12px; color: #5a8f73; letter-spacing: .1em; }
.lark-config h1 { font-size: 26px; font-weight: 650; margin: 6px 0; }
.lark-config h2 { font-size: 16px; font-weight: 650; margin: 0 0 8px; }
.lark-config p { color: #64748b; font-size: 13px; line-height: 1.7; margin: 4px 0 12px; }
.lc-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
.lc-hint { color: #64748b; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.lc-clear { margin-top: 8px; }
.lc-test { justify-content: flex-start; flex-wrap: wrap; gap: 12px; }
.lc-result { margin-top: 16px; }
.lc-tips ul { margin: 0; padding-left: 18px; color: #64748b; font-size: 13px; line-height: 1.9; }
.lc-footer { padding: 16px 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; font-size: 13px; color: #64748b; }
@media (max-width: 640px) {
  .lc-header, .lc-footer { align-items: flex-start; flex-direction: column; }
  .lc-card { padding: 18px; }
  .lark-config h1 { font-size: 23px; }
}
</style>
