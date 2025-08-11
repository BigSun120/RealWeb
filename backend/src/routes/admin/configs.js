const express = require('express');
const { auth } = require('../../middleware/auth');
const ToolConfig = require('../../models/ToolConfig');
const ActivityLogger = require('../../middleware/activityLogger');
const ToolsPermission = require('../../middleware/toolsPermission');
const logger = require('../../utils/logger');

const router = express.Router();

// 应用权限验证
router.use(auth);
router.use(ToolsPermission.requireAdmin);

// 获取配置列表
router.get('/', async (req, res) => {
  try {
    const { group, includeSystem = false } = req.query;

    // 构建查询条件
    const query = {};
    if (group) query.group = group;
    if (includeSystem !== 'true') query.isSystem = { $ne: true };

    const configs = await ToolConfig.find(query)
      .sort({ group: 1, key: 1 });

    // 过滤敏感配置
    const filteredConfigs = configs.map(config => {
      const configObj = config.toObject();
      if (config.isSensitive && !req.user.isSuperAdmin) {
        configObj.value = '***';
      }
      return configObj;
    });

    res.json({
      code: 200,
      message: 'success',
      data: filteredConfigs
    });
  } catch (error) {
    logger.error('获取配置列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取配置列表失败'
    });
  }
});

// 获取配置分组
router.get('/groups', async (req, res) => {
  try {
    const groups = await ToolConfig.distinct('group');

    res.json({
      code: 200,
      message: 'success',
      data: groups
    });
  } catch (error) {
    logger.error('获取配置分组失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取配置分组失败'
    });
  }
});

// 获取单个配置
router.get('/:key', async (req, res) => {
  try {
    const config = await ToolConfig.findOne({ key: req.params.key });

    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    // 检查敏感配置权限
    if (config.isSensitive && !req.user.isSuperAdmin) {
      return res.status(403).json({
        code: 403,
        message: '没有权限访问此配置'
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: config
    });
  } catch (error) {
    logger.error('获取配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取配置失败'
    });
  }
});

// 设置配置值
router.put('/:key', async (req, res) => {
  try {
    const { value, description, group = 'general', isSensitive = false } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        code: 400,
        message: '配置值不能为空'
      });
    }

    // 检查是否为系统配置
    const existingConfig = await ToolConfig.findOne({ key: req.params.key });
    if (existingConfig && existingConfig.isSystem && !req.user.isSuperAdmin) {
      return res.status(403).json({
        code: 403,
        message: '没有权限修改系统配置'
      });
    }

    const config = await ToolConfig.setValue(req.params.key, value, {
      description,
      group,
      isSensitive,
      updatedBy: req.user._id
    });

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '更新工具配置',
      `更新了配置: ${req.params.key}`,
      req,
      config._id,
      'config'
    );

    res.json({
      code: 200,
      message: '配置更新成功',
      data: config
    });
  } catch (error) {
    logger.error('设置配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '设置配置失败'
    });
  }
});

// 批量设置配置
router.post('/batch', async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供配置列表'
      });
    }

    // 验证权限
    for (const config of configs) {
      const existingConfig = await ToolConfig.findOne({ key: config.key });
      if (existingConfig && existingConfig.isSystem && !req.user.isSuperAdmin) {
        return res.status(403).json({
          code: 403,
          message: `没有权限修改系统配置: ${config.key}`
        });
      }
    }

    const result = await ToolConfig.setMultiple(configs, req.user._id);

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '批量更新工具配置',
      `批量更新了 ${configs.length} 个配置`,
      req,
      null,
      'config'
    );

    res.json({
      code: 200,
      message: '批量设置成功',
      data: {
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      }
    });
  } catch (error) {
    logger.error('批量设置配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量设置失败'
    });
  }
});

// 删除配置
router.delete('/:key', async (req, res) => {
  try {
    const config = await ToolConfig.findOne({ key: req.params.key });

    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    // 检查是否为系统配置
    if (config.isSystem) {
      return res.status(403).json({
        code: 403,
        message: '不能删除系统配置'
      });
    }

    await ToolConfig.findOneAndDelete({ key: req.params.key });

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '删除工具配置',
      `删除了配置: ${req.params.key}`,
      req,
      config._id,
      'config'
    );

    res.json({
      code: 200,
      message: '配置删除成功'
    });
  } catch (error) {
    logger.error('删除配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除配置失败'
    });
  }
});

// 重置配置为默认值
router.post('/:key/reset', async (req, res) => {
  try {
    const config = await ToolConfig.findOne({ key: req.params.key });

    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    // 检查权限
    if (config.isSystem && !req.user.isSuperAdmin) {
      return res.status(403).json({
        code: 403,
        message: '没有权限重置系统配置'
      });
    }

    // 这里需要定义默认值映射
    const defaultValues = {
      'tools.enabled': true,
      'tools.requireAuth': false,
      'tools.maxUsagePerDay': 1000,
      'tools.maxUsagePerUser': 100,
      'analytics.enabled': true,
      'analytics.retentionDays': 90,
      'analytics.trackAnonymous': true,
      'cache.enabled': true,
      'cache.ttl': 3600,
      'security.rateLimitEnabled': true,
      'security.rateLimitWindow': 900,
      'security.rateLimitMax': 100
    };

    const defaultValue = defaultValues[req.params.key];
    if (defaultValue === undefined) {
      return res.status(400).json({
        code: 400,
        message: '该配置没有默认值'
      });
    }

    const oldValue = config.value;
    config.value = defaultValue;
    config.updatedBy = req.user._id;
    await config.save();

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '重置工具配置',
      `重置了配置: ${req.params.key}`,
      req,
      config._id,
      'config'
    );

    res.json({
      code: 200,
      message: '配置重置成功',
      data: config
    });
  } catch (error) {
    logger.error('重置配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '重置配置失败'
    });
  }
});

// 导出配置
router.get('/export/all', async (req, res) => {
  try {
    const { includeSystem = false, includeSensitive = false } = req.query;

    const query = {};
    if (includeSystem !== 'true') query.isSystem = { $ne: true };
    if (includeSensitive !== 'true') query.isSensitive = { $ne: true };

    const configs = await ToolConfig.find(query)
      .select('-_id -__v -createdAt -updatedAt -updatedBy')
      .sort({ group: 1, key: 1 });

    res.json({
      code: 200,
      message: 'success',
      data: {
        exportTime: new Date().toISOString(),
        configCount: configs.length,
        configs
      }
    });
  } catch (error) {
    logger.error('导出配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '导出配置失败'
    });
  }
});

// 导入配置
router.post('/import', async (req, res) => {
  try {
    const { configs, overwrite = false } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供配置列表'
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const configData of configs) {
      try {
        const existingConfig = await ToolConfig.findOne({ key: configData.key });

        if (existingConfig && !overwrite) {
          skippedCount++;
          continue;
        }

        if (existingConfig && existingConfig.isSystem && !req.user.isSuperAdmin) {
          errors.push(`跳过系统配置: ${configData.key}`);
          continue;
        }

        await ToolConfig.setValue(configData.key, configData.value, {
          ...configData,
          updatedBy: req.user._id
        });

        importedCount++;
      } catch (error) {
        errors.push(`导入配置 ${configData.key} 失败: ${error.message}`);
      }
    }

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '导入工具配置',
      `导入了 ${importedCount} 个配置`,
      req,
      null,
      'config'
    );

    res.json({
      code: 200,
      message: '配置导入完成',
      data: {
        importedCount,
        skippedCount,
        totalCount: configs.length,
        errors
      }
    });
  } catch (error) {
    logger.error('导入配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '导入配置失败'
    });
  }
});

module.exports = router;
