const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
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
userSchema.methods.generateAuthToken = function () {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
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
