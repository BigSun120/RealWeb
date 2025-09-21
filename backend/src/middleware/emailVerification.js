/**
 * 邮箱验证中间件
 * 用于保护需要邮箱验证的路由
 */

/**
 * 检查用户是否已验证邮箱
 * 如果未验证，返回403错误
 */
const requireEmailVerification = (req, res, next) => {
  // 检查用户是否已登录
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '请先登录'
    });
  }

  // 管理员跳过邮箱验证检查
  if (req.user.isAdmin) {
    return next();
  }

  // 检查邮箱是否已验证
  if (!req.user.emailVerified) {
    return res.status(403).json({
      code: 403,
      message: '请先验证您的邮箱地址才能使用此功能',
      data: {
        needsEmailVerification: true,
        email: req.user.email,
        canResendVerificationEmail: req.user.canResendVerificationEmail()
      }
    });
  }

  next();
};

/**
 * 检查用户是否已验证邮箱（软检查）
 * 如果未验证，在响应中添加提醒信息，但不阻止请求
 */
const checkEmailVerification = (req, res, next) => {
  // 如果用户已登录且未验证邮箱，添加提醒信息
  if (req.user && !req.user.emailVerified && !req.user.isAdmin) {
    // 在响应中添加邮箱验证提醒
    const originalJson = res.json;
    res.json = function(data) {
      if (data && typeof data === 'object') {
        data.emailVerificationReminder = {
          needsVerification: true,
          message: '您的邮箱尚未验证，验证后可享受完整功能',
          canResendVerificationEmail: req.user.canResendVerificationEmail()
        };
      }
      return originalJson.call(this, data);
    };
  }

  next();
};

/**
 * 获取需要邮箱验证的权限列表
 */
const getEmailVerificationRequiredPermissions = () => {
  return [
    'blog:create',
    'blog:edit', 
    'blog:delete',
    'blog:publish',
    'comment:create',
    'file:upload'
  ];
};

/**
 * 检查特定权限是否需要邮箱验证
 */
const isEmailVerificationRequired = (permission) => {
  const requiredPermissions = getEmailVerificationRequiredPermissions();
  return requiredPermissions.includes(permission);
};

/**
 * 为特定权限创建邮箱验证中间件
 */
const requireEmailVerificationForPermission = (permission) => {
  return (req, res, next) => {
    // 检查用户是否已登录
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      });
    }

    // 管理员跳过检查
    if (req.user.isAdmin) {
      return next();
    }

    // 检查权限是否需要邮箱验证
    if (isEmailVerificationRequired(permission) && !req.user.emailVerified) {
      return res.status(403).json({
        code: 403,
        message: `使用 ${permission} 功能需要先验证邮箱地址`,
        data: {
          needsEmailVerification: true,
          requiredPermission: permission,
          email: req.user.email,
          canResendVerificationEmail: req.user.canResendVerificationEmail()
        }
      });
    }

    next();
  };
};

module.exports = {
  requireEmailVerification,
  checkEmailVerification,
  requireEmailVerificationForPermission,
  getEmailVerificationRequiredPermissions,
  isEmailVerificationRequired
};
