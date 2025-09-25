const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

/**
 * 邮件服务类
 * 负责发送各种类型的邮件，包括验证邮件、欢迎邮件等
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.init();
  }

  /**
   * 初始化邮件服务
   */
  async init() {
    try {
      // 创建邮件传输器
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 2500,
        secure: process.env.SMTP_SECURE === 'true',
        ignoreTLS: process.env.SMTP_IGNORE_TLS !== 'false',
        requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
        auth:
          process.env.SMTP_AUTH === 'true'
            ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
            : false,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000
      });

      // 验证连接
      if (process.env.NODE_ENV !== 'test') {
        await this.verifyConnection();
      }

      console.log('✅ 邮件服务初始化成功');
    } catch (error) {
      console.error('❌ 邮件服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证邮件服务连接
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ 邮件服务器连接验证成功');
      return true;
    } catch (error) {
      console.error('❌ 邮件服务器连接验证失败:', error);
      return false;
    }
  }

  /**
   * 发送邮箱验证邮件
   * @param {Object} user - 用户对象
   * @param {string} verificationUrl - 验证链接
   */
  async sendVerificationEmail(user, verificationUrl) {
    try {
      const template = await this.getEmailTemplate('verification');

      const mailOptions = {
        from: this.getFromAddress(),
        to: user.email,
        subject: '📧 验证您的邮箱地址 - ' + this.getSiteName(),
        html: template
          .replace(/{{username}}/g, user.displayName || user.username)
          .replace(/{{email}}/g, user.email)
          .replace(/{{verificationUrl}}/g, verificationUrl)
          .replace(/{{siteName}}/g, this.getSiteName())
          .replace(/{{siteUrl}}/g, this.getSiteUrl()),
        text: this.generateVerificationTextEmail(user, verificationUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ 验证邮件发送成功:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ 验证邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送欢迎邮件
   * @param {Object} user - 用户对象
   */
  async sendWelcomeEmail(user) {
    try {
      const template = await this.getEmailTemplate('welcome');

      const mailOptions = {
        from: this.getFromAddress(),
        to: user.email,
        subject: '🎉 欢迎加入 ' + this.getSiteName(),
        html: template
          .replace(/{{username}}/g, user.displayName || user.username)
          .replace(/{{email}}/g, user.email)
          .replace(/{{siteName}}/g, this.getSiteName())
          .replace(/{{siteUrl}}/g, this.getSiteUrl()),
        text: this.generateWelcomeTextEmail(user)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ 欢迎邮件发送成功:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ 欢迎邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送密码重置邮件（为后续功能准备）
   * @param {Object} user - 用户对象
   * @param {string} resetUrl - 重置链接
   */
  async sendPasswordResetEmail(user, resetUrl) {
    try {
      const template = await this.getEmailTemplate('password-reset');

      const mailOptions = {
        from: this.getFromAddress(),
        to: user.email,
        subject: '🔐 重置您的密码 - ' + this.getSiteName(),
        html: template
          .replace(/{{username}}/g, user.displayName || user.username)
          .replace(/{{email}}/g, user.email)
          .replace(/{{resetUrl}}/g, resetUrl)
          .replace(/{{siteName}}/g, this.getSiteName())
          .replace(/{{siteUrl}}/g, this.getSiteUrl()),
        text: this.generatePasswordResetTextEmail(user, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ 密码重置邮件发送成功:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ 密码重置邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 获取邮件模板
   * @param {string} templateName - 模板名称
   */
  async getEmailTemplate(templateName) {
    try {
      // 如果模板已缓存，直接返回
      if (this.templates.has(templateName)) {
        return this.templates.get(templateName);
      }

      // 读取模板文件
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf8');

      // 缓存模板
      this.templates.set(templateName, template);

      return template;
    } catch (error) {
      console.error(`❌ 读取邮件模板失败 (${templateName}):`, error);
      // 返回默认模板
      return this.getDefaultTemplate(templateName);
    }
  }

  /**
   * 获取默认邮件模板
   * @param {string} templateName - 模板名称
   */
  getDefaultTemplate(templateName) {
    const templates = {
      verification: `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>邮箱验证 - {{siteName}}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #409eff, #5d9cec); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📧 邮箱验证</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{siteName}}</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">您好 {{username}}！</h2>
              <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                感谢您注册 {{siteName}}！为了保护您的账户安全，请验证您的邮箱地址。
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{verificationUrl}}" style="background: linear-gradient(135deg, #409eff, #5d9cec); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3); transition: all 0.3s ease;">
                  立即验证邮箱
                </a>
              </div>

              <!-- Alternative Link -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">如果按钮无法点击，请复制以下链接到浏览器：</p>
                <p style="word-break: break-all; color: #409eff; font-size: 14px; margin: 0;">{{verificationUrl}}</p>
              </div>

              <!-- Security Note -->
              <div style="border-left: 4px solid #ffc107; background: #fff9c4; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #856404; font-size: 14px; margin: 0;">
                  <strong>安全提醒：</strong>此验证链接将在24小时后过期，请尽快完成验证。
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">
                此邮件由 {{siteName}} 自动发送，请勿回复。
              </p>
              <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                © {{siteName}} · 保护您的隐私和数据安全
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      welcome: `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>欢迎加入 - {{siteName}}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #67c23a, #85ce61); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 欢迎加入</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{siteName}}</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">{{username}}，欢迎您！</h2>
              <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                恭喜您成功加入 {{siteName}}！您的邮箱已完成验证，现在可以畅享所有功能。
              </p>

              <!-- Features -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">您现在可以：</h3>
                <ul style="color: #5a6c7d; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>💬 发表评论，与其他用户互动</li>
                  <li>📝 发布精彩的文章和内容</li>
                  <li>🚀 使用所有网站的高级功能</li>
                  <li>🔔 接收重要通知和更新</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{siteUrl}}" style="background: linear-gradient(135deg, #67c23a, #85ce61); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(103, 194, 58, 0.3);">
                  立即开始探索 →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">
                此邮件由 {{siteName}} 自动发送，请勿回复。
              </p>
              <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                © {{siteName}} · 期待与您一起创造精彩内容
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      'password-reset': `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>密码重置 - {{siteName}}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f56c6c, #f78989); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔐 密码重置</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{siteName}}</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">您好 {{username}}！</h2>
              <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                我们收到了重置您密码的请求。如果这是您本人操作，请点击下方按钮重置密码。
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{resetUrl}}" style="background: linear-gradient(135deg, #f56c6c, #f78989); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 108, 108, 0.3);">
                  立即重置密码
                </a>
              </div>

              <!-- Alternative Link -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">如果按钮无法点击，请复制以下链接到浏览器：</p>
                <p style="word-break: break-all; color: #f56c6c; font-size: 14px; margin: 0;">{{resetUrl}}</p>
              </div>

              <!-- Security Notice -->
              <div style="border-left: 4px solid #dc3545; background: #f8d7da; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #721c24; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>安全提醒：</strong>
                </p>
                <ul style="color: #721c24; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li>此重置链接将在1小时后失效</li>
                  <li>如果您没有请求重置密码，请忽略此邮件</li>
                  <li>建议使用强密码保护您的账户安全</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">
                此邮件由 {{siteName}} 自动发送，请勿回复。
              </p>
              <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                © {{siteName}} · 保护您的账户安全
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return templates[templateName] || '<p>邮件模板未找到</p>';
  }

  /**
   * 生成纯文本验证邮件
   */
  generateVerificationTextEmail(user, verificationUrl) {
    return `
验证您的邮箱地址

您好 ${user.displayName || user.username}，

感谢您注册 ${this.getSiteName()}！请访问以下链接验证您的邮箱地址：

${verificationUrl}

此链接将在24小时后过期。

---
此邮件由 ${this.getSiteName()} 自动发送，请勿回复。
    `.trim();
  }

  /**
   * 生成纯文本欢迎邮件
   */
  generateWelcomeTextEmail(user) {
    return `
欢迎加入 ${this.getSiteName()}

您好 ${user.displayName || user.username}，

欢迎加入 ${this.getSiteName()}！您的邮箱已成功验证。

现在您可以：
- 发表评论和互动
- 发布文章和内容  
- 使用所有网站功能

访问网站：${this.getSiteUrl()}

---
此邮件由 ${this.getSiteName()} 自动发送，请勿回复。
    `.trim();
  }

  /**
   * 生成纯文本密码重置邮件
   */
  generatePasswordResetTextEmail(user, resetUrl) {
    return `
重置您的密码

您好 ${user.displayName || user.username}，

我们收到了重置您密码的请求。请访问以下链接重置密码：

${resetUrl}

此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。

---
此邮件由 ${this.getSiteName()} 自动发送，请勿回复。
    `.trim();
  }

  /**
   * 获取发件人地址
   */
  getFromAddress() {
    return process.env.EMAIL_FROM || `aowuwu@${this.getSiteDomain()}`;
  }

  /**
   * 获取网站名称
   */
  getSiteName() {
    return process.env.SITE_NAME || '网站';
  }

  /**
   * 获取网站URL
   */
  getSiteUrl() {
    return process.env.FRONTEND_URL || 'https://godaug.fun';
  }

  /**
   * 获取网站域名
   */
  getSiteDomain() {
    const url = this.getSiteUrl();
    try {
      return new URL(url).hostname;
    } catch {
      return 'godaug.fun';
    }
  }
}

// 创建单例实例
const emailService = new EmailService();

module.exports = emailService;
