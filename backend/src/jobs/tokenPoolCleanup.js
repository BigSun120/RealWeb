const cron = require('node-cron')
const TokenPool = require('../models/TokenPool')
const logger = require('../utils/logger')

// 每天凌晨2点执行清理任务
const scheduleTokenPoolCleanup = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('开始执行令牌池清理任务')
      
      // 清理过期令牌
      const expiredResult = await TokenPool.cleanupExpired()
      logger.info(`清理了 ${expiredResult.modifiedCount} 个过期令牌`)
      
      // 删除超过30天的无效令牌记录
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const deleteResult = await TokenPool.deleteMany({
        status: { $in: ['expired', 'invalid'] },
        updatedAt: { $lt: thirtyDaysAgo }
      })
      
      logger.info(`删除了 ${deleteResult.deletedCount} 个过期的无效令牌记录`)
      
      // 统计当前池子状态
      const stats = await TokenPool.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
      
      const statusStats = {}
      stats.forEach(stat => {
        statusStats[stat._id] = stat.count
      })
      
      logger.info('令牌池清理完成', {
        expiredCleaned: expiredResult.modifiedCount,
        recordsDeleted: deleteResult.deletedCount,
        currentStats: statusStats
      })
      
    } catch (error) {
      logger.error('令牌池清理任务失败:', error)
    }
  }, {
    timezone: 'Asia/Shanghai'
  })
  
  logger.info('令牌池清理任务已启动，每天凌晨2点执行')
}

// 手动执行清理（用于测试）
const manualCleanup = async () => {
  try {
    logger.info('手动执行令牌池清理')
    
    const expiredResult = await TokenPool.cleanupExpired()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const deleteResult = await TokenPool.deleteMany({
      status: { $in: ['expired', 'invalid'] },
      updatedAt: { $lt: thirtyDaysAgo }
    })
    
    return {
      expiredCleaned: expiredResult.modifiedCount,
      recordsDeleted: deleteResult.deletedCount
    }
  } catch (error) {
    logger.error('手动清理失败:', error)
    throw error
  }
}

module.exports = {
  scheduleTokenPoolCleanup,
  manualCleanup
}
