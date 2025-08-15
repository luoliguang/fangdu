import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: `/api`, // 统一设置基础URL
});

// 请求拦截器
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            // 如果存在通行证，就在请求头里带上
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;