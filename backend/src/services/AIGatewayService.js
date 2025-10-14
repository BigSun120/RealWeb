const AIService = require('./AIService');
const AIConfig = require('../models/AIConfig');
const UserAIConnection = require('../models/UserAIConnection');
const logger = require('../utils/logger');

/**
 * AI网关服务
 * 负责路由选择、配额控制、降级策略等
 */
class AIGatewayService {
  /**
   * 智能路由：选择最佳的AI连接
   * 优先使用用户BYOK，如果不可用则回退到平台配置
   * @param {String} userId - 用户ID
   * @param {Object} options - 选项
   * @returns {Object} 连接信息
   */
  async selectConnection(userId, options = {}) {
    const { 
      preferredProvider = null,
      requireUserKey = false 
    } = options;

    // 调试日志
    logger.info('🔍 selectConnection called', { userId, preferredProvider, requireUserKey });

    try {
      // 1. 尝试获取用户自带密钥（BYOK）
      if (userId) {
        logger.info('✅ userId exists, querying user connection...');
        const userConnection = preferredProvider 
          ? await UserAIConnection.findOne({ 
              user: userId, 
              provider: preferredProvider,
              isActive: true 
            })
          : await UserAIConnection.getUserDefaultConnection(userId);

        if (userConnection) {
          logger.info('📝 userConnection found', { 
            provider: userConnection.provider, 
            isActive: userConnection.isActive 
          });
          
          // 检查用户配额
          if (await this.checkUserQuota(userConnection)) {
            logger.info('✅ 使用用户BYOK连接', { userId, provider: userConnection.provider });
            return {
              type: 'user',
              connection: userConnection,
              provider: userConnection.provider,
              baseURL: userConnection.baseURL,
              apiKey: userConnection.apiKey, // 直接使用明文API密钥
              model: userConnection.defaultModel,
              requestParams: userConnection.requestParams,
              timeout: userConnection.timeout
            };
          } else {
            logger.warn('⚠️ 用户配额不足', { userId });
          }
        } else {
          logger.info('⚠️ userConnection not found for userId:', userId);
        }
      } else {
        logger.info('⚠️ userId is null/undefined, skipping user connection query');
      }

      // 2. 如果要求必须使用用户密钥，则返回错误
      if (requireUserKey) {
        throw new Error('未找到可用的用户AI连接');
      }

      // 3. 回退到平台配置
      logger.info('🔄 Falling back to platform config...');
      const platformConfig = await AIConfig.getActiveConfig();
      logger.info('📝 platformConfig query result:', { 
        found: !!platformConfig, 
        providersCount: platformConfig?.providers?.length || 0 
      });
      
      if (!platformConfig || !platformConfig.providers.length) {
        logger.error('❌ 平台AI服务未配置');
        throw new Error('平台AI服务未配置');
      }

      // 4. 根据路由策略选择provider
      const selectedProvider = await this.selectPlatformProvider(
        platformConfig,
        preferredProvider
      );

      if (!selectedProvider) {
        throw new Error('没有可用的平台AI服务');
      }

      // 5. 选择provider下的API密钥
      const selectedKey = platformConfig.getAvailableKey(selectedProvider.provider);
      if (!selectedKey) {
        throw new Error('没有可用的API密钥');
      }

      // 6. 检查平台配额
      if (!(await this.checkPlatformQuota(platformConfig))) {
        throw new Error('平台配额不足');
      }

      logger.info('使用平台AI服务', { 
        provider: selectedProvider.provider,
        keyLabel: selectedKey.label 
      });

      return {
        type: 'platform',
        config: platformConfig,
        provider: selectedProvider.provider,
        providerConfig: selectedProvider,
        baseURL: selectedProvider.baseURL,
        apiKey: platformConfig.decryptApiKey(selectedKey.keyEncrypted),
        keyId: selectedKey._id,
        model: selectedProvider.defaultModel,
        requestParams: selectedProvider.requestParams?.defaults || {},
        timeout: selectedProvider.timeout
      };

    } catch (error) {
      logger.error('AI连接选择失败:', error);
      throw error;
    }
  }

  /**
   * 选择平台provider（根据路由策略）
   */
  async selectPlatformProvider(platformConfig, preferredProvider = null) {
    const enabledProviders = platformConfig.providers.filter(p => p.enabled);
    
    if (!enabledProviders.length) {
      return null;
    }

    // 如果指定了provider，优先使用
    if (preferredProvider) {
      const provider = enabledProviders.find(p => p.provider === preferredProvider);
      if (provider) return provider;
    }

    // 根据路由策略选择
    const strategy = platformConfig.routingStrategy || 'priority';

    switch (strategy) {
      case 'priority':
        // 按权重随机选择
        return this.selectByWeight(enabledProviders);
      
      case 'round-robin':
        // 轮询（简单实现，可以存储状态）
        return enabledProviders[0];
      
      case 'least-latency':
        // 选择最低延迟（这里简化处理）
        return enabledProviders[0];
      
      case 'cost-optimized':
        // 选择成本最优（这里简化处理）
        return enabledProviders[0];
      
      default:
        return enabledProviders[0];
    }
  }

  /**
   * 按权重选择provider
   */
  selectByWeight(providers) {
    // 这里简化处理，直接返回第一个
    // 实际可以根据apiKeys的weight进行加权随机
    return providers[0];
  }

  /**
   * 检查用户配额
   */
  async checkUserQuota(userConnection) {
    if (!userConnection.quotaSettings || !userConnection.quotaSettings.dailyLimit) {
      return true; // 未设置限制，允许使用
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 这里简化处理，实际需要查询当日使用量
    // 可以从usage.lastUsedAt判断是否是今天，或者从日志中统计
    return true;
  }

  /**
   * 检查平台配额
   */
  async checkPlatformQuota(platformConfig) {
    if (!platformConfig.quota) {
      return true; // 未设置限制，允许使用
    }

    const { monthlyBudget } = platformConfig.quota;
    if (!monthlyBudget) {
      return true;
    }

    // 这里简化处理，实际需要查询本月总花费
    // 可以统计所有provider下所有key的usage.totalCost
    return true;
  }

  /**
   * 调用AI生成
   * @param {String} userId - 用户ID
   * @param {Object} params - 生成参数
   * @returns {Promise} 生成结果
   */
  async generate(userId, params) {
    const {
      messages,
      provider = null,
      model = null,
      temperature = null,
      maxTokens = null,
      stream = false,
      requireUserKey = false
    } = params;

    try {
      // 1. 选择连接
      const connection = await this.selectConnection(userId, {
        preferredProvider: provider,
        requireUserKey
      });

      // 2. 准备请求参数
      const requestParams = {
        provider: connection.provider,
        baseURL: connection.baseURL,
        apiKey: connection.apiKey,
        model: model || connection.model,
        messages,
        options: {
          temperature: temperature ?? connection.requestParams.temperature,
          maxTokens: maxTokens ?? connection.requestParams.maxTokens,
          topP: connection.requestParams.topP,
          frequencyPenalty: connection.requestParams.frequencyPenalty,
          presencePenalty: connection.requestParams.presencePenalty
        },
        stream,
        timeout: connection.timeout
      };

      // 3. 调用AI服务
      const result = await AIService.generateCompletion(requestParams);

      // 4. 如果成功，更新使用统计
      if (result.success) {
        await this.updateUsageStats(connection, result.usage);
      }

      // 5. 如果失败且允许降级，尝试降级
      if (!result.success && connection.type === 'user' && !requireUserKey) {
        logger.info('用户连接失败，尝试降级到平台服务');
        return await this.generate(userId, {
          ...params,
          requireUserKey: false,
          provider: null // 清除provider限制，让平台自己选择
        });
      }

      return result;

    } catch (error) {
      logger.error('AI生成失败:', error);
      throw error;
    }
  }

  /**
   * 流式生成
   */
  async generateStream(userId, params, onChunk, onComplete, onError) {
    try {
      const connection = await this.selectConnection(userId, {
        preferredProvider: params.provider,
        requireUserKey: params.requireUserKey || false
      });

      const requestParams = {
        provider: connection.provider,
        baseURL: connection.baseURL,
        apiKey: connection.apiKey,
        model: params.model || connection.model,
        messages: params.messages,
        options: {
          temperature: params.temperature ?? connection.requestParams.temperature,
          maxTokens: params.maxTokens ?? connection.requestParams.maxTokens,
          topP: connection.requestParams.topP,
          frequencyPenalty: connection.requestParams.frequencyPenalty,
          presencePenalty: connection.requestParams.presencePenalty
        },
        timeout: connection.timeout
      };

      await AIService.generateStreamCompletion(
        requestParams,
        onChunk,
        async (result) => {
          // 更新使用统计
          await this.updateUsageStats(connection, result.usage);
          onComplete(result);
        },
        onError
      );

    } catch (error) {
      onError(error);
    }
  }

  /**
   * 更新使用统计
   */
  async updateUsageStats(connection, usage) {
    try {
      if (connection.type === 'user') {
        // 更新用户连接的使用统计
        const cost = AIService.estimateCost(
          connection.provider,
          connection.model,
          usage
        );
        await connection.connection.updateUsage(usage, cost, true);
      } else if (connection.type === 'platform') {
        // 更新平台配置的使用统计
        const cost = AIService.estimateCost(
          connection.provider,
          connection.model,
          usage
        );
        await connection.config.updateKeyUsage(
          connection.provider,
          connection.keyId,
          { ...usage, cost }
        );
      }
    } catch (error) {
      logger.error('更新使用统计失败:', error);
    }
  }

  /**
   * 验证连接
   */
  async validateConnection(userId, connectionId, isUserConnection = true) {
    try {
      let connection;
      
      if (isUserConnection) {
        connection = await UserAIConnection.findOne({
          _id: connectionId,
          user: userId
        });

        if (!connection) {
          throw new Error('连接不存在');
        }

        const result = await AIService.validateApiKey(
          connection.provider,
          connection.baseURL,
          connection.apiKey, // 直接使用明文API密钥
          connection.defaultModel
        );

        await connection.updateValidation(result.valid, result.error);
        return result;

      } else {
        // 验证平台配置
        const config = await AIConfig.getActiveConfig();
        if (!config) {
          throw new Error('平台配置不存在');
        }

        const provider = config.providers.id(connectionId);
        if (!provider) {
          throw new Error('Provider不存在');
        }

        const key = provider.apiKeys[0]; // 验证第一个密钥
        if (!key) {
          throw new Error('没有配置API密钥');
        }

        const result = await AIService.validateApiKey(
          provider.providerType,
          provider.baseURL,
          config.decryptApiKey(key.keyEncrypted),
          provider.defaultModel
        );

        return result;
      }

    } catch (error) {
      logger.error('连接验证失败:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户使用统计
   */
  async getUserUsageStats(userId, period = 'month') {
    try {
      const connections = await UserAIConnection.find({ user: userId });
      
      const stats = {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        connections: connections.map(conn => ({
          id: conn._id,
          name: conn.name,
          provider: conn.provider,
          usage: conn.usage
        }))
      };

      connections.forEach(conn => {
        stats.totalTokens += conn.usage.totalTokens || 0;
        stats.promptTokens += conn.usage.promptTokens || 0;
        stats.completionTokens += conn.usage.completionTokens || 0;
      });

      return stats;

    } catch (error) {
      logger.error('获取用户使用统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台使用统计
   */
  async getPlatformUsageStats() {
    try {
      const config = await AIConfig.getActiveConfig();
      if (!config) {
        return null;
      }

      const stats = {
        providers: [],
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0
      };

      config.providers.forEach(provider => {
        let providerStats = {
          provider: provider.provider,
          displayName: provider.displayName,
          keys: [],
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0
        };

        provider.apiKeys.forEach(key => {
          providerStats.keys.push({
            label: key.label,
            keyMask: key.keyMask,
            usage: key.usage
          });
          providerStats.totalRequests += key.usage.totalRequests || 0;
          providerStats.totalTokens += key.usage.totalTokens || 0;
          providerStats.totalCost += key.usage.totalCost || 0;
        });

        stats.providers.push(providerStats);
        stats.totalRequests += providerStats.totalRequests;
        stats.totalTokens += providerStats.totalTokens;
        stats.totalCost += providerStats.totalCost;
      });

      return stats;

    } catch (error) {
      logger.error('获取平台使用统计失败:', error);
      throw error;
    }
  }
}

// 导出单例
module.exports = new AIGatewayService();
