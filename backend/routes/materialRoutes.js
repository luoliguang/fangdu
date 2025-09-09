const express = require('express');
const MaterialController = require('../controllers/MaterialController');

/**
 * 素材相关路由
 */
function createMaterialRoutes(db) {
  const router = express.Router();
  const materialController = new MaterialController(db);

  // 获取素材列表
  router.get('/', materialController.getMaterials.bind(materialController));

  // 获取所有标签（必须在 /:id 之前）
  router.get('/tags/all', materialController.getAllTags.bind(materialController));

  // 获取素材统计信息（必须在 /:id 之前）
  router.get('/stats/overview', materialController.getMaterialStats.bind(materialController));

  // 搜索素材（必须在 /:id 之前）
  router.get('/search/query', materialController.searchMaterials.bind(materialController));

  // 上传素材
  router.post('/', 
    materialController.getUploadMiddleware(),
    materialController.uploadMaterial.bind(materialController)
  );

  // 批量删除素材
  router.post('/batch/delete', materialController.batchDeleteMaterials.bind(materialController));

  // 获取单个素材详情（必须在具体路径之后）
  router.get('/:id', materialController.getMaterialById.bind(materialController));

  // 更新素材信息
  router.put('/:id', materialController.updateMaterial.bind(materialController));

  // 删除素材
  router.delete('/:id', materialController.deleteMaterial.bind(materialController));

  return router;
}

module.exports = createMaterialRoutes;