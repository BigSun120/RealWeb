const AugmentToken = require('../models/AugmentToken');
const TokenPool = require('../models/TokenPool');
const TokenStatus = require('../models/TokenStatus');
const logger = require('../utils/logger');

/**
 * 统一令牌管理服务
 * 负责处理令牌的全生命周期管理，确保数据一致性和防止重复
 */
class TokenManagerService {
  /**
   * 检查用户是否已拥有指定的访问令牌
   * @param {string} userId - 用户ID
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<Object|null>} 如果存在返回令牌对象，否则返回null
   */
  async checkUserTokenExists(userId, accessToken) {
    try {
      const existingToken = await AugmentToken.findOne({
        userId,
        accessToken,
        isActive: true
      });
      return existingToken;
    } catch (error) {
      logger.error('检查用户令牌存在性失败:', error);
      throw error;
    }
  }

  /**
   * 检查令牌池中是否存在指定的访问令牌
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<Object|null>} 如果存在返回令牌池对象，否则返回null
   */
  async checkPoolTokenExists(accessToken) {
    try {
      const existingToken = await TokenPool.findOne({
        accessToken,
        status: { $in: ['available', 'claimed'] }
      });
      return existingToken;
    } catch (error) {
      logger.error('检查令牌池令牌存在性失败:', error);
      throw error;
    }
  }

  /**
   * 获取令牌的全局状态信息
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<Object>} 令牌状态信息
   */
  async getTokenGlobalStatus(accessToken) {
    try {
      // 查找所有拥有此令牌的用户
      const userTokens = await AugmentToken.find({
        accessToken,
        isActive: true
      }).populate('userId', 'username email');

      // 查找令牌池中的状态
      const poolToken = await TokenPool.findOne({
        accessToken
      }).populate('uploaderId', 'username email')
        .populate('claimedBy', 'username email');

      return {
        accessToken: accessToken.substring(0, 10) + '...',
        userTokens: userTokens.map(token => ({
          userId: token.userId._id,
          username: token.userId.username,
          email: token.userId.email,
          emailNote: token.emailNote,
          createdAt: token.createdAt
        })),
        poolStatus: poolToken ? {
          status: poolToken.status,
          uploader: poolToken.uploaderId ? {
            userId: poolToken.uploaderId._id,
            username: poolToken.uploaderId.username,
            email: poolToken.uploaderId.email
          } : null,
          claimedBy: poolToken.claimedBy ? {
            userId: poolToken.claimedBy._id,
            username: poolToken.claimedBy.username,
            email: poolToken.claimedBy.email
          } : null,
          uploadedAt: poolToken.uploadedAt,
          claimedAt: poolToken.claimedAt
        } : null,
        totalOwners: userTokens.length,
        isInPool: !!poolToken
      };
    } catch (error) {
      logger.error('获取令牌全局状态失败:', error);
      throw error;
    }
  }

  /**
   * 安全地为用户添加令牌
   * @param {string} userId - 用户ID
   * @param {Object} tokenData - 令牌数据
   * @returns {Promise<Object>} 创建的令牌对象
   */
  async safeAddUserToken(userId, tokenData) {
    try {
      // 检查令牌状态
      const tokenStatus = await TokenStatus.findByAccessToken(tokenData.accessToken);
      if (tokenStatus && tokenStatus.currentOwner.userId) {
        throw new Error(`此令牌已被用户 ${tokenStatus.currentOwner.username} 拥有，无法重复添加`);
      }

      // 检查用户是否已拥有此令牌
      const existingToken = await this.checkUserTokenExists(userId, tokenData.accessToken);
      if (existingToken) {
        throw new Error(`用户已拥有此令牌，令牌ID: ${existingToken.tokenId}`);
      }

      // 创建新令牌
      const newToken = await AugmentToken.createToken(tokenData, userId);

      // 更新令牌状态
      const userInfo = await this.getUserInfo(userId);
      await this.updateTokenStatus(tokenData.accessToken, userId, userInfo, 'direct_add', {
        tokenId: newToken.tokenId,
        source: tokenData.metadata?.source || 'web'
      });

      logger.info(`用户 ${userId} 成功添加令牌: ${tokenData.accessToken.substring(0, 10)}...`);
      return newToken;
    } catch (error) {
      logger.error('安全添加用户令牌失败:', error);
      throw error;
    }
  }

  /**
   * 安全地删除用户令牌
   * @param {string} userId - 用户ID
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>} 删除结果
   */
  async safeDeleteUserToken(userId, tokenId) {
    try {
      const token = await AugmentToken.findByTokenId(tokenId, userId);
      if (!token) {
        throw new Error('令牌不存在或无权限删除');
      }

      const accessToken = token.accessToken;

      // 删除用户令牌
      await AugmentToken.deleteOne({ _id: token._id });

      // 释放令牌状态
      await this.releaseTokenStatus(accessToken, 'user_delete');

      // 检查是否需要处理令牌池中的相关记录
      const poolToken = await TokenPool.findOne({ accessToken });
      if (poolToken) {
        // 如果用户是上传者且令牌已被领取，需要特殊处理
        if (poolToken.uploaderId.toString() === userId && poolToken.status === 'claimed') {
          logger.warn(`用户 ${userId} 删除了已被领取的令牌池令牌: ${accessToken.substring(0, 10)}...`);
        }
      }

      logger.info(`用户 ${userId} 成功删除令牌: ${accessToken.substring(0, 10)}...`);
      return {
        success: true,
        deletedTokenId: tokenId,
        accessToken: accessToken.substring(0, 10) + '...'
      };
    } catch (error) {
      logger.error('安全删除用户令牌失败:', error);
      throw error;
    }
  }

  /**
   * 安全地从令牌池领取令牌
   * 确保一个令牌只能对应一个用户，但一个用户可以拥有多个不同的令牌
   * @param {string} userId - 用户ID
   * @param {string} poolTokenId - 令牌池ID
   * @returns {Promise<Object>} 领取结果
   */
  async safeClaimPoolToken(userId, poolTokenId) {
    try {
      const poolToken = await TokenPool.findById(poolTokenId);
      if (!poolToken) {
        throw new Error('令牌池中的令牌不存在');
      }

      if (poolToken.status !== 'available') {
        throw new Error('令牌不可领取');
      }

      // 严格检查：任何用户都不能拥有相同的令牌（包括上传者）
      const existingUserToken = await this.checkUserTokenExists(userId, poolToken.accessToken);
      if (existingUserToken) {
        throw new Error('您已拥有此令牌，无法重复领取');
      }

      // 检查是否有其他用户已拥有此令牌
      const globalStatus = await this.getTokenGlobalStatus(poolToken.accessToken);
      if (globalStatus.totalOwners > 0) {
        const ownersList = globalStatus.userTokens.map(token => token.username).join(', ');
        throw new Error(`此令牌已被其他用户拥有 (${ownersList})，无法领取。一个令牌只能对应一个用户。`);
      }

      // 标记为已领取
      await poolToken.claimBy(userId);

      // 添加到用户的令牌列表
      const userToken = new AugmentToken({
        userId: userId,
        accessToken: poolToken.accessToken,
        tenantUrl: poolToken.tenantUrl || 'https://api.augmentcode.com/',
        portalUrl: poolToken.portalUrl || '',
        emailNote: `从令牌池领取 - ${new Date().toLocaleDateString()}`,
        portalInfo: poolToken.portalInfo,
        metadata: {
          source: 'pool',
          poolTokenId: poolTokenId
        }
      });

      await userToken.save();

      // 更新令牌状态
      const userInfo = await this.getUserInfo(userId);
      await this.updateTokenStatus(poolToken.accessToken, userId, userInfo, 'pool_claim', {
        poolTokenId: poolTokenId,
        userTokenId: userToken.tokenId
      });

      logger.info(`用户 ${userId} 成功从令牌池领取令牌: ${poolToken.accessToken.substring(0, 10)}...`);
      return {
        success: true,
        poolToken,
        userToken
      };
    } catch (error) {
      logger.error('安全领取令牌池令牌失败:', error);
      throw error;
    }
  }

  /**
   * 安全地删除令牌池令牌
   * @param {string} userId - 操作用户ID
   * @param {string} poolTokenId - 令牌池ID
   * @param {boolean} isAdmin - 是否为管理员操作
   * @returns {Promise<Object>} 删除结果
   */
  async safeDeletePoolToken(userId, poolTokenId, isAdmin = false) {
    try {
      const poolToken = await TokenPool.findById(poolTokenId);
      if (!poolToken) {
        throw new Error('令牌池中的令牌不存在');
      }

      // 检查权限
      const isOwner = poolToken.uploaderId.toString() === userId;
      if (!isOwner && !isAdmin) {
        throw new Error('无权限删除此令牌');
      }

      const accessToken = poolToken.accessToken;

      // 如果令牌已被领取，需要从领取者的令牌列表中移除
      if (poolToken.status === 'claimed' && poolToken.claimedBy) {
        await AugmentToken.deleteOne({
          userId: poolToken.claimedBy,
          accessToken: accessToken
        });
        logger.info(`已从用户 ${poolToken.claimedBy} 的令牌列表中移除令牌: ${accessToken.substring(0, 10)}...`);
      }

      // 删除令牌池记录
      await TokenPool.findByIdAndDelete(poolTokenId);

      logger.info(`用户 ${userId} 成功删除令牌池令牌: ${accessToken.substring(0, 10)}...`);
      return {
        success: true,
        deletedPoolTokenId: poolTokenId,
        accessToken: accessToken.substring(0, 10) + '...',
        hadClaimedBy: poolToken.claimedBy
      };
    } catch (error) {
      logger.error('安全删除令牌池令牌失败:', error);
      throw error;
    }
  }

  /**
   * 验证令牌操作的合法性
   * @param {string} operation - 操作类型
   * @param {string} userId - 用户ID
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<Object>} 验证结果
   */
  async validateTokenOperation(operation, userId, accessToken) {
    try {
      const globalStatus = await this.getTokenGlobalStatus(accessToken);

      const validation = {
        operation,
        userId,
        accessToken: accessToken.substring(0, 10) + '...',
        isValid: true,
        warnings: [],
        errors: []
      };

      switch (operation) {
        case 'add_user_token':
          if (globalStatus.userTokens.some(token => token.userId === userId)) {
            validation.isValid = false;
            validation.errors.push('用户已拥有此令牌');
          }
          break;

        case 'add_pool_token':
          if (globalStatus.isInPool) {
            validation.isValid = false;
            validation.errors.push('令牌已存在于令牌池中');
          }
          break;

        case 'claim_pool_token':
          // 检查当前用户是否已拥有此令牌
          if (globalStatus.userTokens.some(token => token.userId === userId)) {
            validation.isValid = false;
            validation.errors.push('您已拥有此令牌，无法重复领取');
          }
          // 检查是否有任何用户已拥有此令牌（一个令牌只能对应一个用户）
          if (globalStatus.totalOwners > 0) {
            validation.isValid = false;
            const ownersList = globalStatus.userTokens.map(token => token.username).join(', ');
            validation.errors.push(`此令牌已被其他用户拥有 (${ownersList})，无法领取。一个令牌只能对应一个用户。`);
          }
          if (!globalStatus.isInPool) {
            validation.isValid = false;
            validation.errors.push('令牌不在令牌池中');
          }
          break;
      }

      if (globalStatus.totalOwners > 1) {
        validation.warnings.push(`此令牌被 ${globalStatus.totalOwners} 个用户拥有，可能存在数据不一致`);
      }

      return validation;
    } catch (error) {
      logger.error('验证令牌操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId).select('username email');
      if (!user) {
        throw new Error('用户不存在');
      }
      return {
        username: user.username,
        email: user.email
      };
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新令牌状态
   * @param {string} accessToken - 访问令牌
   * @param {string} userId - 用户ID
   * @param {Object} userInfo - 用户信息
   * @param {string} source - 来源
   * @param {Object} metadata - 元数据
   * @returns {Promise<Object>} 令牌状态对象
   */
  async updateTokenStatus(accessToken, userId, userInfo, source, metadata = {}) {
    try {
      let tokenStatus = await TokenStatus.findByAccessToken(accessToken);

      if (!tokenStatus) {
        // 创建新的令牌状态
        tokenStatus = await TokenStatus.createOrUpdate(accessToken, {
          currentOwner: {
            userId: userId,
            username: userInfo.username,
            email: userInfo.email,
            claimedAt: new Date()
          },
          ownershipHistory: [{
            userId: userId,
            username: userInfo.username,
            email: userInfo.email,
            action: 'claimed',
            timestamp: new Date(),
            source: source,
            metadata: metadata
          }],
          stats: {
            totalClaims: 1,
            currentOwnershipDuration: new Date()
          }
        });
      } else {
        // 更新现有令牌状态
        await tokenStatus.updateCurrentOwner(userId, userInfo, source, metadata);
      }

      return tokenStatus;
    } catch (error) {
      logger.error('更新令牌状态失败:', error);
      throw error;
    }
  }

  /**
   * 释放令牌状态
   * @param {string} accessToken - 访问令牌
   * @param {string} reason - 释放原因
   * @returns {Promise<Object>} 释放结果
   */
  async releaseTokenStatus(accessToken, reason = 'deleted') {
    try {
      const tokenStatus = await TokenStatus.findByAccessToken(accessToken);
      if (tokenStatus) {
        await tokenStatus.releaseOwner(reason);
        logger.info(`令牌状态已释放: ${accessToken.substring(0, 10)}... 原因: ${reason}`);
      }
      return tokenStatus;
    } catch (error) {
      logger.error('释放令牌状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取令牌的详细状态信息
   * @param {string} accessToken - 访问令牌
   * @returns {Promise<Object>} 详细状态信息
   */
  async getDetailedTokenStatus(accessToken) {
    try {
      const tokenStatus = await TokenStatus.findByAccessToken(accessToken)
        .populate('currentOwner.userId', 'username email')
        .populate('ownershipHistory.userId', 'username email')
        .populate('poolStatus.uploaderId', 'username email')
        .populate('poolStatus.poolId');

      if (!tokenStatus) {
        return {
          exists: false,
          accessToken: accessToken.substring(0, 10) + '...',
          message: '令牌状态不存在'
        };
      }

      return {
        exists: true,
        accessToken: accessToken.substring(0, 10) + '...',
        currentOwner: tokenStatus.currentOwner,
        ownershipHistory: tokenStatus.ownershipHistory,
        poolStatus: tokenStatus.poolStatus,
        tokenInfo: tokenStatus.tokenInfo,
        stats: tokenStatus.stats,
        createdAt: tokenStatus.createdAt,
        updatedAt: tokenStatus.updatedAt
      };
    } catch (error) {
      logger.error('获取详细令牌状态失败:', error);
      throw error;
    }
  }
}

module.exports = new TokenManagerService();
