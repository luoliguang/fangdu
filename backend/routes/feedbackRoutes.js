const express = require('express');
const FeedbackController = require('../controllers/FeedbackController');

/**
 * 反馈留言相关路由
 */
function createFeedbackRoutes(db) {
  const router = express.Router();
  const feedbackController = new FeedbackController(db);

  // 提交留言
  router.post('/', 
    feedbackController.rateLimitMiddleware.bind(feedbackController),
    feedbackController.submitFeedback.bind(feedbackController)
  );

  // 获取留言列表
  router.get('/', feedbackController.getFeedbacks.bind(feedbackController));

  // 获取单个留言详情
  router.get('/:id', feedbackController.getFeedbackById.bind(feedbackController));

  // 更新留言状态
  router.put('/:id/status', feedbackController.updateFeedbackStatus.bind(feedbackController));

  // 删除留言
  router.delete('/:id', feedbackController.deleteFeedback.bind(feedbackController));

  // 获取未处理留言数量
  router.get('/stats/unprocessed', feedbackController.getUnprocessedCount.bind(feedbackController));

  // 根据用户ID获取留言列表
  router.get('/user/:userId', feedbackController.getFeedbacksByUserId.bind(feedbackController));

  // 获取留言统计信息
  router.get('/stats/overview', feedbackController.getFeedbackStats.bind(feedbackController));

  // 批量更新留言状态
  router.put('/batch/status', feedbackController.batchUpdateStatus.bind(feedbackController));

  // 回复留言
  router.post('/:id/reply', feedbackController.replyToFeedback.bind(feedbackController));

  // 批量删除留言
  router.post('/batch/delete', feedbackController.batchDeleteFeedbacks.bind(feedbackController));

  // 导出留言数据
  router.get('/export/data', feedbackController.exportFeedbacks.bind(feedbackController));

  // 搜索留言
  router.get('/search/query', feedbackController.searchFeedbacks.bind(feedbackController));

  return router;
}

module.exports = createFeedbackRoutes;