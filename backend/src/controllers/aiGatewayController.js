const AIGatewayService = require('../services/AIGatewayService');
const UserAIConnection = require('../models/UserAIConnection');
const logger = require('../utils/logger');

/**
 * AI生成接口
 */
exports.generate = async (req, res) => {
  try {
    const { messages, provider, model, temperature, maxTokens, requireUserKey } = req.body;
    const userId = req.user?.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '消息内容不能为空'
      });
    }

    const result = await AIGatewayService.generate(userId, {
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      stream: false,
      requireUserKey: requireUserKey || false
    });

    if (result.success) {
      res.json({
        code: 200,
        message: '生成成功',
        data: {
          content: result.content,
          usage: result.usage,
          model: result.model,
          latency: result.latency
        }
      });
    } else {
      res.status(500).json({
        code: 500,
        message: '生成失败',
        error: result.error,
        errorType: result.errorType
      });
    }

  } catch (error) {
    logger.error('AI生成失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '生成失败'
    });
  }
};

/**
 * 流式生成接口（SSE）
 */
exports.generateStream = async (req, res) => {
  try {
    const { messages, provider, model, temperature, maxTokens, requireUserKey } = req.body;
    const userId = req.user?.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '消息内容不能为空'
      });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await AIGatewayService.generateStream(
      userId,
      {
        messages,
        provider,
        model,
        temperature,
        maxTokens,
        requireUserKey: requireUserKey || false
      },
      (content, data) => {
        // 发送数据块
        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
      },
      (result) => {
        // 发送完成事件
        res.write(`data: ${JSON.stringify({ type: 'done', usage: result.usage })}\n\n`);
        res.end();
      },
      (error) => {
        // 发送错误事件
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      }
    );

  } catch (error) {
    logger.error('流式生成失败:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * 获取用户的AI连接列表
 */
exports.getUserConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const connections = await UserAIConnection.find({ user: userId })
      .select('-__v')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      code: 200,
      message: '获取成功',
      data: connections
    });

  } catch (error) {
    logger.error('获取用户连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败'
    });
  }
};

/**
 * 创建用户AI连接
 */
exports.createUserConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      provider,
      providerDisplayName,
      baseURL,
      apiKey,
      defaultModel,
      availableModels,
      requestParams,
      timeout,
      isDefault
    } = req.body;

    // 验证必填字段
    if (!provider || !baseURL || !apiKey || !defaultModel) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段'
      });
    }

    // 创建连接
    const connection = new UserAIConnection({
      user: userId,
      name: name || '我的AI连接',
      description,
      provider,
      providerDisplayName,
      baseURL,
      apiKey, // 直接存储明文API密钥
      defaultModel,
      availableModels,
      requestParams,
      timeout,
      isDefault: isDefault || false
    });

    const savedConnection = await connection.save();

    // 返回连接数据
    const connectionData = savedConnection.toObject();
    delete connectionData.__v;

    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: connectionData
    });

  } catch (error) {
    logger.error('创建用户连接失败:', error);
    logger.error('错误堆栈:', error.stack);
    res.status(500).json({
      code: 500,
      message: error.message || '创建失败'
    });
  }
};

/**
 * 更新用户AI连接
 */
exports.updateUserConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      description,
      provider,  // 添加provider字段
      providerDisplayName,  // 添加providerDisplayName字段
      baseURL,
      apiKey,
      defaultModel,
      availableModels,
      requestParams,
      timeout,
      isDefault,
      isActive
    } = req.body;

    const connection = await UserAIConnection.findOne({ _id: id, user: userId });
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    // 更新字段
    if (name !== undefined) connection.name = name;
    if (description !== undefined) connection.description = description;
    if (provider !== undefined) connection.provider = provider;  // 更新provider
    if (providerDisplayName !== undefined) connection.providerDisplayName = providerDisplayName;  // 更新providerDisplayName
    if (baseURL !== undefined) connection.baseURL = baseURL;
    if (defaultModel !== undefined) connection.defaultModel = defaultModel;
    if (availableModels !== undefined) connection.availableModels = availableModels;
    if (requestParams !== undefined) connection.requestParams = requestParams;
    if (timeout !== undefined) connection.timeout = timeout;
    if (isDefault !== undefined) connection.isDefault = isDefault;
    if (isActive !== undefined) connection.isActive = isActive;

    // 如果提供了新的API密钥，直接更新
    if (apiKey) {
      connection.apiKey = apiKey;
    }

    await connection.save();

    // 返回连接数据
    const connectionData = connection.toObject();
    delete connectionData.__v;

    res.json({
      code: 200,
      message: '更新成功',
      data: connectionData
    });

  } catch (error) {
    logger.error('更新用户连接失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '更新失败'
    });
  }
};

/**
 * 删除用户AI连接
 */
exports.deleteUserConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const connection = await UserAIConnection.findOneAndDelete({ _id: id, user: userId });
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    res.json({
      code: 200,
      message: '删除成功'
    });

  } catch (error) {
    logger.error('删除用户连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除失败'
    });
  }
};

/**
 * 验证用户AI连接
 */
exports.validateUserConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await AIGatewayService.validateConnection(userId, id, true);

    res.json({
      code: 200,
      message: '验证完成',
      data: result
    });

  } catch (error) {
    logger.error('验证用户连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '验证失败'
    });
  }
};

/**
 * 获取用户使用统计
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;

    const stats = await AIGatewayService.getUserUsageStats(userId, period || 'month');

    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    });

  } catch (error) {
    logger.error('获取用户统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败'
    });
  }
};

/**
 * 获取平台使用统计（仅管理员）
 */
exports.getPlatformStats = async (req, res) => {
  try {
    const stats = await AIGatewayService.getPlatformUsageStats();

    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    });

  } catch (error) {
    logger.error('获取平台统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败'
    });
  }
};
