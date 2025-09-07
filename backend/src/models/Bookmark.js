const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    // 收藏用户
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID不能为空'],
      index: true
    },

    // 收藏目标类型
    targetType: {
      type: String,
      required: [true, '收藏目标类型不能为空'],
      enum: ['article', 'comment'],
      index: true
    },

    // 收藏目标ID
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, '收藏目标ID不能为空'],
      index: true
    },

    // 收藏标签（可选，用于分类）
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, '标签长度不能超过20个字符']
    }],

    // 收藏备注（可选）
    note: {
      type: String,
      trim: true,
      maxlength: [200, '备注长度不能超过200个字符'],
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 复合唯一索引：防止重复收藏
bookmarkSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true, name: 'unique_bookmark' }
);

// 用户收藏列表查询索引
bookmarkSchema.index({ userId: 1, createdAt: -1 });

// 目标内容收藏统计索引
bookmarkSchema.index({ targetType: 1, targetId: 1 });

// 注意：虚拟字段使用refPath在某些情况下可能不稳定
// 我们将在查询时手动处理关联数据

// 静态方法：切换收藏状态
bookmarkSchema.statics.toggleBookmark = async function (userId, targetType, targetId, options = {}) {
  try {
    // 参数验证
    if (!userId || !targetType || !targetId) {
      throw new Error('用户ID、目标类型和目标ID不能为空');
    }

    if (!['article', 'comment'].includes(targetType)) {
      throw new Error('不支持的收藏目标类型');
    }

    // 检查是否已收藏
    const existingBookmark = await this.findOne({
      userId,
      targetType,
      targetId
    });

    if (existingBookmark) {
      // 已收藏，取消收藏
      await this.deleteOne({ _id: existingBookmark._id });
      return {
        bookmarked: false,
        bookmark: null,
        action: 'removed'
      };
    } else {
      // 未收藏，添加收藏
      const bookmark = new this({
        userId,
        targetType,
        targetId,
        tags: options.tags || [],
        note: options.note || ''
      });

      await bookmark.save();

      return {
        bookmarked: true,
        bookmark,
        action: 'added'
      };
    }
  } catch (error) {
    if (error.code === 11000) {
      // 处理并发情况下的重复键错误
      throw new Error('收藏操作冲突，请重试');
    }
    throw error;
  }
};

// 静态方法：检查收藏状态
bookmarkSchema.statics.isBookmarked = async function (userId, targetType, targetId) {
  if (!userId || !targetType || !targetId) {
    return false;
  }

  const bookmark = await this.findOne({
    userId,
    targetType,
    targetId
  });

  return !!bookmark;
};

// 静态方法：批量检查收藏状态
bookmarkSchema.statics.checkBookmarkStatus = async function (userId, targets) {
  if (!userId || !Array.isArray(targets) || targets.length === 0) {
    return {};
  }

  const conditions = targets.map(target => ({
    userId,
    targetType: target.type,
    targetId: target.id
  }));

  const bookmarks = await this.find({
    $or: conditions
  });

  const statusMap = {};
  bookmarks.forEach(bookmark => {
    const key = `${bookmark.targetType}_${bookmark.targetId}`;
    statusMap[key] = true;
  });

  return statusMap;
};

// 静态方法：获取用户收藏列表
bookmarkSchema.statics.getUserBookmarks = async function (userId, options = {}) {
  const {
    targetType,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  // 构建查询条件
  const query = { userId };
  if (targetType) {
    query.targetType = targetType;
  }

  // 构建排序条件
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // 分页查询
  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  // 手动填充关联数据
  const Article = require('./Article');
  const Comment = require('./Comment');

  for (const bookmark of bookmarks) {
    try {
      if (bookmark.targetType === 'article') {
        bookmark.target = await Article.findById(bookmark.targetId)
          .populate('author', 'displayName username avatar')
          .lean();
      } else if (bookmark.targetType === 'comment') {
        bookmark.target = await Comment.findById(bookmark.targetId)
          .populate('author', 'displayName username avatar')
          .lean();
      }
    } catch (error) {
      console.error(`Failed to populate ${bookmark.targetType} ${bookmark.targetId}:`, error);
      bookmark.target = null;
    }
  }

  return {
    bookmarks,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// 静态方法：获取内容收藏统计
bookmarkSchema.statics.getBookmarkStats = async function (targetType, targetId) {
  if (!targetType || !targetId) {
    return { count: 0 };
  }

  const count = await this.countDocuments({
    targetType,
    targetId
  });

  return { count };
};

// 静态方法：获取用户收藏统计
bookmarkSchema.statics.getUserBookmarkStats = async function (userId) {
  if (!userId) {
    return { total: 0, byType: {} };
  }

  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$targetType',
        count: { $sum: 1 }
      }
    }
  ]);

  const byType = {};
  let total = 0;

  stats.forEach(stat => {
    byType[stat._id] = stat.count;
    total += stat.count;
  });

  return { total, byType };
};

module.exports = mongoose.model('Bookmark', bookmarkSchema);
