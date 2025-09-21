const User = require('../models/User');
const logger = require('./logger');

/**
 * 检查管理员账户是否存在
 */
const checkAdminExists = async () => {
  try {
    // 查找管理员账户
    const admin = await User.findOne({ isAdmin: true });

    if (admin) {
      logger.info(`管理员账户已存在: ${admin.username}`);
      return true;
    } else {
      logger.warn('未找到管理员账户，请手动创建管理员账户');
      return false;
    }
  } catch (error) {
    logger.error('检查管理员账户失败:', error);
    return false;
  }
};

/**
 * 初始化管理员检查
 */
const initDefaultAdmin = async () => {
  try {
    await checkAdminExists();
  } catch (error) {
    logger.error('初始化管理员检查失败:', error);
  }
};

module.exports = {
  initDefaultAdmin
};
