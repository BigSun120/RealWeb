const express = require('express');
const { auth, adminAuth } = require('../../middleware/auth');
const publicAIConnectionController = require('../../controllers/publicAIConnectionController');

const router = express.Router();

// 所有路由需要管理员权限
router.use(auth);
router.use(adminAuth);

/**
 * @route   GET /api/admin/ai-connections/public
 * @desc    获取公共AI连接列表（带分页）
 * @access  Admin
 */
router.get('/public', publicAIConnectionController.getPublicConnections);

/**
 * @route   POST /api/admin/ai-connections/public
 * @desc    创建公共AI连接
 * @access  Admin
 */
router.post('/public', publicAIConnectionController.createPublicConnection);

/**
 * @route   PUT /api/admin/ai-connections/public/:id
 * @desc    更新公共AI连接
 * @access  Admin
 */
router.put('/public/:id', publicAIConnectionController.updatePublicConnection);

/**
 * @route   DELETE /api/admin/ai-connections/public/:id
 * @desc    删除公共AI连接
 * @access  Admin
 */
router.delete('/public/:id', publicAIConnectionController.deletePublicConnection);

/**
 * @route   PATCH /api/admin/ai-connections/public/:id/status
 * @desc    切换公共连接的启用状态
 * @access  Admin
 */
router.patch('/public/:id/status', publicAIConnectionController.toggleConnectionStatus);

/**
 * @route   PATCH /api/admin/ai-connections/public/:id/default
 * @desc    设置为默认连接
 * @access  Admin
 */
router.patch('/public/:id/default', publicAIConnectionController.setDefaultConnection);

/**
 * @route   POST /api/admin/ai-connections/public/:id/test
 * @desc    测试公共连接
 * @access  Admin
 */
router.post('/public/:id/test', publicAIConnectionController.testConnection);

module.exports = router;
