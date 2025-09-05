#!/usr/bin/env node

/**
 * 邮箱验证系统数据库迁移脚本
 * 为现有用户添加邮箱验证相关字段的默认值
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personal_website_dev';

async function migrateEmailVerification() {
  try {
    console.log('🚀 开始邮箱验证系统数据库迁移...');
    
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 查找所有现有用户
    const existingUsers = await User.find({});
    console.log(`📊 找到 ${existingUsers.length} 个现有用户`);

    if (existingUsers.length === 0) {
      console.log('ℹ️  没有现有用户需要迁移');
      return;
    }

    // 统计需要更新的用户
    const usersNeedingUpdate = existingUsers.filter(user => 
      user.emailVerified === undefined || 
      user.emailVerified === null
    );

    console.log(`🔄 需要更新 ${usersNeedingUpdate.length} 个用户的邮箱验证状态`);

    if (usersNeedingUpdate.length === 0) {
      console.log('✅ 所有用户已经有邮箱验证状态，无需迁移');
      return;
    }

    // 批量更新现有用户的邮箱验证状态
    const updateResult = await User.updateMany(
      {
        $or: [
          { emailVerified: { $exists: false } },
          { emailVerified: null }
        ]
      },
      {
        $set: {
          emailVerified: true, // 现有用户默认为已验证
          emailVerifiedAt: new Date() // 设置验证时间为当前时间
        }
      }
    );

    console.log(`✅ 成功更新 ${updateResult.modifiedCount} 个用户的邮箱验证状态`);

    // 验证更新结果
    const verifiedCount = await User.countDocuments({ emailVerified: true });
    const unverifiedCount = await User.countDocuments({ emailVerified: false });
    
    console.log('📊 迁移后统计:');
    console.log(`   - 已验证用户: ${verifiedCount}`);
    console.log(`   - 未验证用户: ${unverifiedCount}`);

    console.log('🎉 邮箱验证系统数据库迁移完成！');

  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateEmailVerification()
    .then(() => {
      console.log('✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = migrateEmailVerification;
