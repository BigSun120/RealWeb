const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const SecurityLogger = require('./securityLogger');

/**
 * 邮箱验证相关的频率限制中间件
 */

/**
 * 创建基于 MongoDB 的存储
 */
const createMongoStore = () => {
  try {
    return new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: 'rateLimitStore',
      expireTimeMs: 15 * 60 * 1000 // 15分钟过期
    });
  } catch (error) {
    console.warn('Failed to create MongoDB rate limit store, falling back to memory store');
    return undefined; // 使用默认的内存存储
  }
};

/**
 * 验证邮件发送频率限制
 * 限制：每个IP每3分钟最多发送5次验证邮件
 */
const verificationEmailRateLimit = rateLimit({
  store: createMongoStore(),
  windowMs: 3 * 60 * 1000, // 3分钟窗口（从5分钟减少到3分钟）
  max: 5, // 最多5次请求（从3次增加到5次）
  message: {
    code: 429,
    message: '验证邮件发送过于频繁，请3分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 基于IP和邮箱地址生成key
    const email = req.body.email || req.user?.email || '';
    const ip = SecurityLogger.getClientIP(req);
    return `verification_email:${ip}:${email}`;
  },
  onLimitReached: (req, res) => {
    const email = req.body.email || req.user?.email || '';
    const userId = req.user?.id || null;

    SecurityLogger.logRateLimitTriggered(
      userId,
      email,
      'verification_email_send',
      req
    );
  }
});

/**
 * 邮箱验证尝试频率限制
 * 限制：每个IP每小时最多尝试验证20次
 */
const emailVerificationRateLimit = rateLimit({
  store: createMongoStore(),
  windowMs: 60 * 60 * 1000, // 1小时窗口
  max: 20, // 最多20次尝试（从10次增加到20次）
  message: {
    code: 429,
    message: '邮箱验证尝试过于频繁，请1小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = SecurityLogger.getClientIP(req);
    return `email_verification:${ip}`;
  },
  onLimitReached: (req, res) => {
    const token = req.params.token || '';

    SecurityLogger.logRateLimitTriggered(
      null,
      null,
      'email_verification_attempt',
      req
    );

    SecurityLogger.logSuspiciousActivity(
      'Excessive email verification attempts',
      { tokenPrefix: token.substring(0, 8) + '...' },
      req
    );
  }
});

/**
 * 注册频率限制
 * 限制：每个IP每小时最多注册10个账户
 */
const registrationRateLimit = rateLimit({
  store: createMongoStore(),
  windowMs: 60 * 60 * 1000, // 1小时窗口
  max: 10, // 最多10次注册（从5次增加到10次）
  message: {
    code: 429,
    message: '注册过于频繁，请1小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = SecurityLogger.getClientIP(req);
    return `registration:${ip}`;
  },
  onLimitReached: (req, res) => {
    const email = req.body.email || '';

    SecurityLogger.logRateLimitTriggered(
      null,
      email,
      'registration_attempt',
      req
    );

    SecurityLogger.logSuspiciousActivity(
      'Excessive registration attempts',
      { email },
      req
    );
  }
});

/**
 * 登录频率限制
 * 限制：每个IP每15分钟最多尝试登录20次
 */
const loginRateLimit = rateLimit({
  store: createMongoStore(),
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 20, // 最多20次尝试（从10次增加到20次）
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = SecurityLogger.getClientIP(req);
    const identifier = req.body.identifier || '';
    return `login:${ip}:${identifier}`;
  },
  onLimitReached: (req, res) => {
    const identifier = req.body.identifier || '';

    SecurityLogger.logRateLimitTriggered(
      null,
      identifier,
      'login_attempt',
      req
    );

    SecurityLogger.logSuspiciousActivity(
      'Excessive login attempts',
      { identifier },
      req
    );
  }
});

/**
 * 创建自定义频率限制器
 * @param {Object} options - 配置选项
 * @returns {Function} 频率限制中间件
 */
const createCustomRateLimit = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = '请求过于频繁，请稍后再试',
    keyPrefix = 'custom',
    onLimitReached = null
  } = options;

  return rateLimit({
    store: createMongoStore(),
    windowMs,
    max,
    message: {
      code: 429,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = SecurityLogger.getClientIP(req);
      const userId = req.user?.id || 'anonymous';
      return `${keyPrefix}:${ip}:${userId}`;
    },
    onLimitReached: onLimitReached || ((req, res) => {
      SecurityLogger.logRateLimitTriggered(
        req.user?.id || null,
        req.user?.email || null,
        keyPrefix,
        req
      );
    })
  });
};

/**
 * 基于用户的频率限制（需要认证）
 * @param {Object} options - 配置选项
 * @returns {Function} 频率限制中间件
 */
const createUserBasedRateLimit = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = '操作过于频繁，请稍后再试',
    action = 'user_action'
  } = options;

  return rateLimit({
    store: createMongoStore(),
    windowMs,
    max,
    message: {
      code: 429,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return `${action}:user:${userId}`;
    },
    onLimitReached: (req, res) => {
      SecurityLogger.logRateLimitTriggered(
        req.user?.id || null,
        req.user?.email || null,
        action,
        req
      );
    },
    skip: (req) => {
      // 管理员跳过频率限制
      return req.user?.isAdmin === true;
    }
  });
};

module.exports = {
  verificationEmailRateLimit,
  emailVerificationRateLimit,
  registrationRateLimit,
  loginRateLimit,
  createCustomRateLimit,
  createUserBasedRateLimit
};
