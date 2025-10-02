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
  
  // 构建优化配置（减少内存使用）
  build: {
    // 关闭source map以减少内存和构建时间
    sourcemap: false,
    
    // 调整chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    
    // 减少内联资源大小阈值（小于4kb的资源会被内联）
    assetsInlineLimit: 4096,
    
    // 使用esbuild压缩，比terser更快，内存占用更少
    minify: 'esbuild',
    
    // Rollup配置
    rollupOptions: {
      output: {
        // 手动分割代码块，避免单个chunk过大
        manualChunks: {
          // Vue核心库
          'vue-vendor': ['vue', 'vue-router'],
          // Element Plus UI库
          'element-plus': ['element-plus'],
          // Markdown编辑器
          'markdown-editor': ['md-editor-v3'],
          // ECharts图表库
          'echarts': ['echarts'],
          // 其他工具库
          'utils': ['axios', 'chroma-js']
        },
        // 自定义chunk文件名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      },
      // 忽略某些警告
      onwarn(warning, warn) {
        // 忽略"Module level directives cause errors"警告
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      }
    },
    
    // 关闭brotli压缩，减少构建时内存占用
    reportCompressedSize: false,
    
    // 设置较大的chunk分割阈值
    cssCodeSplit: true,
    
    // 清空输出目录
    emptyOutDir: true
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'element-plus',
      'axios',
      'echarts',
      'md-editor-v3'
    ],
    exclude: []
  },
  
  // ESBuild配置
  esbuild: {
    // 在生产构建时移除console和debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // 减少日志输出
    logLevel: 'error'
  }
})