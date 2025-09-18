const express = require('express');
const { auth } = require('../middleware/auth');
const TempEmailActivationCode = require('../models/TempEmailActivationCode');
const TempEmailUsageLog = require('../models/TempEmailUsageLog');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 检查用户临时邮箱权限状态
 * GET /api/temp-email-auth/access-status
 */
router.get('/access-status', auth, async (req, res) => {
  try {
    const user = req.user;

    const hasAccess = await user.hasTempEmailAccess();

    const status = {
      hasAccess: hasAccess,
      isAdmin: user.isAdmin,
      tempEmailAccess: user.tempEmailAccess || {
        enabled: false,
        activatedAt: null,
        activatedBy: null,
        expiresAt: null,
        lastUsedAt: null
      }
    };

    // 如果有权限，添加额外信息
    if (status.hasAccess) {
      status.remainingTime = null;
      if (user.tempEmailAccess?.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(user.tempEmailAccess.expiresAt);
        if (expiresAt > now) {
          status.remainingTime = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)); // 剩余天数
        }
      }
    }

    res.json({
      code: 200,
      success: true,
      data: status,
      message: '权限状态查询成功'
    });

  } catch (error) {
    logger.error('查询权限状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询权限状态失败'
    });
  }
});

/**
 * 验证用户激活码状态（深度检查）
 * GET /api/temp-email-auth/validate-codes
 */
router.get('/validate-codes', auth, async (req, res) => {
  try {
    const user = req.user;

    // 强制重新检查权限状态
    const hasAccess = await user.hasTempEmailAccess();

    // 收集激活码信息
    let activationCodes = [];
    if (user.tempEmailAccess) {
      if (user.tempEmailAccess.activationCodes && user.tempEmailAccess.activationCodes.length > 0) {
        activationCodes = user.tempEmailAccess.activationCodes;
      } else if (user.tempEmailAccess.activatedBy) {
        activationCodes = [user.tempEmailAccess.activatedBy];
      }
    }

    // 检查每个激活码的详细状态
    const codeDetails = [];
    if (activationCodes.length > 0) {
      const codes = await TempEmailActivationCode.find({
        code: { $in: activationCodes }
      });

      for (const codeStr of activationCodes) {
        const codeDoc = codes.find(c => c.code === codeStr);
        codeDetails.push({
          code: codeStr,
          exists: !!codeDoc,
          isActive: codeDoc ? codeDoc.isActive : false,
          expiresAt: codeDoc ? codeDoc.expiresAt : null
        });
      }
    }

    logger.info(`用户 ${user.username} 激活码验证结果:`, {
      hasAccess,
      activationCodes,
      codeDetails
    });

    res.json({
      code: 200,
      success: true,
      message: '激活码验证完成',
      data: {
        hasAccess,
        activationCodes,
        codeDetails,
        tempEmailAccess: user.tempEmailAccess
      }
    });

  } catch (error) {
    logger.error('验证激活码状态失败:', error);
    res.status(500).json({
      success: false,
      message: '验证激活码状态失败',
      code: 'VALIDATION_ERROR'
    });
  }
});

/**
 * 激活临时邮箱权限
 * POST /api/temp-email-auth/activate
 */
router.post('/activate', auth, async (req, res) => {
  try {
    const { activationCode } = req.body;
    const user = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // 验证输入
    if (!activationCode) {
      return res.status(400).json({
        success: false,
        message: '激活验证码不能为空',
        code: 'ACTIVATION_CODE_REQUIRED'
      });
    }

    // 允许所有用户（包括已激活用户）继续激活更多激活码
    // 已激活用户激活新码时，时间不叠加，取最长的过期时间

    // 查找可用的激活码
    const codeDoc = await TempEmailActivationCode.findAvailableByCode(activationCode);

    if (!codeDoc) {
      // 记录失败日志
      await TempEmailUsageLog.logAction({
        userId: user._id,
        action: 'activate',
        activationCode,
        ipAddress,
        userAgent,
        result: 'failure',
        errorMessage: '激活验证码无效或已过期'
      });

      return res.status(400).json({
        success: false,
        message: '激活验证码无效或已过期',
        code: 'INVALID_ACTIVATION_CODE'
      });
    }

    // 检查验证码是否可用
    if (!codeDoc.canUse()) {
      // 记录失败日志
      await TempEmailUsageLog.logAction({
        userId: user._id,
        action: 'activate',
        activationCode,
        ipAddress,
        userAgent,
        result: 'failure',
        errorMessage: '激活验证码已达到使用上限'
      });

      return res.status(400).json({
        success: false,
        message: '激活验证码已达到使用上限',
        code: 'ACTIVATION_CODE_EXHAUSTED'
      });
    }

    // 使用验证码
    codeDoc.use(user._id);
    await codeDoc.save();

    // 激活用户权限
    user.activateTempEmailAccess(activationCode, codeDoc.expiresAt);
    await user.save();

    // 记录成功日志
    await TempEmailUsageLog.logAction({
      userId: user._id,
      action: 'activate',
      activationCode,
      ipAddress,
      userAgent,
      result: 'success',
      details: {
        codeId: codeDoc._id,
        expiresAt: codeDoc.expiresAt
      }
    });

    logger.info(`用户 ${user.username} 成功激活临时邮箱权限，使用激活码: ${activationCode}`);

    res.json({
      code: 200,
      success: true,
      message: '临时邮箱权限激活成功',
      data: {
        activatedAt: user.tempEmailAccess.activatedAt,
        expiresAt: user.tempEmailAccess.expiresAt
      }
    });

  } catch (error) {
    logger.error('激活临时邮箱权限失败:', error);

    // 记录错误日志
    try {
      await TempEmailUsageLog.logAction({
        userId: req.user?._id,
        action: 'activate',
        activationCode: req.body?.activationCode,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        result: 'error',
        errorMessage: error.message
      });
    } catch (logError) {
      logger.error('记录激活失败日志时出错:', logError);
    }

    res.status(500).json({
      success: false,
      message: '激活临时邮箱权限失败',
      code: 'ACTIVATION_ERROR'
    });
  }
});

/**
 * 获取用户使用统计
 * GET /api/temp-email-auth/usage-stats
 */
router.get('/usage-stats', auth, async (req, res) => {
  try {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;

    // 检查权限
    if (!user.hasTempEmailAccess()) {
      return res.status(403).json({
        success: false,
        message: '需要临时邮箱权限才能查看统计信息',
        code: 'ACCESS_DENIED'
      });
    }

    const stats = await TempEmailUsageLog.getUserStats(user._id, days);

    res.json({
      success: true,
      data: {
        period: `${days}天`,
        stats
      },
      message: '使用统计查询成功'
    });

  } catch (error) {
    logger.error('查询使用统计失败:', error);
    res.status(500).json({
      success: false,
      message: '查询使用统计失败'
    });
  }
});

/**
 * 撤销临时邮箱权限（仅管理员）
 * POST /api/temp-email-auth/revoke/:userId
 */
router.post('/revoke/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // 检查管理员权限
    if (!adminUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以撤销用户权限',
        code: 'ADMIN_REQUIRED'
      });
    }

    // 查找目标用户
    const User = require('../models/User');
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 检查用户是否有权限
    const hasAccess = await targetUser.hasTempEmailAccess();
    if (!hasAccess) {
      return res.status(400).json({
        success: false,
        message: '用户没有临时邮箱权限',
        code: 'NO_ACCESS_TO_REVOKE'
      });
    }

    // 撤销权限
    targetUser.revokeTempEmailAccess();
    await targetUser.save();

    // 记录操作日志
    await TempEmailUsageLog.logAction({
      userId: targetUser._id,
      action: 'revoke',
      ipAddress,
      userAgent,
      result: 'success',
      details: {
        revokedBy: adminUser._id,
        revokedByUsername: adminUser.username
      }
    });

    logger.info(`管理员 ${adminUser.username} 撤销了用户 ${targetUser.username} 的临时邮箱权限`);

    res.json({
      success: true,
      message: '用户权限撤销成功',
      data: {
        userId: targetUser._id,
        username: targetUser.username,
        revokedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('撤销用户权限失败:', error);
    res.status(500).json({
      success: false,
      message: '撤销用户权限失败'
    });
  }
});

module.exports = router;
