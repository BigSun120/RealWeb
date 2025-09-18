const express = require('express');
const { adminAuth } = require('../../middleware/auth');
const sessionManager = require('../../utils/sessionManager');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * 获取会话统计信息
 * GET /api/admin/sessions/stats
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = sessionManager.getSessionStats();
    const anomalies = sessionManager.detectAnomalousPatterns();
    
    res.json({
      success: true,
      data: {
        stats,
        anomalies,
        timestamp: new Date()
      },
      message: '获取会话统计成功'
    });

  } catch (error) {
    logger.error('获取会话统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话统计失败'
    });
  }
});

/**
 * 获取用户的活跃会话
 * GET /api/admin/sessions/user/:userId
 */
router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = sessionManager.getUserActiveSessions(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        sessions,
        count: sessions.length
      },
      message: '获取用户会话成功'
    });

  } catch (error) {
    logger.error('获取用户会话失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户会话失败'
    });
  }
});

/**
 * 获取会话详细信息
 * GET /api/admin/sessions/detail/:tokenId
 */
router.get('/detail/:tokenId', adminAuth, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const sessionDetail = sessionManager.getSessionDetails(tokenId);
    
    if (!sessionDetail) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    res.json({
      success: true,
      data: sessionDetail,
      message: '获取会话详情成功'
    });

  } catch (error) {
    logger.error('获取会话详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话详情失败'
    });
  }
});

/**
 * 强制使用户会话失效
 * POST /api/admin/sessions/invalidate/:userId
 */
router.post('/invalidate/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'ADMIN_REVOKE' } = req.body;
    
    const invalidatedCount = sessionManager.invalidateUserSessions(userId, reason);
    
    logger.info(`管理员 ${req.user.username} 使用户 ${userId} 的 ${invalidatedCount} 个会话失效`);
    
    res.json({
      success: true,
      data: {
        userId,
        invalidatedCount,
        reason
      },
      message: `成功使 ${invalidatedCount} 个会话失效`
    });

  } catch (error) {
    logger.error('使会话失效失败:', error);
    res.status(500).json({
      success: false,
      message: '使会话失效失败'
    });
  }
});

/**
 * 清理过期会话
 * POST /api/admin/sessions/cleanup
 */
router.post('/cleanup', adminAuth, async (req, res) => {
  try {
    sessionManager.cleanupExpiredSessions();
    const stats = sessionManager.getSessionStats();
    
    logger.info(`管理员 ${req.user.username} 手动清理了过期会话`);
    
    res.json({
      success: true,
      data: {
        stats,
        cleanupTime: new Date()
      },
      message: '会话清理完成'
    });

  } catch (error) {
    logger.error('清理会话失败:', error);
    res.status(500).json({
      success: false,
      message: '清理会话失败'
    });
  }
});

/**
 * 获取异常会话模式
 * GET /api/admin/sessions/anomalies
 */
router.get('/anomalies', adminAuth, async (req, res) => {
  try {
    const anomalies = sessionManager.detectAnomalousPatterns();
    
    res.json({
      success: true,
      data: anomalies,
      message: '获取异常模式成功'
    });

  } catch (error) {
    logger.error('获取异常模式失败:', error);
    res.status(500).json({
      success: false,
      message: '获取异常模式失败'
    });
  }
});

/**
 * 验证token有效性（调试用）
 * POST /api/admin/sessions/validate
 */
router.post('/validate', adminAuth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token不能为空'
      });
    }
    
    const validation = sessionManager.validateToken(token);
    
    res.json({
      success: true,
      data: {
        validation,
        timestamp: new Date()
      },
      message: 'Token验证完成'
    });

  } catch (error) {
    logger.error('Token验证失败:', error);
    res.status(500).json({
      success: false,
      message: 'Token验证失败'
    });
  }
});

module.exports = router;
