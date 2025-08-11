const mongoose = require('mongoose');

/**
 * 工具使用统计数据模型
 */
const toolUsageSchema = new mongoose.Schema({
  // 关联信息
  toolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true,
    index: true
  },
  toolIdentifier: {
    type: String, // 工具的字符串ID
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  
  // 会话信息
  sessionId: {
    type: String,
    index: true
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String,
    index: true
  },
  
  // 使用详情
  action: {
    type: String,
    enum: ['view', 'use', 'download', 'share', 'favorite'],
    default: 'use',
    index: true
  },
  duration: {
    type: Number, // 使用时长（秒）
    default: 0
  },
  
  // 输入输出数据（可选，用于分析）
  inputSize: {
    type: Number, // 输入数据大小（字节）
    default: 0
  },
  outputSize: {
    type: Number, // 输出数据大小（字节）
    default: 0
  },
  
  // 性能指标
  responseTime: {
    type: Number, // 响应时间（毫秒）
    default: 0
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  errorMessage: {
    type: String
  },
  
  // 设备和环境信息
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    screen: {
      width: Number,
      height: Number
    }
  },
  
  // 地理位置（可选）
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // 来源信息
  referrer: {
    type: String
  },
  source: {
    type: String,
    enum: ['direct', 'search', 'social', 'referral', 'email', 'other'],
    default: 'direct'
  },
  
  // 自定义数据
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD 格式，便于按日期统计
    index: true
  },
  hour: {
    type: Number, // 0-23，便于按小时统计
    index: true
  }
}, {
  timestamps: false // 使用自定义的 createdAt
});

// 复合索引
toolUsageSchema.index({ toolIdentifier: 1, createdAt: -1 });
toolUsageSchema.index({ userId: 1, createdAt: -1 });
toolUsageSchema.index({ date: 1, hour: 1 });
toolUsageSchema.index({ toolIdentifier: 1, date: 1 });
toolUsageSchema.index({ action: 1, success: 1 });

// 中间件：设置日期和小时
toolUsageSchema.pre('save', function(next) {
  if (!this.date) {
    const date = this.createdAt || new Date();
    this.date = date.toISOString().split('T')[0]; // YYYY-MM-DD
    this.hour = date.getHours();
  }
  next();
});

// 静态方法：记录工具使用
toolUsageSchema.statics.recordUsage = async function(data) {
  const usage = new this(data);
  await usage.save();
  
  // 更新工具的使用计数
  const Tool = require('./Tool');
  await Tool.findOneAndUpdate(
    { id: data.toolIdentifier },
    { 
      $inc: { usageCount: 1 },
      lastUsedAt: new Date()
    }
  );
  
  return usage;
};

// 静态方法：获取工具使用统计
toolUsageSchema.statics.getToolStats = function(toolIdentifier, startDate, endDate) {
  const match = { toolIdentifier };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        avgResponseTime: { $avg: '$responseTime' },
        successRate: {
          $avg: { $cond: ['$success', 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsage: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 2] },
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        successRate: { $round: [{ $multiply: ['$successRate', 100] }, 2] }
      }
    }
  ]);
};

// 静态方法：获取使用趋势
toolUsageSchema.statics.getUsageTrend = function(toolIdentifier, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        toolIdentifier,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$date',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        date: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// 静态方法：获取热门工具排行
toolUsageSchema.statics.getPopularTools = function(limit = 10, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$toolIdentifier',
        usageCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $project: {
        toolIdentifier: '$_id',
        usageCount: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 2] },
        _id: 0
      }
    },
    { $sort: { usageCount: -1 } },
    { $limit: limit }
  ]);
};

// 静态方法：获取用户行为分析
toolUsageSchema.statics.getUserBehavior = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$toolIdentifier',
        usageCount: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        lastUsed: { $max: '$createdAt' }
      }
    },
    { $sort: { usageCount: -1 } }
  ]);
};

module.exports = mongoose.model('ToolUsage', toolUsageSchema);
