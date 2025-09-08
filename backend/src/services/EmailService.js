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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #409eff;">📧 验证您的邮箱地址</h2>
          <p>您好 {{username}}，</p>
          <p>感谢您注册 {{siteName}}！请点击下面的按钮验证您的邮箱地址：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background: #409eff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">验证邮箱</a>
          </div>
          <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
          <p style="color: #999; font-size: 12px;">此链接将在24小时后过期。</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由 {{siteName}} 自动发送，请勿回复。</p>
        </div>
      `,
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #67c23a;">🎉 欢迎加入:{{siteName}}</h2>
          <p>您好 {{username}}，</p>
          <p>欢迎加入 {{siteName}}！您的邮箱已成功验证。</p>
          <p>现在您可以：</p>
          <ul>
            <li>发表评论和互动</li>
            <li>发布文章和内容</li>
            <li>使用所有网站功能</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{siteUrl}}" style="background: #67c23a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">开始探索</a>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由 {{siteName}} 自动发送，请勿回复。</p>
        </div>
      `,
      'password-reset': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f56c6c;">🔐 重置您的密码</h2>
          <p>您好 {{username}}，</p>
          <p>我们收到了重置您密码的请求。请点击下面的按钮重置密码：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background: #f56c6c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">重置密码</a>
          </div>
          <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
          <p style="color: #999; font-size: 12px;">此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由 {{siteName}} 自动发送，请勿回复。</p>
        </div>
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
    return process.env.EMAIL_FROM || `noreply@${this.getSiteDomain()}`;
  }

  /**
   * 获取网站名称
   */
  getSiteName() {
    return process.env.SITE_NAME || '个人网站';
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
