#!/usr/bin/env node

/**
 * DNS配置检查工具
 * 帮助验证域名DNS配置是否正确
 */

const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDNS(domain) {
  log(`\n🔍 检查域名: ${domain}`, 'cyan');
  log('=' .repeat(50), 'blue');
  
  try {
    // 检查A记录
    log('\n📍 检查A记录...', 'yellow');
    try {
      const aRecords = await resolve4(domain);
      log(`✅ A记录: ${aRecords.join(', ')}`, 'green');
    } catch (error) {
      log(`❌ A记录未找到: ${error.message}`, 'red');
    }
    
    // 检查邮件服务器A记录
    log('\n📧 检查邮件服务器A记录...', 'yellow');
    try {
      const mailRecords = await resolve4(`mail.${domain}`);
      log(`✅ mail.${domain}: ${mailRecords.join(', ')}`, 'green');
    } catch (error) {
      log(`❌ mail.${domain} 未找到: ${error.message}`, 'red');
    }
    
    // 检查MX记录
    log('\n📮 检查MX记录...', 'yellow');
    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords.length > 0) {
        mxRecords.forEach(record => {
          log(`✅ MX记录: ${record.exchange} (优先级: ${record.priority})`, 'green');
        });
      } else {
        log(`❌ 未找到MX记录`, 'red');
      }
    } catch (error) {
      log(`❌ MX记录查询失败: ${error.message}`, 'red');
    }
    
    // 检查SPF记录
    log('\n🛡️  检查SPF记录...', 'yellow');
    try {
      const txtRecords = await resolveTxt(domain);
      const spfRecord = txtRecords.find(record => 
        record.some(txt => txt.startsWith('v=spf1'))
      );
      
      if (spfRecord) {
        log(`✅ SPF记录: ${spfRecord.join('')}`, 'green');
      } else {
        log(`⚠️  未找到SPF记录 (可选)`, 'yellow');
      }
    } catch (error) {
      log(`❌ TXT记录查询失败: ${error.message}`, 'red');
    }
    
  } catch (error) {
    log(`❌ DNS查询失败: ${error.message}`, 'red');
  }
}

async function main() {
  log('🌐 DNS配置检查工具', 'cyan');
  log('用于验证邮箱域名的DNS配置是否正确\n', 'blue');
  
  // 从命令行参数获取域名，或使用默认域名
  const domains = process.argv.slice(2);
  
  if (domains.length === 0) {
    log('使用方法: node test-dns-config.js <域名1> [域名2] ...', 'yellow');
    log('示例: node test-dns-config.js godaug.fun example.com', 'yellow');
    log('\n使用默认域名进行测试:', 'blue');
    domains.push('godaug.fun');
  }
  
  for (const domain of domains) {
    await checkDNS(domain);
  }
  
  log('\n💡 配置建议:', 'cyan');
  log('1. 确保A记录指向你的服务器IP', 'blue');
  log('2. 确保MX记录指向mail.yourdomain.com', 'blue');
  log('3. 确保mail.yourdomain.com的A记录指向服务器IP', 'blue');
  log('4. 可选：添加SPF记录防止垃圾邮件', 'blue');
  
  log('\n🔧 如果记录未找到，请在域名注册商管理面板中添加:', 'yellow');
  log('• Namecheap: Domain List → Manage → Advanced DNS', 'blue');
  log('• GoDaddy: 我的产品 → 域名 → DNS管理', 'blue');
  log('• 阿里云: 控制台 → 域名 → 解析设置', 'blue');
  log('• 腾讯云: 控制台 → 域名注册 → 解析', 'blue');
}

if (require.main === module) {
  main().catch(console.error);
}
