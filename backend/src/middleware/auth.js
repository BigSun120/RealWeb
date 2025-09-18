const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const sessionManager = require('../utils/sessionManager');

// 验证token中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '访问被拒绝，需要提供token',
        errorType: 'NO_TOKEN'
      });
    }

    // 使用会话管理器验证token
    const validation = sessionManager.validateToken(token);

    if (!validation.valid) {
      // 记录会话失效
      sessionManager.recordSessionInvalidation(
        token,
        validation.reason,
        req.get('User-Agent'),
        req.ip
      );

      logger.warn('JWT验证失败:', {
        error: validation.error,
        reason: validation.reason,
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        code: 401,
        message: validation.reason === 'TOKEN_EXPIRED' ? 'Token已过期，请重新登录' : '无效的token',
        errorType: validation.reason
      });
    }

    const decoded = validation.decoded;

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      logger.warn('Token有效但用户不存在:', {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        errorType: 'USER_NOT_FOUND'
      });
    }

    // 检查用户账户状态
    if (user.status === 'disabled') {
      return res.status(401).json({
        code: 401,
        message: '账户已被禁用',
        errorType: 'ACCOUNT_DISABLED'
      });
    }

    // 记录会话活动
    sessionManager.recordSessionActivity(
      user._id,
      token,
      req.get('User-Agent'),
      req.ip
    );

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(401).json({
      code: 401,
      message: '认证失败',
      errorType: 'AUTH_ERROR'
    });
  }
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // 可选认证失败不阻止请求继续
    next();
  }
};

// 管理员权限中间件
const adminAuth = async (req, res, next) => {
  try {
    // 先进行身份验证
    if (!req.user) {
      await auth(req, res, () => { });
    }

    // 检查是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      code: 401,
      message: '请先登录'
    });
  }
};

// 检查资源所有权
const checkOwnership = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          code: 404,
          message: '资源不存在'
        });
      }

      // 管理员可以访问所有资源
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // 检查是否为资源所有者
      const ownerId = resource.authorId || resource.userId || resource.author;
      if (ownerId && ownerId.toString() === req.user._id.toString()) {
        req.resource = resource;
        next();
      } else {
        res.status(403).json({
          code: 403,
          message: '权限不足，只能操作自己的资源'
        });
      }
    } catch (error) {
      next(error);
    }
  };
};

// 临时邮箱权限检查中间件
const requireTempEmailAccess = async (req, res, next) => {
  try {
    // 1. 确保用户已登录（应该由auth中间件先处理）
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
        code: 'AUTH_REQUIRED'
      });
    }

    // 2. 检查临时邮箱权限（异步检查，包含激活码状态验证）
    const hasAccess = await req.user.hasTempEmailAccess();
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '需要激活临时邮箱权限',
        code: 'TEMP_EMAIL_ACCESS_REQUIRED',
        needsActivation: true
      });
    }

    // 3. 更新使用时间
    req.user.updateTempEmailUsage();
    await req.user.save();

    next();
  } catch (error) {
    console.error('临时邮箱权限检查失败:', error);
    res.status(500).json({
      success: false,
      message: '权限检查失败',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  checkOwnership,
  requireTempEmailAccess
};
