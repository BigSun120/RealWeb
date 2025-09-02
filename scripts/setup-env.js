#!/usr/bin/env node

/**
 * 环境配置切换脚本
 * 用法: node scripts/setup-env.js [development|production]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const environment = args[0] || 'development';

const envFiles = {
  development: '.env.development',
  production: '.env.production'
};

const sourceFile = envFiles[environment];
const targetFile = '.env';

if (!sourceFile) {
  console.error('❌ 无效的环境参数。请使用: development 或 production');
  process.exit(1);
}

const sourcePath = path.join(__dirname, '..', sourceFile);
const targetPath = path.join(__dirname, '..', targetFile);

try {
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 环境配置文件不存在: ${sourceFile}`);
    process.exit(1);
  }

  // 备份现有的 .env 文件
  if (fs.existsSync(targetPath)) {
    const backupPath = `${targetPath}.backup.${Date.now()}`;
    fs.copyFileSync(targetPath, backupPath);
    console.log(`📦 已备份现有配置到: ${path.basename(backupPath)}`);
  }

  // 复制环境配置文件
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ 已切换到 ${environment} 环境配置`);
  
  // 显示当前配置信息
  const envContent = fs.readFileSync(targetPath, 'utf8');
  const nodeEnv = envContent.match(/NODE_ENV=(.+)/)?.[1] || 'unknown';
  const port = envContent.match(/PORT=(.+)/)?.[1] || 'unknown';
  const mongoUri = envContent.match(/MONGODB_URI=(.+)/)?.[1] || 'unknown';
  
  console.log('\n📋 当前配置信息:');
  console.log(`   环境: ${nodeEnv}`);
  console.log(`   端口: ${port}`);
  console.log(`   数据库: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);
  
  if (environment === 'development') {
    console.log('\n💡 开发环境提示:');
    console.log('   - 确保本地MongoDB服务运行在27017端口');
    console.log('   - 或者使用 Docker: docker run -d --name mongodb-dev -p 27017:27017 mongo:latest');
    console.log('   - 启动项目: npm run dev');
  } else {
    console.log('\n💡 生产环境提示:');
    console.log('   - 确保生产环境MongoDB服务可用');
    console.log('   - 构建项目: npm run build');
    console.log('   - 启动服务: npm start 或使用 PM2');
  }

} catch (error) {
  console.error('❌ 配置切换失败:', error.message);
  process.exit(1);
}
