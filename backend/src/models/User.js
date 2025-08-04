const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  permissions: [{
    type: String,
    enum: [
      'blog:create',      // 创建博客
      'blog:edit',        // 编辑博客
      'blog:delete',      // 删除博客
      'blog:publish',     // 发布博客
      'comment:create',   // 发表评论
      'comment:edit',     // 编辑评论
      'comment:delete',   // 删除评论
      'profile:edit',     // 编辑个人资料
      'file:upload'       // 上传文件
    ]
  }],

  // 用户角色
  role: {
    type: String,
    enum: ['user', 'blogger', 'moderator', 'admin'],
    default: 'user'
  },


}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

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

// 密码加密中间件
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
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
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: this._id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// 实例方法：更新登录信息
userSchema.methods.updateLoginInfo = async function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  await this.save();
};

// 实例方法：检查权限
userSchema.methods.hasPermission = function(permission) {
  // 管理员拥有所有权限
  if (this.isAdmin) {
    return true;
  }

  // 检查用户是否有特定权限
  return this.permissions && this.permissions.includes(permission);
};

// 实例方法：添加权限
userSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this;
};

// 实例方法：移除权限
userSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this;
};

// 实例方法：设置角色并自动分配权限
userSchema.methods.setRole = function(role) {
  this.role = role;

  // 根据角色自动分配权限
  const rolePermissions = {
    user: ['comment:create', 'profile:edit'],
    blogger: [
      'comment:create', 'profile:edit', 'file:upload',
      'blog:create', 'blog:edit', 'blog:delete', 'blog:publish'
    ],
    moderator: [
      'comment:create', 'comment:edit', 'comment:delete',
      'profile:edit', 'file:upload',
      'blog:create', 'blog:edit', 'blog:delete', 'blog:publish'
    ],
    admin: [] // 管理员通过isAdmin字段拥有所有权限
  };

  this.permissions = rolePermissions[role] || [];
  return this;
};

// 实例方法：获取公开信息
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.email;
  return userObject;
};

// 自定义toJSON方法
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  // 添加向后兼容的canPublishBlog字段
  user.canPublishBlog = this.isAdmin || this.hasPermission('blog:create');
  return user;
};

// 静态方法：根据邮箱或用户名查找用户
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  }).select('+password');
};

// 静态方法：检查邮箱是否已存在
userSchema.statics.isEmailTaken = async function(email, excludeUserId) {
  const query = { email };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const user = await this.findOne(query);
  return !!user;
};

// 静态方法：检查用户名是否已存在
userSchema.statics.isUsernameTaken = async function(username, excludeUserId) {
  const query = { username };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const user = await this.findOne(query);
  return !!user;
};

module.exports = mongoose.model('User', userSchema);
