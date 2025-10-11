const mongoose = require('mongoose');

/**
 * 提示词使用记录模型
 * 记录每次提示词的使用情况，包括使用时间、输入参数、效果反馈等
 */
const promptUsageLogSchema = new mongoose.Schema({
  // 提示词ID
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptTemplate',
    required: true,
    index: true
  },
  
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 使用时间
  usedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 使用的变量值（JSON格式）
  variables: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 渲染后的内容
  renderedContent: {
    type: String,
    default: ''
  },
  
  // 用户反馈
  feedback: {
    // 评分 (1-5星)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    
    // 评论内容
    comment: {
      type: String,
      default: ''
    },
    
    // 是否有效
    isEffective: {
      type: Boolean,
      default: null
    },
    
    // 反馈提交时间
    submittedAt: {
      type: Date,
      default: null
    }
  },
  
  // 性能数据
  performance: {
    // 响应时间(ms)
    responseTime: {
      type: Number,
      default: null
    },
    
    // Token 数量
    tokenCount: {
      type: Number,
      default: null
    }
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  collection: 'prompt_usage_logs'
});

// 复合索引：提高查询性能
promptUsageLogSchema.index({ promptId: 1, usedAt: -1 });
promptUsageLogSchema.index({ userId: 1, usedAt: -1 });

// 虚拟字段：是否已提交反馈
promptUsageLogSchema.virtual('hasFeedback').get(function() {
  return this.feedback && (
    this.feedback.rating !== null || 
    this.feedback.comment !== '' || 
    this.feedback.isEffective !== null
  );
});

// 确保虚拟字段在 JSON 序列化时包含
promptUsageLogSchema.set('toJSON', { virtuals: true });
promptUsageLogSchema.set('toObject', { virtuals: true });

// 静态方法：获取提示词的使用统计
promptUsageLogSchema.statics.getPromptStats = async function(promptId, options = {}) {
  const { startDate, endDate } = options;
  
  const matchCondition = { promptId: new mongoose.Types.ObjectId(promptId) };
  
  if (startDate || endDate) {
    matchCondition.usedAt = {};
    if (startDate) matchCondition.usedAt.$gte = new Date(startDate);
    if (endDate) matchCondition.usedAt.$lte = new Date(endDate);
  }
  
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: 1 },
        averageRating: { $avg: '$feedback.rating' },
        effectiveCount: {
          $sum: { $cond: [{ $eq: ['$feedback.isEffective', true] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    totalUsage: 0,
    averageRating: 0,
    effectiveCount: 0
  };
};

// 静态方法：获取使用趋势数据
promptUsageLogSchema.statics.getUsageTrend = async function(promptId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const trend = await this.aggregate([
    {
      $match: {
        promptId: new mongoose.Types.ObjectId(promptId),
        usedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$usedAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return trend;
};

const PromptUsageLog = mongoose.model('PromptUsageLog', promptUsageLogSchema);

module.exports = PromptUsageLog;
