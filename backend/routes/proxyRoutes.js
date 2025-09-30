const express = require('express');
const url = require('url');
const http = require('http');
const https = require('https');

// 允许的目标主机后缀，避免开放代理风险
const ALLOWED_HOST_SUFFIXES = [
  '.aliyuncs.com',
  '.oss-cn-', // 宽松匹配各区域二级域名前缀
  '.fangdutex.cn'
];

function isHostAllowed(targetUrl) {
  try {
    const u = new URL(targetUrl);
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
  } catch (_) {
    return false;
  }
}

function createProxyRoutes() {
  const router = express.Router();

  // 代理媒体：仅允许 GET/HEAD，必须提供完整 https/http 资源 URL
  router.all('/media', async (req, res) => {
    try {
      const target = req.query.url;
      if (!target) return res.status(400).json({ success: false, message: '缺少参数 url' });
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ success: false, message: '仅支持 GET/HEAD' });
      }
      if (!/^https?:\/\//i.test(target)) {
        return res.status(400).json({ success: false, message: 'url 必须为 http/https 绝对地址' });
      }
      if (!isHostAllowed(target)) {
        return res.status(403).json({ success: false, message: '目标主机不被允许' });
      }

      const parsed = new URL(target);
      const client = parsed.protocol === 'https:' ? https : http;

      const requestHeaders = {
        'User-Agent': req.headers['user-agent'] || 'fd-media-proxy',
        'Accept': req.headers['accept'] || '*/*'
      };
      // 透传 Range 支持分段
      if (req.headers['range']) requestHeaders['Range'] = req.headers['range'];

      const proxyReq = client.request({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: requestHeaders
      }, proxyRes => {
        // 透传关键头
        const headers = {};
        const passthrough = [
          'content-type', 'content-length', 'accept-ranges', 'content-range',
          'etag', 'last-modified', 'cache-control'
        ];
        passthrough.forEach(h => {
          if (proxyRes.headers[h]) headers[h] = proxyRes.headers[h];
        });
        // 明确允许跨域（虽然同源访问，不妨显式暴露）
        headers['Access-Control-Allow-Origin'] = '*';
        res.writeHead(proxyRes.statusCode || 502, headers);
        if (req.method === 'HEAD') return res.end();
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        console.error('媒体代理失败:', e.message);
        res.status(502).json({ success: false, message: '上游请求失败' });
      });

      proxyReq.end();
    } catch (err) {
      console.error('代理异常:', err);
      res.status(500).json({ success: false, message: '代理内部错误' });
    }
  });

  return router;
}

module.exports = createProxyRoutes; 