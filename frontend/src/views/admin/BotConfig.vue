<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useApi } from '../../composables/useApi.js';

const api = useApi();
const status = ref(null);       // 服务器返回的脱敏状态（不含 API Key）
const loadError = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);   // { ok, message }

const models = [
  { value: 'deepseek-chat', label: 'deepseek-chat（通用对话，推荐）' },
  { value: 'deepseek-reasoner', label: 'deepseek-reasoner（推理模型，较慢）' }
];

const form = ref({
  enabled: false, apiKey: '', clearApiKey: false, model: 'deepseek-chat',
  temperature: 0.7, maxTokens: 800, systemPrompt: '', quotePolicy: '', welcomeMessage: ''
});

const keyTouched = computed(() => form.value.apiKey.trim() !== '');
const dirty = computed(() => {
  if (!status.value) return false;
  const f = form.value;
  const s = status.value;
  return f.enabled !== s.enabled || keyTouched.value || f.clearApiKey
    || f.model !== s.model || f.temperature !== s.temperature || f.maxTokens !== s.maxTokens
    || f.systemPrompt !== s.systemPrompt || f.quotePolicy !== s.quotePolicy
    || f.welcomeMessage !== s.welcomeMessage;
});
const keyPlaceholder = computed(() => status.value?.hasApiKey ? '已配置：••••（留空则保持不变）' : 'sk-...');
const canTest = computed(() => keyTouched.value || (status.value?.hasApiKey && !form.value.clearApiKey));

function applyStatus(data) {
  status.value = data;
  form.value = {
    enabled: data.enabled, apiKey: '', clearApiKey: false, model: data.model,
    temperature: data.temperature, maxTokens: data.maxTokens, systemPrompt: data.systemPrompt,
    quotePolicy: data.quotePolicy, welcomeMessage: data.welcomeMessage
  };
}

async function load() {
  loadError.value = false;
  const result = await api.get('/api/v1/bot-config');
  if (result.success) applyStatus(result.data.data);
  else loadError.value = true;
}

function payload() {
  const f = form.value;
  return {
    enabled: f.enabled, apiKey: f.apiKey.trim(), clearApiKey: f.clearApiKey, model: f.model,
    temperature: f.temperature, maxTokens: f.maxTokens, systemPrompt: f.systemPrompt.trim(),
    quotePolicy: f.quotePolicy.trim(), welcomeMessage: f.welcomeMessage.trim()
  };
}

async function save() {
  saving.value = true;
  try {
    const result = await api.put('/api/v1/bot-config', payload());
    if (result.success) {
      applyStatus(result.data.data);
      ElMessage.success('机器人配置已保存');
    }
  } finally { saving.value = false; }
}

async function sendTest() {
  testing.value = true;
  testResult.value = null;
  try {
    // 测试用当前草稿，不必先保存；API Key 留空时沿用已保存的值
    const result = await api.post('/api/v1/bot-config/test', payload(), {}, { showError: false });
    testResult.value = result.success
      ? { ok: true, message: result.data?.data?.reply || '（模型返回了空内容）' }
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
  <div class="bot-config" v-loading="api.isLoading.value && !status">
    <header class="bc-header">
      <div>
        <span class="eyebrow">反馈机器人</span>
        <h1>机器人配置</h1>
        <p>小度帮助客户搜索实拍图、拆分关键词；找不到的需求可直接提交给掌柜的，回复在网站查看。关闭 AI 也不影响需求提交。</p>
      </div>
      <el-tag v-if="status" :type="status.enabled && status.configured ? 'success' : 'info'">
        {{ status.enabled && status.configured ? 'AI 助手已开启' : 'AI 助手未开启' }}
      </el-tag>
    </header>

    <el-alert v-if="loadError" title="配置加载失败，请重试后再编辑" type="error" :closable="false">
      <el-button @click="load">重新加载</el-button>
    </el-alert>

    <template v-if="status">
      <section class="bc-card">
        <el-form label-position="top" @submit.prevent>
          <el-form-item label="启用 AI 助手">
            <el-switch v-model="form.enabled" aria-label="启用 AI 助手" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="form.apiKey" type="password" show-password :placeholder="keyPlaceholder" autocomplete="new-password" />
            <el-checkbox v-if="status.hasApiKey" v-model="form.clearApiKey" class="bc-clear">清除已保存的 API Key</el-checkbox>
            <div class="bc-hint">在 DeepSeek 开放平台创建。保存后不会再明文显示。</div>
          </el-form-item>
          <el-form-item label="模型">
            <el-select v-model="form.model" style="width: 100%">
              <el-option v-for="m in models" :key="m.value" :label="m.label" :value="m.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="温度">
            <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input :show-input-controls="false" />
            <div class="bc-hint">数值越低回答越稳定，越高越发散。客服场景建议 0.3–0.7。</div>
          </el-form-item>
          <el-form-item label="最大回复长度">
            <el-input-number v-model="form.maxTokens" :min="1" :max="4096" />
          </el-form-item>
          <el-form-item label="系统提示词">
            <el-input v-model="form.systemPrompt" type="textarea" :rows="5" maxlength="2000" show-word-limit />
          </el-form-item>
          <el-form-item label="报价政策">
            <el-input v-model="form.quotePolicy" type="textarea" :rows="4" maxlength="1000" show-word-limit />
            <div class="bc-hint">用户问到价格/报价时机器人会强制按此说明回复，不报价，引导微信或其他渠道。</div>
          </el-form-item>
          <el-form-item label="欢迎语">
            <el-input v-model="form.welcomeMessage" type="textarea" :rows="2" maxlength="300" show-word-limit />
          </el-form-item>
        </el-form>

        <div class="bc-test">
          <el-button :loading="testing" :disabled="!canTest" @click="sendTest">测试对话</el-button>
          <span class="bc-hint">测试使用上方填写的内容，无需先保存。</span>
        </div>
        <el-alert v-if="testResult" class="bc-result" :type="testResult.ok ? 'success' : 'error'" :title="testResult.ok ? '测试成功，模型回复：' : '测试失败'" :description="testResult.message" show-icon :closable="false" />
      </section>

      <section class="bc-card bc-tips">
        <h2>安全与防刷说明</h2>
        <ul>
          <li>API Key 仅保存在服务器，页面只显示脱敏状态，不会回传给前台。</li>
          <li>聊天接口有防刷限流，并限制消息与历史长度，超限请求会被拒绝。</li>
          <li>报价政策会强制注入系统提示词，约束机器人不报价、不猜测价格。</li>
          <li>AI 不可用时普通搜索只显示基础指引；客户明确提交的找图需求仍会进留言管理并按飞书配置通知。</li>
        </ul>
      </section>

      <footer class="bc-footer">
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
.bot-config, .bot-config :deep(*) { box-sizing: border-box; }
.bot-config { --el-color-primary: #5a8f73; color: #1a1a1a; max-width: 820px; margin: 0 auto; }
.bc-header, .bc-footer, .bc-test { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.bc-header { margin: 10px 0 24px; }
.eyebrow { font-size: 12px; color: #5a8f73; letter-spacing: .1em; }
.bot-config h1 { font-size: 26px; font-weight: 650; margin: 6px 0; }
.bot-config h2 { font-size: 16px; font-weight: 650; margin: 0 0 8px; }
.bot-config p { color: #64748b; font-size: 13px; line-height: 1.7; margin: 4px 0 12px; }
.bc-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
.bc-hint { color: #64748b; font-size: 12px; line-height: 1.6; margin-top: 6px; }
.bc-clear { margin-top: 8px; }
.bc-test { justify-content: flex-start; flex-wrap: wrap; gap: 12px; }
.bc-result { margin-top: 16px; }
.bc-tips ul { margin: 0; padding-left: 18px; color: #64748b; font-size: 13px; line-height: 1.9; }
.bc-footer { padding: 16px 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; font-size: 13px; color: #64748b; }
@media (max-width: 640px) {
  .bc-header, .bc-footer { align-items: flex-start; flex-direction: column; }
  .bc-card { padding: 18px; }
  .bot-config h1 { font-size: 23px; }
}
</style>
