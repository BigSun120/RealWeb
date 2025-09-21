const mongoose = require('mongoose');

const tempEmailActivationCodeSchema = new mongoose.Schema(
  {
    // 激活验证码（唯一）
    code: {
      type: String,
      required: [true, '激活验证码不能为空'],
      unique: true,
      trim: true,
      minlength: [6, '激活验证码至少6个字符'],
      maxlength: [50, '激活验证码最多50个字符'],
      index: true
    },

    // 描述说明
    description: {
      type: String,
      trim: true,
      maxlength: [200, '描述最多200个字符'],
      default: ''
    },

    // 是否启用
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // 最大使用次数（-1为无限制）
    maxUses: {
      type: Number,
      default: -1,
      min: -1
    },

    // 当前使用次数
    currentUses: {
      type: Number,
      default: 0,
      min: 0
    },

    // 过期时间
    expiresAt: {
      type: Date,
      default: null,
      index: true
    },

    // 创建者（管理员）
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // 最后使用时间
    lastUsedAt: {
      type: Date,
      default: null
    },

    // 最后使用者
    lastUsedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引
tempEmailActivationCodeSchema.index({ code: 1 });
tempEmailActivationCodeSchema.index({ isActive: 1 });
tempEmailActivationCodeSchema.index({ expiresAt: 1 });
tempEmailActivationCodeSchema.index({ createdBy: 1 });
tempEmailActivationCodeSchema.index({ createdAt: -1 });

// 虚拟字段：是否可用
tempEmailActivationCodeSchema.virtual('isAvailable').get(function () {
  // 检查是否启用
  if (!this.isActive) {
    return false;
  }

  // 检查是否过期
  if (this.expiresAt && this.expiresAt < new Date()) {
    return false;
  }

  // 检查使用次数限制
  if (this.maxUses > 0 && this.currentUses >= this.maxUses) {
    return false;
  }

  return true;
});

// 虚拟字段：剩余使用次数
tempEmailActivationCodeSchema.virtual('remainingUses').get(function () {
  if (this.maxUses === -1) {
    return -1; // 无限制
  }
  return Math.max(0, this.maxUses - this.currentUses);
});

// 实例方法：检查验证码是否可用
tempEmailActivationCodeSchema.methods.canUse = function () {
  return this.isAvailable;
};

// 实例方法：使用验证码
tempEmailActivationCodeSchema.methods.use = function (userId) {
  if (!this.canUse()) {
    throw new Error('验证码不可用');
  }

  // 检查是否已被其他用户使用
  if (this.lastUsedBy && !this.lastUsedBy.equals(userId)) {
    throw new Error('该验证码已被其他用户使用');
  }

  this.currentUses += 1;
  this.lastUsedAt = new Date();
  this.lastUsedBy = userId;

  return this;
};

// 实例方法：重置使用次数
tempEmailActivationCodeSchema.methods.resetUsage = function () {
  this.currentUses = 0;
  this.lastUsedAt = null;
  this.lastUsedBy = null;
  return this;
};

// 实例方法：启用/禁用
tempEmailActivationCodeSchema.methods.setActive = function (isActive) {
  this.isActive = isActive;
  return this;
};

// 实例方法：设置过期时间
tempEmailActivationCodeSchema.methods.setExpiration = function (expiresAt) {
  this.expiresAt = expiresAt;
  return this;
};

// 静态方法：查找可用的验证码
tempEmailActivationCodeSchema.statics.findAvailableByCode = function (code) {
  return this.findOne({
    code: code,
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// 静态方法：清理过期的验证码
tempEmailActivationCodeSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    {
      isActive: false
    }
  );
  return result;
};

// 静态方法：获取统计信息
tempEmailActivationCodeSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCodes: { $sum: 1 },
        activeCodes: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        expiredCodes: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$expiresAt', null] },
                  { $lt: ['$expiresAt', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalUses: { $sum: '$currentUses' }
      }
    }
  ]);

  return stats[0] || {
    totalCodes: 0,
    activeCodes: 0,
    expiredCodes: 0,
    totalUses: 0
  };
};

// 静态方法：生成随机验证码
tempEmailActivationCodeSchema.statics.generateCode = function (length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 静态方法：批量创建验证码
tempEmailActivationCodeSchema.statics.createBatch = async function (count, options = {}) {
  const {
    description = '',
    maxUses = -1,
    expiresAt = null,
    createdBy
  } = options;

  if (!createdBy) {
    throw new Error('创建者ID不能为空');
  }

  const codes = [];
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    // 生成唯一的验证码
    do {
      code = this.generateCode();
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('生成唯一验证码失败，请重试');
      }
    } while (await this.findOne({ code }));

    codes.push({
      code,
      description: description || `批量生成 ${i + 1}/${count}`,
      maxUses,
      expiresAt,
      createdBy
    });
  }

  return await this.insertMany(codes);
};

// 自定义toJSON方法
tempEmailActivationCodeSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // 添加计算字段
  obj.isAvailable = this.isAvailable;
  obj.remainingUses = this.remainingUses;

  return obj;
};

module.exports = mongoose.model('TempEmailActivationCode', tempEmailActivationCodeSchema);
