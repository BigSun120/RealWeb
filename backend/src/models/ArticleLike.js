const mongoose = require('mongoose');

const articleLikeSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
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

// 复合索引，确保用户对同一文章只能点赞一次
articleLikeSchema.index({ articleId: 1, userId: 1 }, { unique: true });

// 虚拟字段：文章信息
articleLikeSchema.virtual('article', {
  ref: 'Article',
  localField: 'articleId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：用户信息
articleLikeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：检查用户是否已点赞
articleLikeSchema.statics.isLiked = function(articleId, userId) {
  return this.findOne({ articleId, userId }).lean();
};

// 静态方法：切换点赞状态
articleLikeSchema.statics.toggleLike = async function(articleId, userId, ipAddress = null) {
  const Article = mongoose.model('Article');
  
  try {
    // 检查是否已点赞
    const existingLike = await this.findOne({ articleId, userId });
    
    if (existingLike) {
      // 取消点赞
      await this.deleteOne({ articleId, userId });
      await Article.findByIdAndUpdate(articleId, { $inc: { likeCount: -1 } });
      return { action: 'unliked', likeCount: await Article.findById(articleId).select('likeCount').then(a => a.likeCount) };
    } else {
      // 添加点赞
      await this.create({ articleId, userId, ipAddress });
      await Article.findByIdAndUpdate(articleId, { $inc: { likeCount: 1 } });
      return { action: 'liked', likeCount: await Article.findById(articleId).select('likeCount').then(a => a.likeCount) };
    }
  } catch (error) {
    if (error.code === 11000) {
      // 重复点赞，忽略错误
      return { action: 'already_liked', likeCount: await Article.findById(articleId).select('likeCount').then(a => a.likeCount) };
    }
    throw error;
  }
};

// 静态方法：获取文章的点赞统计
articleLikeSchema.statics.getLikeStats = async function(articleId) {
  const count = await this.countDocuments({ articleId });
  return { count };
};

// 静态方法：获取用户点赞的文章列表
articleLikeSchema.statics.getUserLikedArticles = function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('article', 'title excerpt coverImage authorId publishedAt likeCount viewCount')
    .lean();
};

// 静态方法：获取热门文章排行榜
articleLikeSchema.statics.getPopularArticles = async function(options = {}) {
  const { 
    timeRange = 'all', // all, week, month, day
    limit = 10 
  } = options;
  
  let dateFilter = {};
  const now = new Date();
  
  switch (timeRange) {
    case 'day':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
      break;
    case 'week':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
      break;
    case 'month':
      dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
      break;
    default:
      // 'all' - 不添加时间过滤
      break;
  }
  
  const pipeline = [
    ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
    {
      $group: {
        _id: '$articleId',
        likeCount: { $sum: 1 },
        latestLike: { $max: '$createdAt' }
      }
    },
    { $sort: { likeCount: -1, latestLike: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'articles',
        localField: '_id',
        foreignField: '_id',
        as: 'article'
      }
    },
    { $unwind: '$article' },
    {
      $match: {
        'article.status': 'published',
        'article.isDeleted': { $ne: true }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'article.authorId',
        foreignField: '_id',
        as: 'article.author'
      }
    },
    { $unwind: '$article.author' },
    {
      $project: {
        _id: '$article._id',
        title: '$article.title',
        excerpt: '$article.excerpt',
        coverImage: '$article.coverImage',
        publishedAt: '$article.publishedAt',
        likeCount: 1,
        viewCount: '$article.viewCount',
        author: {
          _id: '$article.author._id',
          username: '$article.author.username',
          displayName: '$article.author.displayName',
          avatar: '$article.author.avatar'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('ArticleLike', articleLikeSchema);
