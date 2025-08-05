const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
const Notification = require('./backend/src/models/Notification');

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal_website_dev');
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 创建测试通知
const createTestNotification = async () => {
  try {
    // 查找用户
    const fromUser = await User.findOne({ username: 'admin666' });
    const toUser = await User.findOne({ username: 'dfhtrhr' });

    if (!fromUser || !toUser) {
      console.log('用户不存在:');
      console.log('fromUser (admin666):', fromUser ? '存在' : '不存在');
      console.log('toUser (dfhtrhr):', toUser ? '存在' : '不存在');
      return;
    }

    // 创建测试通知
    const notification = new Notification({
      type: 'mention',
      title: '有人在评论中提到了你',
      content: `${fromUser.username} 在评论中提到了你`,
      fromUserId: fromUser._id,
      toUserId: toUser._id,
      relatedId: '507f1f77bcf86cd799439011', // 假的文章ID
      relatedType: 'Article'
    });

    await notification.save();
    console.log('测试通知创建成功:', notification);

    // 查询用户的所有通知
    const userNotifications = await Notification.find({ toUserId: toUser._id })
      .populate('fromUserId', 'username avatar')
      .sort({ createdAt: -1 });

    console.log(`用户 ${toUser.username} 的通知列表:`, userNotifications);

    // 查询未读数量
    const unreadCount = await Notification.countDocuments({
      toUserId: toUser._id,
      isRead: false
    });

    console.log(`未读通知数量: ${unreadCount}`);

  } catch (error) {
    console.error('创建测试通知失败:', error);
  }
};

// 清理测试数据
const cleanupTestData = async () => {
  try {
    const result = await Notification.deleteMany({
      title: '有人在评论中提到了你'
    });
    console.log(`清理了 ${result.deletedCount} 条测试通知`);
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
};

// 主函数
const main = async () => {
  await connectDB();
  
  const action = process.argv[2];
  
  if (action === 'clean') {
    await cleanupTestData();
  } else {
    await createTestNotification();
  }
  
  await mongoose.disconnect();
  console.log('脚本执行完成');
};

// 运行脚本
// node test-notification.js - 创建测试通知
// node test-notification.js clean - 清理测试通知
main().catch(console.error);
