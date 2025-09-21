const express = require('express');
const axios = require('axios');
const { auth, adminAuth, requireTempEmailAccess } = require('../middleware/auth');
const TempEmailUsageLog = require('../models/TempEmailUsageLog');
const TempEmailBox = require('../models/TempEmailBox');
const ToolConfig = require('../models/ToolConfig');
const router = express.Router();

// Inbucket API配置
const INBUCKET_API = 'http://localhost:9000/api/v1';

// 默认支持的域名列表
const DEFAULT_DOMAINS = [
  'godaug.fun',      // 你的自有域名 - 最高优先级
  'localhost',       // 本地开发测试
  'test.local'       // 本地测试域名
];

// 获取当前支持的域名列表
function getSupportedDomains() {
  return global.emailDomains || DEFAULT_DOMAINS;
}

/**
 * 生成随机字符串
 */
function generateRandomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成临时邮箱地址
 * POST /api/temp-email/generate
 */
router.post('/generate', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const { domain, customName } = req.body;

    // 验证域名
    const supportedDomains = getSupportedDomains();
    const selectedDomain = domain && supportedDomains.includes(domain)
      ? domain
      : supportedDomains[Math.floor(Math.random() * supportedDomains.length)];

    // 生成邮箱用户名
    const username = customName || generateRandomString(10);
    const email = `${username}@${selectedDomain}`;

    // 检查邮箱是否已存在
    const existingEmailBox = await TempEmailBox.findOne({ email });
    if (existingEmailBox) {
      // 如果邮箱已存在，更新最后访问时间
      await existingEmailBox.updateLastAccessed();

      return res.json({
        success: true,
        data: {
          email: existingEmailBox.email,
          domain: existingEmailBox.domain,
          username: existingEmailBox.username,
          createdAt: existingEmailBox.createdAt,
          webUrl: `http://localhost:9000/#/mailbox/${email}`,
          isExisting: true
        },
        message: '邮箱已存在，已更新访问时间'
      });
    }

    // 创建新的邮箱记录
    const emailBox = new TempEmailBox({
      email,
      username,
      domain: selectedDomain,
      userId: req.user._id,
      isCustomName: !!customName,
      createdFromIP: req.ip || req.connection.remoteAddress,
      createdFromUserAgent: req.get('User-Agent')
    });

    await emailBox.save();

    // 记录使用日志
    try {
      await TempEmailUsageLog.logAction({
        userId: req.user._id,
        action: 'generate',
        email,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        result: 'success',
        details: {
          domain: selectedDomain,
          username,
          customName: !!customName
        }
      });
    } catch (logError) {
      console.error('记录生成邮箱日志失败:', logError);
    }

    res.json({
      success: true,
      data: {
        email: emailBox.email,
        domain: emailBox.domain,
        username: emailBox.username,
        createdAt: emailBox.createdAt,
        webUrl: `http://localhost:9000/#/mailbox/${email}`,
        isExisting: false
      },
      message: '临时邮箱生成成功'
    });
  } catch (error) {
    console.error('生成临时邮箱失败:', error);

    // 处理重复邮箱错误
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '邮箱地址已存在，请重新生成'
      });
    }

    res.status(500).json({
      success: false,
      message: '生成临时邮箱失败'
    });
  }
});

/**
 * 获取邮箱邮件列表
 * GET /api/temp-email/:email/messages
 */
router.get('/:email/messages', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const { email } = req.params;

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    // 从Inbucket获取邮件列表
    const response = await axios.get(`${INBUCKET_API}/mailbox/${email}`, {
      timeout: 5000
    });

    const messages = response.data || [];

    // 记录查看邮件日志
    try {
      await TempEmailUsageLog.logAction({
        userId: req.user._id,
        action: 'view',
        email,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        result: 'success',
        details: {
          messageCount: messages.length
        }
      });
    } catch (logError) {
      console.error('记录查看邮件日志失败:', logError);
    }

    res.json({
      success: true,
      data: {
        email,
        messages: messages.map(msg => ({
          id: msg.id,
          from: msg.from,
          subject: msg.subject,
          date: msg.date,
          size: msg.size
        })),
        total: messages.length
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      // 邮箱不存在或无邮件
      return res.json({
        success: true,
        data: {
          email: req.params.email,
          messages: [],
          total: 0
        }
      });
    }

    console.error('获取邮件列表失败:', error.message);
    console.error('错误详情:', {
      url: `${INBUCKET_API}/mailbox/${req.params.email}`,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    res.status(500).json({
      success: false,
      message: '获取邮件列表失败: ' + (error.response?.statusText || error.message)
    });
  }
});

/**
 * 获取邮件详情
 * GET /api/temp-email/:email/messages/:messageId
 */
router.get('/:email/messages/:messageId', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const { email, messageId } = req.params;

    // 从Inbucket获取邮件详情
    const response = await axios.get(`${INBUCKET_API}/mailbox/${email}/${messageId}`, {
      timeout: 5000
    });

    const message = response.data;

    res.json({
      success: true,
      data: {
        id: message.id,
        from: message.from,
        to: message.to,
        subject: message.subject,
        date: message.date,
        body: {
          text: message.body?.text || '',
          html: message.body?.html || ''
        },
        attachments: message.attachments || []
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: '邮件不存在'
      });
    }

    console.error('获取邮件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取邮件详情失败'
    });
  }
});

/**
 * 删除邮件
 * DELETE /api/temp-email/:email/messages/:messageId
 */
router.delete('/:email/messages/:messageId', adminAuth, async (req, res) => {
  try {
    const { email, messageId } = req.params;

    // 从Inbucket删除邮件
    await axios.delete(`${INBUCKET_API}/mailbox/${email}/${messageId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      message: '邮件删除成功'
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: '邮件不存在'
      });
    }

    console.error('删除邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除邮件失败'
    });
  }
});

/**
 * 获取支持的域名列表
 * GET /api/temp-email/domains
 */
router.get('/domains', (req, res) => {
  res.json({
    success: true,
    data: getSupportedDomains()
  });
});

/**
 * 获取用户的邮箱列表
 * GET /api/temp-email/my-emails
 */
router.get('/my-emails', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // 获取用户的邮箱列表
    const emailBoxes = await TempEmailBox.find({
      userId: req.user._id,
      isActive: true
    })
      .sort({ lastAccessedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 获取总数
    const total = await TempEmailBox.countDocuments({
      userId: req.user._id,
      isActive: true
    });

    // 获取用户统计
    const stats = await TempEmailBox.getUserStats(req.user._id);

    res.json({
      success: true,
      data: {
        emailBoxes,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        stats
      }
    });
  } catch (error) {
    console.error('获取用户邮箱列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取邮箱列表失败'
    });
  }
});

/**
 * 获取所有邮箱的邮件概览
 * GET /api/temp-email/all-emails
 */
router.get('/all-emails', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const allEmails = [];

    // 从数据库获取用户的邮箱
    const userEmailBoxes = await TempEmailBox.getUserActiveEmails(req.user._id, 100);

    // 检查每个邮箱的邮件
    for (const emailBox of userEmailBoxes) {
      try {
        const response = await axios.get(`${INBUCKET_API}/mailbox/${emailBox.email}`, {
          timeout: 3000
        });

        const messages = response.data || [];

        // 更新邮箱的邮件数量
        await emailBox.updateMessageCount(messages.length);

        // 只返回有邮件的邮箱，并限制最多20条邮件
        if (messages.length > 0) {
          const limitedMessages = messages
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20)
            .map(msg => ({
              id: msg.id,
              from: msg.from,
              subject: msg.subject,
              date: msg.date,
              size: msg.size
            }));

          allEmails.push({
            email: emailBox.email,
            domain: emailBox.domain,
            messageCount: messages.length,
            messages: limitedMessages,
            createdAt: emailBox.createdAt,
            lastAccessedAt: emailBox.lastAccessedAt
          });
        }
      } catch (error) {
        // 忽略单个邮箱的错误，但记录日志
        console.warn(`获取邮箱 ${emailBox.email} 的邮件失败:`, error.message);
      }
    }

    // 按最后访问时间排序
    allEmails.sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));

    res.json({
      code: 200,
      success: true,
      data: {
        emailBoxes: allEmails,
        total: allEmails.length,
        totalMessages: allEmails.reduce((sum, box) => sum + box.messageCount, 0)
      }
    });
  } catch (error) {
    console.error('获取全部邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取全部邮件失败'
    });
  }
});



/**
 * 清空指定邮箱的所有邮件
 * DELETE /api/temp-email/:email/clear
 */
router.delete('/:email/clear', auth, requireTempEmailAccess, async (req, res) => {
  try {
    const { email } = req.params;

    // 获取邮箱所有邮件
    const messagesResponse = await axios.get(`${INBUCKET_API}/mailbox/${email}`, {
      timeout: 5000
    });

    const messages = messagesResponse.data || [];
    let deletedCount = 0;

    // 逐个删除邮件
    for (const message of messages) {
      try {
        await axios.delete(`${INBUCKET_API}/mailbox/${email}/${message.id}`, {
          timeout: 3000
        });
        deletedCount++;
      } catch (error) {
        console.error(`删除邮件 ${message.id} 失败:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        email,
        deletedCount,
        totalCount: messages.length
      },
      message: `成功清空邮箱，删除了 ${deletedCount} 封邮件`
    });
  } catch (error) {
    console.error('清空邮箱失败:', error);
    res.status(500).json({
      success: false,
      message: '清空邮箱失败: ' + error.message
    });
  }
});

/**
 * 清空用户所有邮箱的邮件
 * DELETE /api/temp-email/clear-all
 */
router.delete('/clear-all', auth, requireTempEmailAccess, async (req, res) => {
  try {
    let totalDeleted = 0;
    let totalMailboxes = 0;

    // 获取用户的所有活跃邮箱
    const userEmailBoxes = await TempEmailBox.getUserActiveEmails(req.user._id, 100);

    // 遍历用户的邮箱
    for (const emailBox of userEmailBoxes) {
      try {
        const messagesResponse = await axios.get(`${INBUCKET_API}/mailbox/${emailBox.email}`, {
          timeout: 3000
        });

        const messages = messagesResponse.data || [];
        if (messages.length > 0) {
          totalMailboxes++;

          // 删除该邮箱的所有邮件
          for (const message of messages) {
            try {
              await axios.delete(`${INBUCKET_API}/mailbox/${emailBox.email}/${message.id}`, {
                timeout: 2000
              });
              totalDeleted++;
            } catch (error) {
              console.error(`删除邮件失败:`, error.message);
            }
          }

          // 更新邮箱的邮件数量
          await emailBox.updateMessageCount(0);
        }
      } catch (error) {
        console.warn(`清空邮箱 ${emailBox.email} 失败:`, error.message);
      }
    }

    res.json({
      success: true,
      data: {
        deletedEmails: totalDeleted,
        clearedMailboxes: totalMailboxes
      },
      message: `成功清空 ${totalMailboxes} 个邮箱，删除了 ${totalDeleted} 封邮件`
    });
  } catch (error) {
    console.error('清空所有邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '清空所有邮件失败: ' + error.message
    });
  }
});

/**
 * 检查邮箱服务状态
 * GET /api/temp-email/status
 */
router.get('/status', async (req, res) => {
  try {
    // 简单的健康检查 - 访问Inbucket主页
    const response = await axios.get('http://localhost:9000/', {
      timeout: 3000
    });

    res.json({
      success: true,
      data: {
        status: 'online',
        inbucketUrl: 'http://localhost:9000',
        supportedDomains: getSupportedDomains(),
        apiUrl: INBUCKET_API
      }
    });
  } catch (error) {
    console.error('邮箱服务状态检查失败:', error.message);
    res.json({
      success: false,
      data: {
        status: 'offline',
        message: '邮箱服务未启动，请运行: npm run email:start'
      }
    });
  }
});

/**
 * 获取临时邮箱页面公告配置
 * GET /api/temp-email/notice
 */
router.get('/notice', async (req, res) => {
  try {
    // 获取页面公告配置
    const noticeConfig = await ToolConfig.getValue('tempEmail.notice', {
      enabled: false,
      title: '',
      content: '',
      type: 'info',
      closable: true
    });

    // 只返回启用的公告
    if (!noticeConfig.enabled || !noticeConfig.content) {
      return res.json({
        code: 200,
        success: true,
        data: null,
        message: '无公告信息'
      });
    }

    res.json({
      code: 200,
      success: true,
      data: noticeConfig,
      message: '获取公告成功'
    });

  } catch (error) {
    console.error('获取临时邮箱公告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取公告失败'
    });
  }
});

module.exports = router;
