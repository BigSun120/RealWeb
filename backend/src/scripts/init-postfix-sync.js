#!/usr/bin/env node

/**
 * 系统启动时初始化Postfix域名配置同步
 */

const { syncPostfixDomains } = require('./sync-postfix-domains');

function initPostfixSync() {
  console.log('🚀 初始化Postfix域名配置同步...');

  try {
    // 检查环境
    if (process.platform !== 'linux') {
      console.log('ℹ️  非Linux环境，跳过Postfix配置同步初始化');
      return;
    }

    // 延迟3秒执行，确保系统完全启动
    setTimeout(() => {
      try {
        syncPostfixDomains();
        console.log('✅ 系统启动时Postfix配置同步完成');
      } catch (error) {
        console.error('❌ 系统启动时Postfix配置同步失败:', error.message);
      }
    }, 3000);
  } catch (error) {
    console.error('初始化Postfix同步失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPostfixSync();
}

module.exports = { initPostfixSync };
