const mongoose = require('mongoose');

/**
 * 提示词评论数据模型
 */
const promptCommentSchema = new mongoose.Schema({
  // 所属提示词
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptTemplate',
    required: true,
    index: true
  },

  // 评论作者
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 评论内容
  content: {
    type: String,
    required: [true, '评论内容不能为空'],
    trim: true,
    minlength: [1, '评论内容至少1个字符'],
    maxlength: [1000, '评论内容最多1000个字符']
  },

  // 回复关系
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptComment',
    default: null,
    index: true
  },

  // 回复给谁（用于 @ 提及）
  replyToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 根评论ID（用于快速查询评论树）
  rootId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptComment',
    default: null,
    index: true
  },

  // 点赞
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // 点赞用户列表（用于判断用户是否已点赞）
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 回复数量
  replyCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // 状态
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: {
    type: Date
  },

  // 编辑历史
  isEdited: {
    type: Boolean,
    default: false
  },

  lastEditedAt: {
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
promptCommentSchema.index({ promptId: 1, parentId: 1, createdAt: -1 });
promptCommentSchema.index({ promptId: 1, rootId: 1, createdAt: 1 });
promptCommentSchema.index({ userId: 1, createdAt: -1 });

// 虚拟字段：作者信息
promptCommentSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：回复对象信息
promptCommentSchema.virtual('replyToUserInfo', {
  ref: 'User',
  localField: 'replyToUserId',
  foreignField: '_id',
  justOne: true
});

// 中间件：更新时间戳
promptCommentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：获取提示词的评论列表（只获取根评论）
promptCommentSchema.statics.getPromptComments = async function(promptId, options = {}) {
  const query = {
    promptId,
    parentId: null,
    isDeleted: false
  };

  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;

  return this.find(query)
    .populate('userId', 'username avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

// 静态方法：获取评论的回复列表
promptCommentSchema.statics.getCommentReplies = async function(commentId, options = {}) {
  const query = {
    parentId: commentId,
    isDeleted: false
  };

  const sort = options.sort || { createdAt: 1 };
  const limit = options.limit || 100;

  return this.find(query)
    .populate('userId', 'username avatar')
    .populate('replyToUserId', 'username')
    .sort(sort)
    .limit(limit)
    .lean();
};

// 静态方法：获取评论树（包含所有回复）
promptCommentSchema.statics.getCommentTree = async function(promptId, options = {}) {
  // 获取所有根评论
  const rootComments = await this.getPromptComments(promptId, options);

  // 获取所有回复
  const rootIds = rootComments.map(c => c._id);
  if (rootIds.length === 0) return [];

  const replies = await this.find({
    rootId: { $in: rootIds },
    isDeleted: false
  })
    .populate('userId', 'username avatar')
    .populate('replyToUserId', 'username')
    .sort({ createdAt: 1 })
    .lean();

  // 构建评论树
  const commentMap = new Map();
  rootComments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
  });

  replies.forEach(reply => {
    const rootId = reply.rootId.toString();
    if (commentMap.has(rootId)) {
      commentMap.get(rootId).replies.push(reply);
    }
  });

  return rootComments;
};

// 实例方法：点赞
promptCommentSchema.methods.addLike = async function(userId) {
  if (!this.likedBy.includes(userId)) {
    this.likedBy.push(userId);
    this.likeCount += 1;
    await this.save();
    return true;
  }
  return false;
};

// 实例方法：取消点赞
promptCommentSchema.methods.removeLike = async function(userId) {
  const index = this.likedBy.indexOf(userId);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likeCount -= 1;
    await this.save();
    return true;
  }
  return false;
};

// 实例方法：更新回复数量
promptCommentSchema.methods.updateReplyCount = async function() {
  const count = await this.constructor.countDocuments({
    parentId: this._id,
    isDeleted: false
  });
  this.replyCount = count;
  await this.save();
};

// 实例方法：软删除
promptCommentSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();

  // 更新父评论的回复数量
  if (this.parentId) {
    const parentComment = await this.constructor.findById(this.parentId);
    if (parentComment) {
      await parentComment.updateReplyCount();
    }
  }
};

module.exports = mongoose.model('PromptComment', promptCommentSchema);
