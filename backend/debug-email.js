#!/usr/bin/env node

/**
 * 邮件发送调试工具
 */

const nodemailer = require('nodemailer');
const axios = require('axios');

async function debugEmail() {
  const testEmail = 'wihte4xduv@godaug.fun'; // 使用你生成的邮箱
  
  console.log('🔍 开始邮件发送调试...');
  console.log('📧 目标邮箱:', testEmail);
  
  try {
    // 1. 检查邮箱是否存在于Inbucket
    console.log('\n1️⃣ 检查邮箱是否存在...');
    try {
      const checkResponse = await axios.get(`http://localhost:9000/api/v1/mailbox/${testEmail}`);
      console.log('✅ 邮箱存在，当前邮件数:', checkResponse.data.length);
    } catch (error) {
      console.log('⚠️ 邮箱不存在或为空');
    }
    
    // 2. 创建SMTP传输器
    console.log('\n2️⃣ 创建SMTP连接...');
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 2500,
      secure: false,
      ignoreTLS: true,
      requireTLS: false,
      auth: false,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      debug: true,
      logger: true
    });
    
    // 3. 验证SMTP连接
    console.log('\n3️⃣ 验证SMTP连接...');
    await transporter.verify();
    console.log('✅ SMTP连接验证成功');
    
    // 4. 发送测试邮件
    console.log('\n4️⃣ 发送测试邮件...');
    const mailOptions = {
      from: 'debug@system.local',
      to: testEmail,
      subject: '🔧 调试测试邮件',
      text: `这是一封调试测试邮件。\n\n收件人: ${testEmail}\n发送时间: ${new Date().toISOString()}\n\n如果收到此邮件，说明邮件系统工作正常。`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #e74c3c;">🔧 调试测试邮件</h2>
          <p>这是一封调试测试邮件。</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>收件人:</strong> ${testEmail}</p>
            <p><strong>发送时间:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="color: #27ae60;">✅ 如果收到此邮件，说明邮件系统工作正常。</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    
    // 5. 等待并检查邮件是否到达
    console.log('\n5️⃣ 等待邮件到达...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const afterResponse = await axios.get(`http://localhost:9000/api/v1/mailbox/${testEmail}`);
      console.log('📬 邮件检查结果:');
      console.log('   邮件总数:', afterResponse.data.length);
      
      if (afterResponse.data.length > 0) {
        console.log('✅ 邮件接收成功!');
        afterResponse.data.forEach((msg, index) => {
          console.log(`   邮件 ${index + 1}:`);
          console.log(`     ID: ${msg.id}`);
          console.log(`     发件人: ${msg.from}`);
          console.log(`     主题: ${msg.subject}`);
          console.log(`     时间: ${msg.date}`);
        });
      } else {
        console.log('❌ 邮件未到达');
      }
    } catch (error) {
      console.log('❌ 检查邮件失败:', error.message);
    }
    
    // 6. 测试其他域名
    console.log('\n6️⃣ 测试localhost域名...');
    const localhostEmail = 'test@localhost';
    
    try {
      const localhostMailOptions = {
        from: 'debug@system.local',
        to: localhostEmail,
        subject: '🔧 localhost测试邮件',
        text: '这是发送到localhost的测试邮件'
      };
      
      const localhostInfo = await transporter.sendMail(localhostMailOptions);
      console.log('✅ localhost邮件发送成功:', localhostInfo.messageId);
      
      // 等待并检查
      await new Promise(resolve => setTimeout(resolve, 2000));
      const localhostCheck = await axios.get(`http://localhost:9000/api/v1/mailbox/${localhostEmail}`);
      console.log('📬 localhost邮件数量:', localhostCheck.data.length);
      
    } catch (error) {
      console.log('❌ localhost测试失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行调试
debugEmail().then(() => {
  console.log('\n🏁 调试完成');
}).catch(console.error);
