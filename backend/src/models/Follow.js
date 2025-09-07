const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  // 关注者ID
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 被关注者ID
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // IP地址（用于防刷）
  ipAddress: {
    type: String,
    default: null
  },
  
  // 关注来源（可选：用于统计分析）
  source: {
    type: String,
    enum: ['profile', 'article', 'comment', 'recommendation'],
    default: 'profile'
  }
}, {
  timestamps: true
});

// 复合索引，确保用户对同一用户只能关注一次
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// 虚拟字段：关注者信息
followSchema.virtual('follower', {
  ref: 'User',
  localField: 'followerId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段：被关注者信息
followSchema.virtual('following', {
  ref: 'User',
  localField: 'followingId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：检查用户是否已关注
followSchema.statics.isFollowing = function(followerId, followingId) {
  return this.findOne({ followerId, followingId }).lean();
};

// 静态方法：切换关注状态
followSchema.statics.toggleFollow = async function(followerId, followingId, ipAddress = null, source = 'profile') {
  // 防止自己关注自己
  if (followerId.toString() === followingId.toString()) {
    throw new Error('不能关注自己');
  }
  
  try {
    // 检查是否已关注
    const existingFollow = await this.findOne({ followerId, followingId });
    
    if (existingFollow) {
      // 取消关注
      await this.deleteOne({ followerId, followingId });
      return { 
        action: 'unfollowed', 
        message: '已取消关注',
        isFollowing: false
      };
    } else {
      // 添加关注
      await this.create({ 
        followerId, 
        followingId, 
        ipAddress,
        source 
      });
      return { 
        action: 'followed', 
        message: '关注成功',
        isFollowing: true
      };
    }
  } catch (error) {
    if (error.code === 11000) {
      // 重复关注，忽略错误
      return { 
        action: 'already_followed', 
        message: '已经关注过了',
        isFollowing: true
      };
    }
    throw error;
  }
};

// 静态方法：获取用户的关注列表
followSchema.statics.getFollowing = function(userId, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = options;
  const skip = (page - 1) * limit;
  
  let sort = {};
  sort[sortBy] = sortOrder;
  
  return this.find({ followerId: userId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('following', 'username displayName avatar bio')
    .lean();
};

// 静态方法：获取用户的粉丝列表
followSchema.statics.getFollowers = function(userId, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = options;
  const skip = (page - 1) * limit;
  
  let sort = {};
  sort[sortBy] = sortOrder;
  
  return this.find({ followingId: userId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('follower', 'username displayName avatar bio')
    .lean();
};

// 静态方法：获取关注统计
followSchema.statics.getFollowStats = async function(userId) {
  const [followingCount, followersCount] = await Promise.all([
    this.countDocuments({ followerId: userId }),
    this.countDocuments({ followingId: userId })
  ]);
  
  return {
    followingCount,
    followersCount
  };
};

// 静态方法：批量检查关注状态
followSchema.statics.checkFollowingStatus = async function(followerId, userIds) {
  const follows = await this.find({
    followerId,
    followingId: { $in: userIds }
  }).select('followingId').lean();
  
  const followingMap = {};
  follows.forEach(follow => {
    followingMap[follow.followingId.toString()] = true;
  });
  
  return followingMap;
};

// 静态方法：获取共同关注
followSchema.statics.getMutualFollowing = async function(userId1, userId2, options = {}) {
  const { limit = 10 } = options;
  
  // 查找两个用户都关注的人
  const user1Following = await this.find({ followerId: userId1 }).select('followingId');
  const user1FollowingIds = user1Following.map(f => f.followingId);
  
  const mutualFollows = await this.find({
    followerId: userId2,
    followingId: { $in: user1FollowingIds }
  })
    .limit(limit)
    .populate('following', 'username displayName avatar')
    .lean();
  
  return mutualFollows.map(f => f.following);
};

// 中间件：删除关注时的清理工作
followSchema.pre('deleteOne', { document: false, query: true }, async function() {
  // 这里可以添加删除关注时的额外逻辑
  // 比如发送通知、更新缓存等
});

// 中间件：创建关注时的处理
followSchema.post('save', async function(doc) {
  // 这里可以添加关注成功后的逻辑
  // 比如发送通知、创建用户动态等
  console.log(`用户 ${doc.followerId} 关注了用户 ${doc.followingId}`);
});

module.exports = mongoose.model('Follow', followSchema);
