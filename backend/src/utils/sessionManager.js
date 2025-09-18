const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * 会话管理工具
 * 用于监控和调试用户会话问题
 */
class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // 存储活跃会话信息
    this.sessionStats = {
      totalSessions: 0,
      expiredSessions: 0,
      invalidSessions: 0,
      lastCleanup: new Date()
    };
    
    // 定期清理过期会话信息（每小时）
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * 记录会话创建
   */
  recordSessionCreation(userId, token, userAgent, ip) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) return;

      const sessionInfo = {
        userId,
        tokenId: decoded.jti || `${userId}_${decoded.iat}`,
        createdAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        userAgent,
        ip,
        lastActivity: new Date(),
        isActive: true
      };

      this.activeSessions.set(sessionInfo.tokenId, sessionInfo);
      this.sessionStats.totalSessions++;

      logger.info('Session created:', {
        userId,
        tokenId: sessionInfo.tokenId,
        expiresAt: sessionInfo.expiresAt,
        userAgent: userAgent?.substring(0, 100),
        ip
      });

    } catch (error) {
      logger.error('Failed to record session creation:', error);
    }
  }

  /**
   * 记录会话活动
   */
  recordSessionActivity(userId, token, userAgent, ip) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) return;

      const tokenId = decoded.jti || `${userId}_${decoded.iat}`;
      const sessionInfo = this.activeSessions.get(tokenId);

      if (sessionInfo) {
        sessionInfo.lastActivity = new Date();
        sessionInfo.userAgent = userAgent;
        sessionInfo.ip = ip;
      } else {
        // 如果会话信息不存在，可能是服务器重启后的情况
        this.recordSessionCreation(userId, token, userAgent, ip);
      }

    } catch (error) {
      logger.error('Failed to record session activity:', error);
    }
  }

  /**
   * 记录会话失效
   */
  recordSessionInvalidation(token, reason, userAgent, ip) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) return;

      const tokenId = decoded.jti || `${decoded.sub || 'unknown'}_${decoded.iat}`;
      const sessionInfo = this.activeSessions.get(tokenId);

      if (sessionInfo) {
        sessionInfo.isActive = false;
        sessionInfo.invalidatedAt = new Date();
        sessionInfo.invalidationReason = reason;
      }

      this.sessionStats.invalidSessions++;

      logger.warn('Session invalidated:', {
        tokenId,
        reason,
        userAgent: userAgent?.substring(0, 100),
        ip,
        tokenCreatedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
        tokenExpiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
      });

    } catch (error) {
      logger.error('Failed to record session invalidation:', error);
    }
  }

  /**
   * 检查token有效性
   */
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return {
        valid: true,
        decoded,
        reason: null
      };
    } catch (error) {
      let reason = 'UNKNOWN_ERROR';
      
      switch (error.name) {
        case 'TokenExpiredError':
          reason = 'TOKEN_EXPIRED';
          this.sessionStats.expiredSessions++;
          break;
        case 'JsonWebTokenError':
          reason = 'INVALID_TOKEN';
          break;
        case 'NotBeforeError':
          reason = 'TOKEN_NOT_ACTIVE';
          break;
        default:
          reason = 'VERIFICATION_ERROR';
      }

      return {
        valid: false,
        decoded: null,
        reason,
        error: error.message
      };
    }
  }

  /**
   * 获取用户的活跃会话
   */
  getUserActiveSessions(userId) {
    const userSessions = [];
    
    for (const [tokenId, sessionInfo] of this.activeSessions) {
      if (sessionInfo.userId.toString() === userId.toString() && sessionInfo.isActive) {
        userSessions.push({
          tokenId,
          createdAt: sessionInfo.createdAt,
          expiresAt: sessionInfo.expiresAt,
          lastActivity: sessionInfo.lastActivity,
          userAgent: sessionInfo.userAgent,
          ip: sessionInfo.ip
        });
      }
    }

    return userSessions.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [tokenId, sessionInfo] of this.activeSessions) {
      if (sessionInfo.expiresAt < now || !sessionInfo.isActive) {
        this.activeSessions.delete(tokenId);
        cleanedCount++;
      }
    }

    this.sessionStats.lastCleanup = now;

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats() {
    const now = new Date();
    const activeCount = Array.from(this.activeSessions.values())
      .filter(session => session.isActive && session.expiresAt > now).length;

    return {
      ...this.sessionStats,
      activeSessions: activeCount,
      totalStoredSessions: this.activeSessions.size,
      lastUpdated: new Date()
    };
  }

  /**
   * 强制使某个用户的所有会话失效
   */
  invalidateUserSessions(userId, reason = 'ADMIN_REVOKE') {
    let invalidatedCount = 0;

    for (const [tokenId, sessionInfo] of this.activeSessions) {
      if (sessionInfo.userId.toString() === userId.toString() && sessionInfo.isActive) {
        sessionInfo.isActive = false;
        sessionInfo.invalidatedAt = new Date();
        sessionInfo.invalidationReason = reason;
        invalidatedCount++;
      }
    }

    logger.info(`Invalidated ${invalidatedCount} sessions for user ${userId}, reason: ${reason}`);
    return invalidatedCount;
  }

  /**
   * 获取会话详细信息（用于调试）
   */
  getSessionDetails(tokenId) {
    return this.activeSessions.get(tokenId) || null;
  }

  /**
   * 检测异常会话模式
   */
  detectAnomalousPatterns() {
    const patterns = {
      multipleIPs: new Map(),
      rapidCreation: new Map(),
      suspiciousUserAgents: []
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const sessionInfo of this.activeSessions.values()) {
      if (!sessionInfo.isActive) continue;

      // 检测同一用户多个IP
      const userKey = sessionInfo.userId.toString();
      if (!patterns.multipleIPs.has(userKey)) {
        patterns.multipleIPs.set(userKey, new Set());
      }
      patterns.multipleIPs.get(userKey).add(sessionInfo.ip);

      // 检测快速创建会话
      if (sessionInfo.createdAt > oneHourAgo) {
        if (!patterns.rapidCreation.has(userKey)) {
          patterns.rapidCreation.set(userKey, 0);
        }
        patterns.rapidCreation.set(userKey, patterns.rapidCreation.get(userKey) + 1);
      }

      // 检测可疑User-Agent
      if (sessionInfo.userAgent && 
          (sessionInfo.userAgent.includes('bot') || 
           sessionInfo.userAgent.includes('crawler') ||
           sessionInfo.userAgent.length < 10)) {
        patterns.suspiciousUserAgents.push({
          userId: sessionInfo.userId,
          userAgent: sessionInfo.userAgent,
          ip: sessionInfo.ip,
          createdAt: sessionInfo.createdAt
        });
      }
    }

    // 过滤异常模式
    const anomalies = {
      multipleIPs: Array.from(patterns.multipleIPs.entries())
        .filter(([userId, ips]) => ips.size > 3)
        .map(([userId, ips]) => ({ userId, ipCount: ips.size, ips: Array.from(ips) })),
      
      rapidCreation: Array.from(patterns.rapidCreation.entries())
        .filter(([userId, count]) => count > 5)
        .map(([userId, count]) => ({ userId, sessionCount: count })),
      
      suspiciousUserAgents: patterns.suspiciousUserAgents
    };

    return anomalies;
  }
}

// 创建全局实例
const sessionManager = new SessionManager();

module.exports = sessionManager;
