const mongoose = require('mongoose');

/**
 * 用户提示词使用记录数据模型
 */
const userPromptUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptTemplate',
    required: true,
    index: true
  },

  // 使用详情
  variableValues: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  generatedPrompt: {
    type: String,
    required: true
  },

  // 反馈信息
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 500
  },
  isSuccessful: {
    type: Boolean,
    default: null
  },

  // 详细评分
  detailedRating: {
    clarity: {
      type: Number,
      min: 1,
      max: 5
    },
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    reusability: {
      type: Number,
      min: 1,
      max: 5
    },
    improvements: String
  },

  // 上下文信息
  aiModel: {
    type: String,
    enum: ['chatgpt', 'claude', 'gemini', 'wenxin', 'tongyi', 'custom', 'other']
  },
  responseQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor']
  },

  // 设备信息
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String
  },

  // 统计
  usedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  executionTime: {
    type: Number,
    default: 0
  },

  // 时间维度（便于统计）
  date: {
    type: String,
    index: true
  },
  hour: {
    type: Number,
    min: 0,
    max: 23,
    index: true
  }
}, {
  timestamps: false
});

// 复合索引
userPromptUsageSchema.index({ userId: 1, usedAt: -1 });
userPromptUsageSchema.index({ promptId: 1, usedAt: -1 });
userPromptUsageSchema.index({ date: 1, hour: 1 });

// 中间件：设置日期和小时
userPromptUsageSchema.pre('save', function(next) {
  if (!this.date) {
    const date = this.usedAt || new Date();
    this.date = date.toISOString().split('T')[0];
    this.hour = date.getHours();
  }
  next();
});

// 静态方法：记录使用
userPromptUsageSchema.statics.recordUsage = async function(data) {
  const usage = new this(data);
  await usage.save();

  // 更新提示词的使用统计
  const PromptTemplate = require('./PromptTemplate');
  await PromptTemplate.findByIdAndUpdate(
    data.promptId,
    {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date()
    }
  );

  return usage;
};

// 静态方法：获取用户使用历史
userPromptUsageSchema.statics.getUserHistory = function(userId, options = {}) {
  const query = { userId };

  if (options.promptId) {
    query.promptId = options.promptId;
  }

  if (options.startDate) {
    query.usedAt = { $gte: new Date(options.startDate) };
  }

  if (options.endDate) {
    query.usedAt = query.usedAt || {};
    query.usedAt.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .populate('promptId', 'title category aiModel')
    .sort({ usedAt: -1 })
    .limit(options.limit || 50);
};

// 静态方法：获取提示词使用统计
userPromptUsageSchema.statics.getPromptStats = function(promptId, startDate, endDate) {
  const match = { promptId: new mongoose.Types.ObjectId(promptId) };

  if (startDate || endDate) {
    match.usedAt = {};
    if (startDate) match.usedAt.$gte = new Date(startDate);
    if (endDate) match.usedAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgRating: { $avg: '$rating' },
        successCount: { $sum: { $cond: ['$isSuccessful', 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsage: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgRating: { $round: ['$avgRating', 1] },
        successRate: {
          $round: [
            { $multiply: [{ $divide: ['$successCount', '$totalUsage'] }, 100] },
            1
          ]
        }
      }
    }
  ]);
};

// 静态方法：获取使用趋势
userPromptUsageSchema.statics.getUsageTrend = function(promptId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        promptId: new mongoose.Types.ObjectId(promptId),
        usedAt: { $gte: startDate }
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

// 静态方法：获取用户常用变量值
userPromptUsageSchema.statics.getUserVariableHistory = async function(userId, promptId, variableName) {
  const results = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        promptId: new mongoose.Types.ObjectId(promptId)
      }
    },
    {
      $project: {
        value: { $objectToArray: '$variableValues' }
      }
    },
    { $unwind: '$value' },
    {
      $match: {
        'value.k': variableName
      }
    },
    {
      $group: {
        _id: '$value.v',
        count: { $sum: 1 },
        lastUsed: { $max: '$usedAt' }
      }
    },
    {
      $project: {
        value: '$_id',
        count: 1,
        lastUsed: 1,
        _id: 0
      }
    },
    { $sort: { count: -1, lastUsed: -1 } },
    { $limit: 10 }
  ]);

  return results;
};

module.exports = mongoose.model('UserPromptUsage', userPromptUsageSchema);
