const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const ActivityLogger = require('../middleware/activityLogger');
const logger = require('../utils/logger');

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

      // 创建用户
      const user = new User({
        username,
        displayName: req.body.displayName || username,
        email,
        password,
        isActive: defaultIsActive,
        role: defaultRole,
        permissions: Array.isArray(defaultPermissions) ? defaultPermissions : []
      });

      // 如果角色不是user，按角色映射刷新权限（以角色为准）
      if (user.role && user.role !== 'user' && typeof user.setRole === 'function') {
        user.setRole(user.role);
      }

      await user.save();

      // 记录注册活动
      await ActivityLogger.logUserRegister(user._id, req);

      logger.info('User registered', { userId: user._id, username, email });

      res.status(201).json({
        code: 201,
        message: '注册成功',
        data: {
          user: user.getPublicProfile()
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

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: user.getPublicProfile()
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

module.exports = router;
