import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import Toast from 'vue-toastification' // 引入库
import 'vue-toastification/dist/index.css' // 引入样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/gallery-shared.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 全局配置 Toast
app.use(Toast, {
    transition: "Vue-Toastification__bounce",
    maxToasts: 2,
    newestOnTop: true,
    position: "top-center",
    timeout: 2200, // 轻提示保持短暂，避免遮挡页面操作
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: true,
    closeButton: "button",
    icon: true,
    rtl: false
})

app.mount('#app')