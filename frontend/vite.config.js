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
  
  // 开发服务器配置
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    }
  },
  
  // 构建配置
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ECharts 只在统计页用，单独拆出
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          // PDF 导出库只在色卡页用，单独拆出
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-export'
          // Markdown 编辑器 + highlight.js 语言包，只在管理后台用
          if (id.includes('md-editor-v3') || id.includes('highlight.js') || id.includes('@vavt')) return 'md-editor'
          // OGL WebGL 背景库
          if (id.includes('/ogl/')) return 'ogl'
          // Element Plus UI 库
          if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
          // 其余 node_modules 合并为一个 vendor chunk
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios'
    ]
  }
})