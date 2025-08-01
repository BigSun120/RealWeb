const ActivityLog = require('../models/ActivityLog');

/**
 * 活动日志记录中间件
 */
class ActivityLogger {
  /**
   * 记录用户登录
   */
  static async logUserLogin(userId, req) {
    return await ActivityLog.logActivity({
      type: 'user_login',
      title: '用户登录',
      description: '用户成功登录系统',
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        loginTime: new Date(),
        method: 'password'
      }
    });
  }

  /**
   * 记录用户注册
   */
  static async logUserRegister(userId, req) {
    return await ActivityLog.logActivity({
      type: 'user_register',
      title: '用户注册',
      description: '新用户完成注册',
      userId,
      targetId: userId,
      targetType: 'User',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        registerTime: new Date()
      }
    });
  }

  /**
   * 记录用户登出
   */
  static async logUserLogout(userId, req) {
    return await ActivityLog.logActivity({
      type: 'user_logout',
      title: '用户登出',
      description: '用户退出系统',
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        logoutTime: new Date()
      }
    });
  }

  /**
   * 记录文章创建
   */
  static async logArticleCreate(userId, articleId, articleTitle, req) {
    return await ActivityLog.logActivity({
      type: 'article_create',
      title: '创建文章',
      description: `创建了文章 "${articleTitle}"`,
      userId,
      targetId: articleId,
      targetType: 'Article',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        articleTitle,
        action: 'create'
      }
    });
  }

  /**
   * 记录文章编辑
   */
  static async logArticleEdit(userId, articleId, articleTitle, req) {
    return await ActivityLog.logActivity({
      type: 'article_edit',
      title: '编辑文章',
      description: `编辑了文章 "${articleTitle}"`,
      userId,
      targetId: articleId,
      targetType: 'Article',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        articleTitle,
        action: 'edit'
      }
    });
  }

  /**
   * 记录文章发布
   */
  static async logArticlePublish(userId, articleId, articleTitle, req) {
    return await ActivityLog.logActivity({
      type: 'article_publish',
      title: '发布文章',
      description: `发布了文章 "${articleTitle}"`,
      userId,
      targetId: articleId,
      targetType: 'Article',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        articleTitle,
        action: 'publish'
      }
    });
  }

  /**
   * 记录文章删除
   */
  static async logArticleDelete(userId, articleId, articleTitle, req) {
    return await ActivityLog.logActivity({
      type: 'article_delete',
      title: '删除文章',
      description: `删除了文章 "${articleTitle}"`,
      userId,
      targetId: articleId,
      targetType: 'Article',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        articleTitle,
        action: 'delete'
      }
    });
  }

  /**
   * 记录管理员操作
   */
  static async logAdminAction(userId, action, description, req, targetId = null, targetType = null) {
    return await ActivityLog.logActivity({
      type: 'admin_action',
      title: '管理员操作',
      description,
      userId,
      targetId,
      targetType,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        action,
        adminAction: true
      }
    });
  }

  /**
   * 记录用户信息更新
   */
  static async logUserUpdate(userId, targetUserId, req) {
    return await ActivityLog.logActivity({
      type: 'user_update',
      title: '更新用户信息',
      description: '用户信息已更新',
      userId,
      targetId: targetUserId,
      targetType: 'User',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        action: 'update_profile'
      }
    });
  }

  /**
   * 记录密码重置
   */
  static async logPasswordReset(userId, targetUserId, req) {
    return await ActivityLog.logActivity({
      type: 'password_reset',
      title: '密码重置',
      description: '用户密码已重置',
      userId,
      targetId: targetUserId,
      targetType: 'User',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        action: 'reset_password'
      }
    });
  }

  /**
   * 记录系统事件
   */
  static async logSystemEvent(title, description, metadata = {}) {
    return await ActivityLog.logActivity({
      type: 'system_event',
      title,
      description,
      metadata: {
        ...metadata,
        systemEvent: true,
        timestamp: new Date()
      }
    });
  }

  /**
   * 获取客户端IP地址
   */
  static getClientIP(req) {
    return req.ip ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  /**
   * 记录操作失败
   */
  static async logFailure(type, title, description, userId, req, error) {
    return await ActivityLog.logActivity({
      type,
      title,
      description,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      result: 'failure',
      errorMessage: error.message || error.toString(),
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
  }
}

module.exports = ActivityLogger;
