const express = require('express');
const router = express.Router();
const promptUsageController = require('../controllers/promptUsageController');
const { auth } = require('../middleware/auth');

/**
 * 提示词使用记录路由
 * 基础路径: /api/prompts
 */

// 记录提示词使用
// POST /api/prompts/:id/usage
router.post(
  '/:id/usage',
  auth,
  promptUsageController.recordUsage
);

// 获取使用记录列表
// GET /api/prompts/:id/usage
router.get(
  '/:id/usage',
  auth,
  promptUsageController.getUsageLogs
);

// 获取使用统计数据
// GET /api/prompts/:id/usage/statistics
router.get(
  '/:id/usage/statistics',
  auth,
  promptUsageController.getStatistics
);

// 更新使用反馈
// PATCH /api/prompts/usage/:logId/feedback
router.patch(
  '/usage/:logId/feedback',
  auth,
  promptUsageController.updateFeedback
);

// 删除使用记录
// DELETE /api/prompts/usage/:logId
router.delete(
  '/usage/:logId',
  auth,
  promptUsageController.deleteUsageLog
);

module.exports = router;
