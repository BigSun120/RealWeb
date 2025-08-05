const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const CommentLike = require('../models/CommentLike');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  checkCommentPermission,
  checkCommentOwnership,
  validateCommentContent,
  checkCommentFrequency,
  checkDuplicateContent,
  checkEditTimeLimit,
  handleValidationErrors
} = require('../middleware/commentAuth');
const { autoModeration } = require('../middleware/commentModeration');

// 评论发布频率限制
const commentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3, // 最多3条评论
  message: {
    code: 429,
    message: '评论发布过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 查找评论所在页面
router.get('/find-page/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { limit = 10 } = req.query;

    // 查找评论
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    // 找到第1级评论（顶级评论）
    let topLevelComment = comment;
    let isReply = false;

    if (comment.parentId) {
      isReply = true;
      // 查找父评论
      const parentComment = await Comment.findById(comment.parentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: '父评论不存在'
        });
      }

      // 如果父评论还有父评论，说明是第3级评论，需要找到第1级
      if (parentComment.parentId) {
        topLevelComment = await Comment.findById(parentComment.parentId);
        if (!topLevelComment) {
          return res.status(404).json({
            success: false,
            message: '顶级评论不存在'
          });
        }
      } else {
        // 父评论就是第1级评论
        topLevelComment = parentComment;
      }
    }

    // 计算第1级评论在第几页（按创建时间倒序排序）
    const commentsBeforeTarget = await Comment.countDocuments({
      articleId: comment.articleId,
      parentId: null, // 只计算顶级评论
      createdAt: { $gt: topLevelComment.createdAt }, // 比第1级评论更新的评论
      status: 'published',
      isDeleted: false
    });

    const page = Math.floor(commentsBeforeTarget / limit) + 1;

    res.json({
      success: true,
      data: {
        page,
        commentId: topLevelComment._id, // 返回第1级评论ID
        originalCommentId: commentId,   // 原始评论ID
        isReply,
        articleId: comment.articleId
      }
    });
  } catch (error) {
    console.error('查找评论页面失败:', error);
    res.status(500).json({
      success: false,
      message: '查找评论页面失败'
    });
  }
});

// 获取文章的评论列表
router.get('/article/:articleId', optionalAuth, [
  param('articleId').isMongoId().withMessage('文章ID格式不正确')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { articleId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1, // 默认倒序，最新评论在前
      level = null
    } = req.query;

    // 验证文章是否存在
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published' || article.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 获取评论列表
    const comments = await Comment.getArticleComments(articleId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder),
      level: level ? parseInt(level) : null
    });

    // 获取总数
    let query = {
      articleId,
      status: 'published',
      isDeleted: false
    };
    if (level !== null) {
      query.level = parseInt(level);
    }
    const total = await Comment.countDocuments(query);

    // 如果用户已登录，检查点赞状态
    if (req.user) {
      for (let comment of comments) {
        const isLiked = await CommentLike.isLiked(comment._id, req.user._id);
        comment.isLiked = !!isLiked;
      }
    }

    res.json({
      code: 200,
      message: '获取评论列表成功',
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取评论的回复列表
router.get('/:commentId/replies', optionalAuth, [
  param('commentId').isMongoId().withMessage('评论ID格式不正确')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1 // 默认倒序，最新回复在前
    } = req.query;

    // 验证父评论是否存在
    const parentComment = await Comment.findById(commentId);
    if (!parentComment || parentComment.status !== 'published' || parentComment.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '评论不存在'
      });
    }

    // 获取回复列表
    const replies = await Comment.getCommentReplies(commentId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    });

    // 获取总数
    const total = await Comment.countDocuments({
      parentId: commentId,
      status: 'published',
      isDeleted: false
    });

    // 如果用户已登录，检查点赞状态
    if (req.user) {
      for (let reply of replies) {
        const isLiked = await CommentLike.isLiked(reply._id, req.user._id);
        reply.isLiked = !!isLiked;
      }
    }

    res.json({
      code: 200,
      message: '获取回复列表成功',
      data: replies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 发表评论
router.post('/',
  auth,
  checkCommentPermission('create'),
  commentRateLimit,
  checkCommentFrequency,
  [
    body('articleId').isMongoId().withMessage('文章ID格式不正确'),
    body('parentId').optional().isMongoId().withMessage('父评论ID格式不正确'),
    body('mentionedUsers').optional().isArray().withMessage('mentionedUsers必须是数组'),
    body('mentionedUsers.*').optional().isMongoId().withMessage('mentionedUsers中的用户ID格式不正确'),
    ...validateCommentContent
  ],
  handleValidationErrors,
  checkDuplicateContent,
  autoModeration,
  async (req, res, next) => {
  try {
    const { articleId, content, parentId, mentionedUsers = [] } = req.body;

    // 验证文章是否存在且可评论
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published' || article.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在或不允许评论'
      });
    }

    let level = 1;
    let rootId = null;
    let parentComment = null;

    // 如果是回复评论
    if (parentId) {
      parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.status !== 'published' || parentComment.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '父评论不存在'
        });
      }

      // 检查评论层级限制
      if (parentComment.level >= 3) {
        return res.status(400).json({
          code: 400,
          message: '评论层级不能超过3级'
        });
      }

      level = parentComment.level + 1;
      rootId = parentComment.rootId || parentComment._id;
    }

    // 获取审核结果
    const moderationResult = req.moderationResult || {
      moderationStatus: 'auto_approved',
      reason: null
    };

    // 创建评论
    const comment = new Comment({
      content,
      articleId,
      authorId: req.user._id,
      parentId: parentId || null,
      rootId,
      level,
      mentionedUsers: mentionedUsers || [],
      moderationStatus: moderationResult.moderationStatus,
      moderationReason: moderationResult.reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await comment.save();
    await comment.populate('author', 'username avatar');
    await comment.populate('mentionedUsers', 'username avatar');

    console.log('保存的评论数据:', {
      _id: comment._id,
      content: comment.content,
      mentionedUsers: comment.mentionedUsers
    });

    // 更新文章评论数量
    await article.incrementCommentCount();

    // 如果是回复，更新父评论的回复数量
    if (parentComment) {
      await parentComment.incrementReplyCount();

      // 发送回复通知给父评论作者（如果不是自己回复自己）
      if (!parentComment.authorId.equals(req.user._id)) {
        try {
          await Notification.createReplyNotification(
            parentComment.authorId,
            comment,
            article,
            req.user
          );
        } catch (notificationError) {
          console.error('发送回复通知失败:', notificationError);
        }
      }
    }

    // 发送@用户通知
    console.log('处理@用户通知，mentionedUsers:', mentionedUsers);
    if (mentionedUsers && mentionedUsers.length > 0) {
      try {
        // 获取被@用户的详细信息
        const mentionedUserDocs = await User.find({
          _id: { $in: mentionedUsers },
          isActive: true
        }).select('_id username');

        console.log('找到的被@用户:', mentionedUserDocs);

        // 为每个被@的用户发送通知（排除自己）
        for (const mentionedUser of mentionedUserDocs) {
          if (!mentionedUser._id.equals(req.user._id)) {
            console.log(`发送通知给用户: ${mentionedUser.username}`);
            const notification = await Notification.createMentionNotification(
              mentionedUser._id,
              comment,
              article,
              req.user
            );
            console.log('通知创建成功:', notification);
          } else {
            console.log('跳过自己:', mentionedUser.username);
          }
        }
      } catch (notificationError) {
        console.error('发送@用户通知失败:', notificationError);
      }
    } else {
      console.log('没有@用户需要通知');
    }

    res.status(201).json({
      code: 201,
      message: '发表评论成功',
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// 编辑评论
router.put('/:commentId',
  auth,
  checkCommentPermission('edit'),
  [
    param('commentId').isMongoId().withMessage('评论ID格式不正确'),
    ...validateCommentContent
  ],
  handleValidationErrors,
  checkCommentOwnership,
  checkEditTimeLimit,
  async (req, res, next) => {
  try {
    const { content } = req.body;
    const comment = req.comment; // 从中间件获取

    // 更新评论
    comment.content = content;
    comment.editedAt = new Date();
    comment.editCount += 1;
    await comment.save();
    await comment.populate('author', 'username avatar');
    await comment.populate('mentionedUsers', 'username avatar');

    res.json({
      code: 200,
      message: '编辑评论成功',
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// 删除评论
router.delete('/:commentId',
  auth,
  checkCommentPermission('delete'),
  [
    param('commentId').isMongoId().withMessage('评论ID格式不正确')
  ],
  handleValidationErrors,
  checkCommentOwnership,
  async (req, res, next) => {
  try {
    const comment = req.comment; // 从中间件获取

    // 软删除评论
    await comment.softDelete(req.user._id);

    // 更新文章评论数量
    const article = await Article.findById(comment.articleId);
    if (article) {
      await article.decrementCommentCount();
    }

    // 如果有父评论，更新父评论的回复数量
    if (comment.parentId) {
      const parentComment = await Comment.findById(comment.parentId);
      if (parentComment) {
        await parentComment.decrementReplyCount();
      }
    }

    res.json({
      code: 200,
      message: '删除评论成功'
    });
  } catch (error) {
    next(error);
  }
});

// 点赞/取消点赞评论
router.post('/:commentId/like', auth, [
  param('commentId').isMongoId().withMessage('评论ID格式不正确')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;

    // 验证评论是否存在
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status !== 'published' || comment.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '评论不存在'
      });
    }

    // 切换点赞状态
    const result = await CommentLike.toggleLike(commentId, req.user._id, req.ip);

    res.json({
      code: 200,
      message: result.action === 'liked' ? '点赞成功' : '取消点赞成功',
      data: {
        action: result.action,
        likeCount: result.likeCount,
        isLiked: result.action === 'liked'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取评论的点赞用户列表
router.get('/:commentId/likes', optionalAuth, [
  param('commentId').isMongoId().withMessage('评论ID格式不正确')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 验证评论是否存在
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status !== 'published' || comment.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '评论不存在'
      });
    }

    // 获取点赞用户列表
    const likes = await CommentLike.getLikeUsers(commentId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // 获取总数
    const total = await CommentLike.countDocuments({ commentId });

    res.json({
      code: 200,
      message: '获取点赞用户列表成功',
      data: likes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取用户的评论列表
router.get('/user/:userId', optionalAuth, [
  param('userId').isMongoId().withMessage('用户ID格式不正确')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { page = 1, limit = 20, status = 'published' } = req.query;

    // 获取用户评论列表
    const comments = await Comment.getUserComments(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    // 获取总数
    const total = await Comment.countDocuments({
      authorId: userId,
      status,
      isDeleted: false
    });

    res.json({
      code: 200,
      message: '获取用户评论列表成功',
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
