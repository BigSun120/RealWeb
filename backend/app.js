const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');
// const { initDefaultAdmin } = require('./src/utils/initAdmin');
const ActivityLogger = require('./src/middleware/activityLogger');
// const { initActivityData } = require('./src/utils/initActivityData');
// const { initAllData } = require('./src/utils/initData');
// const { initToolsData } = require('./src/utils/initTools');
const analyticsScheduler = require('./src/utils/analyticsScheduler');
const errorHandler = require('./src/middleware/errorHandler');
// const initPublicNoticeReadStatus = require('./src/scripts/initPublicNoticeReadStatus');
const { scheduleTokenPoolCleanup } = require('./src/jobs/tokenPoolCleanup');
const databaseBackup = require('./src/utils/databaseBackup');

// 路由导入
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const articleRoutes = require('./src/routes/articles');
const commentRoutes = require('./src/routes/comments');
const moderationRoutes = require('./src/routes/moderation');
const notificationRoutes = require('./src/routes/notifications');
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
const tempEmailAuthRoutes = require('./src/routes/tempEmailAuth');
const publicNoticesRoutes = require('./src/routes/publicNotices');
const adminPublicNoticesRoutes = require('./src/routes/admin/publicNotices');
const adminTempEmailActivationCodesRoutes = require('./src/routes/admin/tempEmailActivationCodes');
const adminSessionsRoutes = require('./src/routes/admin/sessions');
const adminTokensRoutes = require('./src/routes/admin/tokens');
const bookmarkRoutes = require('./src/routes/bookmarks');
const backgroundRoutes = require('./src/routes/backgrounds');
const promptsRoutes = require('./src/routes/prompts');
const promptUsageRoutes = require('./src/routes/prompt-usage');
const aiRoutes = require('./src/routes/ai');
const adminPublicAIConnectionsRoutes = require('./src/routes/admin/publicAIConnections');

const app = express();
const PORT = process.env.PORT || 8001;

// 连接数据库并初始化配置
const initializeDatabase = async () => {
  try {
    await connectDB();

    // 检查数据库连接状态
    if (mongoose.connection.readyState === 1) {
      logger.info('数据库连接成功');

      // 检查数据库是否为空（安全检查）
      const User = require('./src/models/User');
      const userCount = await User.countDocuments();
      const isEmptyDatabase = userCount === 0;

      logger.info(`数据库状态检查: 用户数量=${userCount}, 是否为空数据库=${isEmptyDatabase}`);

      // 如果不是空数据库，创建启动前备份
      if (!isEmptyDatabase) {
        await databaseBackup.autoBackupBeforeStart();
      }

      // 初始化安全配置（总是执行，因为有upsert逻辑）
      const SecurityConfig = require('./src/models/SecurityConfig');
      await SecurityConfig.initializeDefaults();
      logger.info('安全配置初始化完成');

      // 注释掉所有数据初始化代码，防止清理数据库
      // await initDefaultAdmin();
      // if (isEmptyDatabase) {
      //   logger.info('检测到空数据库，执行完整初始化...');
      //   await initActivityData();
      //   await initAllData();
      //   await initToolsData();
      //   logger.info('空数据库初始化完成');
      // } else {
      //   logger.info('数据库已有数据，跳过数据初始化');
      // }

      // 注释掉公告阅读状态初始化
      // try {
      //   await initPublicNoticeReadStatus();
      //   logger.info('公告阅读状态初始化完成');
      // } catch (error) {
      //   logger.warn('公告阅读状态初始化失败:', error.message);
      // }

      // 启动工具箱分析调度器
      analyticsScheduler.start();

      // 记录系统启动事件
      await ActivityLogger.logSystemEvent('系统启动', '网站系统成功启动', {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        startTime: new Date(),
        userCount,
        isEmptyDatabase
      });

      logger.info('数据库初始化完成');
    } else {
      logger.warn('数据库未连接，跳过数据初始化');
    }
  } catch (error) {
    logger.error('数据库连接或初始化失败:', error);
    logger.info('继续启动服务器，部分功能可能不可用');
  }
};

// 异步初始化数据库，不阻塞服务器启动
initializeDatabase();

// 信任代理设置（用于nginx反向代理）
app.set('trust proxy', 1);

// 基础中间件 - 安全头配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // 允许嵌入第三方内容
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001', // 支持Vite的备用端口
      'http://74.48.194.227', // 生产环境IP
      'https://godaug.fun', // 生产环境域名
      'http://godaug.fun', // 生产环境域名（HTTP）
      'http://localhost' // 本地访问
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 限流中间件 - 仅在生产环境启用
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 300, // 限制每个IP 300次请求（从100增加到300）
    message: {
      code: 429,
      message: '请求过于频繁，请稍后再试'
    }
  });
  app.use('/api/', limiter);

  // 登录接口特殊限流
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // 从5次增加到15次
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

// 解析中间件 - 增加上传限制到50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 添加CORS头
app.use(
  '/uploads',
  (req, res, next) => {
    // 调试日志
    const uploadPath = path.resolve(process.env.UPLOAD_PATH || path.join(__dirname, 'uploads'));
    console.log(`[Static] 请求文件: ${req.url}, 服务路径: ${uploadPath}`);

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
  },
  express.static(path.resolve(process.env.UPLOAD_PATH || path.join(__dirname, 'uploads')))
);

// 注意：Augment配套程序静态文件服务已移除，改用协议调用方式
// app.use('/static', express.static(path.join(__dirname, '../augment-proxy')));

// 背景图片静态文件服务已由上面的 /uploads 路径处理，移除重复配置

// 前端静态文件服务（生产环境）- 已由 nginx 处理，禁用以避免路由冲突
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/dist')));
// }

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/notifications', notificationRoutes);
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
app.use('/api/temp-email-auth', tempEmailAuthRoutes);
app.use('/api/public-notices', publicNoticesRoutes);
app.use('/api/admin/public-notices', adminPublicNoticesRoutes);
app.use('/api/admin/temp-email-activation-codes', adminTempEmailActivationCodesRoutes);
app.use('/api/admin/sessions', adminSessionsRoutes);
app.use('/api/admin/tokens', adminTokensRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/backgrounds', backgroundRoutes);
app.use('/api/tools/prompt-vault', promptsRoutes);
app.use('/api/prompts', promptUsageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/ai-connections', adminPublicAIConnectionsRoutes);

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

// API健康检查（用于Nginx代理）
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// 前端路由处理（生产环境）- 已由 nginx 处理，禁用以避免 API 路由冲突
// if (process.env.NODE_ENV === 'production') {
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//   });
// }

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

  // 启动令牌清理任务
  if (process.env.NODE_ENV === 'production') {
    const tokenCleanup = require('./src/utils/tokenCleanup');
    tokenCleanup.start();
    logger.info('Token cleanup scheduler started');
  }

  // 启动令牌池清理任务
  scheduleTokenPoolCleanup();

  // 初始化全局域名配置
  try {
    const { getDomains } = require('./src/routes/admin/emailDomains');
    global.emailDomains = getDomains();
    logger.info(`✅ 全局域名配置已初始化: ${global.emailDomains.join(', ')}`);
  } catch (error) {
    logger.error('初始化全局域名配置失败:', error.message);
    // 使用默认域名
    global.emailDomains = ['godaug.fun', 'localhost', 'test.local'];
    logger.info(`使用默认域名配置: ${global.emailDomains.join(', ')}`);
  }

  // 初始化Postfix域名配置同步
  try {
    const { initPostfixSync } = require('./src/scripts/init-postfix-sync');
    initPostfixSync();
  } catch (error) {
    logger.error('初始化Postfix同步失败:', error.message);
  }
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
