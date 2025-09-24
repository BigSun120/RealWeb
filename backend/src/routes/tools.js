const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const ActivityLogger = require('../middleware/activityLogger');
const ToolsAnalytics = require('../middleware/toolsAnalytics');
const ToolsPermission = require('../middleware/toolsPermission');

// 导入控制器
const toolsController = require('../controllers/toolsController');

// 导入工具特定路由
const videoRoutes = require('./tools/video');
const youtubeRoutes = require('./tools/youtube');
const iqiyiRoutes = require('./tools/iqiyi');
const augmentRoutes = require('./tools/augment');
const tokenPoolRoutes = require('./tools/tokenPool');
const mailMemoRoutes = require('./tools/mailMemo');

const router = express.Router();

// 特殊路由：不需要工具记录检查的路由
router.use('/token-pool', tokenPoolRoutes); // 令牌池管理（直接写死在代码中）

// 应用工具箱基础中间件
router.use(ToolsPermission.checkToolboxEnabled); // 检查工具箱是否启用
router.use(ToolsPermission.checkRateLimit); // 检查频率限制
router.use(ToolsAnalytics.createMiddleware()); // 应用分析中间件

// 工具特定路由
router.use('/video', videoRoutes); // 视频下载工具
router.use('/youtube', youtubeRoutes); // YouTube下载工具
router.use('/iqiyi', iqiyiRoutes); // 爱奇艺下载工具
router.use('/augment', augmentRoutes); // Augment 工具
router.use('/mail-memo', mailMemoRoutes); // 邮箱备忘录

// 公开路由：获取工具列表
router.get('/', optionalAuth, toolsController.getTools);

// 公开路由：获取工具详情
router.get('/:id', optionalAuth, ToolsPermission.checkToolAccess, toolsController.getToolById);

// 公开路由：获取工具分类
router.get('/categories/list', toolsController.getCategories);

// 公开路由：获取推荐工具
router.get('/featured/list', optionalAuth, toolsController.getFeaturedTools);

// 认证路由：记录工具使用
router.post(
  '/:id/usage',
  optionalAuth,
  ToolsPermission.checkToolUsagePermission,
  toolsController.recordUsage
);

// 认证路由：获取用户收藏的工具
router.get('/favorites/list', auth, toolsController.getFavoriteTools);

// 认证路由：添加/移除收藏
router.post('/:id/favorite', auth, toolsController.toggleFavorite);



module.exports = router;

