/**
 * 初始化公告阅读状态数据库
 * 为现有用户创建公告阅读状态记录
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const PublicNotice = require('../models/PublicNotice');
const PublicNoticeRead = require('../models/PublicNoticeRead');

async function initPublicNoticeReadStatus() {
  try {
    console.log('🚀 开始初始化公告阅读状态...');

    // 获取所有用户
    const users = await User.find({}).select('_id').lean();
    console.log(`📊 找到 ${users.length} 个用户`);

    // 获取所有已发布的公告
    const notices = await PublicNotice.find({ published: true }).select('_id createdAt').lean();
    console.log(`📊 找到 ${notices.length} 个已发布的公告`);

    if (users.length === 0 || notices.length === 0) {
      console.log('⚠️  没有用户或公告，跳过初始化');
      return;
    }

    // 检查是否已经有阅读状态记录
    const existingRecords = await PublicNoticeRead.countDocuments();
    if (existingRecords > 0) {
      console.log(`⚠️  已存在 ${existingRecords} 条阅读状态记录，跳过初始化`);
      return;
    }

    // 为每个用户创建对所有公告的阅读状态记录
    const batchSize = 100;
    let totalCreated = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const userBatch = users.slice(i, i + batchSize);
      const records = [];

      for (const user of userBatch) {
        for (const notice of notices) {
          // 默认所有公告都标记为未读
          records.push({
            userId: user._id,
            noticeId: notice._id,
            isRead: false,
            isDismissed: false
          });
        }
      }

      if (records.length > 0) {
        await PublicNoticeRead.insertMany(records, { ordered: false });
        totalCreated += records.length;
        console.log(`✅ 已处理 ${Math.min(i + batchSize, users.length)} / ${users.length} 个用户`);
      }
    }

    console.log(`🎉 初始化完成！共创建 ${totalCreated} 条阅读状态记录`);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const connectDB = require('../config/database');
  
  connectDB().then(async () => {
    try {
      await initPublicNoticeReadStatus();
      console.log('✅ 脚本执行完成');
      process.exit(0);
    } catch (error) {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  });
}

module.exports = initPublicNoticeReadStatus;
