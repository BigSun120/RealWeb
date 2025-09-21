const mongoose = require('mongoose');

const tempEmailUsageLogSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // 操作类型
    action: {
      type: String,
      required: true,
      enum: [
        'activate',      // 激活权限
        'generate',      // 生成邮箱
        'view',          // 查看邮件
        'delete',        // 删除邮件
        'clear',         // 清空邮箱
        'send_test',     // 发送测试邮件
        'revoke'         // 撤销权限
      ],
      index: true
    },

    // 相关邮箱地址
    email: {
      type: String,
      default: null,
      index: true
    },

    // 使用的激活码（仅激活操作）
    activationCode: {
      type: String,
      default: null,
      index: true
    },

    // 操作详情（JSON格式）
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // 时间戳
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    // IP地址
    ipAddress: {
      type: String,
      default: null,
      index: true
    },

    // 用户代理
    userAgent: {
      type: String,
      default: null
    },

    // 操作结果
    result: {
      type: String,
      enum: ['success', 'failure', 'error'],
      default: 'success',
      index: true
    },

    // 错误信息（如果操作失败）
    errorMessage: {
      type: String,
      default: null
    },

    // 会话ID（用于关联同一会话的操作）
    sessionId: {
      type: String,
      default: null,
      index: true
    }
  },
  {
    timestamps: false, // 使用自定义的timestamp字段
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引
tempEmailUsageLogSchema.index({ userId: 1, timestamp: -1 });
tempEmailUsageLogSchema.index({ action: 1, timestamp: -1 });
tempEmailUsageLogSchema.index({ email: 1, timestamp: -1 });
tempEmailUsageLogSchema.index({ activationCode: 1 });
tempEmailUsageLogSchema.index({ ipAddress: 1, timestamp: -1 });
tempEmailUsageLogSchema.index({ result: 1, timestamp: -1 });
tempEmailUsageLogSchema.index({ timestamp: -1 }); // 按时间倒序

// 虚拟字段：用户信息
tempEmailUsageLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：记录操作日志
tempEmailUsageLogSchema.statics.logAction = async function (options) {
  const {
    userId,
    action,
    email = null,
    activationCode = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    result = 'success',
    errorMessage = null,
    sessionId = null
  } = options;

  if (!userId || !action) {
    throw new Error('用户ID和操作类型不能为空');
  }

  const log = new this({
    userId,
    action,
    email,
    activationCode,
    details,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    result,
    errorMessage,
    sessionId
  });

  return await log.save();
};

// 静态方法：获取用户操作统计
tempEmailUsageLogSchema.statics.getUserStats = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastAction: { $max: '$timestamp' }
      }
    }
  ]);

  // 转换为对象格式
  const result = {};
  stats.forEach(stat => {
    result[stat._id] = {
      count: stat.count,
      lastAction: stat.lastAction
    };
  });

  return result;
};

// 静态方法：获取系统使用统计
tempEmailUsageLogSchema.statics.getSystemStats = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp'
            }
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        totalCount: { $sum: '$count' },
        dailyStats: {
          $push: {
            date: '$_id.date',
            count: '$count'
          }
        }
      }
    }
  ]);

  return stats;
};

// 静态方法：获取激活码使用统计
tempEmailUsageLogSchema.statics.getActivationCodeStats = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        action: 'activate',
        timestamp: { $gte: startDate },
        activationCode: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$activationCode',
        useCount: { $sum: 1 },
        lastUsed: { $max: '$timestamp' },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueUsers: { $size: '$users' }
      }
    },
    {
      $project: {
        users: 0 // 不返回用户列表，只返回数量
      }
    },
    {
      $sort: { useCount: -1 }
    }
  ]);

  return stats;
};

// 静态方法：获取IP地址统计（安全监控）
tempEmailUsageLogSchema.statics.getIPStats = async function (days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        ipAddress: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$ipAddress',
        actionCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        actions: { $addToSet: '$action' },
        lastAction: { $max: '$timestamp' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $project: {
        uniqueUsers: 0 // 不返回用户列表，只返回数量
      }
    },
    {
      $sort: { actionCount: -1 }
    },
    {
      $limit: 100 // 限制返回前100个IP
    }
  ]);

  return stats;
};

// 静态方法：清理旧日志
tempEmailUsageLogSchema.statics.cleanup = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });

  return result;
};

// 静态方法：检测异常行为
tempEmailUsageLogSchema.statics.detectAnomalies = async function (hours = 1) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  // 检测频繁操作的用户
  const frequentUsers = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        actionCount: { $sum: 1 },
        uniqueIPs: { $addToSet: '$ipAddress' },
        actions: { $addToSet: '$action' }
      }
    },
    {
      $match: {
        actionCount: { $gte: 50 } // 1小时内操作超过50次
      }
    },
    {
      $addFields: {
        uniqueIPCount: { $size: '$uniqueIPs' }
      }
    },
    {
      $sort: { actionCount: -1 }
    }
  ]);

  // 检测频繁操作的IP
  const frequentIPs = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        ipAddress: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$ipAddress',
        actionCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $match: {
        actionCount: { $gte: 100 } // 1小时内操作超过100次
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { actionCount: -1 }
    }
  ]);

  return {
    frequentUsers,
    frequentIPs
  };
};

module.exports = mongoose.model('TempEmailUsageLog', tempEmailUsageLogSchema);
