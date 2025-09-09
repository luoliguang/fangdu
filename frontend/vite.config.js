import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 新增 server.proxy 配置
  server: {
    proxy: {
      // 字符串简写写法
      // '/api': 'http://localhost:3001',

      // 选项写法，更灵活
      '/api': {
        target: 'http://localhost:3002', // 您本地后端服务的地址
        changeOrigin: true, // 必须设置为 true
        // 如果您的API路径没有 /api 前缀，可以用 rewrite
        // rewrite: (path) => path.replace(/^/api/, '') 
      }
    }
  }
})