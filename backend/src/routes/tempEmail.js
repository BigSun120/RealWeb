const express = require('express');
const axios = require('axios');
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

// 内存中的邮箱注册表（生产环境建议使用Redis或数据库）
const generatedEmails = new Set();

// 添加已知的邮箱到注册表
generatedEmails.add('wihte4xduv@godaug.fun');

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
router.post('/generate', async (req, res) => {
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

    // 记录生成的邮箱
    generatedEmails.add(email);

    res.json({
      success: true,
      data: {
        email,
        domain: selectedDomain,
        username,
        createdAt: new Date(),
        webUrl: `http://localhost:9000/#/mailbox/${email}`
      },
      message: '临时邮箱生成成功'
    });
  } catch (error) {
    console.error('生成临时邮箱失败:', error);
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
router.get('/:email/messages', async (req, res) => {
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
router.get('/:email/messages/:messageId', async (req, res) => {
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
router.delete('/:email/messages/:messageId', async (req, res) => {
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
 * 获取所有邮箱的邮件概览
 * GET /api/temp-email/all-emails
 */
router.get('/all-emails', async (req, res) => {
  try {
    const allEmails = [];

    // 方法1: 检查已生成的邮箱
    for (const email of generatedEmails) {
      try {
        const response = await axios.get(`${INBUCKET_API}/mailbox/${email}`, {
          timeout: 3000
        });

        const messages = response.data || [];
        if (messages.length > 0) {
          const domain = email.split('@')[1];
          allEmails.push({
            email,
            domain,
            messageCount: messages.length,
            messages: messages.map(msg => ({
              id: msg.id,
              from: msg.from,
              subject: msg.subject,
              date: msg.date,
              size: msg.size
            }))
          });
        }
      } catch (error) {
        // 忽略单个邮箱的错误
      }
    }

    // 方法2: 检查常见的邮箱地址（向后兼容）
    const commonPrefixes = ['test', 'demo', 'temp', 'mail', 'user', 'admin'];

    for (const domain of getSupportedDomains()) {
      for (const prefix of commonPrefixes) {
        const email = `${prefix}@${domain}`;

        // 跳过已经检查过的邮箱
        if (generatedEmails.has(email) || allEmails.find(box => box.email === email)) {
          continue;
        }

        try {
          const response = await axios.get(`${INBUCKET_API}/mailbox/${email}`, {
            timeout: 3000
          });

          const messages = response.data || [];
          if (messages.length > 0) {
            allEmails.push({
              email,
              domain,
              messageCount: messages.length,
              messages: messages.map(msg => ({
                id: msg.id,
                from: msg.from,
                subject: msg.subject,
                date: msg.date,
                size: msg.size
              }))
            });
          }
        } catch (error) {
          // 忽略单个邮箱的错误，继续检查其他邮箱
        }
      }
    }

    res.json({
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
 * 发送测试邮件
 * POST /api/temp-email/:email/send-test
 */
router.post('/:email/send-test', async (req, res) => {
  try {
    const { email } = req.params;
    const nodemailer = require('nodemailer');

    console.log('尝试发送测试邮件到:', email);

    // 创建SMTP传输器（连接到Inbucket）
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 2500,
      secure: false,
      ignoreTLS: true,
      requireTLS: false,
      auth: false,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    // 验证SMTP连接
    console.log('验证SMTP连接...');
    await transporter.verify();
    console.log('SMTP连接验证成功');

    const mailOptions = {
      from: 'test@system.local',
      to: email,
      subject: '🎉 测试邮件 - 临时邮箱功能验证',
      text: `这是一封测试邮件，用于验证临时邮箱功能是否正常工作。\n\n收件人: ${email}\n发送时间: ${new Date().toLocaleString()}\n\n如果您能看到这封邮件，说明临时邮箱功能工作正常！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #409eff;">🎉 测试邮件成功！</h2>
          <p>这是一封测试邮件，用于验证临时邮箱功能。</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>收件人:</strong> ${email}</p>
            <p><strong>发送时间:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #67c23a;">✅ 如果您能看到这封邮件，说明临时邮箱功能工作正常！</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由临时邮箱系统自动发送</p>
        </div>
      `
    };

    console.log('发送邮件...');
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);

    res.json({
      success: true,
      message: '测试邮件发送成功',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('发送测试邮件失败:', error.message);
    console.error('错误详情:', error);
    res.status(500).json({
      success: false,
      message: '发送测试邮件失败: ' + error.message
    });
  }
});

/**
 * 清空指定邮箱的所有邮件
 * DELETE /api/temp-email/:email/clear
 */
router.delete('/:email/clear', async (req, res) => {
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
 * 清空所有邮箱的邮件
 * DELETE /api/temp-email/clear-all
 */
router.delete('/clear-all', async (req, res) => {
  try {
    const supportedDomains = getSupportedDomains();
    const commonPrefixes = ['test', 'demo', 'temp', 'mail', 'user', 'admin'];

    let totalDeleted = 0;
    let totalMailboxes = 0;

    // 遍历所有可能的邮箱
    for (const domain of supportedDomains) {
      for (const prefix of commonPrefixes) {
        const email = `${prefix}@${domain}`;

        try {
          const messagesResponse = await axios.get(`${INBUCKET_API}/mailbox/${email}`, {
            timeout: 3000
          });

          const messages = messagesResponse.data || [];
          if (messages.length > 0) {
            totalMailboxes++;

            // 删除该邮箱的所有邮件
            for (const message of messages) {
              try {
                await axios.delete(`${INBUCKET_API}/mailbox/${email}/${message.id}`, {
                  timeout: 2000
                });
                totalDeleted++;
              } catch (error) {
                console.error(`删除邮件失败:`, error.message);
              }
            }
          }
        } catch (error) {
          // 忽略单个邮箱的错误
        }
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

module.exports = router;
