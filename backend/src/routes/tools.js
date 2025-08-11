const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const Tool = require('../models/Tool');
const ToolCategory = require('../models/ToolCategory');
const ToolUsage = require('../models/ToolUsage');
const ToolConfig = require('../models/ToolConfig');
const ActivityLogger = require('../middleware/activityLogger');
const ToolsAnalytics = require('../middleware/toolsAnalytics');
const ToolsPermission = require('../middleware/toolsPermission');
const logger = require('../utils/logger');

// 导入工具特定路由
const videoRoutes = require('./tools/video');
const youtubeRoutes = require('./tools/youtube');
const iqiyiRoutes = require('./tools/iqiyi');

const router = express.Router();

// 应用工具箱基础中间件
router.use(ToolsPermission.checkToolboxEnabled); // 检查工具箱是否启用
router.use(ToolsPermission.checkRateLimit); // 检查频率限制
router.use(ToolsAnalytics.createMiddleware()); // 应用分析中间件

// 工具特定路由
router.use('/video', videoRoutes); // 视频下载工具
router.use('/youtube', youtubeRoutes); // YouTube下载工具
router.use('/iqiyi', iqiyiRoutes); // 爱奇艺下载工具

// 公开路由：获取工具列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      status = 'active',
      featured,
      search,
      page = 1,
      limit = 20,
      sort = 'sortOrder'
    } = req.query;

    // 构建查询条件
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === 'true';

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 权限过滤
    if (!req.user) {
      query.requiresAuth = false;
    } else if (!req.user.isAdmin) {
      query.$or = [{ requiresAuth: false }, { requiresAuth: true, requiresAdmin: false }];
    }

    // 分页和排序
    const skip = (page - 1) * limit;
    const sortOptions = {};

    switch (sort) {
      case 'name':
        sortOptions.name = 1;
        break;
      case 'usage':
        sortOptions.usageCount = -1;
        break;
      case 'created':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions.sortOrder = 1;
        sortOptions.usageCount = -1;
    }

    const tools = await Tool.find(query)
      .populate('categoryInfo')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Tool.countDocuments(query);

    res.json({
      code: 200,
      message: 'success',
      data: {
        tools,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取工具列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取工具列表失败'
    });
  }
});

// 公开路由：获取工具详情
router.get('/:id', optionalAuth, ToolsPermission.checkToolAccess, async (req, res) => {
  try {
    const tool = await Tool.findOne({ id: req.params.id }).populate('categoryInfo');

    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: '工具不存在'
      });
    }

    // 检查权限
    if (!tool.checkPermission(req.user)) {
      return res.status(403).json({
        code: 403,
        message: '没有访问权限'
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: tool
    });
  } catch (error) {
    logger.error('获取工具详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取工具详情失败'
    });
  }
});

// 公开路由：获取工具分类
router.get('/categories/list', async (req, res) => {
  try {
    const { includeCount = false } = req.query;

    let categories = await ToolCategory.find({ status: 'active' }).sort({ sortOrder: 1 });

    if (includeCount === 'true') {
      // 添加工具数量统计
      for (let category of categories) {
        await category.updateToolCount();
      }
      categories = await ToolCategory.find({ status: 'active' }).sort({ sortOrder: 1 });
    }

    res.json({
      code: 200,
      message: 'success',
      data: categories
    });
  } catch (error) {
    logger.error('获取工具分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取工具分类失败'
    });
  }
});

// 公开路由：获取推荐工具
router.get('/featured/list', optionalAuth, async (req, res) => {
  try {
    const tools = await Tool.getFeaturedTools().populate('categoryInfo').limit(10);

    res.json({
      code: 200,
      message: 'success',
      data: tools
    });
  } catch (error) {
    logger.error('获取推荐工具失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取推荐工具失败'
    });
  }
});

// 认证路由：记录工具使用
router.post(
  '/:id/usage',
  optionalAuth,
  ToolsPermission.checkToolUsagePermission,
  async (req, res) => {
    try {
      const { action = 'use', duration = 0, metadata = {} } = req.body;

      const tool = await Tool.findOne({ id: req.params.id });
      if (!tool) {
        return res.status(404).json({
          code: 404,
          message: '工具不存在'
        });
      }

      // 检查权限
      if (!tool.checkPermission(req.user)) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 记录使用统计
      const usage = await ToolUsage.recordUsage({
        toolId: tool._id,
        toolIdentifier: tool.id,
        userId: req.user ? req.user._id : null,
        action,
        duration,
        sessionId: req.sessionID,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referrer: req.get('Referer'),
        metadata
      });

      res.json({
        code: 200,
        message: '使用记录已保存',
        data: { usageId: usage._id }
      });
    } catch (error) {
      logger.error('记录工具使用失败:', error);
      res.status(500).json({
        code: 500,
        message: '记录使用失败'
      });
    }
  }
);

// 认证路由：获取用户收藏的工具
router.get('/favorites/list', auth, async (req, res) => {
  try {
    // TODO: 实现用户收藏功能
    // 这里需要创建用户收藏表或在用户模型中添加收藏字段

    res.json({
      code: 200,
      message: 'success',
      data: []
    });
  } catch (error) {
    logger.error('获取收藏工具失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取收藏工具失败'
    });
  }
});

// 认证路由：添加/移除收藏
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const { action = 'add' } = req.body; // add 或 remove

    const tool = await Tool.findOne({ id: req.params.id });
    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: '工具不存在'
      });
    }

    // TODO: 实现收藏功能
    // 这里需要在用户模型中添加收藏字段或创建收藏表

    res.json({
      code: 200,
      message: action === 'add' ? '收藏成功' : '取消收藏成功'
    });
  } catch (error) {
    logger.error('收藏操作失败:', error);
    res.status(500).json({
      code: 500,
      message: '收藏操作失败'
    });
  }
});

// 视频解析相关路由已移除

module.exports = router;
