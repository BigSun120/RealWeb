const express = require('express');
const path = require('path');
const baseUploadDir = path.resolve(
  process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
);
const { auth } = require('../middleware/auth');
const { uploadAvatar, handleUploadError, deleteFile } = require('../middleware/upload');
const SecurityConfig = require('../models/SecurityConfig');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// 密码验证函数
function validatePasswordByConfig(password, rules, user = null) {
  const errors = [];

  // 长度检查
  if (password.length < rules.minLength) {
    errors.push(`密码长度至少需要${rules.minLength}位`);
  }

  // 大写字母检查
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }

  // 小写字母检查
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }

  // 数字检查
  if (rules.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('密码必须包含数字');
  }

  // 特殊字符检查
  if (rules.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  }

  // 常见密码检查
  if (rules.forbidCommon && isCommonPassword(password)) {
    errors.push('不能使用常见密码');
  }

  // 个人信息检查
  if (rules.forbidPersonalInfo && user && containsPersonalInfo(password, user)) {
    errors.push('密码不能包含个人信息');
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : '密码符合要求',
    errors
  };
}

// 检查是否为常见密码
function isCommonPassword(password) {
  const commonPasswords = [
    '123456',
    'password',
    '123456789',
    '12345678',
    '12345',
    '1234567',
    '1234567890',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'root',
    '000000',
    '111111',
    '888888',
    '666666',
    '123123',
    'aaaaaa',
    'qwerty123',
    'welcome',
    'login',
    'master',
    'hello',
    'freedom',
    'whatever',
    'qazwsx'
  ];

  return commonPasswords.includes(password.toLowerCase());
}

// 检查是否包含个人信息
function containsPersonalInfo(password, user) {
  const personalInfo = [
    user.username?.toLowerCase(),
    user.email?.split('@')[0]?.toLowerCase(),
    user.firstName?.toLowerCase(),
    user.lastName?.toLowerCase()
  ].filter(Boolean);

  const lowerPassword = password.toLowerCase();

  return personalInfo.some(info => info.length >= 3 && lowerPassword.includes(info));
}

// 搜索用户（用于@功能）
router.get('/search', auth, async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const searchTerm = q.trim();

    let query = { isActive: true };

    // 如果有搜索词，则按展示名或用户名搜索；否则返回所有活跃用户
    if (searchTerm) {
      const regex = { $regex: searchTerm, $options: 'i' };
      query.$or = [{ displayName: regex }, { username: regex }];
    }

    // 搜索用户名或展示名匹配的用户
    const users = await User.find(query)
      .select('username displayName avatar bio')
      .limit(parseInt(limit))
      .sort({ username: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索用户失败'
    });
  }
});

// 获取用户资料
router.get('/profile', auth, async (req, res, next) => {
  try {
    // 获取用户的完整信息（包含邮箱）
    const userProfile = req.user.toJSON();

    res.json({
      code: 200,
      message: '获取用户资料成功',
      data: userProfile
    });
  } catch (error) {
    next(error);
  }
});

// 更新用户资料
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { username, displayName, email, bio, avatar } = req.body;
    const user = req.user;

    if (username && username !== user.username) {
      const User = require('../models/User');
      const usernameExists = await User.isUsernameTaken(username, user._id);
      if (usernameExists) {
        return res.status(400).json({
          code: 400,
          message: '用户名已被使用'
        });
      }
      user.username = username;
    }

    if (displayName !== undefined) {
      // 检查展示名唯一性（允许空字符串）
      if (displayName) {
        const User = require('../models/User');
        const exists = await User.findOne({ displayName, _id: { $ne: user._id } });
        if (exists) {
          return res.status(400).json({ code: 400, message: '展示名已被使用' });
        }
      }
      user.displayName = displayName;
    }

    // 处理邮箱更新
    if (email && email !== user.email) {
      // 检查邮箱是否已被使用
      const User = require('../models/User');
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({
          code: 400,
          message: '邮箱已被使用'
        });
      }

      // 更新邮箱并重置验证状态
      user.email = email.toLowerCase();
      user.emailVerified = false;
      user.emailVerifiedAt = null;
      // 清除旧的验证令牌
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      code: 200,
      message: '更新用户资料成功',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// 上传头像
router.post('/avatar', auth, (req, res, next) => {
  uploadAvatar(req, res, async err => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的头像文件'
        });
      }

      const user = req.user;
      const oldAvatar = user.avatar;

      // 构建新头像URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // 更新用户头像
      user.avatar = avatarUrl;
      await user.save();

      // 删除旧头像文件（如果存在且不是默认头像）
      if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
        const oldAvatarPath = path.join(baseUploadDir, oldAvatar.replace(/^\/uploads\//, ''));
        deleteFile(oldAvatarPath);
      }

      logger.info(`用户 ${user.username} 上传头像成功: ${avatarUrl}`);

      res.json({
        code: 200,
        message: '头像上传成功',
        data: {
          avatar: avatarUrl,
          user: user.getPublicProfile()
        }
      });
    } catch (error) {
      // 如果保存失败，删除已上传的文件
      if (req.file) {
        deleteFile(req.file.path);
      }
      next(error);
    }
  });
});

// 删除头像
router.delete('/avatar', auth, async (req, res, next) => {
  try {
    const user = req.user;
    const oldAvatar = user.avatar;

    // 重置为默认头像
    user.avatar = '';
    await user.save();

    // 删除旧头像文件（如果存在且不是默认头像）
    if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
      const oldAvatarPath = path.join(__dirname, '../../', oldAvatar);
      deleteFile(oldAvatarPath);
    }

    logger.info(`用户 ${user.username} 删除头像成功`);

    res.json({
      code: 200,
      message: '头像删除成功',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.put('/password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 重新查询用户，包含密码字段（auth中间件排除了密码字段，User模型默认也排除密码字段）
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    logger.info(`用户 ${user.username} 尝试修改密码`);

    // 获取当前安全配置
    const securityConfig = await SecurityConfig.getActiveConfig();
    const rules = securityConfig.rules;

    // 验证必填字段
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }

    // 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        code: 400,
        message: '新密码和确认密码不一致'
      });
    }

    // 验证新密码不能与当前密码相同
    if (currentPassword === newPassword) {
      return res.status(400).json({
        code: 400,
        message: '新密码不能与当前密码相同'
      });
    }

    // 根据安全配置验证密码强度
    const passwordValidation = validatePasswordByConfig(newPassword, rules, user);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        code: 400,
        message: passwordValidation.message
      });
    }

    // 验证当前密码是否正确
    try {
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          code: 400,
          message: '当前密码不正确'
        });
      }
    } catch (error) {
      logger.error('密码验证错误:', error);
      return res.status(400).json({
        code: 400,
        message: '密码验证失败，请检查输入'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    logger.info(`用户 ${user.username} 修改密码成功`);

    res.json({
      code: 200,
      message: '密码修改成功',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    logger.error('密码修改失败:', error);
    next(error);
  }
});

// ==================== 关注功能相关API ====================

const Follow = require('../models/Follow');

// 获取用户公开信息（包含关注统计）
router.get('/:userId/profile', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 获取用户基本信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取关注统计
    const stats = await Follow.getFollowStats(userId);

    // 获取公开信息
    const publicProfile = user.getPublicProfile();

    // 添加统计信息
    publicProfile.followingCount = stats.followingCount;
    publicProfile.followersCount = stats.followersCount;

    res.json({
      code: 200,
      message: '获取用户信息成功',
      data: publicProfile
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    next(error);
  }
});

// 关注/取消关注用户
router.post('/:userId/follow', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;
    const { source = 'profile' } = req.body;

    // 验证目标用户是否存在
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 防止关注自己
    if (followerId.toString() === userId) {
      return res.status(400).json({
        code: 400,
        message: '不能关注自己'
      });
    }

    // 切换关注状态
    const result = await Follow.toggleFollow(followerId, userId, req.ip, source);

    res.json({
      code: 200,
      message: result.message,
      data: {
        action: result.action,
        isFollowing: result.isFollowing,
        targetUserId: userId
      }
    });
  } catch (error) {
    logger.error('关注操作失败:', error);
    next(error);
  }
});

// 检查关注状态
router.get('/:userId/follow-status', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    const isFollowing = await Follow.isFollowing(followerId, userId);

    res.json({
      code: 200,
      message: '获取关注状态成功',
      data: {
        isFollowing: !!isFollowing,
        targetUserId: userId
      }
    });
  } catch (error) {
    logger.error('获取关注状态失败:', error);
    next(error);
  }
});

// 获取用户的关注列表
router.get('/:userId/following', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 验证用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const following = await Follow.getFollowing(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    });

    const total = await Follow.countDocuments({ followerId: userId });

    res.json({
      code: 200,
      message: '获取关注列表成功',
      data: {
        following: following.map(f => f.following),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('获取关注列表失败:', error);
    next(error);
  }
});

// 获取用户的粉丝列表
router.get('/:userId/followers', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 验证用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const followers = await Follow.getFollowers(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    });

    const total = await Follow.countDocuments({ followingId: userId });

    res.json({
      code: 200,
      message: '获取粉丝列表成功',
      data: {
        followers: followers.map(f => f.follower),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('获取粉丝列表失败:', error);
    next(error);
  }
});

// 获取用户的关注统计
router.get('/:userId/follow-stats', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // 验证用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const stats = await Follow.getFollowStats(userId);

    res.json({
      code: 200,
      message: '获取关注统计成功',
      data: stats
    });
  } catch (error) {
    logger.error('获取关注统计失败:', error);
    next(error);
  }
});

module.exports = router;
