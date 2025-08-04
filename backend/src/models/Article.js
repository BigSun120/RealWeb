const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [100, '标题最多100个字符'],
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  excerpt: {
    type: String,
    maxlength: [300, '摘要最多300个字符']
  },
  coverImage: {
    type: String,
    default: ''
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['tech', 'life', 'study', 'project', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, '标签最多20个字符']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  isTop: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },

  // 软删除标记
  isDeleted: {
    type: Boolean,
    default: false
  },

  // 删除时间
  deletedAt: {
    type: Date,
    default: null
  },

  // 删除者ID
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 删除原因
  deleteReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：作者信息
articleSchema.virtual('author', {
  ref: 'User',
  localField: 'authorId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：评论列表
articleSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'articleId'
});

// 索引
articleSchema.index({ authorId: 1 });
articleSchema.index({ category: 1, createdAt: -1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ title: 'text', content: 'text' }); // 全文搜索索引
articleSchema.index({ viewCount: -1 });
articleSchema.index({ likeCount: -1 });
articleSchema.index({ isTop: -1, publishedAt: -1 });
articleSchema.index({ isDeleted: 1, deletedAt: -1 });

// 实例方法：软删除
articleSchema.methods.softDelete = function(deletedBy, reason = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.deleteReason = reason;
  return this.save();
};

// 实例方法：恢复删除
articleSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deleteReason = null;
  return this.save();
};

// 静态方法：查找未删除的文章
articleSchema.statics.findNotDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: { $ne: true } });
};

// 静态方法：查找已删除的文章
articleSchema.statics.findDeleted = function(filter = {}) {
  return this.find({ ...filter, isDeleted: true });
};

// 中间件：发布时设置发布时间和验证
articleSchema.pre('save', function(next) {
  // 发布时设置发布时间
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // 发布时验证必填字段
  if (this.status === 'published') {
    if (!this.title || this.title.trim().length === 0) {
      return next(new Error('发布文章时标题不能为空'));
    }
    if (!this.content || this.content.trim().length < 10) {
      return next(new Error('发布文章时内容至少需要10个字符'));
    }
  }

  next();
});

// 中间件：生成摘要
articleSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.excerpt) {
    // 从内容中提取前200个字符作为摘要
    const plainText = this.content.replace(/[#*`]/g, '').trim();
    this.excerpt = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
  }
  next();
});

// 实例方法：增加浏览量
articleSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

// 实例方法：增加点赞数
articleSchema.methods.incrementLikeCount = async function() {
  this.likeCount += 1;
  await this.save();
};

// 实例方法：减少点赞数
articleSchema.methods.decrementLikeCount = async function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
    await this.save();
  }
};

// 实例方法：更新评论数量
articleSchema.methods.updateCommentCount = async function() {
  const Comment = mongoose.model('Comment');
  this.commentCount = await Comment.countDocuments({ articleId: this._id });
  await this.save();
};

// 静态方法：获取热门文章
articleSchema.statics.getPopularArticles = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(limit)
    .populate('author', 'username avatar')
    .select('-content');
};

// 静态方法：获取最新文章
articleSchema.statics.getLatestArticles = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ isTop: -1, publishedAt: -1 })
    .limit(limit)
    .populate('author', 'username avatar')
    .select('-content');
};

// 静态方法：按分类获取文章
articleSchema.statics.getArticlesByCategory = function(category, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ status: 'published', category })
    .sort({ isTop: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username avatar')
    .select('-content');
};

// 静态方法：搜索文章
articleSchema.statics.searchArticles = function(keyword, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({
    status: 'published',
    $text: { $search: keyword }
  })
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username avatar')
    .select('-content');
};

module.exports = mongoose.model('Article', articleSchema);
