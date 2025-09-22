const User = require('../models/User');
const logger = require('./logger');

// 默认超级管理员配置（固定账号，确保数据持久化）
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@godaug.fun',
  username: process.env.ADMIN_USERNAME || 'godaug_admin',
  password: process.env.ADMIN_PASSWORD || 'GodAug2024Admin',
  displayName: '超级管理员',
  bio: '系统默认超级管理员账户'
};

/**
 * 确保存在一个管理员账户；如不存在则创建/升级
 */
const ensureDefaultAdmin = async () => {
  try {
    // 查找现有的管理员
    let user = await User.findOne({
      $or: [
        { username: DEFAULT_ADMIN.username },
        { email: DEFAULT_ADMIN.email }
      ]
    }).select('+password');

    if (user) {
      // 更新现有管理员的密码和信息
      user.password = DEFAULT_ADMIN.password; // 将在pre('save')中被加密
      user.isAdmin = true;
      user.isActive = true;
      user.emailVerified = true;
      user.role = 'admin';
      user.displayName = DEFAULT_ADMIN.displayName;
      user.bio = DEFAULT_ADMIN.bio;

      logger.info('更新现有管理员账户');
    } else {
      // 创建新的超级管理员
      user = new User({
        username: DEFAULT_ADMIN.username,
        displayName: DEFAULT_ADMIN.displayName,
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password, // 将在pre('save')中被加密
        bio: DEFAULT_ADMIN.bio,
        isAdmin: true,
        isActive: true,
        emailVerified: true,
        role: 'admin'
      });

      logger.info('创建新的管理员账户');
    }

    // 设置角色为admin（会自动分配权限）
    if (typeof user.setRole === 'function') {
      user.setRole('admin');
    }

    await user.save();

    // 输出创建成功信息
    logger.info(`🎉 超级管理员创建/更新成功！`);
    logger.info(`📧 邮箱: ${user.email}`);
    logger.info(`👤 用户名: ${user.username}`);
    logger.info(`🔑 密码: ${DEFAULT_ADMIN.password}`);
    logger.warn(`⚠️  请及时修改默认密码！`);

    // 验证密码是否正确设置
    const savedUser = await User.findById(user._id).select('+password');
    if (savedUser && savedUser.password) {
      logger.info('✅ 密码已正确加密并保存');
    } else {
      logger.error('❌ 密码保存失败');
    }

    return user;
  } catch (error) {
    logger.error('创建/更新默认管理员失败:', error);
    return null;
  }
};

/**
 * 初始化管理员：确保默认管理员存在
 */
const initDefaultAdmin = async () => {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    logger.error('初始化管理员失败:', error);
  }
};

module.exports = {
  initDefaultAdmin
};
