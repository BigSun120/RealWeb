const express = require('express');
const router = express.Router();
const aiGatewayController = require('../controllers/aiGatewayController');
const { auth, optionalAuth, adminAuth } = require('../middleware/auth');

/**
 * AI生成相关路由
 */

// AI生成接口（支持未登录用户使用平台密钥）
router.post('/generate', optionalAuth, aiGatewayController.generate);

// AI流式生成接口
router.post('/generate/stream', optionalAuth, aiGatewayController.generateStream);

/**
 * 用户AI连接管理路由（需要登录）
 */

// 获取用户的AI连接列表
router.get('/connections', auth, aiGatewayController.getUserConnections);

// 创建用户AI连接
router.post('/connections', auth, aiGatewayController.createUserConnection);

// 更新用户AI连接
router.put('/connections/:id', auth, aiGatewayController.updateUserConnection);

// 删除用户AI连接
router.delete('/connections/:id', auth, aiGatewayController.deleteUserConnection);

// 验证用户AI连接
router.post('/connections/:id/validate', auth, aiGatewayController.validateUserConnection);

// 获取用户使用统计
router.get('/stats/user', auth, aiGatewayController.getUserStats);

/**
 * 平台统计路由（仅管理员）
 */

// 获取平台使用统计
router.get('/stats/platform', adminAuth, aiGatewayController.getPlatformStats);

module.exports = router;
