const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const AdminTokenService = require('../../services/AdminTokenService');
const adminTokenService = new AdminTokenService();
const User = require('../../models/User');
const logger = require('../../utils/logger');

/**
 * 获取所有令牌（管理员专用）
 * GET /api/admin/tokens/all
 */
router.get('/all', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      source = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      status,
      source,
      sortBy,
      sortOrder
    };

    const result = await adminTokenService.getAllTokens(options);

    res.json({
      success: true,
      data: result,
      message: '获取所有令牌成功'
    });

  } catch (error) {
    logger.error('获取所有令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '获取所有令牌失败',
      error: error.message
    });
  }
});

/**
 * 批量刷新Portal信息
 * POST /api/admin/tokens/batch/refresh-portal
 */
router.post('/batch/refresh-portal', adminAuth, async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要刷新的令牌ID列表'
      });
    }

    const result = await adminTokenService.batchRefreshPortalInfo(tokenIds);

    res.json({
      success: true,
      data: result,
      message: `批量刷新完成，成功 ${result.successCount} 个，失败 ${result.failCount} 个`
    });

  } catch (error) {
    logger.error('批量刷新Portal信息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量刷新Portal信息失败',
      error: error.message
    });
  }
});

/**
 * 批量刷新令牌状态
 * POST /api/admin/tokens/batch/refresh-status
 */
router.post('/batch/refresh-status', adminAuth, async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要刷新的令牌ID列表'
      });
    }

    const result = await adminTokenService.batchRefreshStatus(tokenIds);

    res.json({
      success: true,
      data: result,
      message: `批量刷新完成，成功 ${result.successCount} 个，失败 ${result.failCount} 个`
    });

  } catch (error) {
    logger.error('批量刷新令牌状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量刷新令牌状态失败',
      error: error.message
    });
  }
});


/**
 * 批量转移所有权
 * POST /api/admin/tokens/batch/transfer-ownership
 */
router.post('/batch/transfer-ownership', adminAuth, async (req, res) => {
  try {
    const { tokenIds, targetUserId, targetUsername } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要转移的令牌ID列表'
      });
    }

    if (!targetUserId || !targetUsername) {
      return res.status(400).json({
        success: false,
        message: '请提供目标用户信息'
      });
    }

    const result = await adminTokenService.batchTransferOwnership({
      tokenIds,
      targetUserId,
      targetUsername
    });

    res.json({
      success: true,
      data: result,
      message: `批量转移完成，成功 ${result.successCount} 个，失败 ${result.failCount} 个`
    });

  } catch (error) {
    logger.error('批量转移所有权失败:', error);
    res.status(500).json({
      success: false,
      message: '批量转移所有权失败',
      error: error.message
    });
  }
});

/**
 * 批量回收到池
 * POST /api/admin/tokens/batch/reclaim
 */
router.post('/batch/reclaim', adminAuth, async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要回收的令牌ID列表'
      });
    }

    const result = await adminTokenService.batchReclaimToPool({ tokenIds });

    res.json({
      success: true,
      data: result,
      message: `批量回收完成，成功 ${result.successCount} 个，失败 ${result.failCount} 个`
    });

  } catch (error) {
    logger.error('批量回收到池失败:', error);
    res.status(500).json({
      success: false,
      message: '批量回收到池失败',
      error: error.message
    });
  }
});



/**
 * 批量删除令牌
 * DELETE /api/admin/tokens/batch
 */
router.delete('/batch', adminAuth, async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的令牌ID列表'
      });
    }

    const result = await adminTokenService.batchDelete({ tokenIds });

    res.json({
      success: true,
      data: result,
      message: `批量删除完成，成功 ${result.successCount} 个，失败 ${result.failCount} 个`
    });

  } catch (error) {
    logger.error('批量删除令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除令牌失败',
      error: error.message
    });
  }
});

/**
 * 获取所有用户列表（用于转移所有权）
 * GET /api/admin/tokens/users
 */
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('_id username email displayName isAdmin')
      .limit(50)
      .sort({ username: 1 });

    res.json({
      success: true,
      data: users,
      message: '获取用户列表成功'
    });

  } catch (error) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

/**
 * 获取用户的令牌数量
 * GET /api/admin/tokens/users/:userId/count
 */
router.get('/users/:userId/count', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await adminTokenService.getUserTokenCount(userId);

    res.json({
      success: true,
      data: { count },
      message: '获取用户令牌数量成功'
    });

  } catch (error) {
    logger.error('获取用户令牌数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户令牌数量失败',
      error: error.message
    });
  }
});

module.exports = router;
