const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const PublicNotice = require('../../models/PublicNotice');
const { markdownToSafeHtml } = require('../../utils/markdown');
const cache = require('../../utils/cache');

// 管理端：创建公告（草稿或立即发布）
router.post('/', adminAuth, [
  body('title').isString().notEmpty(),
  body('bodyMarkdown').optional().isString(),
  body('level').optional().isIn(['info', 'warning', 'critical']),
  body('link').optional().isString(),
  body('ctaText').optional().isString(),
  body('published').optional().isBoolean(),
  body('startsAt').optional().isISO8601(),
  body('expiresAt').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: '参数错误', errors: errors.array() });
  try {
    const data = { ...req.body, createdBy: req.user._id };
    data.bodyHtml = markdownToSafeHtml(data.bodyMarkdown || '');
    const notice = await PublicNotice.create(data);
    // 失效缓存
    cache.del(['public-notices:latest', 'public-notices:settings']);
    res.json({ success: true, data: notice });
  } catch (e) {
    res.status(500).json({ success: false, message: '创建公告失败' });
  }
});

// 管理端：列表
router.get('/', adminAuth, async (req, res) => {
  try {
    const list = await PublicNotice.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: '获取公告列表失败' });
  }
});

// 管理端：更新
router.patch('/:id', adminAuth, [param('id').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: '参数错误' });
  try {
    const payload = { ...req.body };
    if (typeof payload.bodyMarkdown === 'string') {
      payload.bodyHtml = markdownToSafeHtml(payload.bodyMarkdown);
    }
    const notice = await PublicNotice.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: '公告不存在' });
    cache.del(['public-notices:latest', 'public-notices:settings']);
    res.json({ success: true, data: notice });
  } catch (e) {
    res.status(500).json({ success: false, message: '更新公告失败' });
  }
});

// 管理端：发布或取消发布
router.post('/:id/publish', adminAuth, [param('id').isMongoId(), body('published').isBoolean()], async (req, res) => {
  try {
    const notice = await PublicNotice.findByIdAndUpdate(req.params.id, { published: !!req.body.published }, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: '公告不存在' });
    cache.del(['public-notices:latest']);
    res.json({ success: true, data: notice });
  } catch (e) {
    // 提示：如需服务端主动推送，请在此集成 SSE/WS 进行通知刷新

    res.status(500).json({ success: false, message: '更新发布状态失败' });
  }
});

// 管理端：删除
router.delete('/:id', adminAuth, [param('id').isMongoId()], async (req, res) => {
  try {
    const result = await PublicNotice.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: '公告不存在' });
    cache.del(['public-notices:latest', 'public-notices:settings']);
    res.json({ success: true, message: '删除成功' });
  } catch (e) {
    res.status(500).json({ success: false, message: '删除公告失败' });
  }
});

module.exports = router;

