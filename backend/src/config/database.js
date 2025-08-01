const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info(`MongoDB 连接成功: ${conn.connection.host}`);

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB 连接断开');
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB 连接已关闭');
      process.exit(0);
    });

  } catch (error) {
    logger.error('MongoDB 连接失败:', error);
    logger.warn('将在无数据库模式下运行，部分功能可能不可用');
    // 不退出进程，允许应用继续运行
  }
};

module.exports = connectDB;
