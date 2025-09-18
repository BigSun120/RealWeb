const User = require('../models/User');
const logger = require('./logger');

/**
 * 检查并创建管理员账户（仅在不存在时创建）
 */
const ensureAdminExists = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    // 查找管理员账户
    const admin = await User.findOne({
      $or: [
        { email: adminEmail },
        { isAdmin: true }
      ]
    });

    if (!admin) {
      logger.info('未找到管理员账户，将创建新的管理员');
      await createNewAdmin();
    } else {
      logger.info(`管理员账户已存在: ${admin.username}`);
    }
  } catch (error) {
    logger.error('检查管理员账户失败:', error);
  }
};

/**
 * 创建新的管理员账户
 */
const createNewAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const adminUsername = process.env.ADMIN_USERNAME || 'ad666';

    const admin = new User({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      isAdmin: true,
      bio: '网站管理员'
    });

    await admin.save();
    logger.info(`新管理员账户创建成功: ${adminEmail}`);
  } catch (error) {
    logger.error('创建管理员账户失败:', error);
  }
};

/**
 * 强制重置管理员密码
 */
const forceResetAdminPassword = async () => {
  try {
    const newPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    // 只重置指定的管理员账户密码，避免重置不需要的账户
    const targetAdminUsername = process.env.ADMIN_USERNAME || 'ad666';
    const admin = await User.findOne({
      username: targetAdminUsername,
      isAdmin: true
    });

    if (admin) {
      admin.password = newPassword;
      await admin.save();
      logger.info(`管理员 ${admin.username} 密码已强制重置为: ${newPassword}`);
    } else {
      logger.warn(`未找到指定的管理员账户: ${targetAdminUsername}`);
    }
  } catch (error) {
    logger.error('重置管理员密码失败:', error);
  }
};

/**
 * 清理不需要的管理员账户（每次启动都执行）
 */
const cleanupUnwantedAdmins = async () => {
  try {
    const targetAdminUsername = process.env.ADMIN_USERNAME || 'ad666';

    // 删除除了目标管理员之外的其他管理员账户
    const result = await User.deleteMany({
      isAdmin: true,
      username: { $ne: targetAdminUsername }
    });

    if (result.deletedCount > 0) {
      logger.info(`已清理 ${result.deletedCount} 个不需要的管理员账户`);
    }
  } catch (error) {
    logger.error('清理管理员账户失败:', error);
  }
};

/**
 * 初始化默认管理员账户
 */
const initDefaultAdmin = async () => {
  try {
    // 清理不需要的管理员账户（一次性执行）
    await cleanupUnwantedAdmins();

    // 检查并创建管理员账户（仅在不存在时创建）
    await ensureAdminExists();

    // 强制重置管理员密码（每次启动都执行）
    await forceResetAdminPassword();
  } catch (error) {
    logger.error('初始化管理员账户失败:', error);
  }
};

module.exports = {
  initDefaultAdmin
};
