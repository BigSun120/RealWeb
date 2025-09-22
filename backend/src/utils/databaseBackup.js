const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * 数据库备份工具
 */
class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/root/backups';
    this.mongoUri = process.env.MONGODB_URI;
  }

  /**
   * 创建数据库备份
   */
  async createBackup(reason = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${reason}_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // 确保备份目录存在
      await fs.mkdir(this.backupDir, { recursive: true });

      logger.info(`开始创建数据库备份: ${backupName}`);

      // 使用Docker执行mongodump
      const command = `docker exec mongodb mongodump --out /data/backup/${backupName}`;
      
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error('数据库备份失败:', error);
            reject(error);
            return;
          }

          logger.info(`数据库备份成功: ${backupName}`);
          logger.info('备份输出:', stdout);
          
          resolve({
            backupName,
            backupPath,
            timestamp: new Date(),
            reason
          });
        });
      });
    } catch (error) {
      logger.error('创建数据库备份失败:', error);
      throw error;
    }
  }

  /**
   * 在系统启动前自动备份
   */
  async autoBackupBeforeStart() {
    try {
      // 检查是否需要备份
      const User = require('../models/User');
      const userCount = await User.countDocuments();
      
      if (userCount > 0) {
        logger.info('检测到现有数据，创建启动前备份...');
        await this.createBackup('before_start');
      } else {
        logger.info('数据库为空，跳过启动前备份');
      }
    } catch (error) {
      logger.warn('启动前备份失败:', error.message);
      // 不抛出错误，允许系统继续启动
    }
  }

  /**
   * 清理旧备份
   */
  async cleanOldBackups(keepDays = 7) {
    try {
      const command = `find ${this.backupDir} -name "backup_*" -mtime +${keepDays} -type d -exec rm -rf {} +`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.warn('清理旧备份失败:', error.message);
          return;
        }
        logger.info('旧备份清理完成');
      });
    } catch (error) {
      logger.warn('清理旧备份失败:', error.message);
    }
  }
}

module.exports = new DatabaseBackup();
