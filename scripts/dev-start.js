#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 自动检测Docker环境并启动3端服务
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查Docker是否安装
function checkDocker() {
  return new Promise((resolve) => {
    exec('docker --version', (error) => {
      resolve(!error);
    });
  });
}

// 检查Docker容器是否运行
function checkInbucketRunning() {
  return new Promise((resolve) => {
    exec('docker ps | grep inbucket-dev', (error, stdout) => {
      resolve(stdout.trim().length > 0);
    });
  });
}

// 启动Inbucket
function startInbucket() {
  return new Promise((resolve, reject) => {
    log('🚀 启动Inbucket邮箱服务...', 'cyan');

    const dockerCmd = [
      'run', '--rm', '--name', 'inbucket-dev',
      '-p', '9000:9000',
      '-p', '2500:2500',
      '-p', '1100:1100',
      '-e', 'INBUCKET_SMTP_DOMAIN=localhost,test.local,dev.local,example.com,tempmail.dev',
      '-e', 'INBUCKET_WEB_CORSORIGIN=http://localhost:3000,http://localhost:5173',
      '-d',
      'inbucket/inbucket:latest'
    ];

    const docker = spawn('docker', dockerCmd);

    docker.on('close', (code) => {
      if (code === 0) {
        log('✅ Inbucket邮箱服务启动成功', 'green');
        log('📧 邮箱Web界面: http://localhost:9000', 'blue');
        log('📨 SMTP服务器: localhost:2500', 'blue');
        resolve();
      } else {
        reject(new Error(`Inbucket启动失败，退出码: ${code}`));
      }
    });
  });
}

// 主函数
async function main() {
  try {
    log('🔍 检查开发环境...', 'yellow');

    // 检查Docker
    const dockerInstalled = await checkDocker();
    if (!dockerInstalled) {
      log('❌ Docker未安装，请先安装Docker', 'red');
      log('💡 安装指南: https://docs.docker.com/get-docker/', 'blue');
      process.exit(1);
    }
    log('✅ Docker已安装', 'green');

    // 检查Inbucket是否已运行
    const inbucketRunning = await checkInbucketRunning();
    if (inbucketRunning) {
      log('ℹ️  Inbucket已在运行中', 'yellow');
    } else {
      await startInbucket();
    }

    // 等待服务启动
    log('⏳ 等待服务启动...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    log('🎉 所有服务启动完成！', 'green');
    log('', 'reset');
    log('📱 前端: http://localhost:3000 (或 5173)', 'blue');
    log('🔗 后端API: http://localhost:8001', 'blue');
    log('📧 邮箱服务: http://localhost:9000', 'blue');
    log('', 'reset');
    log('💡 使用 Ctrl+C 停止所有服务', 'yellow');

  } catch (error) {
    log(`❌ 启动失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  log('\n🛑 正在停止服务...', 'yellow');
  exec('docker stop inbucket-dev', () => {
    log('✅ 服务已停止', 'green');
    process.exit(0);
  });
});

if (require.main === module) {
  main();
}

module.exports = { checkDocker, startInbucket };
