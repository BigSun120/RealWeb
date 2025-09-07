const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// 添加/取消收藏
router.post('/', auth, async (req, res, next) => {
  try {
    const { targetType, targetId, tags, note } = req.body;
    const userId = req.user._id;

    // 参数验证
    if (!targetType || !targetId) {
      return res.status(400).json({
        code: 400,
        message: '目标类型和目标ID不能为空'
      });
    }

    if (!['article', 'comment'].includes(targetType)) {
      return res.status(400).json({
        code: 400,
        message: '不支持的收藏目标类型'
      });
    }

    // 验证目标内容是否存在
    let targetExists = false;
    if (targetType === 'article') {
      const article = await Article.findById(targetId);
      targetExists = !!article;
    } else if (targetType === 'comment') {
      const comment = await Comment.findById(targetId);
      targetExists = !!comment;
    }

    if (!targetExists) {
      return res.status(404).json({
        code: 404,
        message: '收藏目标不存在'
      });
    }

    // 切换收藏状态
    const result = await Bookmark.toggleBookmark(userId, targetType, targetId, {
      tags: tags || [],
      note: note || ''
    });

    // 获取最新的收藏统计
    const stats = await Bookmark.getBookmarkStats(targetType, targetId);

    logger.info('Bookmark toggled', {
      userId,
      targetType,
      targetId,
      action: result.action
    });

    res.json({
      code: 200,
      message: result.bookmarked ? '收藏成功' : '取消收藏成功',
      data: {
        bookmarked: result.bookmarked,
        bookmarkCount: stats.count,
        bookmark: result.bookmark
      }
    });
  } catch (error) {
    logger.error('Toggle bookmark failed:', error);
    next(error);
  }
});

// 获取用户收藏列表
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      targetType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    if (targetType && !['article', 'comment'].includes(targetType)) {
      return res.status(400).json({
        code: 400,
        message: '不支持的收藏目标类型'
      });
    }

    // 获取收藏列表
    const result = await Bookmark.getUserBookmarks(userId, {
      targetType,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder
    });

    res.json({
      code: 200,
      message: '获取收藏列表成功',
      data: result
    });
  } catch (error) {
    logger.error('Get bookmarks failed:', error);
    next(error);
  }
});

// 批量检查收藏状态
router.post('/check', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { targets } = req.body;

    // 参数验证
    if (!Array.isArray(targets)) {
      return res.status(400).json({
        code: 400,
        message: '目标列表必须是数组'
      });
    }

    if (targets.length > 100) {
      return res.status(400).json({
        code: 400,
        message: '一次最多检查100个目标'
      });
    }

    // 验证目标格式
    for (const target of targets) {
      if (!target.type || !target.id) {
        return res.status(400).json({
          code: 400,
          message: '目标格式错误，需要包含type和id字段'
        });
      }
      if (!['article', 'comment'].includes(target.type)) {
        return res.status(400).json({
          code: 400,
          message: '不支持的收藏目标类型'
        });
      }
    }

    // 批量检查收藏状态
    const statusMap = await Bookmark.checkBookmarkStatus(userId, targets);

    res.json({
      code: 200,
      message: '检查收藏状态成功',
      data: statusMap
    });
  } catch (error) {
    logger.error('Check bookmark status failed:', error);
    next(error);
  }
});

// 删除收藏
router.delete('/:bookmarkId', auth, async (req, res, next) => {
  try {
    const { bookmarkId } = req.params;
    const userId = req.user._id;

    // 查找收藏记录
    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
      return res.status(404).json({
        code: 404,
        message: '收藏记录不存在'
      });
    }

    // 检查权限
    if (bookmark.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此收藏'
      });
    }

    // 删除收藏
    await Bookmark.deleteOne({ _id: bookmarkId });

    // 获取最新的收藏统计
    const stats = await Bookmark.getBookmarkStats(bookmark.targetType, bookmark.targetId);

    logger.info('Bookmark deleted', {
      userId,
      bookmarkId,
      targetType: bookmark.targetType,
      targetId: bookmark.targetId
    });

    res.json({
      code: 200,
      message: '删除收藏成功',
      data: {
        bookmarkCount: stats.count
      }
    });
  } catch (error) {
    logger.error('Delete bookmark failed:', error);
    next(error);
  }
});

// 获取用户收藏统计
router.get('/stats', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await Bookmark.getUserBookmarkStats(userId);

    res.json({
      code: 200,
      message: '获取收藏统计成功',
      data: stats
    });
  } catch (error) {
    logger.error('Get bookmark stats failed:', error);
    next(error);
  }
});

// 获取内容收藏统计（公开接口）
router.get('/content/:targetType/:targetId/stats', async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;

    // 参数验证
    if (!['article', 'comment'].includes(targetType)) {
      return res.status(400).json({
        code: 400,
        message: '不支持的收藏目标类型'
      });
    }

    const stats = await Bookmark.getBookmarkStats(targetType, targetId);

    res.json({
      code: 200,
      message: '获取内容收藏统计成功',
      data: stats
    });
  } catch (error) {
    logger.error('Get content bookmark stats failed:', error);
    next(error);
  }
});

module.exports = router;
