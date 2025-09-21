const express = require('express');
const router = express.Router();
const PublicNotice = require('../models/PublicNotice');
const PublicNoticeRead = require('../models/PublicNoticeRead');
const ToolConfig = require('../models/ToolConfig');
const cache = require('../utils/cache');
const { markdownToSafeHtml } = require('../utils/markdown');
const { auth, optionalAuth } = require('../middleware/auth');
const { param, body, validationResult } = require('express-validator');

// GET /api/public-notices/latest?limit=5
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '5', 10), 20));
    const cacheKey = `public-notices:latest:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      // 如果用户已登录，添加阅读状态信息
      if (req.user) {
        const noticeIds = cached.map(notice => notice._id);
        const readStatus = await PublicNoticeRead.getUserReadStatus(req.user._id, noticeIds);

        const noticesWithStatus = cached.map(notice => ({
          ...notice,
          readStatus: readStatus[notice._id] || { isRead: false, isDismissed: false }
        }));

        return res.json({ success: true, data: noticesWithStatus });
      }
      return res.json({ success: true, data: cached });
    }

    const now = new Date();
    const docs = await PublicNotice.find({
      published: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    })
      .sort({ startsAt: -1, createdAt: -1 })
      .limit(limit)
      .select('title bodyHtml bodyMarkdown level link ctaText startsAt expiresAt createdAt');

    // 为兼容历史数据，这里统一按当前渲染规则生成安全的 bodyHtml（包含图片处理）
    const notices = docs.map(d => {
      const obj = d.toObject ? d.toObject() : d;
      obj.bodyHtml = markdownToSafeHtml(obj.bodyMarkdown || '');
      return obj;
    });

    cache.set(cacheKey, notices, 15);

    // 如果用户已登录，添加阅读状态信息
    if (req.user) {
      const noticeIds = notices.map(notice => notice._id);
      const readStatus = await PublicNoticeRead.getUserReadStatus(req.user._id, noticeIds);

      const noticesWithStatus = notices.map(notice => ({
        ...notice,
        readStatus: readStatus[notice._id.toString()] || { isRead: false, isDismissed: false }
      }));

      return res.json({ success: true, data: noticesWithStatus });
    }

    res.json({ success: true, data: notices });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取公告失败' });
  }
});

// GET /api/public-notices/settings -> placements
router.get('/settings', async (req, res) => {
  try {
    const cacheKey = 'public-notices:settings';
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const placements = await ToolConfig.getValue('publicNotices.uiPlacements', ['banner', 'dropdown']);
    const data = { placements };
    cache.set(cacheKey, data, 15);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: '获取公告设置失败' });
  }
});

// GET /api/public-notices/read-status
// 获取用户对公告的阅读状态
router.get('/read-status', auth, async (req, res) => {
  try {
    const { noticeIds } = req.query;

    if (!noticeIds) {
      return res.status(400).json({
        success: false,
        message: '缺少公告ID参数'
      });
    }

    const ids = Array.isArray(noticeIds) ? noticeIds : noticeIds.split(',');
    const readStatus = await PublicNoticeRead.getUserReadStatus(req.user._id, ids);

    res.json({
      success: true,
      data: readStatus
    });
  } catch (error) {
    console.error('获取公告阅读状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取阅读状态失败'
    });
  }
});

// PUT /api/public-notices/:noticeId/read
// 标记公告为已读
router.put(
  '/:noticeId([0-9a-fA-F]{24})/read',
  auth,
  [param('noticeId').isMongoId().withMessage('公告ID格式不正确')],
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

      const { noticeId } = req.params;

      // 检查公告是否存在
      const notice = await PublicNotice.findById(noticeId);
      if (!notice) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      const readRecord = await PublicNoticeRead.markNoticeAsRead(req.user._id, noticeId);

      res.json({
        success: true,
        message: '公告已标记为已读',
        data: {
          noticeId: readRecord.noticeId,
          isRead: readRecord.isRead,
          readAt: readRecord.readAt
        }
      });
    } catch (error) {
      console.error('标记公告为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '标记已读失败'
      });
    }
  }
);

// PUT /api/public-notices/:noticeId/dismiss
// 标记公告为忽略（不再显示）
router.put(
  '/:noticeId([0-9a-fA-F]{24})/dismiss',
  auth,
  [param('noticeId').isMongoId().withMessage('公告ID格式不正确')],
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

      const { noticeId } = req.params;

      // 检查公告是否存在
      const notice = await PublicNotice.findById(noticeId);
      if (!notice) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      const readRecord = await PublicNoticeRead.markNoticeAsDismissed(req.user._id, noticeId);

      res.json({
        success: true,
        message: '公告已标记为不再显示',
        data: {
          noticeId: readRecord.noticeId,
          isDismissed: readRecord.isDismissed,
          dismissedAt: readRecord.dismissedAt
        }
      });
    } catch (error) {
      console.error('标记公告为忽略失败:', error);
      res.status(500).json({
        success: false,
        message: '标记忽略失败'
      });
    }
  }
);

// PUT /api/public-notices/batch-read
// 批量标记公告为已读
router.put(
  '/batch-read',
  auth,
  [
    body('noticeIds').optional().isArray().withMessage('公告ID列表必须是数组'),
    body('noticeIds.*').optional().isMongoId().withMessage('公告ID格式不正确')
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

      const { noticeIds } = req.body;

      if (!noticeIds || noticeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '公告ID列表不能为空'
        });
      }

      const result = await PublicNoticeRead.markMultipleAsRead(req.user._id, noticeIds);

      res.json({
        success: true,
        message: `成功标记 ${result.modifiedCount + result.upsertedCount} 条公告为已读`,
        data: {
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount
        }
      });
    } catch (error) {
      console.error('批量标记公告为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '批量标记已读失败'
      });
    }
  }
);

// GET /api/public-notices/unread-count
// 获取用户未读公告数量
router.get('/unread-count', auth, async (req, res) => {
  try {
    // 获取当前有效的公告
    const now = new Date();
    const activeNotices = await PublicNotice.find({
      published: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    }).select('_id').lean();

    const activeNoticeIds = activeNotices.map(notice => notice._id);
    const unreadCount = await PublicNoticeRead.getUnreadCount(req.user._id, activeNoticeIds);

    res.json({
      success: true,
      data: { count: unreadCount }
    });
  } catch (error) {
    console.error('获取未读公告数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取未读数量失败'
    });
  }
});

module.exports = router;

