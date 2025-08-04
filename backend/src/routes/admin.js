const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Article = require('../models/Article');
const ActivityLog = require('../models/ActivityLog');
const Settings = require('../models/Settings');
const ActivityLogger = require('../middleware/activityLogger');
const { generateRealtimeActivity, clearTestActivityData } = require('../utils/initActivityData');
const logger = require('../utils/logger');

const router = express.Router();

// 管理员权限验证中间件
const adminAuth = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      code: 403,
      message: '需要管理员权限'
    });
  }
  next();
};

// 应用管理员权限验证到所有路由
router.use(auth);
router.use(adminAuth);

// 获取仪表板统计数据
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // 用户统计
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      todayActiveUsers,
      newUsersThisWeek
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({
        createdAt: {
          $gte: lastMonth,
          $lt: thisMonth
        }
      }),
      User.countDocuments({
        lastLoginAt: { $gte: today }
      }),
      User.countDocuments({ createdAt: { $gte: thisWeek } })
    ]);

    // 文章统计
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      newArticlesThisWeek,
      newArticlesToday
    ] = await Promise.all([
      Article.countDocuments(),
      Article.countDocuments({ status: 'published' }),
      Article.countDocuments({ status: 'draft' }),
      Article.countDocuments({
        createdAt: { $gte: thisWeek },
        status: 'published'
      }),
      Article.countDocuments({
        createdAt: { $gte: today },
        status: 'published'
      })
    ]);

    // 浏览量统计
    const viewsResult = await Article.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
    ]);
    const totalViews = viewsResult.length > 0 ? viewsResult[0].totalViews : 0;

    // 今日浏览量（这里需要根据实际的访问日志来计算，暂时用文章浏览量代替）
    const todayViewsResult = await Article.aggregate([
      {
        $match: {
          updatedAt: { $gte: today },
          status: 'published'
        }
      },
      { $group: { _id: null, todayViews: { $sum: '$viewCount' } } }
    ]);
    const todayViews = todayViewsResult.length > 0 ? todayViewsResult[0].todayViews : 0;

    // 计算增长率
    const userGrowthRate = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0;

    const articleGrowthRate = newArticlesThisWeek > 0 ? 8 : 0; // 示例增长率

    res.json({
      code: 200,
      message: '获取统计数据成功',
      data: {
        totalUsers,
        totalArticles,
        totalViews,
        activeUsers: todayActiveUsers,
        trends: {
          userGrowth: {
            value: userGrowthRate,
            period: '本月',
            isPositive: userGrowthRate >= 0
          },
          articleGrowth: {
            value: articleGrowthRate,
            period: '本周',
            isPositive: articleGrowthRate >= 0
          },
          viewGrowth: {
            value: 25,
            period: '今日',
            isPositive: true
          },
          activeUserGrowth: {
            value: todayActiveUsers > 0 ? 5 : -5,
            period: '本周',
            isPositive: todayActiveUsers > 0
          }
        },
        details: {
          users: {
            total: totalUsers,
            active: activeUsers,
            newThisMonth: newUsersThisMonth,
            newThisWeek: newUsersThisWeek,
            todayActive: todayActiveUsers
          },
          articles: {
            total: totalArticles,
            published: publishedArticles,
            draft: draftArticles,
            newThisWeek: newArticlesThisWeek,
            newToday: newArticlesToday
          },
          views: {
            total: totalViews,
            today: todayViews,
            average: totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0
          }
        }
      }
    });

  } catch (error) {
    logger.error('获取仪表板统计数据失败:', error);
    next(error);
  }
});

// 获取最近活动
router.get('/dashboard/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // 获取最近注册的用户
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email createdAt');

    // 获取最近发布的文章
    const recentArticles = await Article.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'username')
      .select('title author createdAt');

    // 构建活动列表
    const activities = [];

    // 添加用户注册活动
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user._id}`,
        type: 'user_register',
        title: '新用户注册',
        description: `用户 "${user.username}" 完成注册`,
        createdAt: user.createdAt,
        user: {
          username: user.username,
          avatar: ''
        }
      });
    });

    // 添加文章发布活动
    recentArticles.forEach(article => {
      activities.push({
        id: `article_${article._id}`,
        type: 'article_publish',
        title: '文章发布',
        description: `文章 "${article.title}" 已发布`,
        createdAt: article.createdAt,
        user: {
          username: article.author?.username || '未知用户',
          avatar: ''
        }
      });
    });

    // 按时间排序并限制数量
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      code: 200,
      message: '获取最近活动成功',
      data: limitedActivities
    });

  } catch (error) {
    logger.error('获取最近活动失败:', error);
    next(error);
  }
});

// 获取系统状态
router.get('/system/status', async (req, res, next) => {
  try {
    // 获取系统信息
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // 检查数据库连接状态
    const mongoose = require('mongoose');
    const databaseStatus = mongoose.connection.readyState === 1 ? 'online' : 'offline';

    // 模拟CPU和磁盘使用率（实际项目中可以使用系统监控库）
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    const diskUsage = Math.floor(Math.random() * 20) + 30; // 30-50%

    res.json({
      code: 200,
      message: '获取系统状态成功',
      data: {
        serverStatus: 'online',
        databaseStatus,
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal
        },
        cpuUsage,
        diskUsage,
        nodeVersion: process.version
      }
    });

  } catch (error) {
    logger.error('获取系统状态失败:', error);
    next(error);
  }
});

// 获取用户列表
router.get('/users', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      role = '',
      startDate = '',
      endDate = '',
      lastLoginStart = '',
      lastLoginEnd = '',
      sortField = 'createdAt',
      sortOrder = 'desc',
      emailDomain = '',
      minLoginCount = '',
      searchFields = 'username,email'
    } = req.query;

    // 构建查询条件
    const query = {};

    // 关键词搜索
    if (search) {
      const fields = searchFields.split(',');
      const searchConditions = [];

      fields.forEach(field => {
        if (field === 'username') {
          searchConditions.push({ username: { $regex: search, $options: 'i' } });
        } else if (field === 'email') {
          searchConditions.push({ email: { $regex: search, $options: 'i' } });
        } else if (field === 'bio') {
          searchConditions.push({ bio: { $regex: search, $options: 'i' } });
        }
      });

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      }
    }

    // 状态筛选
    if (status) {
      query.isActive = status === 'active';
    }

    // 角色筛选
    if (role) {
      query.isAdmin = role === 'admin';
    }

    // 注册时间范围
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // 最后登录时间范围
    if (lastLoginStart && lastLoginEnd) {
      query.lastLoginAt = {
        $gte: new Date(lastLoginStart),
        $lte: new Date(lastLoginEnd + 'T23:59:59.999Z')
      };
    }

    // 邮箱域名筛选
    if (emailDomain) {
      query.email = { $regex: emailDomain.replace('@', '\\@') + '$', $options: 'i' };
    }

    // 最少登录次数
    if (minLoginCount && !isNaN(minLoginCount)) {
      query.loginCount = { $gte: parseInt(minLoginCount) };
    }

    // 构建排序条件
    const sortCondition = {};
    const validSortFields = ['createdAt', 'lastLoginAt', 'username', 'email', 'loginCount'];
    const field = validSortFields.includes(sortField) ? sortField : 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    sortCondition[field] = order;

    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 查询用户
    const users = await User.find(query)
      .select('-password')
      .sort(sortCondition)
      .skip(skip)
      .limit(parseInt(limit));

    // 获取总数
    const total = await User.countDocuments(query);

    // 获取统计信息
    const stats = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          adminCount: { $sum: { $cond: ['$isAdmin', 1, 0] } },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    const searchStats = stats.length > 0 ? {
      total: stats[0].totalUsers,
      adminCount: stats[0].adminCount,
      userCount: stats[0].totalUsers - stats[0].adminCount,
      activeCount: stats[0].activeCount,
      inactiveCount: stats[0].totalUsers - stats[0].activeCount
    } : {
      total: 0,
      adminCount: 0,
      userCount: 0,
      activeCount: 0,
      inactiveCount: 0
    };

    res.json({
      code: 200,
      message: '获取用户列表成功',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: searchStats
      }
    });

  } catch (error) {
    logger.error('获取用户列表失败:', error);
    next(error);
  }
});

// 获取用户详情
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取用户的文章统计
    const articleStats = await Article.aggregate([
      { $match: { author: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      published: 0,
      draft: 0,
      total: 0
    };

    articleStats.forEach(stat => {
      stats[stat._id] = stat.count;
      stats.total += stat.count;
    });

    res.json({
      code: 200,
      message: '获取用户详情成功',
      data: {
        user,
        stats
      }
    });

  } catch (error) {
    logger.error('获取用户详情失败:', error);
    next(error);
  }
});

// 更新用户状态
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({
        code: 400,
        message: '状态参数无效'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'toggle_user_status',
      `${status ? '启用' : '禁用'}了用户 ${user.username}`,
      req,
      user._id,
      'User'
    );

    logger.info(`管理员 ${req.user.username} ${status ? '启用' : '禁用'}了用户 ${user.username}`);

    res.json({
      code: 200,
      message: `用户${status ? '启用' : '禁用'}成功`,
      data: user
    });

  } catch (error) {
    logger.error('更新用户状态失败:', error);
    next(error);
  }
});



// 重置用户密码
router.put('/users/:id/password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '新密码长度不能少于6位'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 加密新密码
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(id, { password: hashedPassword });

    // 记录管理员操作
    await ActivityLogger.logPasswordReset(req.user._id, user._id, req);

    logger.info(`管理员 ${req.user.username} 重置了用户 ${user.username} 的密码`);

    res.json({
      code: 200,
      message: '密码重置成功'
    });

  } catch (error) {
    logger.error('重置用户密码失败:', error);
    next(error);
  }
});

// 删除用户
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 防止管理员删除自己
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        code: 400,
        message: '不能删除自己的账户'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 删除用户的文章
    await Article.deleteMany({ author: id });

    // 删除用户
    await User.findByIdAndDelete(id);

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'delete_user',
      `删除了用户 ${user.username}`,
      req,
      user._id,
      'User'
    );

    logger.info(`管理员 ${req.user.username} 删除了用户 ${user.username}`);

    res.json({
      code: 200,
      message: '用户删除成功'
    });

  } catch (error) {
    logger.error('删除用户失败:', error);
    next(error);
  }
});

// 批量操作用户
router.post('/users/batch', async (req, res, next) => {
  try {
    const { userIds, action, data = {} } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '用户ID列表不能为空'
      });
    }

    // 防止操作自己
    const currentUserId = req.user._id.toString();
    if (userIds.includes(currentUserId)) {
      return res.status(400).json({
        code: 400,
        message: '不能对自己执行批量操作'
      });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: false }
        );
        break;
      case 'delete':
        // 删除用户的文章
        await Article.deleteMany({ author: { $in: userIds } });
        // 删除用户
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      default:
        return res.status(400).json({
          code: 400,
          message: '无效的操作类型'
        });
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      `batch_${action}`,
      `批量${action}了 ${userIds.length} 个用户`,
      req,
      null,
      'User'
    );

    logger.info(`管理员 ${req.user.username} 批量${action}了 ${userIds.length} 个用户`);

    res.json({
      code: 200,
      message: `批量操作成功，影响 ${result.modifiedCount || result.deletedCount} 个用户`,
      data: result
    });

  } catch (error) {
    logger.error('批量操作用户失败:', error);
    next(error);
  }
});



// 创建用户
router.post('/users', async (req, res, next) => {
  try {
    const { username, email, password, bio, isAdmin = false, isActive = true } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名、邮箱和密码不能为空'
      });
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: existingUser.username === username ? '用户名已存在' : '邮箱已存在'
      });
    }

    // 创建新用户
    const newUser = new User({
      username,
      email,
      password,
      bio,
      isAdmin,
      isActive
    });

    await newUser.save();

    // 返回用户信息（不包含密码）
    const userResponse = await User.findById(newUser._id).select('-password');

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'create_user',
      `创建了新用户 ${username}`,
      req,
      newUser._id,
      'User'
    );

    logger.info(`管理员 ${req.user.username} 创建了新用户 ${username}`);

    res.status(201).json({
      code: 201,
      message: '用户创建成功',
      data: userResponse
    });

  } catch (error) {
    logger.error('创建用户失败:', error);
    next(error);
  }
});

// 更新用户信息
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, bio, isAdmin, isActive } = req.body;

    // 防止管理员修改自己的管理员权限
    if (req.user._id.toString() === id && req.user.isAdmin && isAdmin === false) {
      return res.status(400).json({
        code: 400,
        message: '不能取消自己的管理员权限'
      });
    }

    // 检查邮箱是否被其他用户使用
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: id }
      });

      if (existingUser) {
        return res.status(400).json({
          code: 400,
          message: '邮箱已被其他用户使用'
        });
      }
    }

    // 更新用户信息
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'update_user',
      `更新了用户 ${user.username} 的信息`,
      req,
      user._id,
      'User'
    );

    logger.info(`管理员 ${req.user.username} 更新了用户 ${user.username} 的信息`);

    res.json({
      code: 200,
      message: '用户信息更新成功',
      data: user
    });

  } catch (error) {
    logger.error('更新用户信息失败:', error);
    next(error);
  }
});

// 批量导入用户
router.post('/users/import', async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '用户数据不能为空'
      });
    }

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const userData of users) {
      try {
        const { username, email, password, bio, isAdmin = false, isActive = true } = userData;

        // 验证必填字段
        if (!username || !email || !password) {
          results.failed++;
          results.errors.push(`用户 ${username || email} 缺少必填字段`);
          continue;
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({
          $or: [{ username }, { email }]
        });

        if (existingUser) {
          results.skipped++;
          results.errors.push(`用户 ${username} 已存在，跳过`);
          continue;
        }

        // 创建用户
        const newUser = new User({
          username,
          email,
          password,
          bio,
          isAdmin,
          isActive
        });

        await newUser.save();
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push(`创建用户 ${userData.username} 失败: ${error.message}`);
      }
    }

    logger.info(`管理员 ${req.user.username} 批量导入用户，成功: ${results.success}，失败: ${results.failed}，跳过: ${results.skipped}`);

    res.json({
      code: 200,
      message: '批量导入完成',
      data: results
    });

  } catch (error) {
    logger.error('批量导入用户失败:', error);
    next(error);
  }
});

// 获取活动日志
router.get('/activity-log', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = '',
      username = '',
      startTime = '',
      endTime = ''
    } = req.query;

    // 构建查询条件
    const query = {};

    if (type) {
      query.type = type;
    }

    if (username) {
      // 先查找用户ID
      const user = await User.findOne({ username: { $regex: username, $options: 'i' } });
      if (user) {
        query.userId = user._id;
      } else {
        // 如果找不到用户，返回空结果
        return res.json({
          code: 200,
          message: '获取活动日志成功',
          data: {
            activities: [],
            pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 },
            stats: { todayCount: 0, weekCount: 0, activeUsers: 0, totalCount: 0 }
          }
        });
      }
    }

    if (startTime && endTime) {
      query.createdAt = {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      };
    }

    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 查询活动日志
    const activities = await ActivityLog.find(query)
      .populate('userId', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 获取总数
    const total = await ActivityLog.countDocuments(query);

    // 获取统计数据
    const stats = await ActivityLog.getStats();

    res.json({
      code: 200,
      message: '获取活动日志成功',
      data: {
        activities: activities.map(activity => ({
          id: activity._id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          user: activity.userId ? {
            username: activity.userId.username,
            email: activity.userId.email,
            avatar: activity.userId.avatar
          } : null,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          createdAt: activity.createdAt,
          metadata: activity.metadata,
          result: activity.result,
          errorMessage: activity.errorMessage
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats
      }
    });

  } catch (error) {
    logger.error('获取活动日志失败:', error);
    next(error);
  }
});

// 生成模拟活动数据的辅助函数
function generateMockActivities(limit) {
  const activities = [];
  const types = ['user_register', 'user_login', 'article_publish', 'article_edit', 'admin_action', 'system_event'];
  const users = ['admin666', 'user001', 'user002', 'editor001'];

  for (let i = 0; i < limit; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const username = users[Math.floor(Math.random() * users.length)];
    const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    activities.push({
      id: Date.now() + i,
      type,
      title: getActivityTitle(type),
      description: getActivityDescription(type, username),
      user: {
        username,
        avatar: ''
      },
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      createdAt: date.toISOString(),
      metadata: {
        action: type,
        target: 'example',
        details: `${type} performed by ${username}`
      }
    });
  }

  return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getActivityTitle(type) {
  const titles = {
    user_register: '新用户注册',
    user_login: '用户登录',
    article_publish: '发布新文章',
    article_edit: '编辑文章',
    admin_action: '管理员操作',
    system_event: '系统事件'
  };
  return titles[type] || '未知活动';
}

function getActivityDescription(type, username) {
  const descriptions = {
    user_register: `用户 ${username} 完成注册流程`,
    user_login: `用户 ${username} 成功登录系统`,
    article_publish: `用户 ${username} 发布了一篇新文章`,
    article_edit: `用户 ${username} 编辑了文章内容`,
    admin_action: `管理员 ${username} 执行了管理操作`,
    system_event: '系统自动执行的事件'
  };
  return descriptions[type] || '无描述信息';
}

// 生成测试活动数据
router.post('/activity-log/generate', async (req, res, next) => {
  try {
    const { count = 1 } = req.body;

    for (let i = 0; i < count; i++) {
      await generateRealtimeActivity();
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'generate_activity_data',
      `生成了 ${count} 条测试活动数据`,
      req
    );

    res.json({
      code: 200,
      message: `成功生成 ${count} 条活动数据`,
      data: { count }
    });

  } catch (error) {
    logger.error('生成活动数据失败:', error);
    next(error);
  }
});

// 清理测试活动数据
router.delete('/activity-log/test-data', async (req, res, next) => {
  try {
    const deletedCount = await clearTestActivityData();

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'clear_test_activity_data',
      `清理了 ${deletedCount} 条测试活动数据`,
      req
    );

    res.json({
      code: 200,
      message: `成功清理 ${deletedCount} 条测试数据`,
      data: { deletedCount }
    });

  } catch (error) {
    logger.error('清理测试数据失败:', error);
    next(error);
  }
});

// 设置用户角色
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // 验证参数
    const validRoles = ['user', 'blogger', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        code: 400,
        message: '无效的角色类型'
      });
    }

    // 查找用户
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const oldRole = user.role || (user.isAdmin ? 'admin' : 'user');

    // 防止管理员取消自己的管理员权限
    if (req.user._id.toString() === id && user.isAdmin && role !== 'admin') {
      return res.status(400).json({
        code: 400,
        message: '不能取消自己的管理员权限'
      });
    }

    // 设置新角色和权限
    user.setRole(role);

    // 如果设置为admin角色，同时设置isAdmin为true
    if (role === 'admin') {
      user.isAdmin = true;
    } else if (oldRole === 'admin') {
      user.isAdmin = false;
    }

    await user.save();

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'change_user_role',
      `将用户 ${user.username} 的角色从 ${oldRole} 更改为 ${role}`,
      req,
      user._id,
      'User'
    );

    res.json({
      code: 200,
      message: `用户角色已更新为 ${role}`,
      data: {
        userId: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        canPublishBlog: user.canPublishBlog
      }
    });

  } catch (error) {
    logger.error('设置用户角色失败:', error);
    next(error);
  }
});

// 设置用户权限
router.put('/users/:id/permissions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // 验证参数
    const validPermissions = [
      'blog:create', 'blog:edit', 'blog:delete', 'blog:publish',
      'comment:create', 'comment:edit', 'comment:delete',
      'profile:edit', 'file:upload'
    ];

    if (!Array.isArray(permissions) ||
        !permissions.every(p => validPermissions.includes(p))) {
      return res.status(400).json({
        code: 400,
        message: '无效的权限列表'
      });
    }

    // 查找用户
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const oldPermissions = [...user.permissions];
    user.permissions = permissions;
    await user.save();

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'update_user_permissions',
      `更新了用户 ${user.username} 的权限`,
      req,
      user._id,
      'User'
    );

    res.json({
      code: 200,
      message: '用户权限已更新',
      data: {
        userId: user._id,
        username: user.username,
        oldPermissions,
        newPermissions: user.permissions,
        canPublishBlog: user.canPublishBlog
      }
    });

  } catch (error) {
    logger.error('设置用户权限失败:', error);
    next(error);
  }
});

// 获取已删除的文章列表
router.get('/articles/deleted', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const articles = await Article.findDeleted()
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'username avatar')
      .populate('deletedBy', 'username');

    const total = await Article.countDocuments({ isDeleted: true });

    res.json({
      code: 200,
      message: '获取已删除文章列表成功',
      data: {
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    logger.error('获取已删除文章列表失败:', error);
    next(error);
  }
});

// 恢复已删除的文章
router.put('/articles/:id/restore', async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    if (!article.isDeleted) {
      return res.status(400).json({
        code: 400,
        message: '文章未被删除'
      });
    }

    await article.restore();

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'restore_article',
      `恢复了文章 "${article.title}"`,
      req,
      article._id,
      'Article'
    );

    res.json({
      code: 200,
      message: '文章恢复成功',
      data: article
    });

  } catch (error) {
    logger.error('恢复文章失败:', error);
    next(error);
  }
});

// 管理员获取所有文章列表
router.get('/articles', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      authorId,
      search,
      startDate,
      endDate,
      timeType = 'created'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    // 状态筛选
    if (status === 'deleted') {
      // 只查看已删除的文章
      query.isDeleted = true;
    } else if (status && ['draft', 'published', 'archived'].includes(status)) {
      // 查看特定状态的未删除文章
      query.status = status;
      query.isDeleted = { $ne: true };
    } else {
      // 默认排除已删除的文章（查看全部时）
      query.isDeleted = { $ne: true };
    }

    // 作者筛选
    if (authorId) {
      query.authorId = authorId;
    }

    // 搜索
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    // 时间筛选
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // 设置结束时间为当天的23:59:59
      end.setHours(23, 59, 59, 999);

      const timeField = timeType === 'created' ? 'createdAt' : 'updatedAt';
      query[timeField] = {
        $gte: start,
        $lte: end
      };
    }

    // 根据时间筛选类型决定排序字段
    const sortField = timeType === 'created' ? 'createdAt' : 'updatedAt';
    const sortOrder = {};
    sortOrder[sortField] = -1;

    const articles = await Article.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'username avatar');

    const total = await Article.countDocuments(query);

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    logger.error('获取文章列表失败:', error);
    next(error);
  }
});

// 永久删除文章
router.delete('/articles/:id/permanent', async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'permanent_delete_article',
      `永久删除了文章 "${article.title}"`,
      req,
      article._id,
      'Article'
    );

    // 永久删除文章
    await Article.findByIdAndDelete(id);

    res.json({
      code: 200,
      message: '文章永久删除成功'
    });

  } catch (error) {
    logger.error('永久删除文章失败:', error);
    next(error);
  }
});

// ==================== 系统设置相关 API ====================

// 设置数据验证函数
function validateSettingsData(type, data) {
  switch (type) {
    case 'site':
      // 网站设置验证 - 移除必填验证，允许空值
      if (data.name !== undefined && typeof data.name !== 'string') {
        return '网站名称必须是字符串';
      }
      if (data.description !== undefined && typeof data.description !== 'string') {
        return '网站描述必须是字符串';
      }
      if (data.email !== undefined && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return '邮箱格式不正确';
      }
      break;

    case 'personal':
      // 个人信息验证
      if (data.bio !== undefined && typeof data.bio !== 'string') {
        return '个人简介必须是字符串';
      }
      if (data.email !== undefined && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return '邮箱格式不正确';
      }
      break;

    case 'blog':
      // 博客设置验证
      if (data.pageSize !== undefined && (!Number.isInteger(data.pageSize) || data.pageSize < 1 || data.pageSize > 100)) {
        return '每页文章数必须是1-100之间的整数';
      }
      break;
  }

  return null; // 验证通过
}

// 获取所有设置
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await Settings.getAllSettings();

    res.json({
      code: 200,
      message: '获取设置成功',
      data: settings
    });

  } catch (error) {
    logger.error('获取设置失败:', error);
    next(error);
  }
});

// 获取特定类型的设置
router.get('/settings/:type', async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!['site', 'personal', 'blog'].includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '无效的设置类型'
      });
    }

    const data = await Settings.getSetting(type);

    res.json({
      code: 200,
      message: '获取设置成功',
      data
    });

  } catch (error) {
    logger.error('获取设置失败:', error);
    next(error);
  }
});

// 更新设置
router.put('/settings/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const data = req.body;

    if (!['site', 'personal', 'blog'].includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '无效的设置类型'
      });
    }

    // 验证设置数据
    const validationError = validateSettingsData(type, data);
    if (validationError) {
      return res.status(400).json({
        code: 400,
        message: validationError
      });
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'update_settings',
      `更新了${type}设置`,
      req,
      null,
      'Settings'
    );

    const setting = await Settings.updateSetting(type, data, req.user._id);

    res.json({
      code: 200,
      message: '设置更新成功',
      data: setting.data
    });

  } catch (error) {
    logger.error('更新设置失败:', error);
    next(error);
  }
});

// 批量更新设置
router.put('/settings', async (req, res, next) => {
  try {
    const updates = req.body;
    const results = {};

    // 验证所有类型
    for (const type in updates) {
      if (!['site', 'personal', 'blog'].includes(type)) {
        return res.status(400).json({
          code: 400,
          message: `无效的设置类型: ${type}`
        });
      }
    }

    // 批量更新
    for (const type in updates) {
      const setting = await Settings.updateSetting(type, updates[type], req.user._id);
      results[type] = setting.data;
    }

    // 记录管理员操作
    await ActivityLogger.logAdminAction(
      req.user._id,
      'batch_update_settings',
      `批量更新了系统设置`,
      req,
      null,
      'Settings'
    );

    res.json({
      code: 200,
      message: '设置批量更新成功',
      data: results
    });

  } catch (error) {
    logger.error('批量更新设置失败:', error);
    next(error);
  }
});

module.exports = router;
