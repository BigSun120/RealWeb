const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// 验证token中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '访问被拒绝，需要提供token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      code: 401,
      message: '无效的token'
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
      await auth(req, res, () => {});
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

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  checkOwnership
};
