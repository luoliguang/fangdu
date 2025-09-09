const express = require('express');
const VisitController = require('../controllers/VisitController');

/**
 * 访问统计相关路由
 */
function createVisitRoutes(db) {
  const router = express.Router();
  const visitController = new VisitController(db);

  // 记录访问
  router.post('/record', visitController.recordVisit.bind(visitController));

  // 获取当前在线人数
  router.get('/online', visitController.getCurrentOnlineCount.bind(visitController));

  // 获取访问趋势数据
  router.get('/trends', 
    visitController.validateStatsQuery.bind(visitController),
    visitController.getVisitTrends.bind(visitController)
  );

  // 获取页面访问统计
  router.get('/pages', visitController.getPageStats.bind(visitController));

  // 获取访问统计总览
  router.get('/overview', visitController.getOverallStats.bind(visitController));

  // 获取热门页面
  router.get('/popular', visitController.getPopularPages.bind(visitController));

  // 获取访问来源统计
  router.get('/referrers', visitController.getReferrerStats.bind(visitController));

  // 获取访问时段分布
  router.get('/hourly', visitController.getHourlyDistribution.bind(visitController));

  // 获取访问详情
  router.get('/details', 
    visitController.validateStatsQuery.bind(visitController),
    visitController.getVisitDetails.bind(visitController)
  );

  // 获取IP访问频率
  router.get('/ip/:ip/frequency', visitController.getIPVisitFrequency.bind(visitController));

  // 获取实时统计数据
  router.get('/realtime', visitController.getRealTimeStats.bind(visitController));

  // 获取统计仪表板数据
  router.get('/dashboard', visitController.getDashboardStats.bind(visitController));

  // 导出访问数据
  router.get('/export', 
    visitController.validateStatsQuery.bind(visitController),
    visitController.exportVisitData.bind(visitController)
  );

  // 清理过期访问记录（管理员功能）
  router.post('/cleanup', visitController.cleanupOldVisits.bind(visitController));

  return router;
}

module.exports = createVisitRoutes;