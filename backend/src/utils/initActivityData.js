const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const logger = require('./logger');

/**
 * 初始化活动日志测试数据
 */
async function initActivityData() {
  try {
    // 检查是否已有活动数据
    const existingCount = await ActivityLog.countDocuments();
    if (existingCount > 0) {
      logger.info(`活动日志已有 ${existingCount} 条数据，跳过初始化`);
      return;
    }

    // 获取所有用户
    const users = await User.find().limit(10);
    if (users.length === 0) {
      logger.warn('没有用户数据，无法创建活动日志');
      return;
    }

    const activities = [];
    const now = new Date();

    // 生成过去7天的活动数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // 每天生成一些随机活动
      const dailyActivities = Math.floor(Math.random() * 10) + 5; // 5-15个活动
      
      for (let j = 0; j < dailyActivities; j++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const activityTime = new Date(
          date.getTime() + Math.random() * 24 * 60 * 60 * 1000
        );

        // 随机选择活动类型
        const activityTypes = [
          {
            type: 'user_login',
            title: '用户登录',
            description: '用户成功登录系统'
          },
          {
            type: 'user_register',
            title: '用户注册',
            description: '新用户完成注册'
          },
          {
            type: 'admin_action',
            title: '管理员操作',
            description: '管理员执行了系统操作'
          },
          {
            type: 'user_update',
            title: '更新用户信息',
            description: '用户更新了个人资料'
          },
          {
            type: 'system_event',
            title: '系统事件',
            description: '系统自动执行的维护任务'
          }
        ];

        const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        activities.push({
          type: activity.type,
          title: activity.title,
          description: activity.description,
          userId: activity.type === 'system_event' ? null : user._id,
          targetId: activity.type === 'user_register' ? user._id : null,
          targetType: activity.type === 'user_register' ? 'User' : null,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          metadata: {
            testData: true,
            generatedAt: new Date(),
            randomValue: Math.random()
          },
          result: Math.random() > 0.1 ? 'success' : 'failure', // 90%成功率
          createdAt: activityTime,
          updatedAt: activityTime
        });
      }
    }

    // 批量插入活动数据
    await ActivityLog.insertMany(activities);
    
    logger.info(`成功初始化 ${activities.length} 条活动日志测试数据`);

    // 记录初始化完成事件
    await ActivityLog.create({
      type: 'system_event',
      title: '活动日志初始化',
      description: `成功初始化 ${activities.length} 条活动日志测试数据`,
      targetId: null,
      targetType: null,
      metadata: {
        totalRecords: activities.length,
        initializationTime: new Date(),
        systemEvent: true
      }
    });

  } catch (error) {
    logger.error('初始化活动日志数据失败:', error);
  }
}

/**
 * 清理测试数据
 */
async function clearTestActivityData() {
  try {
    const result = await ActivityLog.deleteMany({
      'metadata.testData': true
    });
    
    logger.info(`清理了 ${result.deletedCount} 条测试活动数据`);
    return result.deletedCount;
  } catch (error) {
    logger.error('清理测试活动数据失败:', error);
    return 0;
  }
}

/**
 * 生成实时活动数据（用于演示）
 */
async function generateRealtimeActivity() {
  try {
    const users = await User.find().limit(5);
    if (users.length === 0) return;

    const user = users[Math.floor(Math.random() * users.length)];
    
    const activities = [
      {
        type: 'user_login',
        title: '用户登录',
        description: `用户 ${user.username} 登录了系统`
      },
      {
        type: 'admin_action',
        title: '管理员操作',
        description: `管理员查看了系统状态`
      },
      {
        type: 'user_update',
        title: '更新资料',
        description: `用户 ${user.username} 更新了个人资料`
      }
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    
    await ActivityLog.create({
      type: activity.type,
      title: activity.title,
      description: activity.description,
      userId: user._id,
      targetId: null,
      targetType: null,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: {
        realtimeGenerated: true,
        timestamp: new Date()
      }
    });

    logger.info(`生成实时活动: ${activity.title}`);
  } catch (error) {
    logger.error('生成实时活动失败:', error);
  }
}

module.exports = {
  initActivityData,
  clearTestActivityData,
  generateRealtimeActivity
};
