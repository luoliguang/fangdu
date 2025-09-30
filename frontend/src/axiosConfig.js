import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002',
});

// 请求拦截器
// 它的作用就是在每次请求发送前，都检查一下本地有没有令牌，有的话就带上
apiClient.interceptors.request.use(
    (config) => {
        // 规范化 URL，避免当 baseURL 以 /api 结尾且 url 也以 /api/ 开头时出现 /api/api/... 的重复前缀
        const base = apiClient.defaults.baseURL;
        if (typeof base === 'string' && typeof config.url === 'string') {
            const baseNormalized = String(base).replace(/\/+$/, '');
            const isBaseApi = /\/api$/i.test(baseNormalized);
            if (isBaseApi && /^\/api(\/|$)/i.test(config.url)) {
                // 去掉请求 URL 的第一个 /api，使最终路径为 /api/v1/... 而不是 /api/api/v1/...
                config.url = config.url.replace(/^\/api(\/|$)/i, '/');
            }
        }

        // 1. 从 localStorage 获取令牌
        const token = localStorage.getItem('authToken');

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