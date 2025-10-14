const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../../middleware/auth');
const AIConfig = require('../../models/AIConfig');
const logger = require('../../utils/logger');
const axios = require('axios');
const providerTemplates = require('../../config/aiProviderTemplates');

const router = express.Router();

// 所有路由需要管理员权限
router.use(auth);
router.use(adminAuth);

/**
 * @route   GET /api/admin/ai-config/templates
 * @desc    获取所有可用的Provider模板
 * @access  Admin
 */
router.get('/templates', (req, res) => {
  try {
    const templates = {};
    const templateNames = providerTemplates.getAllTemplates();
    
    templateNames.forEach(name => {
      const template = providerTemplates.getTemplate(name);
      // 只返回基本信息，不包含敏感数据
      templates[name] = {
        provider: template.provider,
        displayName: template.displayName,
        providerType: template.providerType,
        baseURL: template.baseURL,
        defaultModel: template.defaultModel,
        modelsCount: template.models?.presets?.length || 0,
        capabilities: template.models?.presets?.[0]?.capabilities || []
      };
    });
    
    res.json({
      code: 200,
      data: templates
    });
  } catch (error) {
    logger.error('获取模板列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取模板列表失败'
    });
  }
});

/**
 * @route   GET /api/admin/ai-config/templates/:templateName
 * @desc    获取指定模板的完整配置
 * @access  Admin
 */
router.get('/templates/:templateName', (req, res) => {
  try {
    const template = providerTemplates.getTemplate(req.params.templateName);
    
    if (!template) {
      return res.status(404).json({
        code: 404,
        message: '模板不存在'
      });
    }
    
    // 返回完整配置（用于快速填充表单）
    res.json({
      code: 200,
      data: template
    });
  } catch (error) {
    logger.error('获取模板详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取模板详情失败'
    });
  }
});

/**
 * @route   GET /api/admin/ai-config
 * @desc    获取AI配置列表
 * @access  Admin
 */
router.get('/', async (req, res, next) => {
  try {
    const configs = await AIConfig.find()
      .populate('lastModifiedBy', 'username email')
      .sort({ createdAt: -1 });

    // 脱敏：不返回真实密钥
    const sanitized = configs.map(config => {
      const obj = config.toObject();
      if (obj.providers) {
        obj.providers = obj.providers.map(p => {
          if (p.apiKeys) {
            p.apiKeys = p.apiKeys.map(k => ({
              _id: k._id,
              keyMask: k.keyMask,
              label: k.label,
              weight: k.weight,
              isActive: k.isActive,
              usage: k.usage
            }));
          }
          return p;
        });
      }
      return obj;
    });

    res.json({
      code: 200,
      data: sanitized
    });
  } catch (error) {
    logger.error('获取AI配置失败:', error);
    next(error);
  }
});

/**
 * @route   GET /api/admin/ai-config/:id
 * @desc    获取单个AI配置详情
 * @access  Admin
 */
router.get('/:id', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id)
      .populate('lastModifiedBy', 'username email');

    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    // 脱敏
    const obj = config.toObject();
    if (obj.providers) {
      obj.providers = obj.providers.map(p => {
        if (p.apiKeys) {
          p.apiKeys = p.apiKeys.map(k => ({
            _id: k._id,
            keyMask: k.keyMask,
            label: k.label,
            weight: k.weight,
            isActive: k.isActive,
            usage: k.usage
          }));
        }
        return p;
      });
    }

    res.json({
      code: 200,
      data: obj
    });
  } catch (error) {
    logger.error('获取AI配置详情失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/ai-config
 * @desc    创建AI配置
 * @access  Admin
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('配置名称不能为空'),
    body('description').optional().trim(),
    body('providers').isArray().withMessage('providers必须是数组')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          code: 422,
          message: '参数校验失败',
          errors: errors.array()
        });
      }

      const { name, description, providers, routingStrategy, fallbackStrategy, quota, features, monitoring } = req.body;

      // 检查名称是否已存在
      const existing = await AIConfig.findOne({ name });
      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '配置名称已存在'
        });
      }

      const config = new AIConfig({
        name,
        description,
        providers: [],
        routingStrategy,
        fallbackStrategy,
        quota,
        features,
        monitoring,
        lastModifiedBy: req.user._id
      });

      // 处理providers（加密密钥）
      if (providers && providers.length > 0) {
        for (const p of providers) {
          const providerData = {
            provider: p.provider,
            displayName: p.displayName,
            enabled: p.enabled !== false,
            baseURL: p.baseURL,
            defaultModel: p.defaultModel,
            availableModels: p.availableModels || [],
            defaultParams: p.defaultParams || {},
            rateLimit: p.rateLimit || {},
            timeout: p.timeout || 60000,
            retry: p.retry || {},
            apiKeys: []
          };

          // 加密API密钥
          if (p.apiKeys && p.apiKeys.length > 0) {
            for (const key of p.apiKeys) {
              if (key.plainKey) {
                const encrypted = config.encryptApiKey(key.plainKey);
                providerData.apiKeys.push({
                  keyEncrypted: encrypted.keyEncrypted,
                  keyMask: encrypted.keyMask,
                  label: key.label || '默认密钥',
                  weight: key.weight || 1,
                  isActive: key.isActive !== false,
                  usage: {
                    totalRequests: 0,
                    totalTokens: 0,
                    totalCost: 0
                  }
                });
              }
            }
          }

          config.providers.push(providerData);
        }
      }

      await config.save();

      logger.info('AI配置已创建', {
        userId: req.user._id,
        configId: config._id,
        name: config.name
      });

      res.status(201).json({
        code: 201,
        message: '配置创建成功',
        data: { id: config._id }
      });
    } catch (error) {
      logger.error('创建AI配置失败:', error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/admin/ai-config/:id
 * @desc    更新AI配置
 * @access  Admin
 */
router.put('/:id', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    const { description, isActive, routingStrategy, fallbackStrategy, quota, features, monitoring } = req.body;

    // 更新基本字段
    if (description !== undefined) config.description = description;
    if (isActive !== undefined) config.isActive = isActive;
    if (routingStrategy) config.routingStrategy = routingStrategy;
    if (fallbackStrategy) config.fallbackStrategy = fallbackStrategy;
    if (quota) config.quota = { ...config.quota, ...quota };
    if (features) config.features = { ...config.features, ...features };
    if (monitoring) config.monitoring = { ...config.monitoring, ...monitoring };

    config.lastModifiedBy = req.user._id;
    await config.save();

    logger.info('AI配置已更新', {
      userId: req.user._id,
      configId: config._id
    });

    res.json({
      code: 200,
      message: '配置更新成功'
    });
  } catch (error) {
    logger.error('更新AI配置失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/ai-config/:id/providers
 * @desc    添加Provider
 * @access  Admin
 */
router.post('/:id/providers', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    const { provider, displayName, baseURL, defaultModel, apiKeys } = req.body;

    const providerData = {
      provider,
      displayName,
      enabled: true,
      baseURL,
      defaultModel,
      apiKeys: []
    };

    // 加密API密钥
    if (apiKeys && apiKeys.length > 0) {
      for (const key of apiKeys) {
        if (key.plainKey) {
          const encrypted = config.encryptApiKey(key.plainKey);
          providerData.apiKeys.push({
            keyEncrypted: encrypted.keyEncrypted,
            keyMask: encrypted.keyMask,
            label: key.label || '默认密钥',
            weight: key.weight || 1,
            isActive: true,
            usage: {
              totalRequests: 0,
              totalTokens: 0,
              totalCost: 0
            }
          });
        }
      }
    }

    config.providers.push(providerData);
    config.lastModifiedBy = req.user._id;
    await config.save();

    res.json({
      code: 200,
      message: 'Provider添加成功'
    });
  } catch (error) {
    logger.error('添加Provider失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/ai-config/:id/providers/:providerId/keys
 * @desc    为Provider添加密钥
 * @access  Admin
 */
router.post('/:id/providers/:providerId/keys', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    const provider = config.providers.id(req.params.providerId);
    if (!provider) {
      return res.status(404).json({
        code: 404,
        message: 'Provider不存在'
      });
    }

    const { plainKey, label, weight } = req.body;
    if (!plainKey) {
      return res.status(400).json({
        code: 400,
        message: '密钥不能为空'
      });
    }

    const encrypted = config.encryptApiKey(plainKey);
    provider.apiKeys.push({
      keyEncrypted: encrypted.keyEncrypted,
      keyMask: encrypted.keyMask,
      label: label || '新密钥',
      weight: weight || 1,
      isActive: true,
      usage: {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0
      }
    });

    config.lastModifiedBy = req.user._id;
    await config.save();

    res.json({
      code: 200,
      message: '密钥添加成功'
    });
  } catch (error) {
    logger.error('添加密钥失败:', error);
    next(error);
  }
});

/**
 * @route   PATCH /api/admin/ai-config/:id/providers/:providerId/keys/:keyId
 * @desc    更新密钥状态或权重
 * @access  Admin
 */
router.patch('/:id/providers/:providerId/keys/:keyId', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    const provider = config.providers.id(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ code: 404, message: 'Provider不存在' });
    }

    const key = provider.apiKeys.id(req.params.keyId);
    if (!key) {
      return res.status(404).json({ code: 404, message: '密钥不存在' });
    }

    const { isActive, weight, label } = req.body;
    if (isActive !== undefined) key.isActive = isActive;
    if (weight !== undefined) key.weight = weight;
    if (label) key.label = label;

    config.lastModifiedBy = req.user._id;
    await config.save();

    res.json({
      code: 200,
      message: '密钥更新成功'
    });
  } catch (error) {
    logger.error('更新密钥失败:', error);
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/ai-config/:id/providers/:providerId/keys/:keyId
 * @desc    删除密钥
 * @access  Admin
 */
router.delete('/:id/providers/:providerId/keys/:keyId', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    const provider = config.providers.id(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ code: 404, message: 'Provider不存在' });
    }

    provider.apiKeys.pull(req.params.keyId);
    config.lastModifiedBy = req.user._id;
    await config.save();

    res.json({
      code: 200,
      message: '密钥删除成功'
    });
  } catch (error) {
    logger.error('删除密钥失败:', error);
    next(error);
  }
});

/**
 * @route   POST /api/admin/ai-config/test-connection
 * @desc    测试API连接（不保存）
 * @access  Admin
 */
router.post('/test-connection', async (req, res, next) => {
  try {
    const { provider, baseURL, apiKey, model } = req.body;

    if (!provider || !baseURL || !apiKey) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 发送测试请求
    const testModel = model || 'deepseek-chat';
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: testModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const latency = Date.now() - startTime;

      res.json({
        code: 200,
        message: '连接测试成功',
        data: {
          success: true,
          latency,
          model: response.data.model,
          provider
        }
      });
    } catch (error) {
      res.status(500).json({
        code: 500,
        message: '连接测试失败',
        data: {
          success: false,
          error: error.response?.data?.error?.message || error.message
        }
      });
    }
  } catch (error) {
    logger.error('测试连接失败:', error);
    next(error);
  }
});

/**
 * @route   GET /api/admin/ai-config/:id/usage
 * @desc    获取配置的使用统计
 * @access  Admin
 */
router.get('/:id/usage', async (req, res, next) => {
  try {
    const config = await AIConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '配置不存在'
      });
    }

    // 汇总所有provider的用量
    const usage = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: []
    };

    for (const provider of config.providers) {
      const providerUsage = {
        provider: provider.provider,
        displayName: provider.displayName,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        keys: []
      };

      for (const key of provider.apiKeys) {
        providerUsage.totalRequests += key.usage.totalRequests || 0;
        providerUsage.totalTokens += key.usage.totalTokens || 0;
        providerUsage.totalCost += key.usage.totalCost || 0;

        providerUsage.keys.push({
          label: key.label,
          keyMask: key.keyMask,
          usage: key.usage
        });
      }

      usage.totalRequests += providerUsage.totalRequests;
      usage.totalTokens += providerUsage.totalTokens;
      usage.totalCost += providerUsage.totalCost;
      usage.byProvider.push(providerUsage);
    }

    res.json({
      code: 200,
      data: usage
    });
  } catch (error) {
    logger.error('获取使用统计失败:', error);
    next(error);
  }
});

module.exports = router;
