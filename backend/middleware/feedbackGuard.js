const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * 公开留言接口的多层防刷（留言会入库并推送飞书，所以比埋点接口更严）：
 * 1. 同 IP 突发限制：每分钟 5 条
 * 2. 同 IP 长窗口限制：每小时 30 条
 * 3. 全站总量熔断：每小时 200 条（防分布式刷量，保护飞书群和数据库）
 * 4. 同一用户/IP 10 秒冷却，5 分钟内重复内容直接拒绝
 * 5. 入参类型/长度/user_id 格式校验，非法请求不计入业务逻辑
 * 内存实现，重启即清零，对单进程部署足够；多实例部署需换 Redis store。
 */
function createFeedbackGuard({ now = () => Date.now(), burstLimit = 5 } = {}) {
  const limiterBase = { standardHeaders: true, legacyHeaders: false };
  const ipBurst = rateLimit({ ...limiterBase, windowMs: 60 * 1000, limit: burstLimit, message: { success: false, message: '发送太频繁啦，请稍后再试' } });
  const ipHourly = rateLimit({ ...limiterBase, windowMs: 60 * 60 * 1000, limit: 30, message: { success: false, message: '今天留言次数有点多，请稍后再来' } });
  const globalHourly = rateLimit({
    ...limiterBase,
    windowMs: 60 * 60 * 1000,
    limit: 200,
    keyGenerator: () => 'global',
    validate: { keyGeneratorIpFallback: false },
    message: { success: false, message: '留言通道繁忙，请稍后再试' }
  });

  const lastSeen = new Map();   // key -> 上次提交时间
  const recentHash = new Map(); // hash -> 过期时间
  const COOLDOWN_MS = 10 * 1000;
  const DUP_TTL_MS = 5 * 60 * 1000;

  const sweep = (t) => {
    if (lastSeen.size > 5000) for (const [k, v] of lastSeen) if (t - v > COOLDOWN_MS) lastSeen.delete(k);
    if (recentHash.size > 5000) for (const [k, v] of recentHash) if (v < t) recentHash.delete(k);
  };

  function validateAndDedupe(req, res, next) {
    const body = req.body || {};
    if (typeof body.message !== 'string') return fail(res, 400, '留言内容不能为空');
    const message = body.message.trim();
    if (!message) return fail(res, 400, '留言内容不能为空');
    if (message.length > 1000) return fail(res, 400, '留言内容不能超过1000个字符');
    if (body.user_id != null && (typeof body.user_id !== 'string' || !UUID_RE.test(body.user_id))) {
      return fail(res, 400, '用户标识格式不正确');
    }
    // 过滤"全是同一个字符/纯符号"的无意义刷屏
    if (!/[\p{L}\p{N}]/u.test(message) || /^(.)\1{9,}$/su.test(message)) {
      return fail(res, 400, '请输入有意义的内容哦');
    }

    const t = now();
    sweep(t);
    const who = body.user_id || req.ip;
    const last = lastSeen.get(who);
    if (last && t - last < COOLDOWN_MS) return fail(res, 429, '发送太频繁啦，请稍等几秒再试');
    const hash = crypto.createHash('sha1').update(`${who}\n${message}`).digest('hex');
    if ((recentHash.get(hash) || 0) > t) return fail(res, 429, '这条内容刚刚已经收到啦，不用重复发送');

    // 先占位再放行，避免并发请求同时通过检查；业务失败时释放占位
    lastSeen.set(who, t);
    recentHash.set(hash, t + DUP_TTL_MS);
    res.on('finish', () => {
      if (res.statusCode >= 400) { lastSeen.delete(who); recentHash.delete(hash); }
    });
    req.body.message = message;
    next();
  }

  return [ipBurst, ipHourly, globalHourly, validateAndDedupe];
}

module.exports = { createFeedbackGuard };
