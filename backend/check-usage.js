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

async function checkToolUsage() {
  try {
    await connectDB();
    
    console.log('\n=== 工具使用统计 ===');
    
    // 获取所有工具及其使用次数
    const tools = await Tool.find({}).sort({ usageCount: -1 });
    
    console.log('\n工具列表及使用次数:');
    tools.forEach(tool => {
      console.log(`${tool.name} (${tool.id}): ${tool.usageCount} 次使用`);
      if (tool.lastUsedAt) {
        console.log(`  最后使用时间: ${tool.lastUsedAt.toLocaleString()}`);
      }
    });
    
    // 获取使用记录总数
    const totalUsageRecords = await ToolUsage.countDocuments();
    console.log(`\n总使用记录数: ${totalUsageRecords}`);
    
    // 获取最近的使用记录
    const recentUsage = await ToolUsage.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('\n最近10条使用记录:');
    recentUsage.forEach(usage => {
      console.log(`${usage.toolIdentifier} - ${usage.action} - ${usage.createdAt.toLocaleString()}`);
    });
    
    // 按工具统计使用次数
    const usageByTool = await ToolUsage.aggregate([
      {
        $group: {
          _id: '$toolIdentifier',
          count: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n按工具统计使用次数:');
    usageByTool.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} 次使用，最后使用: ${stat.lastUsed ? stat.lastUsed.toLocaleString() : '无'}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

checkToolUsage();
