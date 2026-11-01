<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import FloatingLabelInput from '../components/FloatingLabelInput.vue';

const usernameInput = ref('');
const passwordInput = ref('');
const error = ref('');
const router = useRouter();
const userStore = useUserStore();
const { isLoading } = storeToRefs(userStore);

const handleLogin = async () => {
  if (isLoading.value) return;
  if (!usernameInput.value) {
    error.value = '请输入用户名';
    return;
  }
  if (!passwordInput.value) {
    error.value = '请输入密码';
    return;
  }

  error.value = '';

  try {
    const result = await userStore.login({
      username: usernameInput.value,
      password: passwordInput.value
    });

    if (result.success) {
      router.push('/admin');
    } else {
      error.value = result.message || '用户名或密码错误';
    }
  } catch {
    error.value = '用户名或密码错误';
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-card">
    <!-- 左侧品牌区 -->
    <aside class="brand-panel">
      <div class="brand-glow brand-glow--top"></div>
      <div class="brand-glow brand-glow--bottom"></div>
      <div class="brand-dots"></div>

      <div class="brand-content">
        <div class="brand-logo">
          <span class="brand-logo-text">方度</span>
        </div>
        <h2 class="brand-title">素材管理平台</h2>
        <p class="brand-desc">管理实拍素材、维护站点内容，<br>在这里继续你的工作。</p>

        <div class="brand-tags">
          <span class="brand-tag">实拍图管理</span>
          <span class="brand-tag">面料归档</span>
          <span class="brand-tag">设计素材</span>
        </div>
      </div>

      <div class="brand-footer">
        <span>material.fangdutex.cn</span>
      </div>
    </aside>

    <!-- 右侧表单区 -->
    <section class="form-panel" aria-label="管理员登录">
      <div class="form-wrap">
        <router-link class="login-back" to="/">← 返回网站</router-link>
        <div class="form-eyebrow">管理员入口</div>
        <h1 class="form-title">欢迎回来</h1>
        <p class="form-subtitle">请验证身份后进入管理后台</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-block">
            <FloatingLabelInput
              v-model="usernameInput"
              label="用户名"
              type="text"
              autocomplete="username"
              :disabled="isLoading"
              :hasError="!!error"
            />
          </div>
          <div class="input-block">
            <FloatingLabelInput
              v-model="passwordInput"
              label="密码"
              type="password"
              autocomplete="current-password"
              :disabled="isLoading"
              :hasError="!!error"
            />
          </div>

          <transition name="error-fade">
            <div v-if="error" class="error-bar" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" class="error-icon">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              {{ error }}
            </div>
          </transition>

          <button type="submit" :disabled="isLoading" class="login-button">
            <span v-if="isLoading" class="btn-spinner"></span>
            {{ isLoading ? '验证中...' : '进入后台' }}
          </button>
        </form>
      </div>
      <p class="form-footnote">方度 · 管理员工作台</p>
    </section>
    </div>
  </div>
</template>

<style scoped>
/* ── 整页布局 ── */
.login-page {
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: 40px 24px;
  font-family: inherit;
  background: #f0f2f5;
}
.login-page, .login-page :deep(*) { box-sizing: border-box; }
.login-card { width: 100%; max-width: 1000px; min-height: 560px; display: grid; grid-template-columns: .95fr 1.05fr; border: 1px solid #e5e7eb; border-radius: 22px; overflow: hidden; box-shadow: 0 20px 60px rgba(10,61,34,.08); }
.login-back { display: block; width: fit-content; margin-bottom: 24px; color: #64748b; font-size: 13px; text-decoration: none; transition: color .2s; }
.login-back:hover { color: #0a3d22; }
.login-back:focus-visible, .login-button:focus-visible { outline: 2px solid #5a8f73; outline-offset: 4px; }
.form-footnote { margin: 28px 0 0; font-size: 12px; color: #8a8f8c; }
.input-block :deep(.input-group) { margin-bottom: 0; }
.input-block :deep(input) { min-height: 52px; border-color: #dbe2dd; border-radius: 10px; }
.input-block :deep(input:focus) { border-color: #5a8f73; box-shadow: 0 0 0 3px rgba(90,143,115,.12); }
.input-block :deep(input:focus ~ label), .input-block :deep(input:not(:placeholder-shown) ~ label) { color: #5a8f73; }
.input-block :deep(input.has-error) { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,.1); }
.input-block :deep(input.has-error ~ label) { color: #c0392b; }

/* ── 左侧品牌区 ── */
.brand-panel {
  position: relative;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px;
  background: linear-gradient(145deg, #061e10 0%, #0a3d22 50%, #2d6644 100%);
}

/* 光晕 */
.brand-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.brand-glow--top {
  top: -100px;
  right: -80px;
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, rgba(158, 212, 181, 0.28), transparent 70%);
}

.brand-glow--bottom {
  bottom: -120px;
  left: -80px;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(90, 143, 115, 0.3), transparent 70%);
}

/* 点阵纹理 */
.brand-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

/* 品牌内容 */
.brand-content {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-bottom: auto;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  margin-bottom: 24px;
}

.brand-logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 14px;
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.8;
  margin: 0 0 28px;
}

.brand-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.brand-tag {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.07);
  padding: 5px 14px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

/* 底部域名 */
.brand-footer {
  position: relative;
  z-index: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 1px;
}

/* ── 右侧表单区 ── */
.form-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 36px 48px;
}

.form-wrap {
  width: 100%;
  max-width: 360px;
}

.form-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #5a8f73;
  margin-bottom: 16px;
}

.form-eyebrow::before {
  content: '';
  width: 16px;
  height: 2px;
  background: #5a8f73;
  border-radius: 1px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #0a3d22;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.form-subtitle {
  font-size: 14px;
  color: #8a8f8c;
  margin: 0 0 28px;
}

/* 输入块间距 */
.input-block {
  margin-bottom: 22px;
}

/* 错误提示条 */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  color: #c0392b;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 登录按钮 */
.login-button {
  width: 100%;
  padding: 14px;
  margin-top: 8px;
  background: linear-gradient(135deg, #0a3d22, #5a8f73);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(10, 61, 34, 0.3);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* 加载 spinner */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 响应式 ── */
:global(body:not(.theme-light)) .login-page { background: #080f0a; }
:global(body:not(.theme-light)) .login-card { border-color: rgba(255,255,255,.14); }
:global(body:not(.theme-light)) .form-panel { background: #0c1912; }
:global(body:not(.theme-light)) .form-title { color: #f8fafc; }
:global(body:not(.theme-light)) .form-subtitle,
:global(body:not(.theme-light)) .login-back { color: #94a3b8; }
:global(body:not(.theme-light)) .input-block :deep(input) { background: #080f0a; border-color: #2d6644; color: #f8fafc; }
:global(body:not(.theme-light)) .input-block :deep(input:focus ~ label),
:global(body:not(.theme-light)) .input-block :deep(input:not(:placeholder-shown) ~ label) { background: #080f0a; }
@media (max-width: 768px) {
  .login-page {
    padding: 24px 18px;
  }
  .login-card { grid-template-columns: 1fr; min-height: 0; max-width: 460px; border-radius: 18px; }

  .brand-panel {
    width: 100%;
    padding: 26px 28px;
    min-height: 0;
  }

  .brand-content {
    margin: 0;
  }

  .brand-logo {
    width: 42px;
    height: 42px;
    margin-bottom: 14px;
  }

  .brand-logo-text {
    font-size: 18px;
  }

  .brand-title {
    font-size: 22px;
    margin-bottom: 10px;
  }

  .brand-desc {
    font-size: 14px;
    margin-bottom: 0;
  }
  .brand-tags { display: none; }

  .brand-footer {
    display: none;
  }

  .form-panel {
    padding: 26px 28px;
    align-items: center;
  }
  .login-back { margin-bottom: 24px; }
  .form-title { font-size: 25px; }
  .form-footnote { margin-top: 22px; }
}
</style>
