const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * 用户AI连接配置模型
 * 用于用户自带API密钥（BYOK - Bring Your Own Key）
 */
const userAIConnectionSchema = new mongoose.Schema(
  {
    // 所属用户
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // 连接名称（用户自定义）
    name: {
      type: String,
      required: true,
      trim: true,
      default: '我的AI连接'
    },

    // 连接描述
    description: {
      type: String,
      trim: true
    },

    // 是否启用
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // 是否设为默认连接
    isDefault: {
      type: Boolean,
      default: false
    },

    // 是否为私有连接（只有创建者可见）
    isPrivate: {
      type: Boolean,
      default: false,
      index: true
    },

    // Provider类型
    provider: {
      type: String,
      required: true,
      enum: ['openai', 'deepseek', 'anthropic', 'google', 'custom', 'other'],
      default: 'openai'
    },

    // Provider显示名称
    providerDisplayName: {
      type: String,
      trim: true
    },

    // 基础URL（可自定义代理地址）
    baseURL: {
      type: String,
      required: true,
      trim: true
    },

    // API密钥（明文存储）
    apiKey: {
      type: String,
      required: true
    },

    // 默认模型
    defaultModel: {
      type: String,
      required: true,
      trim: true
    },

    // 可用模型列表（可选）
    availableModels: [
      {
        model: String,
        displayName: String,
        enabled: {
          type: Boolean,
          default: true
        }
      }
    ],

    // 请求参数配置
    requestParams: {
      temperature: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 2
      },
      maxTokens: {
        type: Number,
        default: 4000,
        min: 1,
        max: 128000
      },
      topP: {
        type: Number,
        min: 0,
        max: 1
      },
      topK: Number,
      frequencyPenalty: {
        type: Number,
        min: -2,
        max: 2
      },
      presencePenalty: {
        type: Number,
        min: -2,
        max: 2
      }
    },

    // 代理配置（可选）
    proxyConfig: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      authRequired: Boolean
    },

    // 超时设置（毫秒）
    timeout: {
      type: Number,
      default: 60000,
      min: 1000,
      max: 300000
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
      promptTokens: {
        type: Number,
        default: 0
      },
      completionTokens: {
        type: Number,
        default: 0
      },
      estimatedCost: {
        type: Number,
        default: 0
      },
      lastUsedAt: Date,
      firstUsedAt: Date
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

    // 配额限制（用户自己可以设置提醒阈值）
    quotaSettings: {
      // 每日使用限制（tokens）
      dailyLimit: Number,
      // 每月预算上限（元）
      monthlyBudget: Number,
      // 告警阈值（百分比）
      alertThreshold: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
      },
      // 是否启用告警
      alertEnabled: {
        type: Boolean,
        default: false
      }
    },

    // 优先级（用于多个连接时的选择）
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// 复合索引
userAIConnectionSchema.index({ user: 1, isActive: 1 });
userAIConnectionSchema.index({ user: 1, isDefault: 1 });
userAIConnectionSchema.index({ user: 1, provider: 1 });

// 获取API密钥（保持向后兼容）
userAIConnectionSchema.methods.getApiKey = function() {
  return this.apiKey;
};

// 设置API密钥
userAIConnectionSchema.methods.setApiKey = function(apiKey) {
  this.apiKey = apiKey;
};

// 掩码API密钥显示
userAIConnectionSchema.methods.getMaskedApiKey = function() {
  if (!this.apiKey || this.apiKey.length < 8) {
    return '****';
  }
  return `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
};

// 更新使用统计
userAIConnectionSchema.methods.updateUsage = async function(tokenUsage, cost = 0, success = true) {
  this.usage.totalRequests += 1;
  if (success) {
    this.usage.successfulRequests += 1;
  } else {
    this.usage.failedRequests += 1;
  }
  
  if (tokenUsage) {
    this.usage.totalTokens += (tokenUsage.total_tokens || 0);
    this.usage.promptTokens += (tokenUsage.prompt_tokens || 0);
    this.usage.completionTokens += (tokenUsage.completion_tokens || 0);
  }
  
  this.usage.estimatedCost += cost;
  this.usage.lastUsedAt = new Date();
  
  if (!this.usage.firstUsedAt) {
    this.usage.firstUsedAt = new Date();
  }
  
  await this.save();
};

// 更新验证状态
userAIConnectionSchema.methods.updateValidation = async function(isVerified, errorMessage = null) {
  this.validation.isVerified = isVerified;
  this.validation.lastVerifiedAt = new Date();
  
  if (!isVerified && errorMessage) {
    this.validation.lastErrorMessage = errorMessage;
    this.validation.lastErrorAt = new Date();
  }
  
  await this.save();
};

// 静态方法：获取用户的默认连接
userAIConnectionSchema.statics.getUserDefaultConnection = async function(userId) {
  // 首先查找用户设置的默认连接
  let connection = await this.findOne({ 
    user: userId, 
    isActive: true, 
    isDefault: true 
  });
  
  // 如果没有默认连接，返回第一个激活的连接
  if (!connection) {
    connection = await this.findOne({ 
      user: userId, 
      isActive: true 
    }).sort({ priority: -1, createdAt: -1 });
  }
  
  return connection;
};

// 静态方法：获取用户所有激活的连接
userAIConnectionSchema.statics.getUserActiveConnections = async function(userId) {
  return await this.find({ 
    user: userId, 
    isActive: true 
  }).sort({ priority: -1, createdAt: -1 });
};

// 保存前的钩子：确保每个用户只有一个默认连接
userAIConnectionSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    // 将其他连接的isDefault设为false
    await this.constructor.updateMany(
      { 
        user: this.user, 
        _id: { $ne: this._id },
        isDefault: true
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('UserAIConnection', userAIConnectionSchema);
