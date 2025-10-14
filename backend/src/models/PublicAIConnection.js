const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * 公共AI连接配置模型
 * 用于管理员配置的全局公共AI连接，供所有用户使用
 */
const publicAIConnectionSchema = new mongoose.Schema(
  {
    // 连接名称
    name: {
      type: String,
      required: true,
      trim: true
    },

    // 连接描述
    description: {
      type: String,
      trim: true
    },

    // Provider类型
    provider: {
      type: String,
      required: true,
      enum: ['openai', 'claude', 'gemini', 'other'],
      default: 'openai'
    },

    // API密钥（明文存储）
    apiKey: {
      type: String,
      required: true
    },

    // API端点
    endpoint: {
      type: String,
      required: true,
      trim: true
    },

    // 模型名称
    model: {
      type: String,
      required: true,
      trim: true
    },

    // 是否启用
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // 是否为默认连接
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },

    // 使用统计
    usage: {
      totalRequests: {
        type: Number,
        default: 0
      },
      successfulRequests: {
        type: Number,
        default: 0
      },
      failedRequests: {
        type: Number,
        default: 0
      },
      totalTokens: {
        type: Number,
        default: 0
      },
      lastUsedAt: Date
    },

    // 验证状态
    validation: {
      isVerified: {
        type: Boolean,
        default: false
      },
      lastVerifiedAt: Date,
      lastErrorMessage: String,
      lastErrorAt: Date
    },

    // 创建人
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // 最后修改人
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// 索引
publicAIConnectionSchema.index({ isActive: 1 });
publicAIConnectionSchema.index({ isDefault: 1 });

// 删除了加密、解密和掩码方法，密钥现在直接明文存储

// 更新使用统计
publicAIConnectionSchema.methods.updateUsage = async function(success = true) {
  this.usage.totalRequests += 1;
  if (success) {
    this.usage.successfulRequests += 1;
  } else {
    this.usage.failedRequests += 1;
  }
  
  this.usage.lastUsedAt = new Date();
  await this.save();
};

// 更新验证状态
publicAIConnectionSchema.methods.updateValidation = async function(isVerified, errorMessage = null) {
  this.validation.isVerified = isVerified;
  this.validation.lastVerifiedAt = new Date();
  
  if (!isVerified && errorMessage) {
    this.validation.lastErrorMessage = errorMessage;
    this.validation.lastErrorAt = new Date();
  }
  
  await this.save();
};

// 静态方法：获取默认公共连接
publicAIConnectionSchema.statics.getDefaultConnection = async function() {
  // 首先查找默认连接
  let connection = await this.findOne({ 
    isActive: true, 
    isDefault: true 
  });
  
  // 如果没有默认连接，返回第一个激活的连接
  if (!connection) {
    connection = await this.findOne({ 
      isActive: true 
    }).sort({ createdAt: -1 });
  }
  
  return connection;
};

// 静态方法：获取所有激活的公共连接
publicAIConnectionSchema.statics.getActiveConnections = async function() {
  return await this.find({ 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// 保存前的钩子：确保只有一个默认连接
publicAIConnectionSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    // 将其他连接的isDefault设为false
    await this.constructor.updateMany(
      { 
        _id: { $ne: this._id },
        isDefault: true
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('PublicAIConnection', publicAIConnectionSchema);
