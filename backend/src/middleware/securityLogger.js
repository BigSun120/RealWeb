const logger = require('../utils/logger');

/**
 * 安全事件日志记录中间件
 */

/**
 * 记录邮箱验证相关的安全事件
 */
class SecurityLogger {
  /**
   * 记录邮箱验证令牌生成
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {Object} req - 请求对象
   */
  static logEmailVerificationTokenGenerated(userId, email, req) {
    const clientInfo = this.getClientInfo(req);

    logger.info('Email verification token generated', {
      event: 'EMAIL_VERIFICATION_TOKEN_GENERATED',
      userId,
      email,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录邮箱验证成功
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {Object} req - 请求对象
   */
  static logEmailVerificationSuccess(userId, email, req) {
    const clientInfo = this.getClientInfo(req);

    logger.info('Email verification successful', {
      event: 'EMAIL_VERIFICATION_SUCCESS',
      userId,
      email,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录邮箱验证失败
   * @param {string} token - 验证令牌（部分）
   * @param {string} reason - 失败原因
   * @param {Object} req - 请求对象
   */
  static logEmailVerificationFailure(token, reason, req) {
    const clientInfo = this.getClientInfo(req);

    logger.warn('Email verification failed', {
      event: 'EMAIL_VERIFICATION_FAILED',
      tokenPrefix: token ? token.substring(0, 8) + '...' : 'null',
      reason,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录验证邮件发送
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {string} type - 邮件类型 (verification, resend)
   * @param {Object} req - 请求对象
   */
  static logVerificationEmailSent(userId, email, type, req) {
    const clientInfo = this.getClientInfo(req);

    logger.info('Verification email sent', {
      event: 'VERIFICATION_EMAIL_SENT',
      userId,
      email,
      emailType: type,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录验证邮件发送失败
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {string} error - 错误信息
   * @param {Object} req - 请求对象
   */
  static logVerificationEmailFailure(userId, email, error, req) {
    const clientInfo = this.getClientInfo(req);

    logger.error('Verification email send failed', {
      event: 'VERIFICATION_EMAIL_FAILED',
      userId,
      email,
      error: error.message || error,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录频率限制触发
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {string} action - 触发的动作
   * @param {Object} req - 请求对象
   */
  static logRateLimitTriggered(userId, email, action, req) {
    const clientInfo = this.getClientInfo(req);

    logger.warn('Rate limit triggered', {
      event: 'RATE_LIMIT_TRIGGERED',
      userId,
      email,
      action,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录可疑活动
   * @param {string} activity - 活动描述
   * @param {Object} details - 详细信息
   * @param {Object} req - 请求对象
   */
  static logSuspiciousActivity(activity, details, req) {
    const clientInfo = this.getClientInfo(req);

    logger.warn('Suspicious activity detected', {
      event: 'SUSPICIOUS_ACTIVITY',
      activity,
      details,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录令牌清理事件
   * @param {number} cleanedCount - 清理的令牌数量
   */
  static logTokenCleanup(cleanedCount) {
    logger.info('Expired tokens cleaned up', {
      event: 'TOKEN_CLEANUP',
      cleanedCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 获取客户端信息
   * @param {Object} req - 请求对象
   * @returns {Object} 客户端信息
   */
  static getClientInfo(req) {
    return {
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      referer: req.get('Referer') || null,
      origin: req.get('Origin') || null
    };
  }

  /**
   * 获取客户端真实IP
   * @param {Object} req - 请求对象
   * @returns {string} IP地址
   */
  static getClientIP(req) {
    return req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'Unknown';
  }

  /**
   * 创建安全事件中间件
   * @param {string} eventType - 事件类型
   * @returns {Function} 中间件函数
   */
  static createSecurityMiddleware(eventType) {
    return (req, res, next) => {
      // 记录请求开始
      const startTime = Date.now();

      // 监听响应结束
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const clientInfo = this.getClientInfo(req);

        logger.info(`Security event: ${eventType}`, {
          event: eventType,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id,
          ...clientInfo,
          timestamp: new Date().toISOString()
        });
      });

      next();
    };
  }

  /**
   * 检查并记录异常访问模式
   * @param {Object} req - 请求对象
   * @param {string} userId - 用户ID
   */
  static checkAnomalousAccess(req, userId) {
    const clientInfo = this.getClientInfo(req);

    // 检查是否来自新的IP地址
    // 这里可以实现更复杂的异常检测逻辑

    // 记录访问信息用于后续分析
    logger.info('Access pattern recorded', {
      event: 'ACCESS_PATTERN',
      userId,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录密码重置请求
   * @param {string} userId - 用户ID（可能为null）
   * @param {string} email - 邮箱地址
   * @param {string} status - 状态（success, user_not_found, email_failed等）
   * @param {Object} req - 请求对象
   */
  static logPasswordResetRequest(userId, email, status, req) {
    const clientInfo = this.getClientInfo(req);

    const logLevel = status === 'success' ? 'info' : 'warn';

    logger[logLevel]('Password reset requested', {
      event: 'PASSWORD_RESET_REQUEST',
      userId,
      email,
      status,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录密码重置成功
   * @param {string} userId - 用户ID
   * @param {string} email - 邮箱地址
   * @param {Object} req - 请求对象
   */
  static logPasswordResetSuccess(userId, email, req) {
    const clientInfo = this.getClientInfo(req);

    logger.info('Password reset successful', {
      event: 'PASSWORD_RESET_SUCCESS',
      userId,
      email,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录密码重置失败
   * @param {string} token - 重置令牌（部分）
   * @param {string} reason - 失败原因
   * @param {Object} req - 请求对象
   */
  static logPasswordResetFailure(token, reason, req) {
    const clientInfo = this.getClientInfo(req);

    logger.warn('Password reset failed', {
      event: 'PASSWORD_RESET_FAILURE',
      token: token ? token.substring(0, 8) + '...' : null, // 只记录令牌的前8位
      reason,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = SecurityLogger;
