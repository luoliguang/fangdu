const jwt = require('jsonwebtoken');

// 不允许使用示例配置里的占位密钥，防止"忘了改"导致签名形同虚设
const PLACEHOLDER_SECRETS = [
  'your-secret-key-change-in-production',
  'your-super-secret-jwt-key-change-this-in-production'
];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || PLACEHOLDER_SECRETS.includes(secret)) {
    return null;
  }
  return secret;
}

/**
 * JWT 鉴权中间件：校验 Authorization: Bearer <token>
 * 通过后将解码结果挂到 req.user
 */
function requireAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    console.error('[auth] JWT_SECRET 未配置或仍为占位值，拒绝所有鉴权请求');
    return res.status(503).json({ success: false, message: '服务端认证未配置' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
}

module.exports = { requireAuth, getJwtSecret };
