<template>
  <div id="app">
    <nav class="main-nav">
      <router-link to="/">素材库</router-link>
      <router-link to="/admin">后台管理</router-link>
    </nav>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<style>
  /* 全局样式 */
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f0f2f5;
    margin: 0;
  }
  .main-nav {
    background-color: #2c3e50;
    padding: 1rem 2rem;
    display: flex;
    gap: 1.5rem;
  }
  .main-nav a {
    color: #fff;
    text-decoration: none;
    font-weight: bold;
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: 4px;
  }
  /* 为当前激活的路由链接设置特殊样式 */
  .main-nav a.router-link-exact-active {
    background-color: #42b983;
  }
</style>