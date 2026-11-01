const { optionalAuth } = require('./auth');

function createSiteControlMiddleware(service) {
  return (req, res, next) => optionalAuth(req, res, async () => {
    // Login and the control endpoint must remain available for recovery.
    const route = req.path.toLowerCase().replace(/^\/api(?:\/v1)?(?=\/|$)/, '') || '/';
    if (/^\/(auth|site-control)(\/|$)/.test(route) || route === '/health' || req.method === 'OPTIONS') return next();
    if (req.user?.role === 'admin') return next();
    try {
      const config = await service.get();
      let code;
      if (!config.enabled) code = 'SITE_DISABLED';
      else if (!config.modules.materials && /^\/(materials|proxy|uploads)(\/|$)/.test(route)) code = 'MODULE_DISABLED';
      else if (!config.modules.drawer && /^\/feedbacks(\/|$)/.test(route)) code = 'MODULE_DISABLED';
      if (!code) return next();
      res.set('Cache-Control', 'no-store');
      return res.status(503).json({ success: false, code, message: code === 'SITE_DISABLED' ? '网站已停止服务' : '该模块已关闭' });
    } catch (error) {
      // A configuration failure must not silently reopen a closed site.
      return res.status(503).json({ success: false, code: 'SITE_CONTROL_UNAVAILABLE', message: '站点状态暂时无法读取，请稍后重试' });
    }
  });
}

module.exports = { createSiteControlMiddleware };
