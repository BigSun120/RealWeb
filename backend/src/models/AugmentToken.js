const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Augment Token 数据模型
 * 基于桌面版token结构，适配Web环境和用户隔离
 */
const augmentTokenSchema = new mongoose.Schema({
  // 基本标识
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },

  // 用户关联（实现数据隔离）
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 核心令牌信息
  tenantUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Tenant URL must be a valid HTTP/HTTPS URL'
    }
  },

  // 加密存储的访问令牌
  accessToken: {
    type: String,
    required: true,
    set: function (value) {
      // 自动加密存储
      return this.encryptToken(value);
    }
  },

  // 可选字段
  portalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Portal URL must be a valid HTTP/HTTPS URL'
    }
  },

  emailNote: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // 状态信息
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  banStatus: {
    isBanned: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'UNAUTHORIZED', 'FORBIDDEN', 'RATE_LIMITED', 'SERVER_ERROR', 'UNKNOWN_ERROR'],
      default: 'ACTIVE'
    },
    errorMessage: String,
    responseCode: Number,
    lastChecked: Date
  },

  // Portal 信息缓存
  portalInfo: {
    customerId: String,
    pricingUnitId: String,
    customerData: mongoose.Schema.Types.Mixed,
    ledgerSummary: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
  },

  // 使用统计
  usageStats: {
    totalUses: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    lastSuccessfulUse: Date,
    failureCount: {
      type: Number,
      default: 0
    }
  },

  // 同步状态（为未来的本地代理集成预留）
  syncStatus: {
    lastSyncAt: Date,
    syncVersion: {
      type: Number,
      default: 1
    },
    needsSync: {
      type: Boolean,
      default: false
    }
  },

  // 元数据
  metadata: {
    source: {
      type: String,
      enum: ['web', 'desktop', 'import'],
      default: 'web'
    },
    userAgent: String,
    ipAddress: String,
    importedFrom: String
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
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      // 不返回加密的访问令牌
      delete ret.accessToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 加密密钥（实际部署时应从环境变量获取）
const ENCRYPTION_KEY = process.env.AUGMENT_TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-gcm';

// 实例方法：加密令牌
augmentTokenSchema.methods.encryptToken = function (token) {
  if (!token) return token;

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回格式：iv:authTag:encryptedData
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Token encryption failed:', error);
    return token; // 加密失败时返回原始值
  }
};

// 实例方法：解密令牌
augmentTokenSchema.methods.decryptToken = function () {
  if (!this.accessToken) return null;

  try {
    const parts = this.accessToken.split(':');
    if (parts.length !== 3) {
      // 可能是未加密的旧数据
      return this.accessToken;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return null;
  }
};

// 实例方法：获取显示用的令牌（脱敏）
augmentTokenSchema.methods.getMaskedToken = function () {
  const decrypted = this.decryptToken();
  if (!decrypted || decrypted.length < 8) return '***';

  return decrypted.substring(0, 4) + '***' + decrypted.substring(decrypted.length - 4);
};

// 实例方法：更新使用统计
augmentTokenSchema.methods.recordUsage = function (success = true) {
  this.usageStats.totalUses += 1;
  this.usageStats.lastUsed = new Date();

  if (success) {
    this.usageStats.lastSuccessfulUse = new Date();
    this.usageStats.failureCount = 0;
  } else {
    this.usageStats.failureCount += 1;
  }

  return this.save();
};

// 实例方法：更新账号状态
augmentTokenSchema.methods.updateBanStatus = function (statusData) {
  this.banStatus = {
    ...this.banStatus,
    ...statusData,
    lastChecked: new Date()
  };

  return this.save();
};

// 实例方法：更新Portal信息
augmentTokenSchema.methods.updatePortalInfo = function (portalInfo) {
  this.portalInfo = {
    customer_id: portalInfo.customer_id || null,
    pricing_unit_id: portalInfo.pricing_unit_id || null,
    credits_balance: portalInfo.credits_balance || 0,
    total_usage: portalInfo.total_usage || 0,
    last_updated: new Date(),
    raw_data: portalInfo.raw_customer_data || null
  };

  this.usageStats = {
    credits_balance: portalInfo.credits_balance || 0,
    total_usage: portalInfo.total_usage || 0,
    last_updated: new Date()
  };

  return this.save();
};

// 实例方法：检查是否需要状态更新
augmentTokenSchema.methods.needsStatusCheck = function () {
  if (!this.banStatus.lastChecked) return true;

  const hoursSinceCheck = (Date.now() - this.banStatus.lastChecked.getTime()) / (1000 * 60 * 60);
  return hoursSinceCheck > 24; // 24小时检查一次
};

// 虚拟字段：用户信息
augmentTokenSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：显示名称
augmentTokenSchema.virtual('displayName').get(function () {
  const domain = this.tenantUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return this.emailNote ? `${this.emailNote} (${domain})` : domain;
});

// 索引
augmentTokenSchema.index({ userId: 1, createdAt: -1 });
augmentTokenSchema.index({ userId: 1, isActive: 1 });
augmentTokenSchema.index({ tokenId: 1 }, { unique: true });
augmentTokenSchema.index({ 'banStatus.isBanned': 1 });
augmentTokenSchema.index({ 'usageStats.lastUsed': -1 });

// 中间件：更新时间戳
augmentTokenSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：获取用户的所有令牌
augmentTokenSchema.statics.getUserTokens = function (userId, activeOnly = false) {
  const query = { userId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// 静态方法：按tokenId查找（用户级别）
augmentTokenSchema.statics.findByTokenId = function (tokenId, userId) {
  return this.findOne({ tokenId, userId });
};

// 静态方法：创建新令牌
augmentTokenSchema.statics.createToken = function (tokenData, userId) {
  return this.create({
    ...tokenData,
    userId,
    metadata: {
      ...tokenData.metadata,
      source: 'web'
    }
  });
};

module.exports = mongoose.model('AugmentToken', augmentTokenSchema);
