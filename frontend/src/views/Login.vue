<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../axiosConfig.js'; // 1. 引入我们的axios实例

const tokenInput = ref('');
const error = ref('');
const isLoading = ref(false); // 2. 增加一个加载状态，防止重复点击
const router = useRouter();

// 3. 将函数改造为 async 异步函数
const handleLogin = async () => {
  if (!tokenInput.value) {
    error.value = '请输入访问令牌！';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    // 4. 调用后端的 /auth/validate 接口
    await apiClient.post('/auth/validate', { token: tokenInput.value });
    
    // 5. 如果上面的请求成功 (没有抛出错误)，说明令牌正确
    localStorage.setItem('accessToken', tokenInput.value);
    router.push('/admin'); // 跳转到后台

  } catch (err) {
    // 6. 如果请求失败 (比如后端返回401)，说明令牌错误
    error.value = '密码错了，去素材库看就可以啦。';
    // 清除可能存在的错误令牌
    localStorage.removeItem('accessToken'); 
  } finally {
    isLoading.value = false; // 7. 无论成功失败，都结束加载状态
  }
};
</script>
<template>
  <div class="login-container">
  <h2>请止步，非管理员勿入</h2>
  <form @submit.prevent="handleLogin">
    <input 
      type="password" 
      v-model="tokenInput" 
      placeholder="请输入密码，访客不要到这里来哦"
      :disabled="isLoading"
    >
    <button type="submit" :disabled="isLoading">
      {{ isLoading ? '验证中...' : '进入' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</div>
</template>
<style scoped>
.login-container { max-width: 400px; margin: 5rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
input { width: 90%; padding: 0.8rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; }
button { width: 95%; padding: 0.8rem; background-color: #42b983; color: white; border: none; cursor: pointer; border-radius: 4px; }
.error { color: red; margin-top: 1rem; }
</style>