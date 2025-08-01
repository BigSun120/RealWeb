const mongoose = require('mongoose');

const securityConfigSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  rules: {
    minLength: {
      type: Number,
      required: true,
      min: 4,
      max: 20
    },
    requireUppercase: {
      type: Boolean,
      default: false
    },
    requireLowercase: {
      type: Boolean,
      default: false
    },
    requireNumbers: {
      type: Boolean,
      default: false
    },
    requireSymbols: {
      type: Boolean,
      default: false
    },
    forbidCommon: {
      type: Boolean,
      default: false
    },
    forbidPersonalInfo: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 确保只有一个配置是激活的
securityConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  this.updatedAt = new Date();
  next();
});

// 静态方法：获取当前激活的安全配置
securityConfigSchema.statics.getActiveConfig = async function() {
  let config = await this.findOne({ isActive: true });
  
  // 如果没有激活的配置，创建默认配置
  if (!config) {
    config = await this.create({
      level: 'medium',
      name: '中等安全',
      description: '平衡安全性和易用性',
      rules: {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        forbidCommon: true,
        forbidPersonalInfo: false
      },
      isActive: true
    });
  }
  
  return config;
};

// 静态方法：初始化默认配置
securityConfigSchema.statics.initializeDefaults = async function() {
  const count = await this.countDocuments();
  
  if (count === 0) {
    const defaultConfigs = [
      {
        level: 'low',
        name: '低安全',
        description: '最低安全要求，便于用户使用',
        rules: {
          minLength: 4,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSymbols: false,
          forbidCommon: false,
          forbidPersonalInfo: false
        },
        isActive: false
      },
      {
        level: 'medium',
        name: '中等安全',
        description: '平衡安全性和易用性',
        rules: {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
          forbidCommon: true,
          forbidPersonalInfo: false
        },
        isActive: true
      },
      {
        level: 'high',
        name: '高安全',
        description: '最高安全要求，适合敏感环境',
        rules: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          forbidCommon: true,
          forbidPersonalInfo: true
        },
        isActive: false
      }
    ];
    
    await this.insertMany(defaultConfigs);
  }
};

module.exports = mongoose.model('SecurityConfig', securityConfigSchema);
