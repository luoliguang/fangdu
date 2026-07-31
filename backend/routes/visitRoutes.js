const express = require('express');
const VisitController = require('../controllers/VisitController');
const { requireAuth } = require('../middleware/auth');

/**
 * 访问统计相关路由
 * 公开：访问埋点（record/search/heartbeat/offline）
 * 管理员：所有统计查询、导出、清理
 */
function createVisitRoutes(db) {
  const router = express.Router();
  const visitController = new VisitController(db);

  // ── 埋点接口（公开，前台页面调用）──

  // 记录访问
  router.post('/record', visitController.recordVisit.bind(visitController));

  // 记录搜索关键词
  router.post('/search', visitController.recordSearchKeyword.bind(visitController));

  // 心跳接口（更新在线状态）
  router.post('/heartbeat', visitController.heartbeat.bind(visitController));

  // 离线接口（用户离开）
  router.post('/offline', visitController.offline.bind(visitController));

  // ── 以下均为管理员接口 ──

  // 获取当前在线人数
  router.get('/online', requireAuth, visitController.getCurrentOnlineCount.bind(visitController));

  // 获取访问趋势数据
  router.get('/trends',
    requireAuth,
    visitController.validateStatsQuery.bind(visitController),
    visitController.getVisitTrends.bind(visitController)
  );

  // 获取页面访问统计
  router.get('/pages', requireAuth, visitController.getPageStats.bind(visitController));

  // 获取访问统计总览
  router.get('/overview', requireAuth, visitController.getOverallStats.bind(visitController));

  // 获取热门页面
  router.get('/popular', requireAuth, visitController.getPopularPages.bind(visitController));

  // 获取访问来源统计
  router.get('/referrers', requireAuth, visitController.getReferrerStats.bind(visitController));

  // 获取热门搜索关键词
  router.get('/search/top', requireAuth, visitController.getTopSearchKeywords.bind(visitController));

  // 获取地区访问分布
  router.get('/regions', requireAuth, visitController.getRegionStats.bind(visitController));

  // 获取访问时段分布
  router.get('/hourly', requireAuth, visitController.getHourlyDistribution.bind(visitController));

  // 获取访问详情
  router.get('/details',
    requireAuth,
    visitController.validateStatsQuery.bind(visitController),
    visitController.getVisitDetails.bind(visitController)
  );

  // 获取IP访问频率
  router.get('/ip/:ip/frequency', requireAuth, visitController.getIPVisitFrequency.bind(visitController));

  // 获取实时统计数据
  router.get('/realtime', requireAuth, visitController.getRealTimeStats.bind(visitController));

  // 获取统计仪表板数据
  router.get('/dashboard', requireAuth, visitController.getDashboardStats.bind(visitController));

  // 数据一致性检查和修复
  router.post('/check-consistency', requireAuth, visitController.checkDataConsistency.bind(visitController));

  // 导出访问数据
  router.get('/export',
    requireAuth,
    visitController.validateStatsQuery.bind(visitController),
    visitController.exportVisitData.bind(visitController)
  );

  // 清理过期访问记录
  router.post('/cleanup', requireAuth, visitController.cleanupOldVisits.bind(visitController));

  return router;
}

module.exports = createVisitRoutes;
