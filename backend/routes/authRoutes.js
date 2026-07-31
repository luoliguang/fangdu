const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth, getJwtSecret } = require('../middleware/auth');

// 时序安全的字符串比较，避免通过响应时间推测密码
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // 长度不同也走一次比较，保持耗时一致
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 认证相关路由
 */
function createAuthRoutes() {
  const router = express.Router();

  // 登录限速：同一 IP 15 分钟内最多 5 次失败尝试，成功登录不计数
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '尝试次数过多，请 15 分钟后再试' }
  });

  // 登录接口
  router.post('/login', loginLimiter, (req, res) => {
    const secret = getJwtSecret();
    if (!secret) {
      console.error('[auth] JWT_SECRET 未配置或仍为占位值，登录功能已禁用');
      return res.status(503).json({ success: false, message: '服务端认证未配置' });
    }

    // 密码必须在环境变量中显式配置，不提供默认值
    const accounts = [
      { id: 1, username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, name: '管理员', role: 'admin' },
      { id: 2, username: process.env.USER_USERNAME, password: process.env.USER_PASSWORD, name: '普通用户', role: 'user' }
    ].filter(a => a.username && a.password);

    if (accounts.length === 0) {
      console.error('[auth] 未在环境变量中配置任何账号（ADMIN_USERNAME/ADMIN_PASSWORD）');
      return res.status(503).json({ success: false, message: '服务端认证未配置' });
    }

    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const user = accounts.find(a => safeEqual(a.username, username) && safeEqual(a.password, password));

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      token
    });
  });

  // 登出接口（JWT 无状态，前端清除本地令牌即可）
  router.post('/logout', (req, res) => {
    res.json({ success: true, message: '登出成功' });
  });

  // 获取当前登录用户信息
  router.get('/me', requireAuth, (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.sub,
        username: req.user.username,
        role: req.user.role
      }
    });
  });

  // 验证token接口（保留兼容旧调用）
  router.post('/verify', (req, res) => {
    const secret = getJwtSecret();
    if (!secret) {
      return res.status(503).json({ success: false, message: '服务端认证未配置' });
    }

    const { token } = req.body || {};
    if (!token) {
      return res.status(401).json({ success: false, message: '缺少Token' });
    }

    try {
      const decoded = jwt.verify(token, secret);
      res.json({
        success: true,
        user: { id: decoded.sub, username: decoded.username, role: decoded.role }
      });
    } catch (err) {
      res.status(401).json({ success: false, message: 'Token无效或已过期' });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
