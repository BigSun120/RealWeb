const Comment = require('../models/Comment');
const { body, validationResult } = require('express-validator');

// 检查评论权限
const checkCommentPermission = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      });
    }

    // 管理员拥有所有权限
    if (req.user.isAdmin) {
      return next();
    }

    // 检查用户权限
    const permissionMap = {
      create: 'comment:create',
      edit: 'comment:edit',
      delete: 'comment:delete'
    };

    const requiredPermission = permissionMap[action];
    if (!requiredPermission) {
      return res.status(400).json({
        code: 400,
        message: '无效的操作类型'
      });
    }

    if (!req.user.hasPermission(requiredPermission)) {
      return res.status(403).json({
        code: 403,
        message: `您没有${action === 'create' ? '发表' : action === 'edit' ? '编辑' : '删除'}评论的权限`
      });
    }

    next();
  };
};

// 检查评论所有权
const checkCommentOwnership = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '评论不存在'
      });
    }

    // 管理员可以操作所有评论
    if (req.user.isAdmin) {
      req.comment = comment;
      return next();
    }

    // 检查是否为评论作者
    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        message: '您只能操作自己的评论'
      });
    }

    req.comment = comment;
    next();
  } catch (error) {
    next(error);
  }
};

// 评论内容验证
const validateCommentContent = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('评论内容长度必须在1-500字符之间')
    .custom((value) => {
      // 检查是否包含过多的重复字符
      const repeatedPattern = /(.)\1{9,}/; // 连续10个相同字符
      if (repeatedPattern.test(value)) {
        throw new Error('评论内容包含过多重复字符');
      }

      // 检查是否全是空白字符或特殊字符
      const meaningfulContent = value.replace(/[\s\n\r\t\u00A0\u2000-\u200B\u2028-\u2029\u3000]/g, '');
      if (meaningfulContent.length === 0) {
        throw new Error('评论内容不能为空或只包含空白字符');
      }

      return true;
    })
];

// 频率限制检查
const checkCommentFrequency = async (req, res, next) => {
  try {
    // 开发环境跳过频率限制
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const userId = req.user._id;
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // 检查1分钟内的评论数量
    const recentCommentsCount = await Comment.countDocuments({
      authorId: userId,
      createdAt: { $gte: oneMinuteAgo },
      isDeleted: false
    });

    if (recentCommentsCount >= 3) {
      return res.status(429).json({
        code: 429,
        message: '评论发布过于频繁，请稍后再试'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 重复内容检查
const checkDuplicateContent = async (req, res, next) => {
  try {
    const { content, articleId } = req.body;
    const userId = req.user._id;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 检查5分钟内是否有相同内容的评论
    const duplicateComment = await Comment.findOne({
      authorId: userId,
      articleId,
      content: content.trim(),
      createdAt: { $gte: fiveMinutesAgo },
      isDeleted: false
    });

    if (duplicateComment) {
      return res.status(400).json({
        code: 400,
        message: '请不要重复发表相同内容的评论'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 编辑时间限制检查
const checkEditTimeLimit = (req, res, next) => {
  const comment = req.comment;

  if (!comment) {
    return res.status(404).json({
      code: 404,
      message: '评论不存在'
    });
  }

  // 管理员不受时间限制
  if (req.user.isAdmin) {
    return next();
  }

  // 检查是否在30分钟内
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (comment.createdAt <= thirtyMinutesAgo) {
    return res.status(403).json({
      code: 403,
      message: '评论发布超过30分钟后不能编辑'
    });
  }

  next();
};

// 验证错误处理
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  checkCommentPermission,
  checkCommentOwnership,
  validateCommentContent,
  checkCommentFrequency,
  checkDuplicateContent,
  checkEditTimeLimit,
  handleValidationErrors
};
