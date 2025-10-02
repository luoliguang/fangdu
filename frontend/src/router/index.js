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

// 全局路由守卫 - 自动记录页面访问
router.afterEach(async (to, from) => {
    try {
        // 获取完整路径
        const page = to.path;
        
        // 发送访问记录到后端
        // 使用动态导入避免循环依赖
        const { default: apiClient } = await import('../axiosConfig.js');
        
        // 异步发送，不阻塞路由跳转
        apiClient.post('/api/v1/visits/record', {
            page,
            referrer: from.path || document.referrer
        }).catch(error => {
            // 访问记录失败不影响页面使用
            console.log('访问记录失败:', error.message);
        });
    } catch (error) {
        console.log('访问追踪错误:', error);
    }
});

export default router;