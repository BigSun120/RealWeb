const express = require('express');
const router = express.Router();
const PublicNotice = require('../models/PublicNotice');
const ToolConfig = require('../models/ToolConfig');
const cache = require('../utils/cache');
const { markdownToSafeHtml } = require('../utils/markdown');

// GET /api/public-notices/latest?limit=5
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '5', 10), 20));
    const cacheKey = `public-notices:latest:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const now = new Date();
    const notices = await PublicNotice.find({
      published: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    })
      .sort({ startsAt: -1, createdAt: -1 })
      .limit(limit)
      .select('title bodyHtml bodyMarkdown level link ctaText startsAt expiresAt createdAt');

    cache.set(cacheKey, notices, 15);
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

module.exports = router;

