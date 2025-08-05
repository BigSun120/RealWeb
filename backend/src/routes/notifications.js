const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { param, body, validationResult } = require('express-validator');

// 获取用户通知列表
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = '',
      isRead = ''
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (type) {
      options.type = type;
    }

    if (isRead !== '') {
      options.isRead = isRead === 'true';
    }

    const notifications = await Notification.getUserNotifications(req.user._id, options);
    const total = await Notification.countDocuments({
      userId: req.user._id,
      isDeleted: false,
      ...(type && { type }),
      ...(isRead !== '' && { isRead: isRead === 'true' })
    });



    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知列表失败'
    });
  }
});

// 获取未读通知数量
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    res.status(500).json({
      success: false,
      message: '获取未读通知数量失败'
    });
  }
});

// 标记单个通知为已读
router.put('/:notificationId/read',
  auth,
  [param('notificationId').isMongoId().withMessage('通知ID格式不正确')],
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

      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        userId: req.user._id,
        isDeleted: false
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: '通知不存在'
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        message: '通知已标记为已读',
        data: {
          notificationId: notification._id,
          isRead: notification.isRead,
          readAt: notification.readAt
        }
      });
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '标记通知为已读失败'
      });
    }
  }
);

// 批量标记通知为已读
router.put('/batch-read',
  auth,
  [
    body('notificationIds').optional().isArray().withMessage('通知ID列表必须是数组'),
    body('notificationIds.*').optional().isMongoId().withMessage('通知ID格式不正确')
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

      const { notificationIds } = req.body;

      const result = await Notification.markAllAsRead(req.user._id, notificationIds);

      res.json({
        success: true,
        message: `成功标记 ${result.modifiedCount} 条通知为已读`,
        data: {
          modifiedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('批量标记通知为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '批量标记通知为已读失败'
      });
    }
  }
);

// 删除通知
router.delete('/:notificationId',
  auth,
  [param('notificationId').isMongoId().withMessage('通知ID格式不正确')],
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

      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        userId: req.user._id,
        isDeleted: false
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: '通知不存在'
        });
      }

      await notification.softDelete();

      res.json({
        success: true,
        message: '通知已删除'
      });
    } catch (error) {
      console.error('删除通知失败:', error);
      res.status(500).json({
        success: false,
        message: '删除通知失败'
      });
    }
  }
);

// 清空所有通知
router.delete('/clear-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user._id,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `成功清空 ${result.modifiedCount} 条通知`,
      data: {
        deletedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('清空通知失败:', error);
    res.status(500).json({
      success: false,
      message: '清空通知失败'
    });
  }
});

module.exports = router;
