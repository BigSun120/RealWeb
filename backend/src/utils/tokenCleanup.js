const cron = require('node-cron');
const User = require('../models/User');
const SecurityLogger = require('../middleware/securityLogger');
const logger = require('./logger');

/**
 * 令牌清理工具
 * 定期清理过期的验证令牌和相关数据
 */
class TokenCleanup {
  constructor() {
    this.isRunning = false;
    this.lastCleanup = null;
    this.cleanupStats = {
      totalRuns: 0,
      totalCleaned: 0,
      lastRunTime: null,
      lastRunDuration: null
    };
  }

  /**
   * 启动定时清理任务
   * 每天凌晨2点执行清理
   */
  start() {
    // 每天凌晨2点执行
    cron.schedule('0 2 * * *', async () => {
      await this.runCleanup();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    // 每6小时执行一次轻量级清理
    cron.schedule('0 */6 * * *', async () => {
      await this.runLightCleanup();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    logger.info('Token cleanup scheduler started');
  }

  /**
   * 执行完整清理
   */
  async runCleanup() {
    if (this.isRunning) {
      logger.warn('Token cleanup already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.warn('Token cleanup disabled to prevent data loss');

      let totalCleaned = 0;

      // 禁用所有清理操作，防止误删数据
      // const expiredTokensResult = await this.cleanupExpiredTokens();
      // totalCleaned += expiredTokensResult;
      // const expiredResendResult = await this.cleanupExpiredResendRecords();
      // totalCleaned += expiredResendResult;
      // const orphanedResult = await this.cleanupOrphanedRecords();
      // totalCleaned += orphanedResult;

      // 更新统计信息
      const duration = Date.now() - startTime;
      this.updateStats(totalCleaned, duration);

      // 记录清理结果
      SecurityLogger.logTokenCleanup(totalCleaned);
      logger.info(`Token cleanup skipped (disabled): ${totalCleaned} records cleaned in ${duration}ms`);

    } catch (error) {
      logger.error('Token cleanup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 执行轻量级清理
   */
  async runLightCleanup() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // 只清理明显过期的令牌
      const result = await User.cleanupExpiredTokens();

      if (result.modifiedCount > 0) {
        logger.info(`Light cleanup: ${result.modifiedCount} expired tokens cleaned`);
      }

    } catch (error) {
      logger.error('Light cleanup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 清理过期的验证令牌
   */
  async cleanupExpiredTokens() {
    try {
      const result = await User.updateMany(
        {
          emailVerificationExpires: { $lt: new Date() },
          emailVerified: false
        },
        {
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpires: 1
          }
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} expired verification tokens`);
      return result.modifiedCount;

    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }

  /**
   * 清理过期的重发记录
   */
  async cleanupExpiredResendRecords() {
    try {
      // 清理7天前的重发记录
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await User.updateMany(
        {
          lastVerificationEmailSent: { $lt: sevenDaysAgo }
        },
        {
          $unset: {
            lastVerificationEmailSent: 1
          }
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} expired resend records`);
      return result.modifiedCount;

    } catch (error) {
      logger.error('Failed to cleanup expired resend records:', error);
      return 0;
    }
  }

  /**
   * 清理孤立的验证记录
   */
  async cleanupOrphanedRecords() {
    try {
      // 清理已验证但仍有令牌的记录
      const result = await User.updateMany(
        {
          emailVerified: true,
          $or: [
            { emailVerificationToken: { $exists: true } },
            { emailVerificationExpires: { $exists: true } }
          ]
        },
        {
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpires: 1
          }
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} orphaned verification records`);
      return result.modifiedCount;

    } catch (error) {
      logger.error('Failed to cleanup orphaned records:', error);
      return 0;
    }
  }

  /**
   * 更新统计信息
   */
  updateStats(cleaned, duration) {
    this.cleanupStats.totalRuns++;
    this.cleanupStats.totalCleaned += cleaned;
    this.cleanupStats.lastRunTime = new Date();
    this.cleanupStats.lastRunDuration = duration;
    this.lastCleanup = new Date();
  }

  /**
   * 获取清理统计信息
   */
  getStats() {
    return {
      ...this.cleanupStats,
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup
    };
  }

  /**
   * 手动执行清理（用于管理员操作）
   */
  async manualCleanup() {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }

    await this.runCleanup();
    return this.getStats();
  }

  /**
   * 停止清理任务
   */
  stop() {
    // node-cron 不提供直接停止方法，这里只是标记
    logger.info('Token cleanup scheduler stopped');
  }
}

// 创建单例实例
const tokenCleanup = new TokenCleanup();

module.exports = tokenCleanup;
