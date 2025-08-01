const express = require('express');

const router = express.Router();

// 获取游戏列表
router.get('/', async (req, res, next) => {
  try {
    // 暂时返回模拟数据
    const games = [
      {
        _id: '1',
        name: '贪吃蛇',
        description: '经典的贪吃蛇游戏',
        category: '休闲',
        thumbnail: '/uploads/games/snake.svg',
        playCount: 1234
      },
      {
        _id: '2',
        name: '俄罗斯方块',
        description: '经典的俄罗斯方块游戏',
        category: '益智',
        thumbnail: '/uploads/games/tetris.svg',
        playCount: 2345
      }
    ];

    res.json({
      code: 200,
      message: '获取游戏列表成功',
      data: {
        games,
        pagination: {
          page: 1,
          limit: 10,
          total: games.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取游戏详情
router.get('/:id', async (req, res, next) => {
  try {
    // 暂时返回模拟数据
    const game = {
      _id: req.params.id,
      name: '贪吃蛇',
      description: '经典的贪吃蛇游戏，控制蛇吃食物并避免撞到自己',
      category: '休闲',
      thumbnail: '/uploads/games/snake.svg',
      url: '/games/snake.html',
      playCount: 1234,
      createdAt: new Date()
    };

    res.json({
      code: 200,
      message: '获取游戏详情成功',
      data: game
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
