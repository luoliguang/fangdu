import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification' // 引入库
import 'vue-toastification/dist/index.css' // 引入样式

const app = createApp(App)

app.use(router)

// 全局配置 Toast
app.use(Toast, {
    transition: "Vue-Toastification__bounce",
    maxToasts: 3,
    newestOnTop: true,
    position: "top-right",
    timeout: 3000, // 通知默认显示3秒
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
})

app.mount('#app')