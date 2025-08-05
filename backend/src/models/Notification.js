const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 接收通知的用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 通知类型
  type: {
    type: String,
    enum: ['mention', 'reply', 'like', 'system'],
    required: true,
    index: true
  },

  // 通知标题
  title: {
    type: String,
    required: true,
    maxlength: 100
  },

  // 通知内容
  content: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 相关数据
  relatedData: {
    // 评论ID
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    },
    // 文章ID
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    },
    // 触发用户ID
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // 其他相关数据
    extra: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // 通知状态
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // 阅读时间
  readAt: {
    type: Date,
    default: null
  },

  // 是否删除
  isDeleted: {
    type: Boolean,
    default: false
  },

  // 删除时间
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

// 虚拟字段：触发用户信息
notificationSchema.virtual('fromUser', {
  ref: 'User',
  localField: 'relatedData.fromUserId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：相关评论
notificationSchema.virtual('comment', {
  ref: 'Comment',
  localField: 'relatedData.commentId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：相关文章
notificationSchema.virtual('article', {
  ref: 'Article',
  localField: 'relatedData.articleId',
  foreignField: '_id',
  justOne: true
});

// 实例方法：标记为已读
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// 实例方法：软删除
notificationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// 静态方法：创建@用户通知
notificationSchema.statics.createMentionNotification = async function(mentionedUserId, comment, article, fromUser) {
  const notification = new this({
    userId: mentionedUserId,
    type: 'mention',
    title: `${fromUser.username} 在评论中提到了你`,
    content: `${fromUser.username} 在文章《${article.title}》的评论中提到了你：${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
    relatedData: {
      commentId: comment._id,
      articleId: article._id,
      fromUserId: fromUser._id
    }
  });

  return await notification.save();
};

// 静态方法：创建回复通知
notificationSchema.statics.createReplyNotification = async function(userId, comment, article, fromUser) {
  const notification = new this({
    userId: userId,
    type: 'reply',
    title: `${fromUser.username} 回复了你的评论`,
    content: `${fromUser.username} 在文章《${article.title}》中回复了你：${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
    relatedData: {
      commentId: comment._id,
      articleId: article._id,
      fromUserId: fromUser._id
    }
  });

  return await notification.save();
};

// 静态方法：获取用户通知列表
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    isRead = null
  } = options;

  const skip = (page - 1) * limit;

  let query = {
    userId,
    isDeleted: false
  };

  if (type) {
    query.type = type;
  }

  if (isRead !== null) {
    query.isRead = isRead;
  }

  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // 手动populate relatedData中的引用
  const mongoose = require('mongoose');

  for (const notification of notifications) {
    if (notification.relatedData) {
      // Populate fromUserId
      if (notification.relatedData.fromUserId) {
        try {
          const User = mongoose.model('User');
          const fromUser = await User.findById(notification.relatedData.fromUserId)
            .select('username avatar')
            .lean();
          notification.relatedData.fromUserId = fromUser;
        } catch (error) {
          console.error('Populate fromUserId failed:', error);
        }
      }

      // Populate article info (保留原始ID)
      if (notification.relatedData.articleId) {
        try {
          const Article = mongoose.model('Article');
          const article = await Article.findById(notification.relatedData.articleId)
            .select('title')
            .lean();
          if (article) {
            notification.relatedData.article = article;
            // 保留原始的articleId作为字符串
            notification.relatedData.articleId = notification.relatedData.articleId.toString();
          }
        } catch (error) {
          console.error('Populate article failed:', error);
        }
      }

      // Populate comment info (保留原始ID)
      if (notification.relatedData.commentId) {
        try {
          const Comment = mongoose.model('Comment');
          const comment = await Comment.findById(notification.relatedData.commentId)
            .select('content')
            .lean();
          if (comment) {
            notification.relatedData.comment = comment;
            // 保留原始的commentId作为字符串
            notification.relatedData.commentId = notification.relatedData.commentId.toString();
          }
        } catch (error) {
          console.error('Populate comment failed:', error);
        }
      }
    }
  }

  return notifications;
};

// 静态方法：获取未读通知数量
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isDeleted: false
  });
};

// 静态方法：批量标记为已读
notificationSchema.statics.markAllAsRead = function(userId, notificationIds = null) {
  let query = {
    userId,
    isRead: false,
    isDeleted: false
  };

  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  return this.updateMany(query, {
    isRead: true,
    readAt: new Date()
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
