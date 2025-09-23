const AugmentToken = require('../models/AugmentToken');
const TokenPool = require('../models/TokenPool');
const TokenStatus = require('../models/TokenStatus');
const User = require('../models/User');
const logger = require('../utils/logger');
const AugmentService = require('./AugmentService');

/**
 * 管理员令牌管理服务
 * 负责聚合所有令牌数据，提供统一的管理接口
 */
class AdminTokenService {
  /**
   * 获取所有令牌数据（聚合个人令牌和令牌池）
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 聚合后的令牌数据
   */
  async getAllTokens(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        source = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 获取个人令牌
      const personalTokens = await this.getPersonalTokens(search, status);

      // 获取令牌池令牌
      const poolTokens = await this.getPoolTokens(search, status);

      // 合并和标准化数据
      let allTokens = [
        ...personalTokens.map(token => this.normalizePersonalToken(token)),
        ...poolTokens.map(token => this.normalizePoolToken(token))
      ];

      // 按来源筛选
      if (source) {
        allTokens = allTokens.filter(token => token.source === source);
      }

      // 排序
      allTokens = this.sortTokens(allTokens, sortBy, sortOrder);

      // 分页
      const total = allTokens.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTokens = allTokens.slice(startIndex, endIndex);

      return {
        tokens: paginatedTokens,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取所有令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取个人令牌
   */
  async getPersonalTokens(search = '', status = '') {
    const query = {};

    if (status) {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (status === 'banned') query['banStatus.isBanned'] = true;
    }

    let tokens = await AugmentToken.find(query)
      .populate('userId', 'username email displayName')
      .sort({ createdAt: -1 });

    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      tokens = tokens.filter(token =>
        (token.emailNote && token.emailNote.toLowerCase().includes(searchLower)) ||
        (token.userId?.username && token.userId.username.toLowerCase().includes(searchLower)) ||
        (token.userId?.email && token.userId.email.toLowerCase().includes(searchLower))
      );
    }

    return tokens;
  }

  /**
   * 获取令牌池令牌
   */
  async getPoolTokens(search = '', status = '') {
    const query = {};

    if (status) {
      query.status = status;
    }

    let tokens = await TokenPool.find(query)
      .populate('uploaderId', 'username email displayName')
      .populate('claimedBy', 'username email displayName')
      .sort({ uploadedAt: -1 });

    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      tokens = tokens.filter(token =>
        (token.email_note && token.email_note.toLowerCase().includes(searchLower)) ||
        (token.uploaderId?.username && token.uploaderId.username.toLowerCase().includes(searchLower)) ||
        (token.uploaderId?.email && token.uploaderId.email.toLowerCase().includes(searchLower))
      );
    }

    return tokens;
  }

  /**
   * 标准化个人令牌数据
   */
  normalizePersonalToken(token) {
    const portalInfo = this.parsePortalInfo(token.portalInfo);

    return {
      id: token._id.toString(),
      source: 'personal',
      emailNote: token.emailNote || '未设置',
      ownerInfo: {
        userId: token.userId._id,
        username: token.userId.username,
        email: token.userId.email,
        displayName: token.userId.displayName
      },
      expiryDate: portalInfo.expiry_date || null,
      creditsBalance: portalInfo.credits_balance || token.usageStats?.credits_balance || 0,
      accountStatus: token.banStatus?.status || 'ACTIVE',
      tokenStatus: token.isActive ? 'personal' : 'disabled',
      lastActive: token.lastRefreshed || token.updatedAt,
      accessToken: token.accessToken, // 管理员可见完整令牌
      tenantUrl: token.tenantUrl,
      portalUrl: token.portalUrl,
      portalInfo: portalInfo,
      banStatus: token.banStatus,
      isActive: token.isActive,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt
    };
  }

  /**
   * 标准化令牌池令牌数据
   */
  normalizePoolToken(token) {
    const portalInfo = this.parsePortalInfo(token.portalInfo);

    return {
      id: token._id.toString(),
      source: 'pool',
      emailNote: token.email_note || '未设置',
      ownerInfo: token.claimedBy ? {
        userId: token.claimedBy._id,
        username: token.claimedBy.username,
        email: token.claimedBy.email,
        displayName: token.claimedBy.displayName
      } : {
        userId: token.uploaderId._id,
        username: token.uploaderId.username,
        email: token.uploaderId.email,
        displayName: token.uploaderId.displayName
      },
      expiryDate: token.expiryDate,
      creditsBalance: token.creditsBalance || 0,
      accountStatus: 'ACTIVE', // 令牌池中的令牌默认为活跃状态
      tokenStatus: `pool_${token.status}`,
      lastActive: token.updatedAt,
      accessToken: token.accessToken, // 管理员可见完整令牌
      tenantUrl: token.tenantUrl,
      portalUrl: token.portalUrl,
      portalInfo: portalInfo,
      poolStatus: token.status,
      uploaderId: token.uploaderId._id,
      claimedBy: token.claimedBy?._id,
      claimedAt: token.claimedAt,
      isActive: token.status === 'available' || token.status === 'claimed',
      createdAt: token.uploadedAt,
      updatedAt: token.updatedAt
    };
  }

  /**
   * 解析Portal信息
   */
  parsePortalInfo(portalInfoStr) {
    if (!portalInfoStr) return {};

    try {
      if (typeof portalInfoStr === 'string') {
        return JSON.parse(portalInfoStr);
      }
      return portalInfoStr;
    } catch (error) {
      logger.warn('解析Portal信息失败:', error);
      return {};
    }
  }

  /**
   * 排序令牌
   */
  sortTokens(tokens, sortBy, sortOrder) {
    return tokens.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // 处理日期类型
      if (sortBy.includes('Date') || sortBy.includes('At')) {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }

      // 处理数字类型
      if (sortBy === 'creditsBalance') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      }

      // 处理字符串类型
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;

      return sortOrder === 'desc' ? -result : result;
    });
  }

  /**
   * 批量刷新Portal信息
   */
  async batchRefreshPortalInfo(tokenIds) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const tokenId of tokenIds) {
      try {
        // 查找令牌（可能在个人令牌或令牌池中）
        let token = await AugmentToken.findById(tokenId);
        let isPoolToken = false;

        if (!token) {
          token = await TokenPool.findById(tokenId);
          isPoolToken = true;
        }

        if (!token) {
          results.push({
            tokenId,
            success: false,
            error: '令牌不存在'
          });
          failCount++;
          continue;
        }

        // 刷新Portal信息
        const portalInfo = await AugmentService.getCustomerInfo(
          token.accessToken,
          token.portalUrl || token.tenantUrl
        );

        // 更新令牌信息
        if (isPoolToken) {
          token.portalInfo = JSON.stringify(portalInfo);
          token.creditsBalance = portalInfo.credits_balance || 0;
          token.expiryDate = portalInfo.expiry_date ? new Date(portalInfo.expiry_date) : null;
          await token.save();
        } else {
          await token.updatePortalInfo(portalInfo);
        }

        results.push({
          tokenId,
          success: true,
          data: {
            portal_info: portalInfo,
            credits_balance: portalInfo.credits_balance || 0,
            expiry_date: portalInfo.expiry_date
          }
        });
        successCount++;

      } catch (error) {
        logger.error(`刷新令牌 ${tokenId} Portal信息失败:`, error);
        results.push({
          tokenId,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return {
      results,
      successCount,
      failCount
    };
  }

  /**
   * 批量刷新令牌状态（账号状态/封禁）
   */
  async batchRefreshStatus(tokenIds) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const tokenId of tokenIds) {
      try {
        // 查找令牌（可能在个人令牌或令牌池中）
        let personalToken = await AugmentToken.findById(tokenId);
        if (personalToken) {
          // 个人令牌：检查账号状态并更新 banStatus
          const accessToken = personalToken.accessToken;
          if (!accessToken) {
            results.push({ tokenId, success: false, error: '访问令牌为空' });
            failCount++;
            continue;
          }

          const statusResult = await AugmentService.checkAccountStatus(accessToken, personalToken.tenantUrl);
          await personalToken.updateBanStatus({
            isBanned: statusResult.is_banned,
            status: statusResult.status,
            errorMessage: statusResult.error_message,
            responseCode: statusResult.response_code
          });

          results.push({ tokenId, success: true, data: { ban_status: personalToken.banStatus } });
          successCount++;
          continue;
        }

        // 令牌池令牌
        const poolToken = await TokenPool.findById(tokenId);
        if (poolToken) {
          const accessToken = poolToken.accessToken;
          if (!accessToken) {
            results.push({ tokenId, success: false, error: '访问令牌为空' });
            failCount++;
            continue;
          }

          const statusResult = await AugmentService.checkAccountStatus(accessToken, poolToken.tenantUrl);
          // 与令牌池路由保持一致：封禁 -> invalid，否则 available
          poolToken.status = statusResult.is_banned ? 'invalid' : 'available';
          poolToken.lastRefreshed = new Date();
          await poolToken.save();

          results.push({ tokenId, success: true, data: { status: poolToken.status } });
          successCount++;
          continue;
        }

        results.push({ tokenId, success: false, error: '令牌不存在' });
        failCount++;
      } catch (error) {
        logger.error(`刷新令牌状态失败 ${tokenId}:`, error);
        results.push({ tokenId, success: false, error: error.message });
        failCount++;
      }
    }

    return { results, successCount, failCount };
  }

  /**
   * 批量转移所有权
   */
  async batchTransferOwnership(data) {
    const { tokenIds, targetUserId, targetUsername } = data;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 验证目标用户存在
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new Error('目标用户不存在');
    }

    for (const tokenId of tokenIds) {
      try {
        // 只能转移个人令牌
        const token = await AugmentToken.findById(tokenId);
        if (!token) {
          results.push({
            tokenId,
            success: false,
            error: '令牌不存在或不是个人令牌'
          });
          failCount++;
          continue;
        }

        // 更新所有者
        token.userId = targetUserId;
        await token.save();

        results.push({
          tokenId,
          success: true,
          data: {
            newOwner: {
              userId: targetUserId,
              username: targetUsername
            }
          }
        });
        successCount++;

      } catch (error) {
        logger.error(`转移令牌 ${tokenId} 所有权失败:`, error);
        results.push({
          tokenId,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return {
      results,
      successCount,
      failCount
    };
  }

  /**
   * 批量回收到池
   */
  async batchReclaimToPool(data) {
    const { tokenIds } = data;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const tokenId of tokenIds) {
      try {
        // 只能回收个人令牌
        const personalToken = await AugmentToken.findById(tokenId).populate('userId', 'username email');
        if (!personalToken) {
          results.push({
            tokenId,
            success: false,
            error: '令牌不存在或不是个人令牌'
          });
          failCount++;
          continue;
        }

        // 检查令牌池中是否已存在相同的accessToken
        const existingPoolToken = await TokenPool.findOne({ accessToken: personalToken.accessToken });
        if (existingPoolToken) {
          results.push({
            tokenId,
            success: false,
            error: '该令牌已存在于令牌池中'
          });
          failCount++;
          continue;
        }

        // 验证令牌有效性
        const portalInfo = await AugmentService.getCustomerInfo(
          personalToken.accessToken,
          personalToken.portalUrl || personalToken.tenantUrl
        );

        // 创建令牌池记录
        const tokenPool = new TokenPool({
          accessToken: personalToken.accessToken,
          tenantUrl: personalToken.tenantUrl,
          portalUrl: personalToken.portalUrl || '',
          uploaderId: personalToken.userId._id,
          uploaderEmail: personalToken.userId.email,
          originalUploader: personalToken.userId.username,
          email_note: personalToken.emailNote || '管理员回收',
          portalInfo: JSON.stringify(portalInfo),
          creditsBalance: portalInfo.credits_balance || 0,
          expiryDate: portalInfo.expiry_date ? new Date(portalInfo.expiry_date) : null,
          status: 'available'
        });

        await tokenPool.save();

        // 删除个人令牌
        await AugmentToken.deleteOne({ _id: personalToken._id });

        results.push({
          tokenId,
          success: true,
          data: {
            poolTokenId: tokenPool._id,
            status: 'available'
          }
        });
        successCount++;

      } catch (error) {
        logger.error(`回收令牌 ${tokenId} 到池失败:`, error);
        results.push({
          tokenId,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return {
      results,
      successCount,
      failCount
    };
  }



  /**
   * 批量删除令牌
   */
  async batchDelete(data) {
    const { tokenIds } = data;
    const results = [];
    const deletedIds = [];
    let successCount = 0;
    let failCount = 0;

    for (const tokenId of tokenIds) {
      try {
        // 查找并删除个人令牌
        const personalToken = await AugmentToken.findById(tokenId);
        if (personalToken) {
          await AugmentToken.deleteOne({ _id: tokenId });
          deletedIds.push(tokenId);
          successCount++;
          continue;
        }

        // 查找并删除令牌池令牌
        const poolToken = await TokenPool.findById(tokenId);
        if (poolToken) {
          await TokenPool.deleteOne({ _id: tokenId });
          deletedIds.push(tokenId);
          successCount++;
          continue;
        }

        results.push({
          tokenId,
          success: false,
          error: '令牌不存在'
        });
        failCount++;

      } catch (error) {
        logger.error(`删除令牌 ${tokenId} 失败:`, error);
        results.push({
          tokenId,
          success: false,
          error: error.message
        });
        failCount++;
      }
    }

    return {
      results,
      deletedIds,
      successCount,
      failCount
    };
  }

  /**
   * 获取用户的令牌数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 令牌数量
   */
  async getUserTokenCount(userId) {
    try {
      // 统计个人令牌数量
      const personalTokenCount = await AugmentToken.countDocuments({
        userId: userId,
        isActive: true
      });

      // 统计令牌池中该用户的令牌数量
      const poolTokenCount = await TokenPool.countDocuments({
        uploaderId: userId,
        isActive: true
      });

      return personalTokenCount + poolTokenCount;
    } catch (error) {
      logger.error('获取用户令牌数量失败:', error);
      throw error;
    }
  }
}

module.exports = AdminTokenService;
