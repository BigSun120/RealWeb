const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // 基础信息
  content: {
    type: String,
    required: [true, '评论内容不能为空'],
    trim: true,
    maxlength: [500, '评论内容最多500个字符'],
    minlength: [1, '评论内容不能为空']
  },

  // 关联信息
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: [true, '文章ID不能为空'],
    index: true
  },

  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作者ID不能为空'],
    index: true
  },

  // 回复结构
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },

  rootId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },

  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },

  // 统计信息
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },

  replyCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // 状态信息
  status: {
    type: String,
    enum: ['published', 'pending', 'deleted'],
    default: 'published'
  },

  isTop: {
    type: Boolean,
    default: false
  },

  // 软删除
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date,
    default: null
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 编辑历史
  editedAt: {
    type: Date,
    default: null
  },

  editCount: {
    type: Number,
    default: 0
  },

  // IP地址（用于安全控制）
  ipAddress: {
    type: String,
    default: null
  },

  // 用户代理（用于统计分析）
  userAgent: {
    type: String,
    default: null
  },

  // @用户列表
  mentionedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 审核状态
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'auto_approved'
  },

  // 审核时间
  moderatedAt: {
    type: Date,
    default: null
  },

  // 审核者
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 审核原因
  moderationReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
commentSchema.index({ articleId: 1, createdAt: -1 });
commentSchema.index({ articleId: 1, isTop: -1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ rootId: 1, createdAt: 1 });
commentSchema.index({ authorId: 1, createdAt: -1 });
commentSchema.index({ status: 1, isDeleted: 1 });

// 虚拟字段：作者信息
commentSchema.virtual('author', {
  ref: 'User',
  localField: 'authorId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：文章信息
commentSchema.virtual('article', {
  ref: 'Article',
  localField: 'articleId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：父评论
commentSchema.virtual('parent', {
  ref: 'Comment',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：子评论
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId'
});

// 虚拟字段：点赞用户列表
commentSchema.virtual('likes', {
  ref: 'CommentLike',
  localField: '_id',
  foreignField: 'commentId'
});

// 实例方法：增加点赞数
commentSchema.methods.incrementLikeCount = function() {
  this.likeCount += 1;
  return this.save();
};

// 实例方法：减少点赞数
commentSchema.methods.decrementLikeCount = function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
  }
  return this.save();
};

// 实例方法：增加回复数
commentSchema.methods.incrementReplyCount = function() {
  this.replyCount += 1;
  return this.save();
};

// 实例方法：减少回复数
commentSchema.methods.decrementReplyCount = function() {
  if (this.replyCount > 0) {
    this.replyCount -= 1;
  }
  return this.save();
};

// 实例方法：软删除
commentSchema.methods.softDelete = function(deletedBy, reason = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.status = 'deleted';
  return this.save();
};

// 实例方法：检查是否可以编辑
commentSchema.methods.canEdit = function(userId) {
  // 只有作者可以编辑，且在发布后30分钟内
  if (!this.authorId.equals(userId)) {
    return false;
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.createdAt > thirtyMinutesAgo;
};

// 实例方法：检查是否可以删除
commentSchema.methods.canDelete = function(userId, userRole) {
  // 作者可以删除自己的评论，管理员可以删除任何评论
  return this.authorId.equals(userId) || userRole === 'admin';
};

// 静态方法：获取文章的评论列表
commentSchema.statics.getArticleComments = function(articleId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 1,
    level = null
  } = options;

  const skip = (page - 1) * limit;

  let query = {
    articleId,
    status: 'published',
    isDeleted: false,
    moderationStatus: { $in: ['approved', 'auto_approved'] }
  };

  // 如果指定了层级，则只查询该层级的评论
  if (level !== null) {
    query.level = level;
  }

  let sort = {};
  sort[sortBy] = sortOrder;

  // 置顶评论优先
  if (sortBy !== 'isTop') {
    sort = { isTop: -1, ...sort };
  }

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('author', 'username avatar')
    .populate('parent', 'content author')
    .populate('mentionedUsers', 'username avatar')
    .lean();
};

// 静态方法：获取评论的回复列表
commentSchema.statics.getCommentReplies = function(commentId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 1
  } = options;

  const skip = (page - 1) * limit;

  let sort = {};
  sort[sortBy] = sortOrder;

  return this.find({
    parentId: commentId,
    status: 'published',
    isDeleted: false,
    moderationStatus: { $in: ['approved', 'auto_approved'] }
  })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('author', 'username avatar')
    .populate('mentionedUsers', 'username avatar')
    .lean();
};

// 静态方法：构建评论树
commentSchema.statics.buildCommentTree = async function(articleId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 1
  } = options;

  // 获取根评论
  const rootComments = await this.getArticleComments(articleId, {
    ...options,
    level: 1
  });

  // 为每个根评论获取回复
  for (let comment of rootComments) {
    comment.replies = await this.getCommentReplies(comment._id, {
      sortBy: 'createdAt',
      sortOrder: 1,
      limit: 5 // 默认只显示5条回复
    });

    // 获取回复的回复（最多3级）
    for (let reply of comment.replies) {
      if (reply.level < 3) {
        reply.replies = await this.getCommentReplies(reply._id, {
          sortBy: 'createdAt',
          sortOrder: 1,
          limit: 3
        });
      }
    }
  }

  return rootComments;
};

// 静态方法：获取用户的评论列表
commentSchema.statics.getUserComments = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'published'
  } = options;

  const skip = (page - 1) * limit;

  let query = {
    authorId: userId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('article', 'title')
    .populate('author', 'username avatar')
    .lean();
};

// 静态方法：获取热门评论
commentSchema.statics.getPopularComments = function(articleId, limit = 5) {
  return this.find({
    articleId,
    status: 'published',
    isDeleted: false,
    level: 1 // 只获取根评论
  })
    .sort({
      isTop: -1,
      likeCount: -1,
      replyCount: -1,
      createdAt: -1
    })
    .limit(limit)
    .populate('author', 'username avatar')
    .lean();
};

module.exports = mongoose.model('Comment', commentSchema);
