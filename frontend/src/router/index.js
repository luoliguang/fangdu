import { createRouter, createWebHistory } from 'vue-router';
import Gallery from '../views/Gallery.vue';
import Admin from '../views/Admin.vue';
import Login from '../views/Login.vue'; // 引入登录页
import UploadMaterial from '../views/UploadMaterial.vue';
import MaterialManagement from '../views/MaterialManagement.vue';
import FeedbackManagement from '../views/FeedbackManagement.vue';
import Statistics from '../views/Statistics.vue';
import DrawerConfig from '../views/admin/DrawerConfig.vue';
import ColorCard from '../views/ColorCard.vue'; // 引入打色卡组件
import SizeConverter from '../views/SizeConverter.vue'; // 引入尺码工具组件

const routes = [
    { path: '/', name: 'Gallery', component: Gallery },
    { path: '/login', name: 'Login', component: Login }, // 添加登录路由
    { path: '/color-card', name: 'ColorCard', component: ColorCard }, // 添加打色卡路由
    { path: '/size-converter', name: 'SizeConverter', component: SizeConverter }, // 添加尺码工具路由
    {
        path: '/admin',
        name: 'Admin',
        component: Admin,
        // 新增：路由守卫
        beforeEnter: (to, from, next) => {
            const token = localStorage.getItem('authToken'); // 修改为authToken以保持一致性
            if (token) {
                next(); // 有通行证，放行
            } else {
                next('/login'); // 没有通行证，请去登录
            }
        },
        children: [
            { 
                path: '', 
                name: 'AdminDefault',
                redirect: { name: 'UploadMaterial' } 
            },
            { 
                path: 'upload', 
                name: 'UploadMaterial', 
                component: UploadMaterial 
            },
            { 
                path: 'materials', 
                name: 'MaterialManagement', 
                component: MaterialManagement 
            },
            { 
                path: 'feedback', 
                name: 'FeedbackManagement', 
                component: FeedbackManagement 
            },
            { 
                path: 'statistics', 
                name: 'Statistics', 
                component: Statistics 
            },
            { 
                path: 'drawer-config', 
                name: 'DrawerConfig', 
                component: DrawerConfig 
            }
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// 生成或获取会话ID
function getSessionId() {
    let sessionId = localStorage.getItem('visitor_session_id');
    if (!sessionId) {
        // 生成唯一的会话ID
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('visitor_session_id', sessionId);
    }
    return sessionId;
}

// 心跳定时器
let heartbeatTimer = null;

// 发送心跳
async function sendHeartbeat() {
    try {
        const sessionId = getSessionId();
        const { default: apiClient } = await import('../axiosConfig.js');
        
        apiClient.post('/api/v1/visits/heartbeat', {
            sessionId
        }).catch(() => {
            // 静默处理心跳错误
        });
    } catch (error) {
        // 静默处理心跳错误
    }
}

// 启动心跳定时器
function startHeartbeat() {
    // 清除现有定时器
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }
    
    // 立即发送一次心跳
    sendHeartbeat();
    
    // 每30秒发送一次心跳
    heartbeatTimer = setInterval(() => {
        sendHeartbeat();
    }, 30000);
}

// 停止心跳定时器
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

// 通知后端用户离线
async function notifyOffline() {
    try {
        const sessionId = getSessionId();
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
        const url = `${baseURL}/api/v1/visits/offline`;
        
        // 使用 sendBeacon API 确保请求能在页面关闭时发送
        const data = JSON.stringify({ sessionId });
        const blob = new Blob([data], { type: 'application/json' });
        
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, blob);
        } else {
            // 降级方案：使用 fetch 同步请求
            const { default: apiClient } = await import('../axiosConfig.js');
            apiClient.post('/api/v1/visits/offline', { sessionId }).catch(() => {});
        }
    } catch (error) {
        // 静默处理离线通知错误
    }
}

// 初始化心跳机制（确保在浏览器环境中执行）
function initHeartbeat() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return; // 非浏览器环境，跳过
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopHeartbeat();
        } else {
            startHeartbeat();
        }
    });

    // 监听浏览器关闭/刷新事件
    window.addEventListener('beforeunload', () => {
        stopHeartbeat();
        notifyOffline();
    });

    // 立即启动心跳
    startHeartbeat();
}

// 在路由守卫中初始化心跳（确保在首次路由后执行）
let heartbeatInitialized = false;

// 全局路由守卫 - 自动记录页面访问和初始化心跳
router.afterEach(async (to, from) => {
    try {
        // 首次进入时初始化心跳机制
        if (!heartbeatInitialized) {
            heartbeatInitialized = true;
            initHeartbeat();
        }
        
        // 获取完整路径
        const page = to.path;
        
        // 过滤掉不需要统计的路径
        // 1. 管理员后台路径 (/admin/*)
        // 2. 登录页面 (/login)
        const shouldNotRecord = 
            page.startsWith('/admin') ||  // 所有管理员路径
            page === '/login';             // 登录页面
        
        if (shouldNotRecord) {
            return; // 跳过记录
        }
        
        // 获取会话ID
        const sessionId = getSessionId();
        
        // 发送访问记录到后端
        // 使用动态导入避免循环依赖
        const { default: apiClient } = await import('../axiosConfig.js');
        
        // 异步发送，不阻塞路由跳转
        apiClient.post('/api/v1/visits/record', {
            page,
            sessionId,
            referrer: from.path || document.referrer
        }).catch(() => {
            // 静默处理访问记录错误
        });
    } catch (error) {
        // 静默处理访问追踪错误
    }
});

export default router;