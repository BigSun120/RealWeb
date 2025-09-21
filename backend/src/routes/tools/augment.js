/**
 * Augment Token Manager API路由
 * 提供OAuth认证和令牌管理功能
 */

const express = require('express');
const { auth: requireAuth, optionalAuth } = require('../../middleware/auth');
const ToolsPermission = require('../../middleware/toolsPermission');
const ActivityLogger = require('../../middleware/activityLogger');
const AugmentToken = require('../../models/AugmentToken');
const AugmentService = require('../../services/AugmentService');
const TokenManagerService = require('../../services/TokenManagerService');
const logger = require('../../utils/logger');

const router = express.Router();

// 应用工具箱权限中间件
router.use(ToolsPermission.checkToolboxEnabled);
router.use(ToolsPermission.checkRateLimit);

// 注意：本地代理程序下载功能已移除，改用协议调用方式

// 其他路由都需要认证
router.use(requireAuth);

// OAuth状态存储（生产环境应使用Redis）
const oauthStates = new Map();

/**
 * 生成OAuth授权URL
 * POST /api/tools/augment/auth-url
 */
router.post('/auth-url', async (req, res) => {
  try {
    const oauthState = AugmentService.createOAuthState();
    const authUrl = AugmentService.generateAuthorizeUrl(oauthState);

    // 存储OAuth状态（5分钟过期）
    const stateKey = `${req.user._id}_${oauthState.state}`;
    oauthStates.set(stateKey, oauthState);
    setTimeout(() => oauthStates.delete(stateKey), 5 * 60 * 1000);

    res.json({
      success: true,
      data: {
        auth_url: authUrl,
        state: oauthState.state
      }
    });

    logger.info(`OAuth URL generated for user ${req.user._id}`);
  } catch (error) {
    logger.error('Generate auth URL failed:', error);
    res.status(500).json({
      success: false,
      message: '生成授权URL失败',
      error: error.message
    });
  }
});

/**
 * 获取访问令牌
 * POST /api/tools/augment/token
 */
router.post('/token', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：code 和 state'
      });
    }

    // 验证OAuth状态
    const stateKey = `${req.user._id}_${state}`;
    const oauthState = oauthStates.get(stateKey);

    if (!oauthState) {
      return res.status(400).json({
        success: false,
        message: 'OAuth状态无效或已过期，请重新生成授权URL'
      });
    }

    // 完成OAuth流程
    const tokenResult = await AugmentService.completeOAuthFlow(oauthState, code);

    // 清理OAuth状态
    oauthStates.delete(stateKey);

    res.json({
      success: true,
      data: tokenResult
    });

    logger.info(`Token obtained for user ${req.user._id}`);
  } catch (error) {
    logger.error('Get token failed:', error);
    res.status(500).json({
      success: false,
      message: '获取访问令牌失败',
      error: error.message
    });
  }
});

/**
 * 获取用户的所有令牌
 * GET /api/tools/augment/tokens
 */
router.get('/tokens', async (req, res) => {
  try {
    const { active_only = false } = req.query;

    const tokens = await AugmentToken.getUserTokens(req.user._id, active_only === 'true');

    // 返回脱敏后的令牌数据
    const safeTokens = tokens.map(token => {
      // 处理portal_info数据格式
      let portalInfoStr = '{}';
      if (token.portalInfo && token.portalInfo.fullData) {
        // 如果有完整数据，使用完整数据
        portalInfoStr = JSON.stringify(token.portalInfo.fullData);
      } else if (token.portalInfo && token.portalInfo.customerId) {
        // 如果有数据库结构的数据，转换为前端期望的格式
        const frontendFormat = {
          customer_id: token.portalInfo.customerId,
          pricing_unit_id: token.portalInfo.pricingUnitId,
          credits_balance: token.usageStats?.credits_balance || 0,
          total_usage: token.usageStats?.total_usage || 0,
          is_active: true,
          expiry_date: null,
          raw_customer_data: token.portalInfo.customerData,
          raw_ledger_data: token.portalInfo.ledgerSummary
        };

        // 尝试从ledgerSummary中提取过期时间
        if (token.portalInfo.ledgerSummary && token.portalInfo.ledgerSummary.credit_blocks) {
          const creditBlocks = token.portalInfo.ledgerSummary.credit_blocks;
          if (creditBlocks.length > 0) {
            frontendFormat.expiry_date = creditBlocks[0].expiry_date;
            frontendFormat.is_active = creditBlocks[0].is_active;
          }
        }

        portalInfoStr = JSON.stringify(frontendFormat);
      } else if (token.portalInfo) {
        // 否则使用原始portalInfo
        portalInfoStr = JSON.stringify(token.portalInfo);
      }

      return {
        id: token.tokenId,
        access_token: token.accessToken, // 明文访问令牌
        tenant_url: token.tenantUrl,
        portal_url: token.portalUrl,
        email_note: token.emailNote,
        is_active: token.isActive,
        ban_status: token.banStatus,
        portal_info: portalInfoStr, // 确保返回JSON字符串格式
        usage_stats: token.usageStats,
        display_name: token.displayName,
        masked_token: token.getMaskedToken(),
        created_at: token.createdAt,
        updated_at: token.updatedAt,
        last_refreshed: token.lastRefreshed
      };
    });

    res.json({
      success: true,
      data: safeTokens
    });
  } catch (error) {
    logger.error('Get tokens failed:', error);
    res.status(500).json({
      success: false,
      message: '获取令牌列表失败',
      error: error.message
    });
  }
});

/**
 * 保存新令牌
 * POST /api/tools/augment/tokens
 */
router.post('/tokens', async (req, res) => {
  try {
    const { tenant_url, access_token, portal_url, email_note } = req.body;

    if (!tenant_url || !access_token) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：tenant_url 和 access_token'
      });
    }

    // 验证URL格式
    if (!AugmentService.validateTenantUrl(tenant_url)) {
      return res.status(400).json({
        success: false,
        message: 'Tenant URL格式无效'
      });
    }

    if (portal_url && !AugmentService.validatePortalUrl(portal_url)) {
      return res.status(400).json({
        success: false,
        message: 'Portal URL格式无效'
      });
    }

    // 使用统一令牌管理服务进行验证和创建
    const validation = await TokenManagerService.validateTokenOperation('add_user_token', req.user._id, access_token);

    if (!validation.isValid) {
      return res.status(409).json({
        success: false,
        message: validation.errors.join('; '),
        data: {
          validation
        }
      });
    }

    // 创建新令牌
    const tokenData = {
      tenantUrl: tenant_url,
      accessToken: access_token,
      portalUrl: portal_url || null,
      emailNote: email_note || null,
      metadata: {
        source: 'web',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    };

    const newToken = await TokenManagerService.safeAddUserToken(req.user._id, tokenData);

    res.json({
      success: true,
      data: {
        id: newToken.tokenId,
        message: '令牌保存成功'
      }
    });

    logger.info(`Token saved for user ${req.user._id}, tokenId: ${newToken.tokenId}`);
  } catch (error) {
    logger.error('Save token failed:', error);
    res.status(500).json({
      success: false,
      message: '保存令牌失败',
      error: error.message
    });
  }
});

/**
 * 更新令牌
 * PUT /api/tools/augment/tokens/:tokenId
 */
router.put('/tokens/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { tenant_url, access_token, portal_url, email_note, is_active } = req.body;

    const token = await AugmentToken.findByTokenId(tokenId, req.user._id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      });
    }

    // 更新字段
    if (tenant_url !== undefined) {
      if (!AugmentService.validateTenantUrl(tenant_url)) {
        return res.status(400).json({
          success: false,
          message: 'Tenant URL格式无效'
        });
      }
      token.tenantUrl = tenant_url;
    }

    if (access_token !== undefined) {
      token.accessToken = access_token;
    }

    if (portal_url !== undefined) {
      if (portal_url && !AugmentService.validatePortalUrl(portal_url)) {
        return res.status(400).json({
          success: false,
          message: 'Portal URL格式无效'
        });
      }
      token.portalUrl = portal_url || null;
    }

    if (email_note !== undefined) {
      token.emailNote = email_note || null;
    }

    if (is_active !== undefined) {
      token.isActive = Boolean(is_active);
    }

    await token.save();

    res.json({
      success: true,
      data: {
        id: token.tokenId,
        message: '令牌更新成功'
      }
    });

    logger.info(`Token updated for user ${req.user._id}, tokenId: ${tokenId}`);
  } catch (error) {
    logger.error('Update token failed:', error);
    res.status(500).json({
      success: false,
      message: '更新令牌失败',
      error: error.message
    });
  }
});

/**
 * 删除令牌
 * DELETE /api/tools/augment/tokens/:tokenId
 */
router.delete('/tokens/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    // 使用统一令牌管理服务进行安全删除
    const result = await TokenManagerService.safeDeleteUserToken(req.user._id, tokenId);

    res.json({
      success: true,
      data: {
        message: '令牌删除成功',
        ...result
      }
    });

    logger.info(`Token deleted for user ${req.user._id}, tokenId: ${tokenId}`);
  } catch (error) {
    logger.error('Delete token failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除令牌失败',
      error: error.message
    });
  }
});

/**
 * 检查令牌状态
 * POST /api/tools/augment/tokens/:tokenId/check-status
 */
router.post('/tokens/:tokenId/check-status', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await AugmentToken.findByTokenId(tokenId, req.user._id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      });
    }

    // 获取访问令牌
    const accessToken = token.accessToken;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: '访问令牌为空'
      });
    }

    // 检查账号状态
    const statusResult = await AugmentService.checkAccountStatus(accessToken, token.tenantUrl);

    // 更新令牌状态
    await token.updateBanStatus({
      isBanned: statusResult.is_banned,
      status: statusResult.status,
      errorMessage: statusResult.error_message,
      responseCode: statusResult.response_code
    });

    res.json({
      success: true,
      data: statusResult
    });

    logger.info(`Token status checked for user ${req.user._id}, tokenId: ${tokenId}, status: ${statusResult.status}`);
  } catch (error) {
    logger.error('Check token status failed:', error);
    res.status(500).json({
      success: false,
      message: '检查令牌状态失败',
      error: error.message
    });
  }
});

/**
 * 刷新令牌Portal信息（使用次数等）
 * POST /api/tools/augment/tokens/:tokenId/refresh-portal-info
 */
router.post('/tokens/:tokenId/refresh-portal-info', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await AugmentToken.findByTokenId(tokenId, req.user._id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      });
    }

    // 获取访问令牌
    const accessToken = token.accessToken;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: '访问令牌为空'
      });
    }

    // 刷新Portal信息
    const portalInfo = await AugmentService.getCustomerInfo(accessToken, token.portalUrl);

    // 更新令牌Portal信息
    await token.updatePortalInfo(portalInfo);

    res.json({
      success: true,
      data: {
        portal_info: portalInfo,
        usage_stats: {
          credits_balance: portalInfo.credits_balance,
          total_usage: portalInfo.total_usage,
          last_updated: new Date()
        }
      }
    });

    logger.info(`Token portal info refreshed for user ${req.user._id}, tokenId: ${tokenId}`);
  } catch (error) {
    logger.error('Refresh token portal info failed:', error);
    res.status(500).json({
      success: false,
      message: '刷新Portal信息失败',
      error: error.message
    });
  }
});

/**
 * 批量刷新令牌Portal信息
 * POST /api/tools/augment/tokens/batch-refresh-portal-info
 */
router.post('/tokens/batch-refresh-portal-info', async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的令牌ID数组'
      });
    }

    const results = [];

    // 并发刷新，但限制并发数量
    const concurrency = 3;
    for (let i = 0; i < tokenIds.length; i += concurrency) {
      const batch = tokenIds.slice(i, i + concurrency);
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const token = await AugmentToken.findByTokenId(tokenId, req.user._id);
          if (!token) {
            return { tokenId, success: false, error: '令牌不存在' };
          }

          const accessToken = token.accessToken;
          if (!accessToken) {
            return { tokenId, success: false, error: '访问令牌为空' };
          }

          const portalInfo = await AugmentService.getCustomerInfo(accessToken, token.portalUrl);
          await token.updatePortalInfo(portalInfo);

          return {
            tokenId,
            success: true,
            data: {
              portal_info: portalInfo,
              usage_stats: {
                credits_balance: portalInfo.credits_balance,
                total_usage: portalInfo.total_usage,
                last_updated: new Date()
              }
            }
          };
        } catch (error) {
          return { tokenId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    res.json({
      success: true,
      data: results
    });

    logger.info(`Batch refresh portal info completed for user ${req.user._id}, processed ${tokenIds.length} tokens`);
  } catch (error) {
    logger.error('Batch refresh token portal info failed:', error);
    res.status(500).json({
      success: false,
      message: '批量刷新Portal信息失败',
      error: error.message
    });
  }
});



/**
 * 获取令牌全局状态
 * GET /api/tools/augment/tokens/:accessToken/global-status
 */
router.get('/tokens/:accessToken/global-status', requireAuth, async (req, res) => {
  try {
    const { accessToken } = req.params;

    // 获取令牌的全局状态
    const globalStatus = await TokenManagerService.getTokenGlobalStatus(accessToken);

    res.json({
      success: true,
      data: globalStatus
    });

    logger.info(`Global status retrieved for token: ${accessToken.substring(0, 10)}...`);
  } catch (error) {
    logger.error('Get token global status failed:', error);
    res.status(500).json({
      success: false,
      message: '获取令牌全局状态失败',
      error: error.message
    });
  }
});

/**
 * 验证令牌操作
 * POST /api/tools/augment/validate-operation
 */
router.post('/validate-operation', requireAuth, async (req, res) => {
  try {
    const { operation, accessToken } = req.body;

    if (!operation || !accessToken) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：operation 和 accessToken'
      });
    }

    // 验证令牌操作
    const validation = await TokenManagerService.validateTokenOperation(operation, req.user._id, accessToken);

    res.json({
      success: true,
      data: validation
    });

    logger.info(`Token operation validated: ${operation} for token: ${accessToken.substring(0, 10)}...`);
  } catch (error) {
    logger.error('Validate token operation failed:', error);
    res.status(500).json({
      success: false,
      message: '验证令牌操作失败',
      error: error.message
    });
  }
});

/**
 * 获取令牌详细状态
 * GET /api/tools/augment/tokens/:accessToken/detailed-status
 */
router.get('/tokens/:accessToken/detailed-status', requireAuth, async (req, res) => {
  try {
    const { accessToken } = req.params;

    // 获取令牌的详细状态
    const detailedStatus = await TokenManagerService.getDetailedTokenStatus(accessToken);

    res.json({
      success: true,
      data: detailedStatus
    });

    logger.info(`Detailed status retrieved for token: ${accessToken.substring(0, 10)}...`);
  } catch (error) {
    logger.error('Get detailed token status failed:', error);
    res.status(500).json({
      success: false,
      message: '获取令牌详细状态失败',
      error: error.message
    });
  }
});

module.exports = router;
