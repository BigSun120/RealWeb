const Tool = require('../models/Tool');
const ToolUsage = require('../models/ToolUsage');
const ToolCategory = require('../models/ToolCategory');
const { getStaticTools } = require('../utils/staticTools');
const logger = require('../utils/logger');

class ToolsController {
  static async ensureToolExists(toolId) {
    let tool = await Tool.findOne({ id: toolId });
    if (tool) return tool;

    const staticTool = getStaticTools().find(item => item.id === toolId);
    if (!staticTool) return null;

    tool = await Tool.findOneAndUpdate(
      { id: toolId },
      {
        $set: {
          id: staticTool.id,
          name: staticTool.name,
          description: staticTool.description,
          icon: staticTool.icon || '🔧',
          category: staticTool.category,
          tags: staticTool.tags || [],
          route: staticTool.route,
          component: staticTool.component,
          status: staticTool.status || 'active',
          featured: !!staticTool.featured,
          difficulty: staticTool.difficulty || 'easy',
          estimatedTime: staticTool.estimatedTime || '1分钟',
          requiresAuth: !!staticTool.requiresAuth,
          requiresAdmin: !!staticTool.requiresAdmin,
          sortOrder: Number.isFinite(staticTool.sortOrder) ? staticTool.sortOrder : 0,
          isStatic: true
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return tool;
  }

  /**
   * 获取工具列表
   */
  async getTools(req, res, next) {
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

      // 权限过滤：移除工具列表的权限过滤，让所有用户都能看到全部工具
      // 但保留 requiresAuth 和 requiresAdmin 字段信息，由前端决定如何展示
      // 只过滤需要管理员权限的工具（管理员工具不对非管理员显示）
      if (!req.user || !req.user.isAdmin) {
        query.requiresAdmin = { $ne: true }; // 只排除管理员专用工具
      }

      // 分页
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // 排序
      const sortOptions = {};
      if (sort === 'name') {
        sortOptions.name = 1;
      } else if (sort === 'usageCount') {
        sortOptions.usageCount = -1;
      } else if (sort === 'createdAt') {
        sortOptions.createdAt = -1;
      } else {
        sortOptions.sortOrder = 1;
        sortOptions.createdAt = -1;
      }

      // 查询工具
      const tools = await Tool.find(query)
        .populate('categoryInfo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // 获取总数
      const total = await Tool.countDocuments(query);

      // 计算分页信息
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        code: 200,
        message: '获取工具列表成功',
        data: {
          tools,
          pagination: {
            current: pageNum,
            total: totalPages,
            hasNext: hasNextPage,
            hasPrev: hasPrevPage,
            totalItems: total
          }
        }
      });
    } catch (error) {
      logger.error('获取工具列表失败:', error);
      next(error);
    }
  }

  /**
   * 获取工具详情
   */
  async getToolById(req, res, next) {
    try {
      const tool = await Tool.findOne({ id: req.params.id })
        .populate('categoryInfo')
        .lean();

      if (!tool) {
        return res.status(404).json({
          code: 404,
          message: '工具不存在'
        });
      }

      // 权限检查
      if (tool.requiresAuth && !req.user) {
        return res.status(401).json({
          code: 401,
          message: '此工具需要登录后使用'
        });
      }

      if (tool.requiresAdmin && (!req.user || !req.user.isAdmin)) {
        return res.status(403).json({
          code: 403,
          message: '此工具需要管理员权限'
        });
      }

      res.json({
        code: 200,
        message: '获取工具详情成功',
        data: tool
      });
    } catch (error) {
      logger.error('获取工具详情失败:', error);
      next(error);
    }
  }

  /**
   * 记录工具使用统计
   */
  async recordUsage(req, res, next) {
    try {
      const { action = 'use', duration = 0, metadata = {} } = req.body;

      const tool = await ToolsController.ensureToolExists(req.params.id);
      if (!tool) {
        return res.status(404).json({
          code: 404,
          message: '工具不存在'
        });
      }

      // 更新使用统计
      const now = new Date();
      if (action === 'use') {
        tool.usageCount += 1;
        tool.lastUsedAt = now;
        await tool.save();
      }

      try {
        const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';
        const sessionId = req.headers['x-session-id'] || req.session?.id || (metadata && metadata.sessionId) || undefined;
        const deviceType = (metadata && (metadata.deviceType || metadata.device?.type)) || 'unknown';

        const usageEntry = new ToolUsage({
          toolId: tool._id,
          toolIdentifier: tool.id,
          userId: req.user ? req.user._id : null,
          sessionId,
          userAgent,
          ipAddress,
          action,
          duration: Number.isFinite(duration) ? duration : 0,
          responseTime: Number.isFinite(metadata?.responseTime) ? metadata.responseTime : 0,
          success: typeof metadata?.success === 'boolean' ? metadata.success : true,
          device: {
            type: deviceType,
            os: metadata?.device?.os || metadata?.os || undefined,
            browser: metadata?.device?.browser || metadata?.browser || undefined,
            screen: metadata?.device?.screen || undefined
          },
          source: metadata?.source || 'direct',
          referrer: metadata?.referrer || req.get('Referrer') || undefined,
          metadata,
          createdAt: now,
          date: now.toISOString().slice(0, 10),
          hour: now.getHours()
        });

        await usageEntry.save();
      } catch (logError) {
        logger.warn('记录工具使用日志失败:', logError);
      }

      res.json({
        code: 200,
        message: '记录使用统计成功',
        data: {
          toolId: tool.id,
          action,
          duration,
          metadata
        }
      });
    } catch (error) {
      logger.error('记录工具使用统计失败:', error);
      next(error);
    }
  }

  /**
   * 获取工具分类
   * 支持两种模式：
   * 1. 从ToolCategory表获取完整分类信息（默认）
   * 2. 从Tool表提取分类并统计（fallback）
   */
  async getCategories(req, res, next) {
    try {
      const { includeCount = false, simple = false } = req.query;

      // 简单模式：从工具中提取分类
      if (simple === 'true') {
        const categories = await Tool.distinct('category', { status: 'active' });
        const categoriesWithCount = await Promise.all(
          categories.map(async (category) => {
            const count = await Tool.countDocuments({
              category,
              status: 'active'
            });
            return { name: category, count };
          })
        );

        return res.json({
          code: 200,
          message: '获取工具分类成功',
          data: categoriesWithCount.sort((a, b) => b.count - a.count)
        });
      }

      // 完整模式：从ToolCategory表获取
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
        message: '获取工具分类成功',
        data: categories
      });
    } catch (error) {
      logger.error('获取工具分类失败:', error);
      next(error);
    }
  }

  /**
   * 收藏/取消收藏工具
   */
  async toggleFavorite(req, res, next) {
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
      next(error);
    }
  }

  /**
   * 获取推荐工具
   */
  async getFeaturedTools(req, res, next) {
    try {
      const tools = await Tool.find({
        featured: true,
        status: 'active'
      })
        .populate('categoryInfo')
        .sort({ sortOrder: 1, usageCount: -1 })
        .limit(10)
        .lean();

      res.json({
        code: 200,
        message: '获取推荐工具成功',
        data: tools
      });
    } catch (error) {
      logger.error('获取推荐工具失败:', error);
      next(error);
    }
  }

  /**
   * 获取用户收藏的工具
   */
  async getFavoriteTools(req, res, next) {
    try {
      // TODO: 实现用户收藏功能
      // 这里需要创建用户收藏表或在用户模型中添加收藏字段

      res.json({
        code: 200,
        message: '获取收藏工具成功',
        data: []
      });
    } catch (error) {
      logger.error('获取收藏工具失败:', error);
      next(error);
    }
  }


}

module.exports = new ToolsController();
