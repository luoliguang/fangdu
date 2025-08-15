<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const tokenInput = ref('');
const error = ref('');
const router = useRouter();

const handleLogin = () => {
  if (!tokenInput.value) {
    error.value = '请输入访问令牌！';
    return;
  }
  // 将令牌（通行证）存入浏览器的 localStorage
  localStorage.setItem('accessToken', tokenInput.value);
  // 登录成功后，跳转到后台管理页面
  router.push('/admin');
};
</script>
<template>
  <div class="login-container">
    <h2>请止步，非管理员勿入</h2>
    <form @submit.prevent="handleLogin">
      <input type="password" v-model="tokenInput" placeholder="请输入访问令牌">
      <button type="submit">进入</button>
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