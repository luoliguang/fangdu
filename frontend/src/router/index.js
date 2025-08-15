import { createRouter, createWebHistory } from 'vue-router';
import Gallery from '../views/Gallery.vue';
import Admin from '../views/Admin.vue';
import Login from '../views/Login.vue'; // 引入登录页

const routes = [
    { path: '/', name: 'Gallery', component: Gallery },
    { path: '/login', name: 'Login', component: Login }, // 添加登录路由
    {
        path: '/admin',
        name: 'Admin',
        component: Admin,
        // 新增：路由守卫
        beforeEnter: (to, from, next) => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                next(); // 有通行证，放行
            } else {
                next('/login'); // 没有通行证，请去登录
            }
        }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;