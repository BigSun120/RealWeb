const Tool = require('../models/Tool');
const ToolCategory = require('../models/ToolCategory');
const ToolConfig = require('../models/ToolConfig');
const logger = require('../utils/logger');

/**
 * 工具箱权限控制中间件
 */
class ToolsPermission {
  /**
   * 检查工具访问权限
   */
  static checkToolAccess = async (req, res, next) => {
    try {
      const toolId = req.params.id || req.params.toolId;
      if (!toolId) {
        return res.status(400).json({
          code: 400,
          message: '工具ID不能为空'
        });
      }

      // 获取工具信息
      const tool = await Tool.findOne({ id: toolId });
      if (!tool) {
        return res.status(404).json({
          code: 404,
          message: '工具不存在'
        });
      }

      // 检查工具状态
      if (tool.status !== 'active') {
        // 管理员可以访问所有状态的工具
        if (!req.user || !req.user.isAdmin) {
          return res.status(403).json({
            code: 403,
            message: '工具暂不可用'
          });
        }
      }

      // 检查工具权限
      if (!tool.checkPermission(req.user)) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 将工具信息添加到请求对象
      req.tool = tool;
      next();
    } catch (error) {
      logger.error('检查工具权限失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };

  /**
   * 检查分类访问权限
   */
  static checkCategoryAccess = async (req, res, next) => {
    try {
      const categoryId = req.params.categoryId || req.query.category;
      if (!categoryId) {
        return next(); // 没有指定分类，继续执行
      }

      // 获取分类信息
      const category = await ToolCategory.findOne({ id: categoryId });
      if (!category) {
        return res.status(404).json({
          code: 404,
          message: '分类不存在'
        });
      }

      // 检查分类状态
      if (category.status !== 'active') {
        if (!req.user || !req.user.isAdmin) {
          return res.status(403).json({
            code: 403,
            message: '分类暂不可用'
          });
        }
      }

      // 检查分类权限
      if (!category.checkPermission(req.user)) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 将分类信息添加到请求对象
      req.category = category;
      next();
    } catch (error) {
      logger.error('检查分类权限失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };

  /**
   * 检查工具箱功能是否启用
   */
  static checkToolboxEnabled = async (req, res, next) => {
    try {
      const enabled = await ToolConfig.getValue('tools.enabled', true);
      if (!enabled) {
        return res.status(503).json({
          code: 503,
          message: '工具箱功能暂时关闭'
        });
      }
      next();
    } catch (error) {
      logger.error('检查工具箱状态失败:', error);
      next(); // 出错时默认允许访问
    }
  };

  /**
   * 检查使用频率限制
   */
  static checkRateLimit = async (req, res, next) => {
    try {
      const rateLimitEnabled = await ToolConfig.getValue('security.rateLimitEnabled', true);
      if (!rateLimitEnabled) {
        return next();
      }

      const windowMs = await ToolConfig.getValue('security.rateLimitWindow', 900) * 1000; // 15分钟
      const maxRequests = await ToolConfig.getValue('security.rateLimitMax', 100);

      // 获取用户标识
      const identifier = req.user ? req.user._id.toString() : req.ip;
      const key = `rate_limit:${identifier}`;

      // 这里应该使用Redis或内存缓存来实现频率限制
      // 简化实现，实际项目中建议使用express-rate-limit
      
      // 检查今日使用次数限制
      const dailyLimit = req.user 
        ? await ToolConfig.getValue('tools.maxUsagePerUser', 100)
        : await ToolConfig.getValue('tools.maxUsagePerDay', 1000);

      // TODO: 实现具体的频率限制逻辑
      
      next();
    } catch (error) {
      logger.error('检查频率限制失败:', error);
      next(); // 出错时默认允许访问
    }
  };

  /**
   * 检查管理员权限
   */
  static requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '需要登录'
      });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    next();
  };

  /**
   * 检查工具管理权限
   */
  static checkToolManagePermission = async (req, res, next) => {
    try {
      // 检查是否为管理员
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          code: 403,
          message: '需要管理员权限'
        });
      }

      // 检查具体的工具管理权限
      const toolId = req.params.id;
      if (toolId && req.method !== 'POST') {
        const tool = await Tool.findById(toolId);
        if (!tool) {
          return res.status(404).json({
            code: 404,
            message: '工具不存在'
          });
        }

        // 检查是否有权限管理此工具
        // 可以根据需要添加更细粒度的权限控制
        req.tool = tool;
      }

      next();
    } catch (error) {
      logger.error('检查工具管理权限失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };

  /**
   * 检查分类管理权限
   */
  static checkCategoryManagePermission = async (req, res, next) => {
    try {
      // 检查是否为管理员
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          code: 403,
          message: '需要管理员权限'
        });
      }

      // 检查具体的分类管理权限
      const categoryId = req.params.id;
      if (categoryId && req.method !== 'POST') {
        const category = await ToolCategory.findById(categoryId);
        if (!category) {
          return res.status(404).json({
            code: 404,
            message: '分类不存在'
          });
        }

        req.category = category;
      }

      next();
    } catch (error) {
      logger.error('检查分类管理权限失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };

  /**
   * 检查工具使用权限（用于记录使用统计）
   */
  static checkToolUsagePermission = async (req, res, next) => {
    try {
      const toolId = req.params.id;
      const tool = await Tool.findOne({ id: toolId });
      
      if (!tool) {
        return res.status(404).json({
          code: 404,
          message: '工具不存在'
        });
      }

      // 检查工具是否可用
      if (tool.status !== 'active' && (!req.user || !req.user.isAdmin)) {
        return res.status(403).json({
          code: 403,
          message: '工具暂不可用'
        });
      }

      // 检查使用权限
      if (!tool.checkPermission(req.user)) {
        return res.status(403).json({
          code: 403,
          message: '没有使用权限'
        });
      }

      req.tool = tool;
      next();
    } catch (error) {
      logger.error('检查工具使用权限失败:', error);
      res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };

  /**
   * 创建权限检查中间件组合
   */
  static createPermissionChain = (...middlewares) => {
    return (req, res, next) => {
      let index = 0;
      
      const runNext = (err) => {
        if (err) return next(err);
        
        if (index >= middlewares.length) {
          return next();
        }
        
        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      };
      
      runNext();
    };
  };
}

module.exports = ToolsPermission;
