#!/usr/bin/env node

/**
 * 同步管理员标记脚本
 * 遍历用户表，将 role === "admin" 但 isAdmin 未设置为 true 的记录修正
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error('未找到 MongoDB 连接字符串，请在环境变量或 .env 文件中配置 MONGODB_URI');
  process.exit(1);
}
process.env.MONGODB_URI = mongoUri;

const connectDB = require('../config/database');

(async () => {
  try {
    await connectDB();
    const User = require('../models/User');

    const result = await User.updateMany(
      {
        role: 'admin',
        isAdmin: { $ne: true }
      },
      {
        $set: { isAdmin: true }
      }
    );

    const updated = result.modifiedCount ?? result.nModified ?? 0;
    console.log(`管理员标记已同步，修正记录数: ${updated}`);
  } catch (error) {
    console.error('同步管理员标记失败:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
})();
