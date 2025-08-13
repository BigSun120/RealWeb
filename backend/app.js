const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');
const { initDefaultAdmin } = require('./src/utils/initAdmin');
const ActivityLogger = require('./src/middleware/activityLogger');
const { initActivityData } = require('./src/utils/initActivityData');
const { initAllData } = require('./src/utils/initData');
const { initToolsData } = require('./src/utils/initTools');
const analyticsScheduler = require('./src/utils/analyticsScheduler');
const errorHandler = require('./src/middleware/errorHandler');

// 路由导入
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const articleRoutes = require('./src/routes/articles');
const commentRoutes = require('./src/routes/comments');
const moderationRoutes = require('./src/routes/moderation');
const notificationRoutes = require('./src/routes/notifications');
const gameRoutes = require('./src/routes/games');
const securityRoutes = require('./src/routes/security');
const adminRoutes = require('./src/routes/admin');
const settingsRoutes = require('./src/routes/settings');
const categoryRoutes = require('./src/routes/categories');
const tagRoutes = require('./src/routes/tags');
const toolsRoutes = require('./src/routes/tools');
const adminToolsRoutes = require('./src/routes/admin/tools');
const adminCategoriesRoutes = require('./src/routes/admin/categories');
const adminConfigsRoutes = require('./src/routes/admin/configs');
const adminEmailDomainsRoutes = require('./src/routes/admin/emailDomains');
const tempEmailRoutes = require('./src/routes/tempEmail');

const app = express();
const PORT = process.env.PORT || 8000;

// 连接数据库并初始化配置
connectDB().then(async () => {
  // 初始化安全配置
  const SecurityConfig = require('./src/models/SecurityConfig');
  await SecurityConfig.initializeDefaults();
  logger.info('安全配置初始化完成');

  // 初始化默认管理员
  await initDefaultAdmin();

  // 初始化活动日志测试数据
  await initActivityData();

  // 初始化分类和标签数据
  await initAllData();

  // 初始化工具箱数据
  await initToolsData();

  // 启动工具箱分析调度器
  analyticsScheduler.start();

  // 记录系统启动事件
  await ActivityLogger.logSystemEvent(
    '系统启动',
    '个人网站系统成功启动',
    {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      startTime: new Date()
    }
  );
}).catch(error => {
  logger.error('数据库连接或初始化失败:', error);
});

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001' // 支持Vite的备用端口
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 限流中间件 - 仅在生产环境启用
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 100次请求
    message: {
      code: 429,
      message: '请求过于频繁，请稍后再试'
    }
  });
  app.use('/api/', limiter);

  // 登录接口特殊限流
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: {
      code: 429,
      message: '登录尝试过于频繁，请稍后再试'
    }
  });
  app.use('/api/auth/login', loginLimiter);

  logger.info('生产环境：已启用API限流保护');
} else {
  logger.info('开发环境：已禁用API限流保护');
}

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 添加CORS头
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}, express.static(path.join(__dirname, 'uploads')));

// 前端静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/admin/tools', adminToolsRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/configs', adminConfigsRoutes);
app.use('/api/admin/email-domains', adminEmailDomainsRoutes);
app.use('/api/temp-email', tempEmailRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// 前端路由处理（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

module.exports = app;
