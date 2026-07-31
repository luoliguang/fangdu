const express = require('express');
const FeedbackController = require('../controllers/FeedbackController');
const { requireAuth } = require('../middleware/auth');

/**
 * 反馈留言相关路由
 * 公开：提交留言、用户查询自己的留言
 * 管理员：列表、状态修改、删除、统计、导出等
 */
function createFeedbackRoutes(db) {
  const router = express.Router();
  const feedbackController = new FeedbackController(db);

  // 提交留言（公开，自带提交频率限制）
  router.post('/',
    feedbackController.rateLimitMiddleware.bind(feedbackController),
    feedbackController.submitFeedback.bind(feedbackController)
  );

  // 根据用户ID获取留言列表（公开：前台需求记录 Widget 使用）
  router.get('/user/:userId', feedbackController.getFeedbacksByUserId.bind(feedbackController));

  // ── 以下均为管理员接口 ──

  // 获取留言列表
  router.get('/', requireAuth, feedbackController.getFeedbacks.bind(feedbackController));

  // 获取未处理留言数量
  router.get('/stats/unprocessed', requireAuth, feedbackController.getUnprocessedCount.bind(feedbackController));

  // 获取留言统计信息
  router.get('/stats/overview', requireAuth, feedbackController.getFeedbackStats.bind(feedbackController));

  // 批量更新留言状态
  router.put('/batch/status', requireAuth, feedbackController.batchUpdateStatus.bind(feedbackController));

  // 批量删除留言
  router.post('/batch/delete', requireAuth, feedbackController.batchDeleteFeedbacks.bind(feedbackController));

  // 导出留言数据
  router.get('/export/data', requireAuth, feedbackController.exportFeedbacks.bind(feedbackController));

  // 搜索留言
  router.get('/search/query', requireAuth, feedbackController.searchFeedbacks.bind(feedbackController));

  // 获取单个留言详情
  router.get('/:id', requireAuth, feedbackController.getFeedbackById.bind(feedbackController));

  // 更新留言状态
  router.put('/:id/status', requireAuth, feedbackController.updateFeedbackStatus.bind(feedbackController));

  // 回复留言
  router.post('/:id/reply', requireAuth, feedbackController.replyToFeedback.bind(feedbackController));

  // 删除留言
  router.delete('/:id', requireAuth, feedbackController.deleteFeedback.bind(feedbackController));

  return router;
}

module.exports = createFeedbackRoutes;
