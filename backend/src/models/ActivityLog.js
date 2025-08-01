const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // 活动类型
  type: {
    type: String,
    required: true,
    enum: [
      'user_register',    // 用户注册
      'user_login',       // 用户登录
      'user_logout',      // 用户登出
      'article_create',   // 文章创建
      'article_edit',     // 文章编辑
      'article_delete',   // 文章删除
      'article_publish',  // 文章发布
      'admin_action',     // 管理员操作
      'user_update',      // 用户信息更新
      'password_reset',   // 密码重置
      'system_event'      // 系统事件
    ]
  },

  // 活动标题
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  // 活动描述
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 操作用户ID（可选，系统事件可能没有用户）
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 目标对象ID（如文章ID、用户ID等）
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // 目标对象类型
  targetType: {
    type: String,
    enum: ['User', 'Article', 'Comment', 'System'],
    required: false
  },

  // IP地址
  ipAddress: {
    type: String,
    default: null
  },

  // 用户代理
  userAgent: {
    type: String,
    default: null
  },

  // 附加元数据
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 操作结果
  result: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },

  // 错误信息（如果操作失败）
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'activity_logs'
});

// 索引优化
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ type: 1, userId: 1, createdAt: -1 });

// 静态方法：记录活动
activityLogSchema.statics.logActivity = async function(activityData) {
  try {
    const activity = new this(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('记录活动日志失败:', error);
    // 不抛出错误，避免影响主要业务流程
    return null;
  }
};

// 静态方法：获取统计数据
activityLogSchema.statics.getStats = async function() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, totalCount, activeUsers] = await Promise.all([
      // 今日活动数
      this.countDocuments({
        createdAt: { $gte: today }
      }),

      // 本周活动数
      this.countDocuments({
        createdAt: { $gte: weekAgo }
      }),

      // 总活动数
      this.countDocuments(),

      // 活跃用户数（本周有活动的用户数）
      this.distinct('userId', {
        userId: { $ne: null },
        createdAt: { $gte: weekAgo }
      }).then(userIds => userIds.length)
    ]);

    return {
      todayCount,
      weekCount,
      totalCount,
      activeUsers
    };
  } catch (error) {
    console.error('获取活动统计失败:', error);
    return {
      todayCount: 0,
      weekCount: 0,
      totalCount: 0,
      activeUsers: 0
    };
  }
};

// 静态方法：清理旧日志
activityLogSchema.statics.cleanOldLogs = async function(daysToKeep = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    console.log(`清理了 ${result.deletedCount} 条旧活动日志`);
    return result.deletedCount;
  } catch (error) {
    console.error('清理旧活动日志失败:', error);
    return 0;
  }
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
