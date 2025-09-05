const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const ActivityLogger = require('../middleware/activityLogger');
const logger = require('../utils/logger');
const emailService = require('../services/EmailService');
const SecurityLogger = require('../middleware/securityLogger');

const router = express.Router();

// 注册
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3, max: 15 })
      .withMessage('用户名长度必须在3-15个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('email').isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
    body('displayName').optional().isLength({ max: 30 }).withMessage('展示名最多30个字符')
  ],
  async (req, res, next) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          code: 400,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { username, email, password, displayName } = req.body;

      // 检查邮箱是否已存在
      const emailExists = await User.isEmailTaken(email);
      if (emailExists) {
        return res.status(400).json({
          code: 400,
          message: '邮箱已被注册'
        });
      }

      // 检查用户名是否已存在
      const usernameExists = await User.isUsernameTaken(username);
      if (usernameExists) {
        return res.status(400).json({
          code: 400,
          message: '用户名已被使用'
        });
      }

      // 读取系统配置中的默认角色与权限
      const ToolConfig = require('../models/ToolConfig');
      const defaultRole = (await ToolConfig.getValue('user.defaultRole', 'user')) || 'user';
      const defaultPermissions = (await ToolConfig.getValue('user.defaultPermissions', [])) || [];
      const defaultIsActive = await ToolConfig.getValue('user.defaultIsActive', true);

      // 创建用户（默认未验证邮箱）
      const user = new User({
        username,
        displayName: req.body.displayName || username,
        email,
        password,
        isActive: defaultIsActive,
        role: defaultRole,
        permissions: Array.isArray(defaultPermissions) ? defaultPermissions : [],
        emailVerified: false // 新用户默认未验证邮箱
      });

      // 如果角色不是user，按角色映射刷新权限（以角色为准）
      if (user.role && user.role !== 'user' && typeof user.setRole === 'function') {
        user.setRole(user.role);
      }

      // 生成邮箱验证令牌
      const verificationToken = user.generateEmailVerificationToken();
      user.markVerificationEmailSent();

      await user.save();

      // 记录令牌生成事件
      SecurityLogger.logEmailVerificationTokenGenerated(user._id, email, req);

      // 发送验证邮件
      try {
        const verificationUrl = `${
          process.env.FRONTEND_URL || 'https://godaug.fun'
        }/auth/verify-email/${verificationToken}`;
        await emailService.sendVerificationEmail(user, verificationUrl);

        // 记录邮件发送成功
        SecurityLogger.logVerificationEmailSent(user._id, email, 'verification', req);
        logger.info('Verification email sent', { userId: user._id, email });
      } catch (emailError) {
        // 记录邮件发送失败
        SecurityLogger.logVerificationEmailFailure(user._id, email, emailError, req);
        logger.error('Failed to send verification email', {
          userId: user._id,
          email,
          error: emailError.message
        });
        // 邮件发送失败不影响注册流程，但需要记录错误
      }

      // 记录注册活动
      await ActivityLogger.logUserRegister(user._id, req);

      logger.info('User registered', { userId: user._id, username, email });

      res.status(201).json({
        code: 201,
        message: '注册成功！请检查您的邮箱并点击验证链接以激活账户。',
        data: {
          user: user.getPublicProfile(),
          needsEmailVerification: true,
          email: email // 返回邮箱地址用于前端显示
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登录
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('邮箱或用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  async (req, res, next) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          code: 400,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { identifier, password } = req.body;

      // 查找用户
      const user = await User.findByEmailOrUsername(identifier);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误'
        });
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (!user.isActive) {
        return res.status(401).json({
          code: 401,
          message: '账户已被禁用'
        });
      }

      // 生成token
      const token = user.generateAuthToken();

      // 更新登录信息
      await user.updateLoginInfo();

      // 记录登录活动
      await ActivityLogger.logUserLogin(user._id, req);

      logger.info('User logged in', { userId: user._id, username: user.username });

      // 准备响应消息
      let message = '登录成功';
      if (!user.emailVerified) {
        message = '登录成功，但您的邮箱尚未验证。请检查邮箱并完成验证以享受完整功能。';
      }

      res.json({
        code: 200,
        message,
        data: {
          token,
          user: user.getPublicProfile(),
          emailVerified: user.emailVerified,
          needsEmailVerification: !user.emailVerified
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取当前用户信息
router.get('/me', auth, async (req, res, next) => {
  try {
    res.json({
      code: 200,
      message: '获取用户信息成功',
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 刷新token
router.post('/refresh', auth, async (req, res, next) => {
  try {
    const token = req.user.generateAuthToken();

    res.json({
      code: 200,
      message: 'Token刷新成功',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// 验证邮箱
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        code: 400,
        message: '验证令牌不能为空'
      });
    }

    // 查找用户
    const user = await User.findByVerificationToken(token);
    if (!user) {
      // 记录验证失败
      SecurityLogger.logEmailVerificationFailure(token, 'Token not found or expired', req);
      return res.status(400).json({
        code: 400,
        message: '验证令牌无效或已过期'
      });
    }

    // 验证令牌
    if (!user.verifyEmailToken(token)) {
      // 记录验证失败
      SecurityLogger.logEmailVerificationFailure(token, 'Token verification failed', req);
      return res.status(400).json({
        code: 400,
        message: '验证令牌无效或已过期'
      });
    }

    // 完成邮箱验证
    user.completeEmailVerification();
    await user.save();

    // 记录验证成功
    SecurityLogger.logEmailVerificationSuccess(user._id, user.email, req);

    // 发送欢迎邮件
    try {
      await emailService.sendWelcomeEmail(user);
      logger.info('Welcome email sent', { userId: user._id, email: user.email });
    } catch (emailError) {
      logger.error('Failed to send welcome email', {
        userId: user._id,
        email: user.email,
        error: emailError.message
      });
      // 欢迎邮件发送失败不影响验证流程
    }

    logger.info('Email verified successfully', { userId: user._id, email: user.email });

    res.json({
      code: 200,
      message: '邮箱验证成功！欢迎加入我们！',
      data: {
        user: user.getPublicProfile(),
        verified: true
      }
    });
  } catch (error) {
    next(error);
  }
});

// 重发验证邮件
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 400,
        message: '邮箱地址不能为空'
      });
    }

    // 查找用户
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 检查是否已经验证
    if (user.emailVerified) {
      return res.status(400).json({
        code: 400,
        message: '邮箱已经验证过了'
      });
    }

    // 检查是否可以重发
    if (!user.canResendVerificationEmail()) {
      return res.status(429).json({
        code: 429,
        message: '请等待5分钟后再重新发送验证邮件'
      });
    }

    // 生成新的验证令牌
    const verificationToken = user.generateEmailVerificationToken();
    user.markVerificationEmailSent();
    await user.save();

    // 发送验证邮件
    try {
      const verificationUrl = `${
        process.env.FRONTEND_URL || 'https://godaug.fun'
      }/auth/verify-email/${verificationToken}`;
      await emailService.sendVerificationEmail(user, verificationUrl);

      // 记录邮件发送成功
      SecurityLogger.logVerificationEmailSent(user._id, email, 'resend', req);
      logger.info('Verification email resent', { userId: user._id, email });
    } catch (emailError) {
      // 记录邮件发送失败
      SecurityLogger.logVerificationEmailFailure(user._id, email, emailError, req);
      logger.error('Failed to resend verification email', {
        userId: user._id,
        email,
        error: emailError.message
      });
      return res.status(500).json({
        code: 500,
        message: '验证邮件发送失败，请稍后重试'
      });
    }

    res.json({
      code: 200,
      message: '验证邮件已重新发送，请检查您的邮箱'
    });
  } catch (error) {
    next(error);
  }
});

// 检查验证状态
router.get('/verification-status/:email', async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        code: 400,
        message: '邮箱地址不能为空'
      });
    }

    // 查找用户
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    res.json({
      code: 200,
      message: '获取验证状态成功',
      data: {
        email: user.email,
        verified: user.emailVerified,
        verifiedAt: user.emailVerifiedAt,
        canResend: user.canResendVerificationEmail()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
