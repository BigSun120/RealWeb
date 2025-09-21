const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// 检查管理员权限的中间件
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
};

// 获取待审核评论列表
router.get('/comments/pending', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    const skip = (page - 1) * limit;
    let sort = {};
    sort[sortBy] = parseInt(sortOrder);

    const comments = await Comment.find({
      moderationStatus: 'pending',
      isDeleted: false
    })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username avatar email')
      .populate('article', 'title')
      .lean();

    const total = await Comment.countDocuments({
      moderationStatus: 'pending',
      isDeleted: false
    });

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取待审核评论失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待审核评论失败'
    });
  }
});

// 获取所有评论（包含审核状态）
router.get('/comments', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1,
      moderationStatus = '',
      authorId = '',
      articleId = ''
    } = req.query;

    const skip = (page - 1) * limit;
    let sort = {};
    sort[sortBy] = parseInt(sortOrder);

    // 构建查询条件
    let query = { isDeleted: false };
    
    if (moderationStatus) {
      query.moderationStatus = moderationStatus;
    }
    if (authorId) {
      query.authorId = authorId;
    }
    if (articleId) {
      query.articleId = articleId;
    }

    const comments = await Comment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username avatar email')
      .populate('article', 'title')
      .populate('moderatedBy', 'username')
      .lean();

    const total = await Comment.countDocuments(query);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败'
    });
  }
});

// 审核评论（批准或拒绝）
router.put('/comments/:commentId/moderate',
  auth,
  requireAdmin,
  [
    param('commentId').isMongoId().withMessage('评论ID格式不正确'),
    body('action').isIn(['approve', 'reject']).withMessage('操作类型无效'),
    body('reason').optional().isString().withMessage('审核原因必须是字符串')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { commentId } = req.params;
      const { action, reason = '' } = req.body;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: '评论不存在'
        });
      }

      // 更新审核状态
      comment.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
      comment.moderatedAt = new Date();
      comment.moderatedBy = req.user._id;
      comment.moderationReason = reason;

      await comment.save();

      // 如果是批准评论，需要更新相关统计
      if (action === 'approve') {
        // 更新文章评论数量
        const Article = require('../models/Article');
        await Article.findByIdAndUpdate(comment.articleId, {
          $inc: { commentCount: 1 }
        });

        // 如果是回复，更新父评论的回复数量
        if (comment.parentId) {
          await Comment.findByIdAndUpdate(comment.parentId, {
            $inc: { replyCount: 1 }
          });
        }
      }

      res.json({
        success: true,
        message: action === 'approve' ? '评论已批准' : '评论已拒绝',
        data: {
          commentId: comment._id,
          moderationStatus: comment.moderationStatus,
          moderatedAt: comment.moderatedAt,
          moderatedBy: comment.moderatedBy,
          moderationReason: comment.moderationReason
        }
      });
    } catch (error) {
      console.error('审核评论失败:', error);
      res.status(500).json({
        success: false,
        message: '审核评论失败'
      });
    }
  }
);

// 批量审核评论
router.put('/comments/batch-moderate',
  auth,
  requireAdmin,
  [
    body('commentIds').isArray().withMessage('评论ID列表必须是数组'),
    body('commentIds.*').isMongoId().withMessage('评论ID格式不正确'),
    body('action').isIn(['approve', 'reject']).withMessage('操作类型无效'),
    body('reason').optional().isString().withMessage('审核原因必须是字符串')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { commentIds, action, reason = '' } = req.body;

      if (commentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要审核的评论'
        });
      }

      const moderationStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // 批量更新评论状态
      const result = await Comment.updateMany(
        { 
          _id: { $in: commentIds },
          moderationStatus: 'pending'
        },
        {
          moderationStatus,
          moderatedAt: new Date(),
          moderatedBy: req.user._id,
          moderationReason: reason
        }
      );

      // 如果是批准评论，需要更新相关统计
      if (action === 'approve') {
        const approvedComments = await Comment.find({
          _id: { $in: commentIds },
          moderationStatus: 'approved'
        }).select('articleId parentId');

        // 更新文章评论数量
        const articleUpdates = {};
        const parentUpdates = {};

        for (const comment of approvedComments) {
          // 统计每篇文章的评论数量
          articleUpdates[comment.articleId] = (articleUpdates[comment.articleId] || 0) + 1;
          
          // 统计每个父评论的回复数量
          if (comment.parentId) {
            parentUpdates[comment.parentId] = (parentUpdates[comment.parentId] || 0) + 1;
          }
        }

        // 批量更新文章评论数量
        const Article = require('../models/Article');
        for (const [articleId, count] of Object.entries(articleUpdates)) {
          await Article.findByIdAndUpdate(articleId, {
            $inc: { commentCount: count }
          });
        }

        // 批量更新父评论回复数量
        for (const [parentId, count] of Object.entries(parentUpdates)) {
          await Comment.findByIdAndUpdate(parentId, {
            $inc: { replyCount: count }
          });
        }
      }

      res.json({
        success: true,
        message: `成功${action === 'approve' ? '批准' : '拒绝'}了 ${result.modifiedCount} 条评论`,
        data: {
          modifiedCount: result.modifiedCount,
          action,
          moderatedAt: new Date(),
          moderatedBy: req.user._id
        }
      });
    } catch (error) {
      console.error('批量审核评论失败:', error);
      res.status(500).json({
        success: false,
        message: '批量审核评论失败'
      });
    }
  }
);

// 获取审核统计信息
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      Comment.countDocuments({ moderationStatus: 'pending', isDeleted: false }),
      Comment.countDocuments({ moderationStatus: 'approved', isDeleted: false }),
      Comment.countDocuments({ moderationStatus: 'rejected', isDeleted: false }),
      Comment.countDocuments({ moderationStatus: 'auto_approved', isDeleted: false })
    ]);

    res.json({
      success: true,
      data: {
        pending: stats[0],
        approved: stats[1],
        rejected: stats[2],
        autoApproved: stats[3],
        total: stats[0] + stats[1] + stats[2] + stats[3]
      }
    });
  } catch (error) {
    console.error('获取审核统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取审核统计失败'
    });
  }
});

module.exports = router;
