const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // IP地址（用于防刷）
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 复合索引，确保用户对同一评论只能点赞一次
commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

// 虚拟字段：评论信息
commentLikeSchema.virtual('comment', {
  ref: 'Comment',
  localField: 'commentId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：用户信息
commentLikeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：检查用户是否已点赞
commentLikeSchema.statics.isLiked = function(commentId, userId) {
  return this.findOne({ commentId, userId }).lean();
};

// 静态方法：切换点赞状态
commentLikeSchema.statics.toggleLike = async function(commentId, userId, ipAddress = null) {
  const Comment = mongoose.model('Comment');
  
  try {
    // 检查是否已点赞
    const existingLike = await this.findOne({ commentId, userId });
    
    if (existingLike) {
      // 取消点赞
      await this.deleteOne({ commentId, userId });
      await Comment.findByIdAndUpdate(commentId, { $inc: { likeCount: -1 } });
      return { action: 'unliked', likeCount: await Comment.findById(commentId).select('likeCount').then(c => c.likeCount) };
    } else {
      // 添加点赞
      await this.create({ commentId, userId, ipAddress });
      await Comment.findByIdAndUpdate(commentId, { $inc: { likeCount: 1 } });
      return { action: 'liked', likeCount: await Comment.findById(commentId).select('likeCount').then(c => c.likeCount) };
    }
  } catch (error) {
    if (error.code === 11000) {
      // 重复点赞，忽略错误
      return { action: 'already_liked', likeCount: await Comment.findById(commentId).select('likeCount').then(c => c.likeCount) };
    }
    throw error;
  }
};

// 静态方法：获取评论的点赞用户列表
commentLikeSchema.statics.getLikeUsers = function(commentId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ commentId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar')
    .lean();
};

module.exports = mongoose.model('CommentLike', commentLikeSchema);
