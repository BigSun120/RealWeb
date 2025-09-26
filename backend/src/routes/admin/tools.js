const express = require('express');
const { auth } = require('../../middleware/auth');
const Tool = require('../../models/Tool');
// const ToolCategory = require('../../models/ToolCategory');
const ToolUsage = require('../../models/ToolUsage');
// const ToolConfig = require('../../models/ToolConfig');
const ActivityLogger = require('../../middleware/activityLogger');
const ToolsPermission = require('../../middleware/toolsPermission');
const logger = require('../../utils/logger');
const { getStaticTools } = require('../../utils/staticTools');

const router = express.Router();

// 应用权限验证
router.use(auth);
router.use(ToolsPermission.requireAdmin);
router.use(ToolsPermission.checkToolManagePermission);

// 获取工具管理列表
router.get('/', async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20, sort = 'createdAt' } = req.query;

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

    // const oldData = tool.toObject();
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

    // const tools = await Tool.find({ _id: { $in: ids } });
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

    // 累计总使用次数
    const totalUsage = await ToolUsage.countDocuments();

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
        totalUsage,
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
    logger.info(`🔍 [Analytics] 获取使用统计请求 - period: ${period}, toolId: ${toolId}`);

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

    logger.info(`📅 [Analytics] 时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    let usageData;
    if (toolId) {
      // 单个工具的使用统计
      logger.info(`📊 [Analytics] 查询单个工具统计: ${toolId}`);
      usageData = await ToolUsage.getToolStats(toolId, startDate, endDate);
      const trendData = await ToolUsage.getUsageTrend(toolId, parseInt(period));

      logger.info(`📊 [Analytics] 单工具查询结果:`, {
        usageData: usageData[0] || {},
        trendData: trendData
      });

      res.json({
        code: 200,
        message: 'success',
        data: {
          stats: usageData[0] || {},
          trend: trendData
        }
      });
    } else {
      // 热门工具排行 + 全站趋势
      const days = parseInt(period);
      logger.info(`📊 [Analytics] 查询全站统计，天数: ${days}`);

      // 检查数据库中是否有数据
      const totalCount = await ToolUsage.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      logger.info(`📊 [Analytics] 时间范围内总记录数: ${totalCount}`);

      const popularTools = await ToolUsage.getPopularTools(10, days);
      logger.info(`📊 [Analytics] 热门工具查询结果:`, popularTools);

      // 全站每日聚合趋势
      const overallTrend = await ToolUsage.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            date: '$_id',
            count: 1,

            uniqueUsers: { $size: '$uniqueUsers' },
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ]);

      logger.info(`📊 [Analytics] 全站趋势查询结果:`, overallTrend);

      // 获取全站汇总统计数据
      const overallStats = await ToolUsage.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalUsage: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgResponseTime: { $avg: '$responseTime' },
            successCount: { $sum: { $cond: ['$success', 1, 0] } }
          }
        },
        {
          $project: {
            totalUsage: 1,
            uniqueUsers: { $size: { $ifNull: ['$uniqueUsers', []] } },
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            successRate: {
              $round: [
                { $multiply: [{ $divide: ['$successCount', '$totalUsage'] }, 100] },
                2
              ]
            },
            _id: 0
          }
        }
      ]);

      const summaryStats = overallStats[0] || {
        totalUsage: 0,
        uniqueUsers: 0,
        avgResponseTime: 0,
        successRate: 0
      };

      logger.info(`📊 [Analytics] 全站汇总统计:`, summaryStats);

      const responseData = {
        popularTools,
        overallTrend,
        stats: summaryStats  // 添加全站汇总统计
      };

      logger.info(`📊 [Analytics] 返回数据:`, responseData);

      res.json({
        code: 200,
        message: 'success',
        data: responseData
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

// 同步静态工具定义到数据库
router.post('/sync-static', async (req, res) => {
  try {
    const staticTools = getStaticTools();
    if (staticTools.length === 0) {
      return res.json({ code: 200, message: '没有可同步的静态工具', data: { created: 0, updated: 0, skipped: 0 } });
    }

    const results = { created: 0, updated: 0, skipped: 0, details: [] };

    for (const staticTool of staticTools) {
      try {
        const existingTool = await Tool.findOne({ id: staticTool.id });

        if (!existingTool) {
          const toolData = {
            ...staticTool,
            isStatic: true,
            createdBy: req.user._id,
            updatedBy: req.user._id
          };
          const tool = new Tool(toolData);
          await tool.save();
          results.created += 1;
          results.details.push({ id: staticTool.id, action: 'created' });
        } else {
          let changed = false;
          const updatableFields = ['route', 'component', 'category', 'icon', 'tags', 'difficulty', 'estimatedTime'];

          updatableFields.forEach(field => {
            if (staticTool[field] !== undefined) {
              const newValue = Array.isArray(staticTool[field]) ? [...staticTool[field]] : staticTool[field];
              if (JSON.stringify(existingTool[field]) !== JSON.stringify(newValue)) {
                existingTool[field] = newValue;
                changed = true;
              }
            }
          });

          if (!existingTool.requiresAuth && staticTool.requiresAuth) {
            existingTool.requiresAuth = staticTool.requiresAuth;
            changed = true;
          }

          if (!existingTool.icon && staticTool.icon) {
            existingTool.icon = staticTool.icon;
            changed = true;
          }

          if (existingTool.sortOrder === undefined && staticTool.sortOrder !== undefined) {
            existingTool.sortOrder = staticTool.sortOrder;
            changed = true;
          }

          if (!existingTool.status && staticTool.status) {
            existingTool.status = staticTool.status;
            changed = true;
          }

          existingTool.isStatic = true;
          existingTool.updatedBy = req.user._id;

          if (changed) {
            await existingTool.save();
            results.updated += 1;
            results.details.push({ id: staticTool.id, action: 'updated' });
          } else {
            await existingTool.save(); // ensure isStatic flag persists
            results.skipped += 1;
            results.details.push({ id: staticTool.id, action: 'skipped' });
          }
        }
      } catch (toolError) {
        logger.error(`同步静态工具 ${staticTool.id} 失败:`, toolError);
        results.details.push({ id: staticTool.id, action: 'error', message: toolError.message });
      }
    }

    res.json({ code: 200, message: '同步完成', data: results });
  } catch (error) {
    logger.error('同步静态工具失败:', error);
    res.status(500).json({ code: 500, message: '同步静态工具失败' });
  }
});

// 全站分析（按时间段）
router.get('/analytics/overall', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = parseInt(period) || 7;
    logger.info(`📈 [Overall] 获取全站分析请求 - period: ${period}, days: ${days}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.info(`📈 [Overall] 时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 检查总记录数
    const totalRecords = await ToolUsage.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    logger.info(`📈 [Overall] 时间范围内总记录数: ${totalRecords}`);

    const stats = await ToolUsage.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgResponseTime: { $avg: '$responseTime' },
          successRate: { $avg: { $cond: ['$success', 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsage: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
          successRate: { $round: [{ $multiply: ['$successRate', 100] }, 2] }
        }
      }
    ]);

    logger.info(`📈 [Overall] 总体统计结果:`, stats);

    // 设备类型分析
    const deviceStats = await ToolUsage.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    logger.info(`📱 [Overall] 设备分布统计结果:`, deviceStats);

    // 用户行为项（示例：按 action 统计）
    const behaviorStats = await ToolUsage.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $project: { action: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    logger.info(`👤 [Overall] 用户行为统计结果:`, behaviorStats);

    const responseData = {
      stats: stats[0] || { totalUsage: 0, uniqueUsers: 0, avgResponseTime: 0, successRate: 0 },
      deviceStats,
      behaviorStats
    };

    logger.info(`📈 [Overall] 最终返回数据:`, responseData);

    res.json({
      code: 200,
      message: 'success',
      data: responseData
    });
  } catch (error) {
    logger.error('获取全站分析失败:', error);
    res.status(500).json({ code: 500, message: '获取全站分析失败' });
  }
});

// 导出分析报表
router.post('/analytics/export', async (req, res) => {
  try {
    const { period = '7d', toolId, dateRange, format = 'excel' } = req.body;

    logger.info('📊 [Export] 开始导出分析报表:', { period, toolId, format });

    // 构建查询参数
    const queryParams = { period };
    if (toolId) queryParams.toolId = toolId;
    if (Array.isArray(dateRange) && dateRange.length === 2) {
      queryParams.startDate = new Date(dateRange[0]);
      queryParams.endDate = new Date(dateRange[1]);
    } else {
      // 根据period计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    }

    // 构建聚合查询
    const matchStage = {
      createdAt: {
        $gte: queryParams.startDate,
        $lte: queryParams.endDate
      }
    };

    if (toolId) {
      const tool = await Tool.findOne({ id: toolId });
      if (tool) {
        matchStage.toolId = tool._id;
      }
    }

    // 获取详细使用数据
    const usageData = await ToolUsage.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'tools',
          localField: 'toolId',
          foreignField: '_id',
          as: 'tool'
        }
      },
      { $unwind: { path: '$tool', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          time: { $dateToString: { format: '%H:%M:%S', date: '$createdAt' } },
          toolName: { $ifNull: ['$tool.name', '$toolIdentifier'] },
          toolIdentifier: 1,
          action: 1,
          success: 1,
          responseTime: 1,
          deviceType: '$device.type',
          deviceOS: '$device.os',
          deviceBrowser: '$device.browser',
          userAgent: 1,
          ipAddress: 1,
          source: 1,
          location: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 } // 限制导出记录数量
    ]);

    // 获取汇总统计
    const summaryStats = await ToolUsage.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgResponseTime: { $avg: '$responseTime' },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          deviceStats: { $push: '$device.type' },
          actionStats: { $push: '$action' }
        }
      },
      {
        $project: {
          totalUsage: 1,
          uniqueUsers: { $size: { $ifNull: ['$uniqueUsers', []] } },
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
          successRate: {
            $round: [
              { $multiply: [{ $divide: ['$successCount', '$totalUsage'] }, 100] },
              2
            ]
          },
          deviceStats: 1,
          actionStats: 1
        }
      }
    ]);

    const summary = summaryStats[0] || {
      totalUsage: 0,
      uniqueUsers: 0,
      avgResponseTime: 0,
      successRate: 0,
      deviceStats: [],
      actionStats: []
    };

    // 根据格式生成报表
    if (format === 'json') {
      // JSON 格式导出
      const reportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          period,
          toolId: toolId || 'all',
          dateRange: {
            start: queryParams.startDate.toISOString(),
            end: queryParams.endDate.toISOString()
          },
          totalRecords: usageData.length
        },
        summary,
        detailData: usageData
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(reportData);

    } else {
      // Excel/CSV 格式导出 (这里简化为 CSV)
      const csvHeaders = [
        '日期', '时间', '工具名称', '工具标识', '操作类型', '是否成功',
        '响应时间(ms)', '设备类型', '操作系统', '浏览器', 'IP地址', '来源'
      ];

      const csvRows = usageData.map(record => [
        record.date || '',
        record.time || '',
        record.toolName || '',
        record.toolIdentifier || '',
        record.action || '',
        record.success ? '成功' : '失败',
        record.responseTime || 0,
        record.deviceType || '',
        record.deviceOS || '',
        record.deviceBrowser || '',
        record.ipAddress || '',
        record.source || ''
      ]);

      // 添加汇总信息行
      const summaryRows = [
        [''],
        ['=== 汇总统计 ==='],
        ['总使用次数', summary.totalUsage],
        ['独立用户数', summary.uniqueUsers],
        ['平均响应时间(ms)', summary.avgResponseTime],
        ['成功率(%)', summary.successRate],
        ['导出时间', new Date().toLocaleString('zh-CN')]
      ];

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ...summaryRows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent); // 添加BOM以支持Excel中文显示
    }

    logger.info('📊 [Export] 报表导出成功:', {
      recordCount: usageData.length,
      format,
      period,
      toolId: toolId || 'all'
    });

  } catch (error) {
    logger.error('📊 [Export] 导出分析报表失败:', error);
    res.status(500).json({
      code: 500,
      message: '导出失败: ' + error.message
    });
  }
});

module.exports = router;
