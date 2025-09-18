const express = require('express');
const mongoose = require('mongoose');
const { adminAuth } = require('../../middleware/auth');
const TempEmailActivationCode = require('../../models/TempEmailActivationCode');
const TempEmailUsageLog = require('../../models/TempEmailUsageLog');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * 获取激活码列表
 * GET /api/admin/temp-email-activation-codes
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, usage } = req.query;

    // 构建查询条件
    const query = {};
    const andConditions = [];

    // 状态筛选
    if (status === 'active') {
      query.isActive = true;
      andConditions.push({
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.expiresAt = { $lte: new Date() };
    } else if (status === 'exhausted') {
      query.$expr = {
        $and: [
          { $gt: ['$maxUses', 0] },
          { $gte: ['$currentUses', '$maxUses'] }
        ]
      };
    }

    // 使用状态筛选
    if (usage === 'unused') {
      query.currentUses = 0;
    } else if (usage === 'used') {
      query.currentUses = { $gt: 0 };
    }

    // 搜索条件
    if (search) {
      andConditions.push({
        $or: [
          { code: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // 合并 $and 条件
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // 分页查询
    const skip = (page - 1) * limit;

    const codes = await TempEmailActivationCode.find(query)
      .populate('createdBy', 'username email displayName')
      .populate('lastUsedBy', 'username email displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TempEmailActivationCode.countDocuments(query);

    res.json({
      code: 200,
      success: true,
      data: {
        codes,
        total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: '获取激活码列表成功'
    });

  } catch (error) {
    logger.error('获取激活码列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取激活码列表失败'
    });
  }
});

/**
 * 获取激活码统计信息
 * GET /api/admin/temp-email-activation-codes/stats
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await TempEmailActivationCode.getStats();

    res.json({
      code: 200,
      success: true,
      data: stats,
      message: '获取统计信息成功'
    });

  } catch (error) {
    logger.error('获取激活码统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

/**
 * 批量切换激活码状态
 * PATCH /api/admin/temp-email-activation-codes/batch/toggle
 */
router.patch('/batch/toggle', adminAuth, async (req, res) => {
  try {
    const { ids, isActive } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请提供要操作的激活码ID列表'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请提供有效的状态值'
      });
    }

    // 验证ObjectId格式
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '无效的激活码ID格式'
      });
    }

    // 批量更新状态
    const result = await TempEmailActivationCode.updateMany(
      { _id: { $in: validIds } },
      { isActive }
    );

    const action = isActive ? '启用' : '禁用';
    logger.info(`管理员 ${req.user?.username || 'unknown'} 批量${action}了 ${result.modifiedCount} 个激活码`);

    res.json({
      code: 200,
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `成功${action} ${result.modifiedCount} 个激活码`
    });

  } catch (error) {
    logger.error('批量切换激活码状态失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '批量操作失败'
    });
  }
});

/**
 * 批量删除激活码
 * DELETE /api/admin/temp-email-activation-codes/batch
 */
router.delete('/batch', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请提供要删除的激活码ID列表'
      });
    }

    // 验证ObjectId格式
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '无效的激活码ID格式'
      });
    }

    // 获取要删除的激活码信息（用于日志）
    const codesToDelete = await TempEmailActivationCode.find({ _id: { $in: validIds } });

    // 批量删除
    const result = await TempEmailActivationCode.deleteMany({ _id: { $in: validIds } });

    logger.info(`管理员 ${req.user?.username || 'unknown'} 批量删除了 ${result.deletedCount} 个激活码`, {
      deletedCodes: codesToDelete.map(code => code.code)
    });

    res.json({
      code: 200,
      success: true,
      data: {
        deletedCount: result.deletedCount
      },
      message: `成功删除 ${result.deletedCount} 个激活码`
    });

  } catch (error) {
    logger.error('批量删除激活码失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '批量删除失败'
    });
  }
});

/**
 * 创建单个激活码
 * POST /api/admin/temp-email-activation-codes
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      code,
      description,
      maxUses = -1,
      expiresAt = null
    } = req.body;

    // 验证输入 - 描述可以为空，但不能是null或undefined
    const finalDescription = description || '临时邮箱激活码';

    // 生成或验证激活码
    let finalCode = code;
    if (!finalCode) {
      finalCode = TempEmailActivationCode.generateCode();
    }

    // 检查激活码是否已存在
    const existingCode = await TempEmailActivationCode.findOne({ code: finalCode });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: '激活码已存在'
      });
    }

    // 创建激活码
    const activationCode = new TempEmailActivationCode({
      code: finalCode,
      description: finalDescription,
      maxUses,
      expiresAt,
      createdBy: req.user._id
    });

    await activationCode.save();

    logger.info(`管理员 ${req.user.username} 创建了激活码: ${finalCode}`);

    res.json({
      code: 200,
      success: true,
      data: activationCode,
      message: '激活码创建成功'
    });

  } catch (error) {
    logger.error('创建激活码失败:', error);
    res.status(500).json({
      success: false,
      message: '创建激活码失败'
    });
  }
});

/**
 * 批量创建激活码
 * POST /api/admin/temp-email-activation-codes/batch
 */
router.post('/batch', adminAuth, async (req, res) => {
  try {
    const {
      count,
      description = '',
      maxUses = -1,
      expiresAt = null
    } = req.body;

    // 验证输入
    if (!count || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        message: '数量必须在1-100之间'
      });
    }

    // 批量创建
    const codes = await TempEmailActivationCode.createBatch(count, {
      description: description || `批量创建 ${count} 个激活码`,
      maxUses,
      expiresAt,
      createdBy: req.user._id
    });

    logger.info(`管理员 ${req.user.username} 批量创建了 ${count} 个激活码`);

    res.json({
      code: 200,
      success: true,
      data: {
        codes,
        count: codes.length
      },
      message: `成功创建 ${codes.length} 个激活码`
    });

  } catch (error) {
    logger.error('批量创建激活码失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量创建激活码失败'
    });
  }
});

/**
 * 更新激活码
 * PUT /api/admin/temp-email-activation-codes/:id
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      maxUses,
      expiresAt
    } = req.body;

    const activationCode = await TempEmailActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    // 更新字段
    if (description !== undefined) activationCode.description = description;
    if (maxUses !== undefined) activationCode.maxUses = maxUses;
    if (expiresAt !== undefined) activationCode.expiresAt = expiresAt;

    await activationCode.save();

    logger.info(`管理员 ${req.user.username} 更新了激活码: ${activationCode.code}`);

    res.json({
      code: 200,
      success: true,
      data: activationCode,
      message: '激活码更新成功'
    });

  } catch (error) {
    logger.error('更新激活码失败:', error);
    res.status(500).json({
      success: false,
      message: '更新激活码失败'
    });
  }
});

/**
 * 切换激活码状态
 * PATCH /api/admin/temp-email-activation-codes/:id/toggle
 */
router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const activationCode = await TempEmailActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    // 切换状态
    activationCode.isActive = !activationCode.isActive;
    await activationCode.save();

    const action = activationCode.isActive ? '启用' : '禁用';
    logger.info(`管理员 ${req.user.username} ${action}了激活码: ${activationCode.code}`);

    res.json({
      code: 200,
      success: true,
      data: activationCode,
      message: `激活码${action}成功`
    });

  } catch (error) {
    logger.error('切换激活码状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换激活码状态失败'
    });
  }
});

/**
 * 删除激活码
 * DELETE /api/admin/temp-email-activation-codes/:id
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const activationCode = await TempEmailActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    await TempEmailActivationCode.findByIdAndDelete(id);

    logger.info(`管理员 ${req.user.username} 删除了激活码: ${activationCode.code}`);

    res.json({
      code: 200,
      success: true,
      message: '激活码删除成功'
    });

  } catch (error) {
    logger.error('删除激活码失败:', error);
    res.status(500).json({
      success: false,
      message: '删除激活码失败'
    });
  }
});

/**
 * 获取激活码使用记录
 * GET /api/admin/temp-email-activation-codes/:id/usage
 */
router.get('/:id/usage', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const activationCode = await TempEmailActivationCode.findById(id);
    if (!activationCode) {
      return res.status(404).json({
        success: false,
        message: '激活码不存在'
      });
    }

    // 获取使用记录
    const skip = (page - 1) * limit;
    const usageLogs = await TempEmailUsageLog.find({
      activationCode: activationCode.code,
      action: 'activate'
    })
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TempEmailUsageLog.countDocuments({
      activationCode: activationCode.code,
      action: 'activate'
    });

    res.json({
      code: 200,
      success: true,
      data: {
        activationCode,
        usageLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      message: '获取使用记录成功'
    });

  } catch (error) {
    logger.error('获取激活码使用记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取使用记录失败'
    });
  }
});

module.exports = router;
