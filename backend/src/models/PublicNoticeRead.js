const mongoose = require('mongoose');

const publicNoticeReadSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 公告ID
  noticeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicNotice',
    required: true,
    index: true
  },

  // 已读状态
  isRead: {
    type: Boolean,
    default: true,
    index: true
  },

  // 阅读时间
  readAt: {
    type: Date,
    default: Date.now
  },

  // 是否已忽略（对应原来的"不再显示"）
  isDismissed: {
    type: Boolean,
    default: false,
    index: true
  },

  // 忽略时间
  dismissedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引，确保用户对同一公告只能有一条记录
publicNoticeReadSchema.index({ userId: 1, noticeId: 1 }, { unique: true });

// 复合索引，优化查询性能
publicNoticeReadSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
publicNoticeReadSchema.index({ userId: 1, isDismissed: 1, createdAt: -1 });

// 虚拟字段：用户信息
publicNoticeReadSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：公告信息
publicNoticeReadSchema.virtual('notice', {
  ref: 'PublicNotice',
  localField: 'noticeId',
  foreignField: '_id',
  justOne: true
});

// 实例方法：标记为已读
publicNoticeReadSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// 实例方法：标记为忽略
publicNoticeReadSchema.methods.markAsDismissed = function() {
  this.isDismissed = true;
  this.dismissedAt = new Date();
  return this.save();
};

// 静态方法：获取用户对公告的阅读状态
publicNoticeReadSchema.statics.getUserReadStatus = async function(userId, noticeIds) {
  if (!Array.isArray(noticeIds)) {
    noticeIds = [noticeIds];
  }

  const readRecords = await this.find({
    userId,
    noticeId: { $in: noticeIds }
  }).lean();

  // 转换为 noticeId -> readStatus 的映射
  const statusMap = {};
  readRecords.forEach(record => {
    statusMap[record.noticeId.toString()] = {
      isRead: record.isRead,
      isDismissed: record.isDismissed,
      readAt: record.readAt,
      dismissedAt: record.dismissedAt
    };
  });

  return statusMap;
};

// 静态方法：标记公告为已读
publicNoticeReadSchema.statics.markNoticeAsRead = async function(userId, noticeId) {
  return await this.findOneAndUpdate(
    { userId, noticeId },
    {
      isRead: true,
      readAt: new Date(),
      $setOnInsert: { userId, noticeId }
    },
    { upsert: true, new: true }
  );
};

// 静态方法：标记公告为忽略
publicNoticeReadSchema.statics.markNoticeAsDismissed = async function(userId, noticeId) {
  return await this.findOneAndUpdate(
    { userId, noticeId },
    {
      isDismissed: true,
      dismissedAt: new Date(),
      $setOnInsert: { userId, noticeId, isRead: true, readAt: new Date() }
    },
    { upsert: true, new: true }
  );
};

// 静态方法：批量标记为已读
publicNoticeReadSchema.statics.markMultipleAsRead = async function(userId, noticeIds) {
  const operations = noticeIds.map(noticeId => ({
    updateOne: {
      filter: { userId, noticeId },
      update: {
        isRead: true,
        readAt: new Date(),
        $setOnInsert: { userId, noticeId }
      },
      upsert: true
    }
  }));

  return await this.bulkWrite(operations);
};

// 静态方法：获取用户未读公告数量
publicNoticeReadSchema.statics.getUnreadCount = async function(userId, activeNoticeIds) {
  if (!activeNoticeIds || activeNoticeIds.length === 0) {
    return 0;
  }

  // 获取用户已读的公告ID
  const readRecords = await this.find({
    userId,
    noticeId: { $in: activeNoticeIds },
    isRead: true
  }).select('noticeId').lean();

  const readNoticeIds = readRecords.map(record => record.noticeId.toString());
  
  // 计算未读数量
  return activeNoticeIds.filter(id => !readNoticeIds.includes(id.toString())).length;
};

// 静态方法：获取用户未忽略的公告
publicNoticeReadSchema.statics.getNonDismissedNotices = async function(userId, notices) {
  if (!notices || notices.length === 0) {
    return [];
  }

  const noticeIds = notices.map(notice => notice._id);
  
  // 获取用户已忽略的公告ID
  const dismissedRecords = await this.find({
    userId,
    noticeId: { $in: noticeIds },
    isDismissed: true
  }).select('noticeId').lean();

  const dismissedNoticeIds = dismissedRecords.map(record => record.noticeId.toString());
  
  // 返回未忽略的公告
  return notices.filter(notice => !dismissedNoticeIds.includes(notice._id.toString()));
};

module.exports = mongoose.model('PublicNoticeRead', publicNoticeReadSchema);
