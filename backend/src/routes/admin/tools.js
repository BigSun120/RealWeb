const express = require('express');
const { auth } = require('../../middleware/auth');
const Tool = require('../../models/Tool');
const ToolCategory = require('../../models/ToolCategory');
const ToolUsage = require('../../models/ToolUsage');
const ToolConfig = require('../../models/ToolConfig');
const ActivityLogger = require('../../middleware/activityLogger');
const ToolsPermission = require('../../middleware/toolsPermission');
const logger = require('../../utils/logger');

const router = express.Router();

// 应用权限验证
router.use(auth);
router.use(ToolsPermission.requireAdmin);
router.use(ToolsPermission.checkToolManagePermission);

// 获取工具管理列表
router.get('/', async (req, res) => {
  try {
    const {
      category,
      status,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt'
    } = req.query;

    // 构建查询条件
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 分页和排序
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sort] = sort === 'name' ? 1 : -1;

    const tools = await Tool.find(query)
      .populate('categoryInfo')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
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
    logger.error('获取工具管理列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取工具列表失败'
    });
  }
});

// 获取工具详情
router.get('/:id', async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id)
      .populate('categoryInfo')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: '工具不存在'
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

// 创建工具
router.post('/', async (req, res) => {
  try {
    const toolData = {
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    const tool = new Tool(toolData);
    await tool.save();

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '创建工具',
      `创建了工具: ${tool.name}`,
      req,
      tool._id,
      'tool'
    );

    res.status(201).json({
      code: 201,
      message: '工具创建成功',
      data: tool
    });
  } catch (error) {
    logger.error('创建工具失败:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        code: 400,
        message: '工具ID已存在'
      });
    }

    res.status(500).json({
      code: 500,
      message: '创建工具失败'
    });
  }
});

// 更新工具
router.put('/:id', async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: '工具不存在'
      });
    }

    const oldData = tool.toObject();
    Object.assign(tool, req.body);
    tool.updatedBy = req.user._id;

    await tool.save();

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '更新工具',
      `更新了工具: ${tool.name}`,
      req,
      tool._id,
      'tool'
    );

    res.json({
      code: 200,
      message: '工具更新成功',
      data: tool
    });
  } catch (error) {
    logger.error('更新工具失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新工具失败'
    });
  }
});

// 删除工具
router.delete('/:id', async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: '工具不存在'
      });
    }

    await Tool.findByIdAndDelete(req.params.id);

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '删除工具',
      `删除了工具: ${tool.name}`,
      req,
      tool._id,
      'tool'
    );

    res.json({
      code: 200,
      message: '工具删除成功'
    });
  } catch (error) {
    logger.error('删除工具失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除工具失败'
    });
  }
});

// 批量删除工具
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供要删除的工具ID列表'
      });
    }

    const tools = await Tool.find({ _id: { $in: ids } });
    const deletedCount = await Tool.deleteMany({ _id: { $in: ids } });

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '批量删除工具',
      `批量删除了 ${deletedCount.deletedCount} 个工具`,
      req,
      null,
      'tool'
    );

    res.json({
      code: 200,
      message: `成功删除 ${deletedCount.deletedCount} 个工具`
    });
  } catch (error) {
    logger.error('批量删除工具失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量删除失败'
    });
  }
});

// 批量更新工具状态
router.post('/batch-update-status', async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供要更新的工具ID列表'
      });
    }

    const result = await Tool.updateMany(
      { _id: { $in: ids } },
      {
        status,
        updatedBy: req.user._id,
        updatedAt: new Date()
      }
    );

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '批量更新工具状态',
      `批量更新了 ${result.modifiedCount} 个工具状态为: ${status}`,
      req,
      null,
      'tool'
    );

    res.json({
      code: 200,
      message: `成功更新 ${result.modifiedCount} 个工具状态`
    });
  } catch (error) {
    logger.error('批量更新工具状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量更新失败'
    });
  }
});

// 获取工具统计概览
router.get('/analytics/overview', async (req, res) => {
  try {
    const totalTools = await Tool.countDocuments();
    const activeTools = await Tool.countDocuments({ status: 'active' });
    const comingSoonTools = await Tool.countDocuments({ status: 'coming-soon' });
    const maintenanceTools = await Tool.countDocuments({ status: 'maintenance' });

    // 获取今日使用统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = await ToolUsage.countDocuments({
      createdAt: { $gte: today }
    });

    // 获取本周使用统计
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekUsage = await ToolUsage.countDocuments({
      createdAt: { $gte: weekStart }
    });

    // 获取活跃用户数
    const activeUsers = await ToolUsage.distinct('userId', {
      createdAt: { $gte: weekStart },
      userId: { $ne: null }
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        totalTools,
        activeTools,
        comingSoonTools,
        maintenanceTools,
        todayUsage,
        weekUsage,
        activeUsers: activeUsers.length
      }
    });
  } catch (error) {
    logger.error('获取工具统计概览失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取统计数据失败'
    });
  }
});

// 获取工具使用统计
router.get('/analytics/usage', async (req, res) => {
  try {
    const { period = '7d', toolId } = req.query;

    // 计算时间范围
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    let usageData;
    if (toolId) {
      // 单个工具的使用统计
      usageData = await ToolUsage.getToolStats(toolId, startDate, endDate);
      const trendData = await ToolUsage.getUsageTrend(toolId, parseInt(period));

      res.json({
        code: 200,
        message: 'success',
        data: {
          stats: usageData[0] || {},
          trend: trendData
        }
      });
    } else {
      // 热门工具排行
      const popularTools = await ToolUsage.getPopularTools(10, parseInt(period));

      res.json({
        code: 200,
        message: 'success',
        data: {
          popularTools
        }
      });
    }
  } catch (error) {
    logger.error('获取工具使用统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取使用统计失败'
    });
  }
});

// 获取用户行为分析
router.get('/analytics/behavior', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 用户活跃度分析
    const userActivity = await ToolUsage.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          usageCount: { $sum: 1 },
          toolsUsed: { $addToSet: '$toolIdentifier' },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          userId: '$_id',
          usageCount: 1,
          toolsUsed: { $size: '$toolsUsed' },
          lastActivity: 1,
          _id: 0
        }
      },
      { $sort: { usageCount: -1 } },
      { $limit: 100 }
    ]);

    // 设备类型分析
    const deviceStats = await ToolUsage.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$device.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      code: 200,
      message: 'success',
      data: {
        userActivity,
        deviceStats
      }
    });
  } catch (error) {
    logger.error('获取用户行为分析失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取行为分析失败'
    });
  }
});

module.exports = router;
