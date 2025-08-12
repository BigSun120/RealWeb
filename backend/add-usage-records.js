const mongoose = require('mongoose');
const Tool = require('./src/models/Tool');
const ToolUsage = require('./src/models/ToolUsage');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal_website_dev');
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}

// 生成随机使用记录
async function addUsageRecords() {
  try {
    await connectDB();
    
    console.log('开始添加使用记录...');
    
    // 获取所有工具
    const tools = await Tool.find({});
    console.log(`找到 ${tools.length} 个工具`);
    
    // 为每个工具添加一些使用记录
    const usageRecords = [];
    const now = new Date();
    
    for (const tool of tools) {
      // 根据工具类型生成不同数量的使用记录
      let recordCount;
      switch (tool.category) {
        case 'text':
          recordCount = Math.floor(Math.random() * 20) + 10; // 10-30次
          break;
        case 'media':
          recordCount = Math.floor(Math.random() * 15) + 5; // 5-20次
          break;
        case 'dev':
          recordCount = Math.floor(Math.random() * 12) + 3; // 3-15次
          break;
        case 'utility':
          recordCount = Math.floor(Math.random() * 18) + 7; // 7-25次
          break;
        case 'image':
          recordCount = Math.floor(Math.random() * 10) + 2; // 2-12次
          break;
        case 'web':
          recordCount = Math.floor(Math.random() * 8) + 1; // 1-9次
          break;
        default:
          recordCount = Math.floor(Math.random() * 5) + 1; // 1-6次
      }
      
      console.log(`为工具 ${tool.name} 生成 ${recordCount} 条记录`);
      
      for (let i = 0; i < recordCount; i++) {
        // 生成过去7天内的随机时间
        const randomDaysAgo = Math.floor(Math.random() * 7);
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        
        const createdAt = new Date(now);
        createdAt.setDate(createdAt.getDate() - randomDaysAgo);
        createdAt.setHours(randomHours, randomMinutes, 0, 0);
        
        // 随机选择操作类型
        const actions = ['view', 'use', 'use', 'use']; // use操作更频繁
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        const usageRecord = {
          toolId: tool._id,
          toolIdentifier: tool.id,
          userId: null, // 匿名用户
          sessionId: `sess_${Math.random().toString(36).substr(2, 9)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          action: action,
          duration: Math.floor(Math.random() * 300) + 10, // 10-310秒
          success: Math.random() > 0.05, // 95%成功率
          responseTime: Math.floor(Math.random() * 1000) + 100, // 100-1100ms
          createdAt: createdAt,
          date: createdAt.toISOString().split('T')[0],
          hour: createdAt.getHours(),
          device: {
            type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
            os: ['Windows', 'macOS', 'iOS', 'Android'][Math.floor(Math.random() * 4)],
            browser: ['Chrome', 'Safari', 'Firefox', 'Edge'][Math.floor(Math.random() * 4)]
          },
          source: ['direct', 'search', 'social', 'referral'][Math.floor(Math.random() * 4)],
          metadata: {
            action: action,
            timestamp: createdAt.toISOString()
          }
        };
        
        usageRecords.push(usageRecord);
      }
    }
    
    // 批量插入使用记录
    console.log(`准备插入 ${usageRecords.length} 条使用记录...`);
    await ToolUsage.insertMany(usageRecords);
    
    // 更新工具的使用计数
    console.log('更新工具使用计数...');
    for (const tool of tools) {
      const toolRecords = usageRecords.filter(record => record.toolIdentifier === tool.id);
      const usageCount = toolRecords.length;
      const lastUsedAt = new Date(Math.max(...toolRecords.map(r => r.createdAt)));
      
      await Tool.findByIdAndUpdate(tool._id, {
        $inc: { usageCount: usageCount },
        lastUsedAt: lastUsedAt
      });
      
      console.log(`${tool.name}: +${usageCount} 次使用`);
    }
    
    console.log('使用记录添加完成！');
    
  } catch (error) {
    console.error('添加使用记录失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 清空现有使用记录（可选）
async function clearUsageRecords() {
  try {
    await connectDB();
    
    console.log('清空现有使用记录...');
    await ToolUsage.deleteMany({});
    
    // 重置工具使用计数
    await Tool.updateMany({}, { 
      usageCount: 0, 
      $unset: { lastUsedAt: 1 } 
    });
    
    console.log('使用记录已清空');
    
  } catch (error) {
    console.error('清空使用记录失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    await clearUsageRecords();
  } else {
    await addUsageRecords();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  addUsageRecords,
  clearUsageRecords
};
