const express = require('express');

/**
 * 认证相关路由
 */
function createAuthRoutes() {
  const router = express.Router();

  // 登录接口
  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // 简单的用户验证（实际项目中应该使用数据库和加密）
    const validUsers = [
      { id: 1, username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123', name: '管理员' },
      { id: 2, username: process.env.USER_USERNAME || 'user', password: process.env.USER_PASSWORD || 'user123', name: '普通用户' }
    ];
    
    const user = validUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
      // 生成简单的token（实际项目中应该使用JWT）
      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name
        },
        token
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
  });

  // 登出接口
  router.post('/logout', (req, res) => {
    res.json({
      success: true,
      message: '登出成功'
    });
  });

  // 验证token接口
  router.post('/verify', (req, res) => {
    const { token } = req.body;
    
    if (token) {
      try {
        // 简单的token验证（实际项目中应该使用JWT验证）
        const decoded = Buffer.from(token, 'base64').toString();
        const [userId, username, timestamp] = decoded.split(':');
        
        // 检查token是否过期（24小时）
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        const isExpired = (now - tokenTime) > 24 * 60 * 60 * 1000;
        
        if (isExpired) {
          res.status(401).json({
            success: false,
            message: 'Token已过期'
          });
        } else {
          res.json({
            success: true,
            user: {
              id: parseInt(userId),
              username
            }
          });
        }
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Token无效'
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: '缺少Token'
      });
    }
  });

  return router;
}

module.exports = createAuthRoutes;