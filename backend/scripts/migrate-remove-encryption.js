/**
 * 数据库迁移脚本：将加密的API密钥迁移为明文存储
 * 
 * 警告：此脚本会解密所有现有的API密钥并转换为明文存储
 * 请在生产环境使用前做好备份！
 * 
 * 运行方式：node scripts/migrate-remove-encryption.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realweb');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 解密函数（与旧代码一致）
const decryptApiKey = (apiKeyEncrypted) => {
  try {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_SECRET || 'default-32-char-secret-key-here!';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const parts = apiKeyEncrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
};

// 迁移函数
const migrateConnections = async () => {
  console.log('🚀 开始迁移 PublicAIConnection...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('publicaiconnections');
  
  // 查找所有有 apiKeyEncrypted 字段的文档
  const docs = await collection.find({ apiKeyEncrypted: { $exists: true } }).toArray();
  
  console.log(`📊 找到 ${docs.length} 条需要迁移的记录`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const doc of docs) {
    try {
      // 解密密钥
      const decryptedKey = decryptApiKey(doc.apiKeyEncrypted);
      
      if (decryptedKey) {
        // 更新文档：添加 apiKey 字段，删除 apiKeyEncrypted 和 apiKeyMask
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: { apiKey: decryptedKey },
            $unset: { apiKeyEncrypted: '', apiKeyMask: '' }
          }
        );
        
        successCount++;
        console.log(`✅ [${successCount}/${docs.length}] 迁移成功: ${doc.name}`);
      } else {
        failCount++;
        console.error(`❌ [${failCount}] 解密失败: ${doc.name} (ID: ${doc._id})`);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ [${failCount}] 迁移失败: ${doc.name}`, error.message);
    }
  }
  
  console.log('\n📈 迁移完成统计:');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${failCount}`);
  console.log(`  📊 总计: ${docs.length}`);
};

// 主函数
const main = async () => {
  console.log('='.repeat(50));
  console.log('🔄 PublicAIConnection 密钥迁移脚本');
  console.log('='.repeat(50));
  console.log('');
  
  await connectDB();
  
  console.log('⚠️  警告：此操作将解密所有API密钥并转换为明文存储');
  console.log('⚠️  请确保已备份数据库！');
  console.log('');
  
  // 等待3秒给用户反应时间
  console.log('⏳ 3秒后开始迁移...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await migrateConnections();
    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行主函数
main();
