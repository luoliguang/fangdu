<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import FloatingLabelInput from '../components/FloatingLabelInput.vue'; // 引入 FloatingLabelInput 组件

const usernameInput = ref('');
const passwordInput = ref('');
const error = ref('');
const router = useRouter();
const userStore = useUserStore();

// 从store获取加载状态
const { isLoading } = userStore;

// 登录处理函数
const handleLogin = async () => {
  if (!usernameInput.value) {
    error.value = '请输入用户名！';
    return;
  }
  
  if (!passwordInput.value) {
    error.value = '请输入密码！';
    return;
  }

  error.value = '';

  try {
    const credentials = {
      username: usernameInput.value,
      password: passwordInput.value
    };
    
    const result = await userStore.login(credentials);
    
    if (result.success) {
      router.push('/admin'); // 跳转到后台
    } else {
      error.value = result.message || '用户名或密码错误';
    }
  } catch (err) {
    error.value = '用户名或密码错误';
  }
};
</script>
<template>
  <div class="login-container">
  <h2>请止步，非管理员勿入</h2>
  <form @submit.prevent="handleLogin">
    <FloatingLabelInput
      v-model="usernameInput"
      label="请输入用户名"
      type="text"
      :disabled="isLoading"
      :hasError="!!error"
    />
    <FloatingLabelInput
      v-model="passwordInput"
      label="请输入密码"
      type="password"
      :disabled="isLoading"
      :hasError="!!error"
    />
    <button type="submit" :disabled="isLoading" class="login-button">
      {{ isLoading ? '验证中...' : '进入' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</div>
</template>
<style scoped>
.login-container { max-width: 400px; margin: 5rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
/* 移除原来的input样式，因为现在使用组件内部的样式 */
/* input { width: 90%; padding: 0.8rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; } */
.login-button { width: 95%; padding: 0.8rem; background-color: #42b983; color: white; border: none; cursor: pointer; border-radius: 4px; }
.login-button:hover:not(:disabled) { background-color: #36a374; }
.login-button:disabled { opacity: 0.7; cursor: not-allowed; }
.error { color: red; margin-top: 1rem; }
</style>