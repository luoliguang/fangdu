const express = require('express');
const FeedbackController = require('../controllers/FeedbackController');
const { requireAdmin } = require('../middleware/auth');
const { createFeedbackGuard } = require('../middleware/feedbackGuard');

/**
 * 反馈留言相关路由
 * 公开：提交留言、用户查询自己的留言
 * 管理员：列表、状态修改、删除、统计、导出等
 */
function createFeedbackRoutes(db) {
  const router = express.Router();
  const feedbackController = new FeedbackController(db);

  // 提交留言（公开，多层防刷：IP 限流 + 全站熔断 + 冷却/去重 + 入参校验）
  router.post('/',
    ...createFeedbackGuard(),
    feedbackController.submitFeedback.bind(feedbackController)
  );

  // 根据用户ID获取留言列表（公开：前台需求记录 Widget 使用）
  router.get('/user/:userId', feedbackController.getFeedbacksByUserId.bind(feedbackController));

  // ── 以下均为管理员接口 ──

  // 获取留言列表
  router.get('/', requireAdmin, feedbackController.getFeedbacks.bind(feedbackController));

  // 获取未处理留言数量
  router.get('/stats/unprocessed', requireAdmin, feedbackController.getUnprocessedCount.bind(feedbackController));

  // 获取留言统计信息
  router.get('/stats/overview', requireAdmin, feedbackController.getFeedbackStats.bind(feedbackController));

  // 批量更新留言状态
  router.put('/batch/status', requireAdmin, feedbackController.batchUpdateStatus.bind(feedbackController));

  // 批量删除留言
  router.post('/batch/delete', requireAdmin, feedbackController.batchDeleteFeedbacks.bind(feedbackController));

  // 导出留言数据
  router.get('/export/data', requireAdmin, feedbackController.exportFeedbacks.bind(feedbackController));

  // 搜索留言
  router.get('/search/query', requireAdmin, feedbackController.searchFeedbacks.bind(feedbackController));

  // 获取单个留言详情
  router.get('/:id', requireAdmin, feedbackController.getFeedbackById.bind(feedbackController));

  // 更新留言状态
  router.put('/:id/status', requireAdmin, feedbackController.updateFeedbackStatus.bind(feedbackController));

  // 回复留言
  router.post('/:id/reply', requireAdmin, feedbackController.replyToFeedback.bind(feedbackController));

  // 删除留言
  router.delete('/:id', requireAdmin, feedbackController.deleteFeedback.bind(feedbackController));

  return router;
}

module.exports = createFeedbackRoutes;
