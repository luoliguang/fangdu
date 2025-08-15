import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: `/api`, // 统一设置基础URL
});

// 请求拦截器
// 它的作用就是在每次请求发送前，都检查一下本地有没有令牌，有的话就带上
apiClient.interceptors.request.use(
    (config) => {
        // 1. 从 localStorage 获取令牌
        const token = localStorage.getItem('accessToken');

        // 2. 如果令牌存在
        if (token) {
            // 3. 将令牌放入请求头，格式必须是 'Bearer ' + token
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;