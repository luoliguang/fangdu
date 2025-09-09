// API服务层 - 统一管理所有API调用
import apiClient from '../axiosConfig.js';

/**
 * 认证相关API
 */
export const authAPI = {
  // 验证登录令牌
  validateToken: (token) => {
    return apiClient.post('/api/auth/validate', { token });
  }
};

/**
 * 素材相关API
 */
export const materialAPI = {
  // 获取素材列表
  getMaterials: (params = {}) => {
    const { search = '', tag = '', page = 1, limit = 20 } = params;
    return apiClient.get('/api/v1/materials', {
      params: { search, tag, page, limit }
    });
  },

  // 上传素材
  uploadMaterial: (formData, onUploadProgress) => {
    return apiClient.post('/api/v1/materials', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  },

  // 更新素材
  updateMaterial: (id, data, token) => {
    return apiClient.put(`/api/v1/materials/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // 删除素材
  deleteMaterial: (id, token) => {
    return apiClient.delete(`/api/v1/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

/**
 * 标签相关API
 */
export const tagAPI = {
  // 获取所有标签
  getTags: () => {
    return apiClient.get('/api/tags');
  }
};

/**
 * 留言/反馈相关API
 */
export const feedbackAPI = {
  // 提交留言
  submitFeedback: (message, userId) => {
    return apiClient.post('/api/v1/feedbacks', { 
      message, 
      user_id: userId 
    });
  },

  // 获取所有留言 (管理员)
  getAllFeedbacks: (token) => {
    return apiClient.get('/api/v1/feedbacks', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // 获取用户留言
  getUserFeedbacks: (userId) => {
    return apiClient.get(`/api/v1/feedbacks/user/${userId}`);
  },

  // 获取未处理留言数量
  getPendingFeedbacksCount: (token) => {
    return apiClient.get('/api/v1/feedbacks/pending/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // 更新留言状态
  updateFeedbackStatus: (id, status, token) => {
    return apiClient.put(`/api/v1/feedbacks/${id}`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // 删除留言
  deleteFeedback: (id, token) => {
    return apiClient.delete(`/api/v1/feedbacks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

/**
 * 统计相关API
 */
export const statsAPI = {
  // 获取在线人数
  getOnlineCount: () => {
    return apiClient.get('/api/v1/visits/online');
  },

  // 获取页面访问统计
  getPageStats: () => {
    return apiClient.get('/api/v1/visits/pages');
  },

  // 获取访问趋势
  getVisitTrends: (params = {}) => {
    return apiClient.get('/api/v1/visits/trends', {
      params
    });
  }
};

/**
 * 工具函数
 */
export const apiUtils = {
  // 获取认证令牌
  getAuthToken: () => {
    return localStorage.getItem('authToken');
  },

  // 设置认证令牌
  setAuthToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  // 清除认证令牌
  clearAuthToken: () => {
    localStorage.removeItem('authToken');
  },

  // 检查是否已认证
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  }
};

// 默认导出所有API
export default {
  auth: authAPI,
  material: materialAPI,
  tag: tagAPI,
  feedback: feedbackAPI,
  stats: statsAPI,
  utils: apiUtils
};