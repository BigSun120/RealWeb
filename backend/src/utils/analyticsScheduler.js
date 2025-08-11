const cron = require('node-cron');
const ToolUsage = require('../models/ToolUsage');
const Tool = require('../models/Tool');
const ToolCategory = require('../models/ToolCategory');
const ToolConfig = require('../models/ToolConfig');
const logger = require('./logger');

/**
 * 工具箱分析定时任务调度器
 */
class AnalyticsScheduler {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * 启动所有定时任务
   */
  start() {
    if (this.isRunning) {
      logger.warn('分析调度器已在运行中');
      return;
    }

    logger.info('启动工具箱分析定时任务...');

    // 每小时更新工具使用统计
    this.scheduleTask('hourly-stats', '0 * * * *', this.updateHourlyStats.bind(this));

    // 每天凌晨2点清理过期数据
    this.scheduleTask('daily-cleanup', '0 2 * * *', this.cleanupExpiredData.bind(this));

    // 每天凌晨3点生成日报
    this.scheduleTask('daily-report', '0 3 * * *', this.generateDailyReport.bind(this));

    // 每周一凌晨4点生成周报
    this.scheduleTask('weekly-report', '0 4 * * 1', this.generateWeeklyReport.bind(this));

    // 每月1号凌晨5点生成月报
    this.scheduleTask('monthly-report', '0 5 1 * *', this.generateMonthlyReport.bind(this));

    // 每10分钟更新工具热度排行
    this.scheduleTask('update-rankings', '*/10 * * * *', this.updateToolRankings.bind(this));

    this.isRunning = true;
    logger.info('工具箱分析定时任务启动完成');
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('停止工具箱分析定时任务...');

    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`已停止任务: ${name}`);
    });

    this.tasks.clear();
    this.isRunning = false;
    logger.info('工具箱分析定时任务已停止');
  }

  /**
   * 调度单个任务
   */
  scheduleTask(name, cronExpression, taskFunction) {
    try {
      const task = cron.schedule(cronExpression, async () => {
        try {
          logger.info(`开始执行任务: ${name}`);
          await taskFunction();
          logger.info(`任务执行完成: ${name}`);
        } catch (error) {
          logger.error(`任务执行失败: ${name}`, error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      task.start();
      this.tasks.set(name, task);
      logger.info(`已调度任务: ${name} (${cronExpression})`);
    } catch (error) {
      logger.error(`调度任务失败: ${name}`, error);
    }
  }

  /**
   * 更新小时统计
   */
  async updateHourlyStats() {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    try {
      // 统计本小时的使用数据
      const hourlyStats = await ToolUsage.aggregate([
        {
          $match: {
            createdAt: { $gte: hourStart, $lt: hourEnd }
          }
        },
        {
          $group: {
            _id: '$toolIdentifier',
            usageCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgResponseTime: { $avg: '$responseTime' },
            successRate: { $avg: { $cond: ['$success', 1, 0] } }
          }
        }
      ]);

      // 更新工具统计
      for (const stat of hourlyStats) {
        await Tool.findOneAndUpdate(
          { id: stat._id },
          {
            $inc: { usageCount: stat.usageCount },
            lastUsedAt: now
          }
        );
      }

      logger.info(`小时统计更新完成，处理了 ${hourlyStats.length} 个工具的数据`);
    } catch (error) {
      logger.error('更新小时统计失败:', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData() {
    try {
      // 获取数据保留天数配置
      const retentionDays = await ToolConfig.getValue('analytics.retentionDays', 90);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // 删除过期的使用记录
      const deleteResult = await ToolUsage.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      logger.info(`清理过期数据完成，删除了 ${deleteResult.deletedCount} 条记录`);
    } catch (error) {
      logger.error('清理过期数据失败:', error);
    }
  }

  /**
   * 生成日报
   */
  async generateDailyReport() {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // 统计昨日数据
      const dailyStats = await this.generatePeriodStats(startOfDay, endOfDay);
      
      // 保存报告（可以存储到数据库或发送邮件）
      logger.info('日报生成完成:', {
        date: yesterday.toISOString().split('T')[0],
        totalUsage: dailyStats.totalUsage,
        uniqueUsers: dailyStats.uniqueUsers,
        topTools: dailyStats.topTools.slice(0, 5)
      });

    } catch (error) {
      logger.error('生成日报失败:', error);
    }
  }

  /**
   * 生成周报
   */
  async generateWeeklyReport() {
    try {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weeklyStats = await this.generatePeriodStats(lastWeek, today);
      
      logger.info('周报生成完成:', {
        period: `${lastWeek.toISOString().split('T')[0]} - ${today.toISOString().split('T')[0]}`,
        totalUsage: weeklyStats.totalUsage,
        uniqueUsers: weeklyStats.uniqueUsers,
        topTools: weeklyStats.topTools.slice(0, 10)
      });

    } catch (error) {
      logger.error('生成周报失败:', error);
    }
  }

  /**
   * 生成月报
   */
  async generateMonthlyReport() {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const monthlyStats = await this.generatePeriodStats(lastMonth, thisMonth);
      
      logger.info('月报生成完成:', {
        period: `${lastMonth.toISOString().split('T')[0]} - ${thisMonth.toISOString().split('T')[0]}`,
        totalUsage: monthlyStats.totalUsage,
        uniqueUsers: monthlyStats.uniqueUsers,
        topTools: monthlyStats.topTools.slice(0, 20)
      });

    } catch (error) {
      logger.error('生成月报失败:', error);
    }
  }

  /**
   * 更新工具热度排行
   */
  async updateToolRankings() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 计算24小时内的工具热度
      const rankings = await ToolUsage.aggregate([
        {
          $match: {
            createdAt: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: '$toolIdentifier',
            usageCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgResponseTime: { $avg: '$responseTime' }
          }
        },
        {
          $project: {
            toolIdentifier: '$_id',
            usageCount: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            avgResponseTime: 1,
            // 热度计算：使用次数 * 0.6 + 独立用户数 * 0.4
            hotScore: {
              $add: [
                { $multiply: ['$usageCount', 0.6] },
                { $multiply: [{ $size: '$uniqueUsers' }, 0.4] }
              ]
            },
            _id: 0
          }
        },
        { $sort: { hotScore: -1 } },
        { $limit: 100 }
      ]);

      // 更新工具的热度排名
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        await Tool.findOneAndUpdate(
          { id: ranking.toolIdentifier },
          {
            $set: {
              'metadata.hotScore': ranking.hotScore,
              'metadata.ranking': i + 1,
              'metadata.lastRankingUpdate': new Date()
            }
          }
        );
      }

      logger.info(`工具热度排行更新完成，处理了 ${rankings.length} 个工具`);
    } catch (error) {
      logger.error('更新工具热度排行失败:', error);
    }
  }

  /**
   * 生成指定时间段的统计数据
   */
  async generatePeriodStats(startDate, endDate) {
    const stats = await ToolUsage.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgResponseTime: { $avg: '$responseTime' },
          successRate: { $avg: { $cond: ['$success', 1, 0] } }
        }
      }
    ]);

    const topTools = await ToolUsage.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$toolIdentifier',
          usageCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          toolIdentifier: '$_id',
          usageCount: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          _id: 0
        }
      },
      { $sort: { usageCount: -1 } },
      { $limit: 50 }
    ]);

    return {
      totalUsage: stats[0]?.totalUsage || 0,
      uniqueUsers: stats[0]?.uniqueUsers?.length || 0,
      avgResponseTime: stats[0]?.avgResponseTime || 0,
      successRate: (stats[0]?.successRate || 0) * 100,
      topTools
    };
  }

  /**
   * 获取任务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys())
    };
  }
}

// 创建全局实例
const analyticsScheduler = new AnalyticsScheduler();

module.exports = analyticsScheduler;
