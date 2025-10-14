const PublicAIConnection = require('../models/PublicAIConnection');
const logger = require('../utils/logger');
const AIService = require('../services/AIService');

/**
 * 获取公共AI连接列表（带分页）
 */
exports.getPublicConnections = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const connections = await PublicAIConnection.find()
      .select('-apiKeyEncrypted') // 不返回加密的密钥
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await PublicAIConnection.countDocuments();

    // 转换 _id 为 id
    const formattedConnections = connections.map(conn => {
      const obj = conn.toObject();
      obj.id = obj._id;
      return obj;
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        connections: formattedConnections,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });

  } catch (error) {
    logger.error('获取公共连接列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败'
    });
  }
};

/**
 * 创建公共AI连接
 */
exports.createPublicConnection = async (req, res) => {
  try {
    const { name, description, provider, apiKey, endpoint, model, isActive, isDefault } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!name || !provider || !apiKey || !endpoint || !model) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填字段'
      });
    }

    // 创建连接
    const connection = new PublicAIConnection({
      name,
      description,
      provider,
      apiKey, // 直接使用明文密钥
      endpoint,
      model,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      createdBy: userId,
      lastModifiedBy: userId
    });

    await connection.save();

    // 返回数据
    const connectionData = connection.toObject();
    connectionData.id = connectionData._id; // 添加 id 字段

    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: connectionData
    });

  } catch (error) {
    logger.error('创建公共连接失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '创建失败'
    });
  }
};

/**
 * 更新公共AI连接
 */
exports.updatePublicConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, apiKey, endpoint, model, isActive, isDefault } = req.body;
    const userId = req.user.id;

    const connection = await PublicAIConnection.findById(id);
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    // 更新字段
    if (name !== undefined) connection.name = name;
    if (description !== undefined) connection.description = description;
    if (apiKey !== undefined && apiKey !== '') connection.apiKey = apiKey; // 直接更新密钥
    if (endpoint !== undefined) connection.endpoint = endpoint;
    if (model !== undefined) connection.model = model;
    if (isActive !== undefined) connection.isActive = isActive;
    if (isDefault !== undefined) connection.isDefault = isDefault;
    connection.lastModifiedBy = userId;

    await connection.save();

    // 返回数据
    const connectionData = connection.toObject();
    connectionData.id = connectionData._id; // 添加 id 字段

    res.json({
      code: 200,
      message: '更新成功',
      data: connectionData
    });

  } catch (error) {
    logger.error('更新公共连接失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '更新失败'
    });
  }
};

/**
 * 删除公共AI连接
 */
exports.deletePublicConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PublicAIConnection.findByIdAndDelete(id);
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
    logger.error('删除公共连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除失败'
    });
  }
};

/**
 * 切换公共连接的启用状态
 */
exports.toggleConnectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const userId = req.user.id;

    const connection = await PublicAIConnection.findById(id);
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    connection.isActive = isActive;
    connection.lastModifiedBy = userId;
    await connection.save();

    res.json({
      code: 200,
      message: `已${isActive ? '启用' : '禁用'}`,
      data: {
        id: connection._id,
        isActive: connection.isActive
      }
    });

  } catch (error) {
    logger.error('切换连接状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '操作失败'
    });
  }
};

/**
 * 设置为默认连接
 */
exports.setDefaultConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await PublicAIConnection.findById(id);
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    connection.isDefault = true;
    connection.lastModifiedBy = userId;
    await connection.save();

    res.json({
      code: 200,
      message: '已设为默认连接',
      data: {
        id: connection._id,
        isDefault: connection.isDefault
      }
    });

  } catch (error) {
    logger.error('设置默认连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '操作失败'
    });
  }
};

/**
 * 测试公共连接
 * 使用统一的AIService进行验证，与用户AI连接验证逻辑保持一致
 */
exports.testConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PublicAIConnection.findById(id);
    if (!connection) {
      return res.status(404).json({
        code: 404,
        message: '连接不存在'
      });
    }

    // 使用AIService进行验证
    const result = await AIService.validateApiKey(
      connection.provider,
      connection.endpoint,
      connection.apiKey,
      connection.model
    );

    // 更新验证状态
    await connection.updateValidation(result.valid, result.error);

    const testResult = {
      success: result.valid,
      message: result.valid ? '连接测试成功' : '连接测试失败',
      model: connection.model,
      provider: connection.provider,
      error: result.error
    };

    res.json({
      code: 200,
      message: '测试完成',
      data: testResult
    });

  } catch (error) {
    logger.error('测试连接失败:', error);
    res.status(500).json({
      code: 500,
      message: '测试失败',
      error: error.message
    });
  }
};
