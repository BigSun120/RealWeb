const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ToolConfig = require('./ToolConfig');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少3个字符'],
      maxlength: [15, '用户名最多15个字符'],
      match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
    },
    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '邮箱格式不正确']
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: [6, '密码至少6个字符'],
      select: false // 默认查询时不返回密码
    },
    avatar: {
      type: String,
      default: ''
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [30, '展示名最多30个字符'],
      unique: true,
      sparse: true,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [200, '个人简介最多200个字符'],
      default: ''
    },
    isAdmin: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    },
    loginCount: {
      type: Number,
      default: 0
    },

    // 用户权限数组 - 更灵活的权限系统
    permissions: [
      {
        type: String,
        enum: [
          'blog:create', // 创建博客
          'blog:edit', // 编辑博客
          'blog:delete', // 删除博客
          'blog:publish', // 发布博客
          'comment:create', // 发表评论
          'comment:edit', // 编辑评论
          'comment:delete', // 删除评论
          'profile:edit', // 编辑个人资料
          'file:upload' // 上传文件
        ]
      }
    ],

    // 用户角色
    role: {
      type: String,
      enum: ['user', 'blogger', 'moderator', 'admin'],
      default: 'user'
    },

    // 邮箱验证相关字段
    emailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    emailVerificationToken: {
      type: String,
      index: true,
      sparse: true,
      select: false // 默认查询时不返回验证令牌
    },
    emailVerificationExpires: {
      type: Date,
      index: true
    },
    emailVerifiedAt: {
      type: Date
    },
    // 重发验证邮件的限制
    lastVerificationEmailSent: {
      type: Date
    },

    // 密码重置相关字段
    passwordResetToken: {
      type: String,
      index: true,
      sparse: true,
      select: false // 默认查询时不返回重置令牌
    },
    passwordResetExpires: {
      type: Date,
      index: true
    },
    passwordResetRequestedAt: {
      type: Date
    },
    passwordResetCount: {
      type: Number,
      default: 0
    },
    lastPasswordResetAt: {
      type: Date
    },

    // 临时邮箱权限控制
    tempEmailAccess: {
      enabled: {
        type: Boolean,
        default: false,
        index: true
      },
      activatedAt: {
        type: Date,
        default: null
      },
      activatedBy: {
        type: String,
        default: null // 使用的激活码
      },
      expiresAt: {
        type: Date,
        default: null,
        index: true
      },
      lastUsedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 虚拟字段：用户发表的文章数量
userSchema.virtual('articleCount', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'authorId',
  count: true
});

// 虚拟字段：关注数量
userSchema.virtual('followingCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'followerId',
  count: true
});

// 虚拟字段：粉丝数量
userSchema.virtual('followersCount', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'followingId',
  count: true
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ emailVerified: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ emailVerificationExpires: 1 });

// 密码加密中间件
userSchema.pre('save', async function (next) {
  // 只有密码被修改时才加密
  if (!this.isModified('password')) return next();

  try {
    // 检查密码是否存在
    if (!this.password) {
      throw new Error('密码不能为空');
    }

    // 生成盐值并加密密码
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});
// 角色与管理员标记同步（仅在未显式修改 isAdmin 时自动处理）
userSchema.pre('save', function (next) {
  if (this.isModified('role') && !this.isModified('isAdmin')) {
    this.isAdmin = this.role === 'admin';
  }
  next();
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function (candidatePassword) {
  // 参数验证
  if (!candidatePassword) {
    throw new Error('候选密码不能为空');
  }
  if (!this.password) {
    throw new Error('用户密码未设置');
  }

  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('密码比较错误:', error);
    throw new Error('密码验证失败');
  }
};

// 实例方法：生成JWT token
userSchema.methods.generateAuthToken = function (options = {}) {
  const jwt = require('jsonwebtoken');

  // 根据rememberMe参数决定过期时间
  const rememberMe = options.rememberMe || false;
  const expiresIn = rememberMe ? '30d' : '7d'; // 记住我30天，否则7天

  // 默认配置
  const defaultOptions = {
    expiresIn,
    issuer: 'personal-website',
    audience: 'web-client'
  };

  // 从options中提取rememberMe，不传递给JWT选项
  const { rememberMe: _, ...jwtOptions } = options;

  // 合并选项（但保持expiresIn的逻辑）
  const tokenOptions = {
    ...defaultOptions,
    ...jwtOptions,
    expiresIn // 确保expiresIn不被覆盖
  };

  // Token payload
  const payload = {
    userId: this._id,
    username: this.username,
    email: this.email,
    isAdmin: this.isAdmin,
    rememberMe, // 添加rememberMe标识到payload中
    iat: Math.floor(Date.now() / 1000), // 签发时间
    // 添加一些额外信息用于调试
    version: '1.0'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

// 实例方法：更新登录信息
userSchema.methods.updateLoginInfo = async function () {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  await this.save();
};

// 实例方法：检查权限
userSchema.methods.hasPermission = function (permission) {
  // 管理员拥有所有权限
  if (this.isAdmin) {
    return true;
  }

  // 某些权限需要邮箱验证
  const emailVerificationRequiredPermissions = [
    'blog:create',
    'blog:edit',
    'blog:delete',
    'blog:publish',
    'comment:create',
    'file:upload'
  ];

  // 如果权限需要邮箱验证但用户未验证邮箱，则拒绝
  if (emailVerificationRequiredPermissions.includes(permission) && !this.emailVerified) {
    return false;
  }

  // 检查用户是否有特定权限
  return this.permissions && this.permissions.includes(permission);
};

// 实例方法：添加权限
userSchema.methods.addPermission = function (permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this;
};

// 实例方法：移除权限
userSchema.methods.removePermission = function (permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this;
};

// 实例方法：设置角色并自动分配权限
userSchema.methods.setRole = function (role) {
  this.role = role;

  // 根据角色自动分配权限
  const rolePermissions = {
    user: ['comment:create', 'profile:edit'],
    blogger: [
      'comment:create',
      'profile:edit',
      'file:upload',
      'blog:create',
      'blog:edit',
      'blog:delete',
      'blog:publish'
    ],
    moderator: [
      'comment:create',
      'comment:edit',
      'comment:delete',
      'profile:edit',
      'file:upload',
      'blog:create',
      'blog:edit',
      'blog:delete',
      'blog:publish'
    ],
    admin: [] // 管理员通过isAdmin字段拥有所有权限
  };

  this.permissions = rolePermissions[role] || [];
  return this;
};

// 实例方法：获取公开信息
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.email;
  return userObject;
};

// 实例方法：获取包含关注统计的公开信息
userSchema.methods.getPublicProfileWithStats = async function () {
  const Follow = require('./Follow');
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.email;

  // 获取关注统计
  const stats = await Follow.getFollowStats(this._id);
  userObject.followingCount = stats.followingCount;
  userObject.followersCount = stats.followersCount;

  return userObject;
};

// 实例方法：生成邮箱验证令牌
userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require('crypto');

  // 生成更安全的随机令牌（64字节）
  const token = crypto.randomBytes(64).toString('hex');

  // 创建令牌哈希（存储哈希值而不是原始令牌）
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 设置令牌哈希和过期时间（24小时）
  this.emailVerificationToken = tokenHash;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

  // 返回原始令牌（用于发送邮件）
  return token;
};

// 实例方法：验证邮箱验证令牌
userSchema.methods.verifyEmailToken = function (token) {
  const crypto = require('crypto');

  if (!token || !this.emailVerificationToken) {
    return false;
  }

  // 检查令牌是否过期
  if (this.emailVerificationExpires && this.emailVerificationExpires < new Date()) {
    return false;
  }

  // 创建令牌哈希并与存储的哈希比较
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 使用时间安全的比较方法
  return crypto.timingSafeEqual(
    Buffer.from(this.emailVerificationToken, 'hex'),
    Buffer.from(tokenHash, 'hex')
  );
};

// 实例方法：完成邮箱验证
userSchema.methods.completeEmailVerification = function () {
  this.emailVerified = true;
  this.emailVerifiedAt = new Date();
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  return this;
};

// 实例方法：检查是否需要重新发送验证邮件
userSchema.methods.canResendVerificationEmail = function () {
  // 如果已经验证，不需要重发
  if (this.emailVerified) {
    return false;
  }

  // 检查是否在冷却期内（5分钟）
  if (this.lastVerificationEmailSent) {
    const cooldownPeriod = 5 * 60 * 1000; // 5分钟
    const timeSinceLastSent = Date.now() - this.lastVerificationEmailSent.getTime();
    if (timeSinceLastSent < cooldownPeriod) {
      return false;
    }
  }

  return true;
};

// 实例方法：记录验证邮件发送时间
userSchema.methods.markVerificationEmailSent = function () {
  this.lastVerificationEmailSent = new Date();
  return this;
};

// 实例方法：生成密码重置令牌
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');

  // 生成更安全的随机令牌（64字节）
  const token = crypto.randomBytes(64).toString('hex');

  // 创建令牌哈希（存储哈希值而不是原始令牌）
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 设置令牌哈希和过期时间（1小时）
  this.passwordResetToken = tokenHash;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期
  this.passwordResetRequestedAt = new Date();

  // 返回原始令牌（用于发送邮件）
  return token;
};

// 实例方法：验证密码重置令牌
userSchema.methods.verifyPasswordResetToken = function (token) {
  const crypto = require('crypto');

  if (!token || !this.passwordResetToken) {
    return false;
  }

  // 检查令牌是否过期
  if (this.passwordResetExpires && this.passwordResetExpires < new Date()) {
    return false;
  }

  // 创建令牌哈希并与存储的哈希比较
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 使用时间安全的比较方法
  return crypto.timingSafeEqual(
    Buffer.from(this.passwordResetToken, 'hex'),
    Buffer.from(tokenHash, 'hex')
  );
};

// 实例方法：检查是否可以请求密码重置
userSchema.methods.canRequestPasswordReset = function () {
  // 检查是否在冷却期内（2分钟）
  if (this.passwordResetRequestedAt) {
    const cooldownPeriod = 2 * 60 * 1000; // 2分钟（从5分钟减少到2分钟）
    const timeSinceLastRequest = Date.now() - this.passwordResetRequestedAt.getTime();
    if (timeSinceLastRequest < cooldownPeriod) {
      return false;
    }
  }

  return true;
};

// 实例方法：执行密码重置
userSchema.methods.resetPassword = async function (newPassword) {
  // 直接设置新密码，让pre('save')中间件处理加密
  this.password = newPassword;

  // 清除重置令牌
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  this.passwordResetCount = (this.passwordResetCount || 0) + 1;
  this.lastPasswordResetAt = new Date();

  return this;
};

// 实例方法：检查临时邮箱权限
userSchema.methods.hasTempEmailAccess = async function () {
  // 管理员拥有所有权限
  if (this.isAdmin) {
    return true;
  }

  // 检查是否开启激活码验证
  const requireActivationCode = await ToolConfig.getValue('tempEmail.requireActivationCode', true);

  // 如果未开启激活码验证，所有登录用户都可以使用
  if (!requireActivationCode) {
    return true;
  }

  // 检查激活码是否仍然有效（实时检查）
  const TempEmailActivationCode = require('./TempEmailActivationCode');
  let codesToCheck = [];

  // 收集需要检查的激活码
  if (this.tempEmailAccess) {
    if (this.tempEmailAccess.activationCodes && this.tempEmailAccess.activationCodes.length > 0) {
      codesToCheck = this.tempEmailAccess.activationCodes;
    } else if (this.tempEmailAccess.activatedBy) {
      // 兼容旧数据，只有activatedBy字段的情况
      codesToCheck = [this.tempEmailAccess.activatedBy];
    }

    // 检查是否过期
    if (this.tempEmailAccess.expiresAt && this.tempEmailAccess.expiresAt < new Date()) {
      return false;
    }
  }

  if (codesToCheck.length > 0) {
    // 检查是否有任何一个激活码仍然有效
    const validCodes = await TempEmailActivationCode.find({
      code: { $in: codesToCheck },
      isActive: true
    });

    const allCodes = await TempEmailActivationCode.find({
      code: { $in: codesToCheck }
    });



    // 如果没有有效的激活码，撤销权限
    if (validCodes.length === 0) {
      if (this.tempEmailAccess) {
        this.tempEmailAccess.enabled = false;
        await this.save();
      }
      return false;
    } else {
      // 确保用户有tempEmailAccess对象
      if (!this.tempEmailAccess) {
        // 如果没有tempEmailAccess对象，创建一个
        const firstValidCode = validCodes[0];
        this.tempEmailAccess = {
          enabled: true,
          activatedAt: new Date(),
          activatedBy: firstValidCode.code,
          activationCodes: codesToCheck,
          expiresAt: firstValidCode.expiresAt,
          lastUsedAt: null
        };
        await this.save();
      } else if (!this.tempEmailAccess.enabled) {
        // 如果有有效激活码但权限被禁用，重新启用权限
        this.tempEmailAccess.enabled = true;
        await this.save();
      }

      return true;
    }
  } else {
    // 没有激活码可检查，但检查是否有曾经使用过的有效激活码
    const usedCodes = await TempEmailActivationCode.find({
      lastUsedBy: this._id,
      isActive: true
    });

    if (usedCodes.length > 0) {
      // 恢复权限对象
      const firstCode = usedCodes[0];
      this.tempEmailAccess = {
        enabled: true,
        activatedAt: new Date(),
        activatedBy: firstCode.code,
        activationCodes: usedCodes.map(c => c.code),
        expiresAt: firstCode.expiresAt,
        lastUsedAt: null
      };

      await this.save();
      return true;
    }

    return false;
  }
};

// 实例方法：激活临时邮箱权限
userSchema.methods.activateTempEmailAccess = function (activationCode, expiresAt = null) {
  const now = new Date();

  // 如果用户已经有权限，更新激活码列表和过期时间
  if (this.tempEmailAccess && this.tempEmailAccess.enabled) {
    // 添加新的激活码到列表中
    if (!this.tempEmailAccess.activationCodes) {
      this.tempEmailAccess.activationCodes = [this.tempEmailAccess.activatedBy];
    }
    this.tempEmailAccess.activationCodes.push(activationCode);

    // 时间不叠加，取最长的过期时间
    if (expiresAt) {
      if (!this.tempEmailAccess.expiresAt || expiresAt > this.tempEmailAccess.expiresAt) {
        this.tempEmailAccess.expiresAt = expiresAt;
      }
    }
  } else {
    // 首次激活
    this.tempEmailAccess = {
      enabled: true,
      activatedAt: now,
      activatedBy: activationCode,
      activationCodes: [activationCode],
      expiresAt: expiresAt,
      lastUsedAt: null
    };
  }

  return this;
};

// 实例方法：撤销临时邮箱权限
userSchema.methods.revokeTempEmailAccess = function () {
  this.tempEmailAccess = {
    enabled: false,
    activatedAt: null,
    activatedBy: null,
    expiresAt: null,
    lastUsedAt: null
  };
  return this;
};

// 实例方法：更新临时邮箱使用时间
userSchema.methods.updateTempEmailUsage = function () {
  if (this.tempEmailAccess) {
    this.tempEmailAccess.lastUsedAt = new Date();
  }
  return this;
};

// 实例方法：清除密码重置令牌
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  return this;
};

// 自定义toJSON方法
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken; // 不返回验证令牌

  // 添加向后兼容的canPublishBlog字段
  user.canPublishBlog = this.isAdmin || this.hasPermission('blog:create');

  // 添加邮箱验证相关的计算字段
  user.needsEmailVerification = !this.emailVerified;
  user.canResendVerificationEmail = this.canResendVerificationEmail();

  // 添加关注统计字段（如果已填充）
  if (this.followingCount !== undefined) {
    user.followingCount = this.followingCount;
  }
  if (this.followersCount !== undefined) {
    user.followersCount = this.followersCount;
  }

  return user;
};

// 静态方法：根据邮箱或用户名查找用户
userSchema.statics.findByEmailOrUsername = function (identifier) {
  return this.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  }).select('+password');
};

// 静态方法：检查邮箱是否已存在
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const query = { email };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const user = await this.findOne(query);
  return !!user;
};

// 静态方法：检查用户名是否已存在
userSchema.statics.isUsernameTaken = async function (username, excludeUserId) {
  const query = { username };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const user = await this.findOne(query);
  return !!user;
};

// 静态方法：通过验证令牌查找用户
userSchema.statics.findByVerificationToken = function (token) {
  const crypto = require('crypto');

  // 创建令牌哈希
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return this.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() }
  }).select('+emailVerificationToken');
};

// 静态方法：通过密码重置令牌查找用户
userSchema.statics.findByPasswordResetToken = function (token) {
  const crypto = require('crypto');

  // 创建令牌哈希
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return this.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetToken');
};

// 静态方法：清理过期的验证令牌
userSchema.statics.cleanupExpiredTokens = async function () {
  const result = await this.updateMany(
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
  return result;
};

module.exports = mongoose.model('User', userSchema);

