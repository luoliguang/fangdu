const express = require('express');
const createMaterialRoutes = require('./materialRoutes');
const createFeedbackRoutes = require('./feedbackRoutes');
const createVisitRoutes = require('./visitRoutes');
const createAuthRoutes = require('./authRoutes');
const drawerConfigRoutes = require('./drawerConfigRoutes');
const createProxyRoutes = require('./proxyRoutes');

/**
 * 主路由配置
 * 整合所有API路由
 */
function createRoutes(db) {
  const router = express.Router();

  // API版本前缀
  const apiV1 = express.Router();

  // 认证相关路由
  apiV1.use('/auth', createAuthRoutes());

  // 素材相关路由
  apiV1.use('/materials', createMaterialRoutes(db));

  // 反馈留言相关路由
  apiV1.use('/feedbacks', createFeedbackRoutes(db));

  // 访问统计相关路由
  apiV1.use('/visits', createVisitRoutes(db));

  // 抽屉配置相关路由
  apiV1.use('/drawer-config', drawerConfigRoutes);

  // 媒体代理路由（用于公司网络/CORS绕行）
  apiV1.use('/proxy', createProxyRoutes());

  // 健康检查路由
  apiV1.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'API服务正常运行',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // 验证令牌有效性
  apiV1.post('/validate-token', (req, res) => {
    const { token } = req.body;
    const secretToken = process.env.SECRET_TOKEN || 'your-secret-token';
    
    if (token === secretToken) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ valid: false, message: '令牌无效' });
    }
  });

  // API信息路由
  apiV1.get('/info', (req, res) => {
    res.json({
      success: true,
      data: {
        name: '房都素材管理系统 API',
        version: '1.0.0',
        description: '提供素材管理、留言反馈和访问统计功能',
        endpoints: {
          materials: {
            description: '素材管理相关接口',
            baseUrl: '/api/v1/materials'
          },
          feedbacks: {
            description: '留言反馈相关接口',
            baseUrl: '/api/v1/feedbacks'
          },
          visits: {
            description: '访问统计相关接口',
            baseUrl: '/api/v1/visits'
          }
        },
        documentation: 'https://github.com/your-repo/api-docs'
      }
    });
  });

  // 挂载API v1路由
  router.use('/api/v1', apiV1);

  // 兼容旧版API路由（保持向后兼容）
  router.use('/api', apiV1);

  // 根路径重定向到API信息
  router.get('/', (req, res) => {
    res.redirect('/api/v1/info');
  });

  // 404处理
  router.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: '接口不存在',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = createRoutes;