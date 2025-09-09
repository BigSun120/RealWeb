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
const logger = require('../../utils/logger');

const router = express.Router();

// 应用工具箱权限中间件
router.use(ToolsPermission.checkToolboxEnabled);
router.use(ToolsPermission.checkRateLimit);

// 下载路由无需认证
router.get('/download/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    // 定义下载链接映射
    // 检查本地是否有构建好的exe文件
    const path = require('path');
    const fs = require('fs');

    const localExePath = path.resolve(__dirname, '../../../../augment-proxy/AugmentTokenManager.exe');
    const hasLocalExe = fs.existsSync(localExePath);



    const downloadUrls = {
      windows: {
        url: hasLocalExe ? `/static/AugmentTokenManager.exe` : null,
        filename: 'AugmentTokenManager.exe',
        local: hasLocalExe
      },
      macos: {
        url: null,
        filename: 'Augment-Token-Manager-macOS.dmg',
        local: false
      },
      linux: {
        url: null,
        filename: 'Augment-Token-Manager-Linux.AppImage',
        local: false
      }
    };

    const downloadInfo = downloadUrls[platform];
    if (!downloadInfo || !downloadInfo.url) {
      return res.status(404).json({
        success: false,
        message: platform === 'windows' ? '本地文件不存在' : '暂不支持该平台'
      });
    }

    // 如果是本地文件，直接发送文件
    if (downloadInfo.local && platform === 'windows') {
      try {
        // 设置正确的响应头
        res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // 发送文件
        res.sendFile(localExePath, (err) => {
          if (err) {
            logger.error(`Failed to send local file: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                message: '文件发送失败',
                error: err.message
              });
            }
          } else {
            logger.info(`Local file downloaded: ${localExePath}`);
          }
        });
        return;
      } catch (error) {
        logger.error(`Failed to send local file: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: '文件发送失败',
          error: error.message
        });
      }
    }

    // 重定向到实际下载链接
    res.redirect(downloadInfo.url);

    logger.info(`Download requested for platform: ${platform}, redirected to: ${downloadInfo.url}`);
  } catch (error) {
    logger.error('Download failed:', error);
    res.status(500).json({
      success: false,
      message: '下载失败',
      error: error.message
    });
  }
});

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
    const safeTokens = tokens.map(token => ({
      id: token.tokenId,
      tenant_url: token.tenantUrl,
      portal_url: token.portalUrl,
      email_note: token.emailNote,
      is_active: token.isActive,
      ban_status: token.banStatus,
      portal_info: token.portalInfo,
      usage_stats: token.usageStats,
      display_name: token.displayName,
      masked_token: token.getMaskedToken(),
      created_at: token.createdAt,
      updated_at: token.updatedAt
    }));

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

    const newToken = await AugmentToken.createToken(tokenData, req.user._id);

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

    const token = await AugmentToken.findByTokenId(tokenId, req.user._id);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      });
    }

    await AugmentToken.deleteOne({ _id: token._id });

    res.json({
      success: true,
      data: {
        message: '令牌删除成功'
      }
    });

    logger.info(`Token deleted for user ${req.user._id}, tokenId: ${tokenId}`);
  } catch (error) {
    logger.error('Delete token failed:', error);
    res.status(500).json({
      success: false,
      message: '删除令牌失败',
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

    // 解密令牌进行状态检查
    const decryptedToken = token.decryptToken();
    if (!decryptedToken) {
      return res.status(500).json({
        success: false,
        message: '令牌解密失败'
      });
    }

    // 检查账号状态
    const statusResult = await AugmentService.checkAccountStatus(decryptedToken, token.tenantUrl);

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

    // 解密令牌
    const decryptedToken = token.decryptToken();
    if (!decryptedToken) {
      return res.status(500).json({
        success: false,
        message: '令牌解密失败'
      });
    }

    // 刷新Portal信息 - 使用portalUrl而不是tenantUrl
    const portalInfo = await AugmentService.getCustomerInfo(decryptedToken, token.portalUrl);

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

          const decryptedToken = token.decryptToken();
          if (!decryptedToken) {
            return { tokenId, success: false, error: '令牌解密失败' };
          }

          const portalInfo = await AugmentService.getCustomerInfo(decryptedToken, token.portalUrl);
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



module.exports = router;
