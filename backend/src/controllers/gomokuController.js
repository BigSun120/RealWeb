const GomokuStats = require('../models/GomokuStats');
const { DIFFICULTIES, RESULTS } = require('../models/GomokuStats');
const cache = require('../utils/cache');
const ToolConfig = require('../models/ToolConfig');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 60;

class GomokuController {
  /**
   * POST /api/tools/gomoku/result
   * body: { difficulty, result }
   */
  async submitResult(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ code: 401, message: '需要登录才能记录胜负' });
      }

      const { difficulty, result } = req.body || {};
      if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ code: 400, message: '无效的难度选项' });
      }
      if (!RESULTS.includes(result)) {
        return res.status(400).json({ code: 400, message: '无效的对局结果' });
      }

      const stats = await GomokuStats.recordResult({
        userId: req.user._id,
        difficulty,
        result
      });

      this.clearRankingCache(difficulty);

      return res.json({
        code: 200,
        message: '记录成功',
        data: GomokuStats.formatStats(stats)
      });
    } catch (error) {
      logger.error('记录五子棋结果失败:', error);
      return res.status(500).json({ code: 500, message: '记录失败，请稍后再试' });
    }
  }

  /**
   * GET /api/tools/gomoku/rankings?difficulty=&limit=
   */
  async getRankings(req, res) {
    try {
      const { difficulty } = req.query;
      let { limit = 10 } = req.query;

      if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ code: 400, message: '无效的难度参数' });
      }

      const rankingEnabled = await ToolConfig.getValue('gomoku.enableRanking', true);
      if (!rankingEnabled) {
        return res.json({ code: 200, message: '排行榜暂未开放', data: [] });
      }

      limit = parseInt(limit, 10);
      if (Number.isNaN(limit) || limit <= 0) {
        limit = 10;
      }
      limit = Math.min(Math.max(limit, 1), 20);

      const cacheKey = this.getRankingCacheKey(difficulty, limit);
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({ code: 200, message: '获取排行榜成功', data: cached });
      }

      const records = await GomokuStats.find({ difficulty, wins: { $gt: 0 } })
        .sort({ wins: -1, updatedAt: 1, totalGames: -1 })
        .limit(limit)
        .populate('userId', 'username displayName avatar');

      const formatted = records.map((record, index) => {
        const stats = GomokuStats.formatStats(record.toObject());
        const user = record.userId;
        const displayName = user?.displayName || user?.username || '已注销用户';
        const avatar = user?.avatar || '';

        return {
          rank: index + 1,
          userId: user?._id || null,
          displayName,
          avatar,
          wins: stats.wins,
          losses: stats.losses,
          totalGames: stats.totalGames,
          winRate: stats.winRate,
          lastResult: stats.lastResult,
          updatedAt: stats.updatedAt
        };
      });

      cache.set(cacheKey, formatted, CACHE_TTL_SECONDS);

      return res.json({ code: 200, message: '获取排行榜成功', data: formatted });
    } catch (error) {
      logger.error('获取五子棋排行榜失败:', error);
      return res.status(500).json({ code: 500, message: '获取排行榜失败，请稍后再试' });
    }
  }

  /**
   * GET /api/tools/gomoku/stats
   */
  async getMyStats(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ code: 401, message: '需要登录才能查看统计' });
      }

      const records = await GomokuStats.find({ userId: req.user._id }).lean();
      const statsMap = new Map(records.map((item) => [item.difficulty, GomokuStats.formatStats(item)]));

      const data = DIFFICULTIES.map((difficulty) => {
        const stats = statsMap.get(difficulty);
        if (stats) {
          return stats;
        }
        return {
          userId: req.user._id,
          difficulty,
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
          lastResult: null,
          updatedAt: null
        };
      });

      return res.json({ code: 200, message: '获取统计成功', data });
    } catch (error) {
      logger.error('获取五子棋个人统计失败:', error);
      return res.status(500).json({ code: 500, message: '获取统计失败，请稍后再试' });
    }
  }

  getRankingCacheKey(difficulty, limit = 10) {
    return `gomoku:rankings:${difficulty}:${limit}`;
  }

  clearRankingCache(difficulty) {
    const keys = cache.keys().filter((key) => key.startsWith(`gomoku:rankings:${difficulty}`));
    if (keys.length > 0) {
      cache.del(keys);
    }
  }
}

module.exports = new GomokuController();
