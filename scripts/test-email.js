#!/usr/bin/env node

/**
 * 临时邮箱功能测试脚本
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';
const INBUCKET_BASE = 'http://localhost:9000/api/v1';

// 测试用户凭据（需要先登录获取token）
let authToken = '';

async function login() {
  try {
    console.log('🔐 正在登录测试用户...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123456'
    });
    
    if (response.data.code === 200) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testEmailGeneration() {
  try {
    console.log('\n📧 测试邮箱生成...');
    
    const response = await axios.post(
      `${API_BASE}/temp-email/generate`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      const email = response.data.data.email;
      console.log('✅ 邮箱生成成功:', email);
      return email;
    }
  } catch (error) {
    console.error('❌ 邮箱生成失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testSendEmail(toEmail) {
  try {
    console.log('\n📨 发送测试邮件...');
    
    // 使用nodemailer发送测试邮件到临时邮箱
    const nodemailer = require('nodemailer');
    
    // 创建SMTP传输器（连接到Inbucket）
    const transporter = nodemailer.createTransporter({
      host: 'localhost',
      port: 2500,
      secure: false,
      auth: false
    });
    
    const mailOptions = {
      from: 'test@example.com',
      to: toEmail,
      subject: '测试邮件 - 临时邮箱功能',
      text: '这是一封测试邮件，用于验证临时邮箱功能是否正常工作。',
      html: `
        <h2>🎉 临时邮箱测试成功！</h2>
        <p>这是一封测试邮件，用于验证临时邮箱功能。</p>
        <p><strong>收件人:</strong> ${toEmail}</p>
        <p><strong>发送时间:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p style="color: #666;">此邮件由临时邮箱系统自动发送</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ 测试邮件发送成功');
    
    return true;
  } catch (error) {
    console.error('❌ 发送邮件失败:', error.message);
    return false;
  }
}

async function testGetMessages(email) {
  try {
    console.log('\n📬 获取邮件列表...');
    
    // 等待邮件到达
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.get(
      `${API_BASE}/temp-email/${email}/messages`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      const messages = response.data.data.messages;
      console.log(`✅ 获取到 ${messages.length} 封邮件`);
      
      if (messages.length > 0) {
        console.log('📧 邮件列表:');
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.subject} (来自: ${msg.from})`);
        });
        return messages[0]; // 返回第一封邮件
      }
    }
  } catch (error) {
    console.error('❌ 获取邮件失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetMessageDetail(email, messageId) {
  try {
    console.log('\n📖 获取邮件详情...');
    
    const response = await axios.get(
      `${API_BASE}/temp-email/${email}/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      const message = response.data.data;
      console.log('✅ 邮件详情获取成功:');
      console.log(`  主题: ${message.subject}`);
      console.log(`  发件人: ${message.from}`);
      console.log(`  收件人: ${message.to}`);
      console.log(`  时间: ${message.date}`);
      console.log(`  内容预览: ${message.body.text?.substring(0, 100)}...`);
      return true;
    }
  } catch (error) {
    console.error('❌ 获取邮件详情失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testServiceStatus() {
  try {
    console.log('\n🔍 检查服务状态...');
    
    const response = await axios.get(`${API_BASE}/temp-email/status`);
    
    if (response.data.success) {
      console.log('✅ 邮箱服务在线');
      console.log(`  支持域名: ${response.data.data.supportedDomains.join(', ')}`);
    } else {
      console.log('⚠️  邮箱服务离线');
    }
  } catch (error) {
    console.error('❌ 服务状态检查失败:', error.message);
  }
}

async function runTests() {
  console.log('🚀 开始临时邮箱功能测试\n');
  
  // 检查服务状态
  await testServiceStatus();
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }
  
  // 生成邮箱
  const email = await testEmailGeneration();
  if (!email) {
    console.log('\n❌ 测试终止：邮箱生成失败');
    return;
  }
  
  // 发送测试邮件
  const sendSuccess = await testSendEmail(email);
  if (!sendSuccess) {
    console.log('\n❌ 测试终止：邮件发送失败');
    return;
  }
  
  // 获取邮件列表
  const firstMessage = await testGetMessages(email);
  if (!firstMessage) {
    console.log('\n⚠️  未收到邮件，可能需要等待更长时间');
    return;
  }
  
  // 获取邮件详情
  await testGetMessageDetail(email, firstMessage.id);
  
  console.log('\n🎉 所有测试完成！');
  console.log(`\n💡 你可以在浏览器中访问以下地址查看邮箱:`);
  console.log(`   http://localhost:9000/#/mailbox/${email}`);
  console.log(`   http://localhost:3000/temp-email`);
}

// 检查依赖
async function checkDependencies() {
  try {
    require('nodemailer');
  } catch (error) {
    console.log('📦 安装nodemailer依赖...');
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', 'nodemailer'], { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ nodemailer安装成功');
          resolve();
        } else {
          reject(new Error('nodemailer安装失败'));
        }
      });
    });
  }
}

// 主函数
async function main() {
  try {
    await checkDependencies();
    await runTests();
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
