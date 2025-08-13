#!/usr/bin/env node

/**
 * 模拟外部邮件发送测试
 * 用于测试临时邮箱接收功能
 */

const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function sendExternalTestEmail() {
  try {
    console.log('📧 外部邮件发送测试工具\n');
    
    // 获取目标邮箱
    const targetEmail = await new Promise((resolve) => {
      rl.question('请输入目标邮箱地址 (例: test123@godaug.fun): ', resolve);
    });
    
    // 获取发件人
    const fromEmail = await new Promise((resolve) => {
      rl.question('请输入发件人邮箱 (例: sender@gmail.com): ', resolve);
    });
    
    // 获取邮件主题
    const subject = await new Promise((resolve) => {
      rl.question('请输入邮件主题 (默认: 外部测试邮件): ', (answer) => {
        resolve(answer || '外部测试邮件');
      });
    });
    
    rl.close();
    
    console.log('\n🚀 正在发送邮件...');
    
    // 创建SMTP传输器（连接到本地Inbucket）
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 2500,
      secure: false,
      ignoreTLS: true,
      requireTLS: false,
      auth: false
    });
    
    const mailOptions = {
      from: fromEmail,
      to: targetEmail,
      subject: subject,
      text: `这是一封模拟的外部邮件测试。

发件人: ${fromEmail}
收件人: ${targetEmail}
发送时间: ${new Date().toLocaleString()}

这封邮件用于测试临时邮箱系统是否能正确接收和显示外部邮件。

如果你在临时邮箱界面中看到这封邮件，说明系统工作正常！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e74c3c;">📧 外部邮件测试</h2>
          <p>这是一封模拟的外部邮件测试。</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>发件人:</strong> ${fromEmail}</p>
            <p><strong>收件人:</strong> ${targetEmail}</p>
            <p><strong>发送时间:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #27ae60;">✅ 如果你在临时邮箱界面中看到这封邮件，说明系统工作正常！</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            此邮件由临时邮箱测试工具发送<br>
            模拟外部邮件发送场景
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ 邮件发送成功!');
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`📬 Response: ${info.response}`);
    console.log('\n💡 现在可以在临时邮箱界面中刷新查看邮件了！');
    console.log(`🌐 Web界面: http://localhost:3000/temp-email`);
    console.log(`📧 Inbucket: http://localhost:9000/#/mailbox/${targetEmail}`);
    
  } catch (error) {
    console.error('❌ 发送失败:', error.message);
  }
}

sendExternalTestEmail();
