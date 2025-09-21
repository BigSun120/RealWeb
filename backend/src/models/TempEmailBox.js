const mongoose = require('mongoose');

/**
 * 临时邮箱数据模型
 * 用于持久化存储用户生成的临时邮箱信息
 */
const tempEmailBoxSchema = new mongoose.Schema(
  {
    // 邮箱地址（唯一）
    email: {
      type: String,
      required: [true, '邮箱地址不能为空'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确']
    },

    // 邮箱用户名部分
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      trim: true,
      index: true
    },

    // 邮箱域名部分
    domain: {
      type: String,
      required: [true, '域名不能为空'],
      trim: true,
      index: true
    },

    // 关联的用户ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true
    },

    // 邮箱状态
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // 是否为自定义用户名
    isCustomName: {
      type: Boolean,
      default: false
    },

    // 邮件数量（缓存字段，定期更新）
    messageCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // 最后访问时间
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // 最后邮件接收时间
    lastMessageAt: {
      type: Date,
      default: null
    },

    // 创建时的IP地址
    createdFromIP: {
      type: String,
      default: null
    },

    // 创建时的用户代理
    createdFromUserAgent: {
      type: String,
      default: null
    },

    // 邮箱标签（用户可自定义）
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, '标签最多20个字符']
    }],

    // 备注信息
    note: {
      type: String,
      trim: true,
      maxlength: [200, '备注最多200个字符'],
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 复合索引
tempEmailBoxSchema.index({ userId: 1, createdAt: -1 });
tempEmailBoxSchema.index({ userId: 1, isActive: 1 });
tempEmailBoxSchema.index({ domain: 1, createdAt: -1 });
tempEmailBoxSchema.index({ lastAccessedAt: -1 });

// 虚拟字段：用户信息
tempEmailBoxSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：是否有新邮件（基于最后访问时间）
tempEmailBoxSchema.virtual('hasNewMessages').get(function() {
  return this.lastMessageAt && this.lastMessageAt > this.lastAccessedAt;
});

// 虚拟字段：邮箱年龄（天数）
tempEmailBoxSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// 实例方法：更新最后访问时间
tempEmailBoxSchema.methods.updateLastAccessed = function() {
  this.lastAccessedAt = new Date();
  return this.save();
};

// 实例方法：更新邮件数量
tempEmailBoxSchema.methods.updateMessageCount = async function(count) {
  this.messageCount = count || 0;
  if (count > 0) {
    this.lastMessageAt = new Date();
  }
  return this.save();
};

// 静态方法：获取用户的活跃邮箱
tempEmailBoxSchema.statics.getUserActiveEmails = function(userId, limit = 50) {
  return this.find({ 
    userId, 
    isActive: true 
  })
  .sort({ lastAccessedAt: -1 })
  .limit(limit);
};

// 静态方法：获取用户邮箱统计
tempEmailBoxSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalEmails: { $sum: 1 },
        activeEmails: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalMessages: { $sum: '$messageCount' },
        domains: { $addToSet: '$domain' }
      }
    }
  ]);

  return stats[0] || {
    totalEmails: 0,
    activeEmails: 0,
    totalMessages: 0,
    domains: []
  };
};

// 中间件：保存前验证
tempEmailBoxSchema.pre('save', function(next) {
  // 确保邮箱地址格式正确
  if (this.email) {
    const [username, domain] = this.email.split('@');
    this.username = username;
    this.domain = domain;
  }
  next();
});

// 自定义toJSON方法
tempEmailBoxSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // 添加计算字段
  obj.hasNewMessages = this.hasNewMessages;
  obj.ageInDays = this.ageInDays;
  
  // 移除敏感信息
  delete obj.createdFromIP;
  delete obj.createdFromUserAgent;
  
  return obj;
};

module.exports = mongoose.model('TempEmailBox', tempEmailBoxSchema);
