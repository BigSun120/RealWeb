const express = require('express');
const { auth, optionalAuth } = require('../../middleware/auth');
const gomokuController = require('../../controllers/gomokuController');

const router = express.Router();

// 标记当前工具，便于分析
router.use((req, res, next) => {
  req.params.toolId = 'gomoku';
  next();
});


// 结果上报
router.post('/result', auth, gomokuController.submitResult.bind(gomokuController));

// 排行榜
router.get('/rankings', optionalAuth, gomokuController.getRankings.bind(gomokuController));

// 个人统计
router.get('/stats', auth, gomokuController.getMyStats.bind(gomokuController));

module.exports = router;

