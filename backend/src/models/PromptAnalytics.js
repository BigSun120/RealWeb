const mongoose = require('mongoose');

/**
 * AI提示词事件埋点数据模型
 * 用于追踪用户对提示词的各种行为
 */
const promptAnalyticsSchema = new mongoose.Schema({
  // 事件类型
  event: {
    type: String,
    required: true,
    enum: [
      'view',           // 查看详情
      'search',         // 搜索
      'copy',           // 复制提示词
      'edit',           // 编辑
      'share',          // 分享
      'export',         // 导出
      'impression'      // 曝光（列表展示）
    ],
    index: true
  },

  // 关联信息
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptTemplate',
    index: true,
    sparse: true  // search事件可能没有promptId
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true  // 匿名用户为null
  },

  // 会话信息
  sessionId: {
    type: String,
    index: true
  },
  userAgent: String,
  ipAddress: String,

  // 事件元数据
  metadata: {
    // search 专用
    searchKeyword: String,      // 搜索关键词
    searchCategory: String,     // 搜索分类筛选
    searchAiModel: String,      // 搜索AI模型筛选
    searchResultCount: Number,  // 搜索结果数量
    searchDuration: Number,     // 搜索耗时(ms)

    // view 专用
    viewSource: {
      type: String,
      enum: ['list', 'search', 'direct', 'share', 'recommendation']
    },
    viewDuration: Number,       // 查看时长(秒)

    // copy 专用
    copySource: {
      type: String,
      enum: ['editor', 'usage', 'detail']
    },
    variablesFilled: Boolean,   // 是否填充了变量
    variableCount: Number,      // 变量数量

    // edit 专用
    fieldsChanged: [String],    // 修改的字段
    isNewPrompt: Boolean,       // 是否新建

    // 通用字段
    promptCategory: String,     // 提示词分类
    promptAiModel: String,      // 提示词AI模型
    promptTags: [String],       // 提示词标签
    referrer: String,           // 来源页面
    previousPage: String        // 上一页
  },

  // 设备信息
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

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  date: {
    type: String,
    index: true  // YYYY-MM-DD 格式，便于统计
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
promptAnalyticsSchema.index({ event: 1, createdAt: -1 });
promptAnalyticsSchema.index({ promptId: 1, event: 1, createdAt: -1 });
promptAnalyticsSchema.index({ userId: 1, createdAt: -1 });
promptAnalyticsSchema.index({ date: 1, hour: 1 });
promptAnalyticsSchema.index({ 'metadata.searchKeyword': 1 }, { sparse: true });

// 中间件：自动设置日期和小时
promptAnalyticsSchema.pre('save', function(next) {
  if (!this.date) {
    const date = this.createdAt || new Date();
    this.date = date.toISOString().split('T')[0];
    this.hour = date.getHours();
  }
  next();
});

// 静态方法：记录事件
promptAnalyticsSchema.statics.trackEvent = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('记录提示词事件失败:', error);
    throw error;
  }
};

// 静态方法：获取热门搜索词
promptAnalyticsSchema.statics.getTopSearchKeywords = function(limit = 10, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        event: 'search',
        'metadata.searchKeyword': { $exists: true, $ne: null, $ne: '' },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$metadata.searchKeyword',
        count: { $sum: 1 },
        avgResultCount: { $avg: '$metadata.searchResultCount' },
        lastSearched: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        keyword: '$_id',
        count: 1,
        avgResultCount: { $round: ['$avgResultCount', 0] },
        lastSearched: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// 静态方法：获取提示词浏览统计
promptAnalyticsSchema.statics.getPromptViewStats = function(promptId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        promptId: new mongoose.Types.ObjectId(promptId),
        event: 'view',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$date',
        viewCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        date: '$_id',
        viewCount: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// 静态方法：获取转化漏斗数据
promptAnalyticsSchema.statics.getConversionFunnel = function(promptId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match = {
    createdAt: { $gte: startDate }
  };
  if (promptId) {
    match.promptId = new mongoose.Types.ObjectId(promptId);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        event: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    }
  ]);
};

// 静态方法：获取用户行为路径分析
promptAnalyticsSchema.statics.getUserJourney = function(userId, sessionId, limit = 50) {
  const query = {};
  if (userId) query.userId = new mongoose.Types.ObjectId(userId);
  if (sessionId) query.sessionId = sessionId;

  return this.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('promptId', 'title category')
    .lean();
};

module.exports = mongoose.model('PromptAnalytics', promptAnalyticsSchema);
