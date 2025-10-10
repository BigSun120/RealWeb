const mongoose = require('mongoose');

/**
 * AI提示词模板数据模型
 */
const promptTemplateSchema = new mongoose.Schema({
  // 基本信息
  id: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  title: {
    type: String,
    required: [true, '标题不能为空'],
    trim: true,
    minlength: [3, '标题至少3个字符'],
    maxlength: [100, '标题最多100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述最多500个字符']
  },
  content: {
    type: String,
    required: [true, '提示词内容不能为空'],
    minlength: [10, '内容至少10个字符']
  },

  // 分类信息
  aiModel: {
    type: String,
    required: [true, 'AI模型不能为空'],
    // 不使用 enum 限制，允许任意自定义模型
    default: 'general',
    index: true
  },
  modelVersion: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, '分类不能为空'],
    enum: ['writing', 'coding', 'translation', 'analysis', 'creative', 'other', 'code', 'content', 'learning', 'roleplay', 'productivity'],
    index: true
  },
  subcategories: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],

  // 变量系统
  variables: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'select', 'number', 'date'],
      default: 'text'
    },
    label: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    default: {
      type: String,
      default: ''
    },
    options: [{
      type: String
    }],
    placeholder: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    validation: {
      min: Number,
      max: Number,
      pattern: String
    }
  }],

  // 示例与说明
  examples: [{
    title: String,
    input: mongoose.Schema.Types.Mixed,
    output: String,
    note: String
  }],
  tips: {
    type: String,
    default: ''
  },
  warnings: {
    type: String,
    default: ''
  },

  // 质量与反馈
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // 使用统计
  viewCount: {
    type: Number,
    default: 0,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  copyCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date
  },
  lastViewedAt: {
    type: Date
  },

  // 版本管理
  version: {
    type: String,
    default: '1.0.0'
  },
  versionHistory: [{
    version: String,
    content: String,
    variables: Array,
    changes: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 权限与共享
  visibility: {
    type: String,
    enum: ['private', 'public', 'unlisted'],
    default: 'private',
    index: true
  },
  isShared: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  sharedAt: {
    type: Date
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowFork: {
    type: Boolean,
    default: true
  },

  // 元数据
  language: {
    type: String,
    enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'none'],
    default: 'none'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedTokens: {
    type: Number,
    default: 0
  },
  estimatedTime: {
    type: String,
    default: '1-2分钟'
  },

  // 个人化
  personalNote: {
    content: String,
    lastUpdated: Date
  },

  // 关联信息
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptFolder',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  forkedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptTemplate'
  },

  // 状态管理
  status: {
    type: String,
    enum: ['active', 'draft', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
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
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
promptTemplateSchema.index({ userId: 1, status: 1, createdAt: -1 });
promptTemplateSchema.index({ category: 1, visibility: 1 });
promptTemplateSchema.index({ aiModel: 1, category: 1 });
promptTemplateSchema.index({ tags: 1, visibility: 1 });
promptTemplateSchema.index({ usageCount: -1, rating: -1 });
promptTemplateSchema.index({ shareToken: 1 });

// 全文索引 (使用 none 语言以支持中文)
promptTemplateSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
  description: 'text'
}, {
  default_language: 'none'
});

// 虚拟字段：文件夹信息
promptTemplateSchema.virtual('folderInfo', {
  ref: 'PromptFolder',
  localField: 'folderId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：用户信息
promptTemplateSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 中间件：更新时间戳
promptTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // 自动生成ID
  if (!this.id) {
    this.id = this._id.toString();
  }

  // 首次创建时记录版本历史
  if (this.isNew && this.content) {
    this.versionHistory = [{
      version: this.version,
      content: this.content,
      variables: this.variables,
      changes: '创建提示词',
      createdAt: new Date(),
      createdBy: this.userId
    }];
  }

  next();
});

// 静态方法：获取用户的提示词列表
promptTemplateSchema.statics.getUserPrompts = function(userId, options = {}) {
  const query = {
    userId,
    isDeleted: false
  };

  if (options.status) {
    query.status = options.status;
  }

  if (options.category) {
    query.category = options.category;
  }

  if (options.aiModel) {
    query.aiModel = options.aiModel;
  }

  if (options.folderId) {
    query.folderId = options.folderId;
  }

  return this.find(query)
    .populate('folderInfo')
    .sort(options.sort || { createdAt: -1 });
};

// 静态方法：搜索提示词
promptTemplateSchema.statics.searchPrompts = function(keyword, userId, options = {}) {
  const query = {
    $text: { $search: keyword },
    userId,
    isDeleted: false,
    status: 'active'
  };

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 50);
};

// 静态方法：获取热门提示词
promptTemplateSchema.statics.getTrendingPrompts = function(limit = 10) {
  return this.find({
    visibility: 'public',
    status: 'active',
    isDeleted: false
  })
    .sort({ usageCount: -1, rating: -1 })
    .limit(limit);
};

// 实例方法：增加查看次数
promptTemplateSchema.methods.incrementView = function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

// 实例方法：增加使用次数
promptTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// 实例方法：增加复制次数
promptTemplateSchema.methods.incrementCopy = function() {
  this.copyCount += 1;
  return this.save();
};

// 实例方法：更新评分
promptTemplateSchema.methods.updateRating = function(newRating) {
  const totalRating = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = Math.round((totalRating / this.ratingCount) * 10) / 10;
  return this.save();
};

// 实例方法：生成分享令牌
promptTemplateSchema.methods.generateShareToken = function() {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(16).toString('hex');
  this.isShared = true;
  this.sharedAt = new Date();
  return this.save();
};

// 实例方法：保存新版本
promptTemplateSchema.methods.saveVersion = function(changes, userId) {
  const newVersion = this.incrementVersion(this.version);

  this.versionHistory.push({
    version: newVersion,
    content: this.content,
    variables: this.variables,
    changes: changes || '更新提示词',
    createdAt: new Date(),
    createdBy: userId
  });

  this.version = newVersion;
  return this.save();
};

// 辅助方法：递增版本号
promptTemplateSchema.methods.incrementVersion = function(version) {
  const parts = version.split('.').map(Number);
  parts[2] += 1;
  return parts.join('.');
};

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
