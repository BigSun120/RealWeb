const mongoose = require('mongoose');
const User = require('./backend/src/models/User');

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

// 创建测试用户
const createTestUsers = async () => {
  try {
    const testUsers = [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: '123456',
        bio: '测试用户'
      },
      {
        username: 'dfhtrhr',
        email: 'dfhtrhr@test.com',
        password: '123456',
        bio: '另一个测试用户'
      },
      {
        username: 'alice',
        email: 'alice@test.com',
        password: '123456',
        bio: 'Alice用户'
      },
      {
        username: 'bob',
        email: 'bob@test.com',
        password: '123456',
        bio: 'Bob用户'
      }
    ];

    for (const userData of testUsers) {
      // 检查用户是否已存在
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        console.log(`用户 ${userData.username} 已存在，跳过创建`);
        continue;
      }

      // 创建新用户
      const user = new User(userData);
      await user.save();
      console.log(`创建用户成功: ${userData.username}`);
    }

    console.log('测试用户创建完成');
  } catch (error) {
    console.error('创建测试用户失败:', error);
  }
};

// 主函数
const main = async () => {
  await connectDB();
  await createTestUsers();
  await mongoose.disconnect();
  console.log('脚本执行完成');
};

// 运行脚本
main().catch(console.error);
