const mongoose = require('mongoose');

/**
 * 令牌状态管理模型
 * 用于跟踪令牌的全局状态和所有者信息
 */
const tokenStatusSchema = new mongoose.Schema({
  // 访问令牌（哈希值，用于索引和查找）
  accessTokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 当前所有者
  currentOwner: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    username: String,
    email: String,
    claimedAt: Date
  },

  // 历史所有者记录
  ownershipHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    email: String,
    action: {
      type: String,
      enum: ['claimed', 'released', 'deleted'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['direct_add', 'pool_claim', 'pool_upload'],
      required: true
    },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // 令牌池状态
  poolStatus: {
    isInPool: {
      type: Boolean,
      default: false
    },
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TokenPool',
      default: null
    },
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired', 'invalid'],
      default: null
    },
    uploadedAt: Date,
    claimedAt: Date
  },

  // 令牌基本信息
  tokenInfo: {
    tenantUrl: String,
    portalUrl: String,
    creditsBalance: {
      type: Number,
      default: 0
    },
    expiryDate: Date,
    lastValidated: Date
  },

  // 状态统计
  stats: {
    totalClaims: {
      type: Number,
      default: 0
    },
    totalReleases: {
      type: Number,
      default: 0
    },
    currentOwnershipDuration: Date, // 当前所有者持有时长的开始时间
    totalOwnershipTime: {
      type: Number,
      default: 0 // 总持有时间（毫秒）
    }
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
tokenStatusSchema.index({ 'currentOwner.userId': 1 });
tokenStatusSchema.index({ 'poolStatus.isInPool': 1 });
tokenStatusSchema.index({ 'poolStatus.status': 1 });
tokenStatusSchema.index({ 'tokenInfo.expiryDate': 1 });

// 实例方法：更新当前所有者
tokenStatusSchema.methods.updateCurrentOwner = function(userId, userInfo, source, metadata = {}) {
  // 记录历史
  if (this.currentOwner.userId) {
    // 计算持有时长
    const ownershipDuration = Date.now() - this.stats.currentOwnershipDuration.getTime();
    this.stats.totalOwnershipTime += ownershipDuration;

    // 添加释放记录
    this.ownershipHistory.push({
      userId: this.currentOwner.userId,
      username: this.currentOwner.username,
      email: this.currentOwner.email,
      action: 'released',
      timestamp: new Date(),
      source: 'ownership_transfer',
      metadata: { transferTo: userId }
    });
    this.stats.totalReleases++;
  }

  // 设置新所有者
  this.currentOwner = {
    userId: userId,
    username: userInfo.username,
    email: userInfo.email,
    claimedAt: new Date()
  };

  // 添加领取记录
  this.ownershipHistory.push({
    userId: userId,
    username: userInfo.username,
    email: userInfo.email,
    action: 'claimed',
    timestamp: new Date(),
    source: source,
    metadata: metadata
  });

  this.stats.totalClaims++;
  this.stats.currentOwnershipDuration = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// 实例方法：释放所有者
tokenStatusSchema.methods.releaseOwner = function(reason = 'deleted') {
  if (this.currentOwner.userId) {
    // 计算持有时长
    const ownershipDuration = Date.now() - this.stats.currentOwnershipDuration.getTime();
    this.stats.totalOwnershipTime += ownershipDuration;

    // 添加释放记录
    this.ownershipHistory.push({
      userId: this.currentOwner.userId,
      username: this.currentOwner.username,
      email: this.currentOwner.email,
      action: 'deleted',
      timestamp: new Date(),
      source: 'manual_delete',
      metadata: { reason }
    });

    this.stats.totalReleases++;
  }

  // 清除当前所有者
  this.currentOwner = {
    userId: null,
    username: null,
    email: null,
    claimedAt: null
  };

  this.stats.currentOwnershipDuration = null;
  this.updatedAt = new Date();

  return this.save();
};

// 实例方法：更新令牌池状态
tokenStatusSchema.methods.updatePoolStatus = function(poolData) {
  this.poolStatus = {
    ...this.poolStatus,
    ...poolData,
    isInPool: true
  };
  this.updatedAt = new Date();
  return this.save();
};

// 实例方法：移除令牌池状态
tokenStatusSchema.methods.removeFromPool = function() {
  this.poolStatus = {
    isInPool: false,
    poolId: null,
    uploaderId: null,
    status: null,
    uploadedAt: null,
    claimedAt: null
  };
  this.updatedAt = new Date();
  return this.save();
};

// 静态方法：通过访问令牌查找
tokenStatusSchema.statics.findByAccessToken = function(accessToken) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(accessToken).digest('hex');
  return this.findOne({ accessTokenHash: hash });
};

// 静态方法：创建或更新令牌状态
tokenStatusSchema.statics.createOrUpdate = function(accessToken, data) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(accessToken).digest('hex');
  
  return this.findOneAndUpdate(
    { accessTokenHash: hash },
    { 
      ...data,
      accessTokenHash: hash,
      updatedAt: new Date()
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

// 静态方法：获取用户拥有的所有令牌状态
tokenStatusSchema.statics.getUserTokens = function(userId) {
  return this.find({ 'currentOwner.userId': userId }).sort({ updatedAt: -1 });
};

// 静态方法：获取令牌池中的令牌状态
tokenStatusSchema.statics.getPoolTokens = function(status = null) {
  const query = { 'poolStatus.isInPool': true };
  if (status) {
    query['poolStatus.status'] = status;
  }
  return this.find(query).sort({ 'poolStatus.uploadedAt': -1 });
};

// 中间件：更新时间戳
tokenStatusSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('TokenStatus', tokenStatusSchema);
