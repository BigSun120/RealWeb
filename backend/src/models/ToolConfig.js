const mongoose = require('mongoose');

/**
 * 工具箱全局配置数据模型
 */
const toolConfigSchema = new mongoose.Schema({
  // 配置标识
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 配置值
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // 配置类型
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  
  // 配置分组
  group: {
    type: String,
    default: 'general',
    index: true
  },
  
  // 配置描述
  description: {
    type: String
  },
  
  // 是否为系统配置（不可删除）
  isSystem: {
    type: Boolean,
    default: false
  },
  
  // 是否为敏感配置（不在前端显示）
  isSensitive: {
    type: Boolean,
    default: false
  },
  
  // 配置验证规则
  validation: {
    required: {
      type: Boolean,
      default: false
    },
    min: Number,
    max: Number,
    pattern: String,
    enum: [String]
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
toolConfigSchema.index({ group: 1, key: 1 });

// 中间件：更新时间戳
toolConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：获取配置值
toolConfigSchema.statics.getValue = async function(key, defaultValue = null) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

// 静态方法：设置配置值
toolConfigSchema.statics.setValue = async function(key, value, options = {}) {
  const config = await this.findOneAndUpdate(
    { key },
    {
      key,
      value,
      type: typeof value,
      ...options
    },
    {
      upsert: true,
      new: true
    }
  );
  return config;
};

// 静态方法：获取分组配置
toolConfigSchema.statics.getGroupConfigs = function(group) {
  return this.find({ group }).sort({ key: 1 });
};

// 静态方法：批量设置配置
toolConfigSchema.statics.setMultiple = async function(configs, updatedBy = null) {
  const operations = configs.map(config => ({
    updateOne: {
      filter: { key: config.key },
      update: {
        ...config,
        updatedBy,
        updatedAt: new Date()
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

// 静态方法：初始化默认配置
toolConfigSchema.statics.initializeDefaults = async function() {
  const defaultConfigs = [
    // 工具箱基本配置
    {
      key: 'tools.enabled',
      value: true,
      type: 'boolean',
      group: 'general',
      description: '是否启用工具箱功能',
      isSystem: true
    },
    {
      key: 'tools.requireAuth',
      value: false,
      type: 'boolean',
      group: 'general',
      description: '工具箱是否需要登录访问'
    },
    {
      key: 'tools.maxUsagePerDay',
      value: 1000,
      type: 'number',
      group: 'limits',
      description: '每日最大使用次数限制'
    },
    {
      key: 'tools.maxUsagePerUser',
      value: 100,
      type: 'number',
      group: 'limits',
      description: '单用户每日最大使用次数'
    },
    
    // 统计配置
    {
      key: 'analytics.enabled',
      value: true,
      type: 'boolean',
      group: 'analytics',
      description: '是否启用使用统计'
    },
    {
      key: 'analytics.retentionDays',
      value: 90,
      type: 'number',
      group: 'analytics',
      description: '统计数据保留天数'
    },
    {
      key: 'analytics.trackAnonymous',
      value: true,
      type: 'boolean',
      group: 'analytics',
      description: '是否跟踪匿名用户'
    },
    
    // 缓存配置
    {
      key: 'cache.enabled',
      value: true,
      type: 'boolean',
      group: 'cache',
      description: '是否启用缓存'
    },
    {
      key: 'cache.ttl',
      value: 3600,
      type: 'number',
      group: 'cache',
      description: '缓存过期时间（秒）'
    },
    
    // 安全配置
    {
      key: 'security.rateLimitEnabled',
      value: true,
      type: 'boolean',
      group: 'security',
      description: '是否启用频率限制'
    },
    {
      key: 'security.rateLimitWindow',
      value: 900,
      type: 'number',
      group: 'security',
      description: '频率限制时间窗口（秒）'
    },
    {
      key: 'security.rateLimitMax',
      value: 100,
      type: 'number',
      group: 'security',
      description: '频率限制最大请求数'
    },
    
    // 文件上传配置
    {
      key: 'upload.maxFileSize',
      value: 10485760, // 10MB
      type: 'number',
      group: 'upload',
      description: '最大文件上传大小（字节）'
    },
    {
      key: 'upload.allowedTypes',
      value: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json'],
      type: 'array',
      group: 'upload',
      description: '允许的文件类型'
    },
    
    // 通知配置
    {
      key: 'notifications.enabled',
      value: true,
      type: 'boolean',
      group: 'notifications',
      description: '是否启用通知功能'
    },
    {
      key: 'notifications.emailEnabled',
      value: false,
      type: 'boolean',
      group: 'notifications',
      description: '是否启用邮件通知'
    }
  ];
  
  // 检查并创建不存在的配置
  for (const config of defaultConfigs) {
    const existing = await this.findOne({ key: config.key });
    if (!existing) {
      await this.create(config);
    }
  }
  
  return defaultConfigs.length;
};

module.exports = mongoose.model('ToolConfig', toolConfigSchema);
