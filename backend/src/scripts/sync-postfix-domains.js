#!/usr/bin/env node

/**
 * Postfix域名配置同步脚本
 * 将后端域名配置同步到Postfix的virtual_mailbox_domains
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置文件路径
const EMAIL_DOMAINS_CONFIG = path.join(__dirname, '../config/email-domains.json');
const POSTFIX_MAIN_CF = '/etc/postfix/main.cf';
const BACKUP_DIR = '/etc/postfix/backups';

// 日志函数
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// 确保备份目录存在
function ensureBackupDir() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      log(`创建备份目录: ${BACKUP_DIR}`);
    }
  } catch (error) {
    log(`创建备份目录失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

// 备份Postfix配置文件
function backupPostfixConfig() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `main.cf.backup.${timestamp}`);

    fs.copyFileSync(POSTFIX_MAIN_CF, backupFile);
    log(`Postfix配置已备份到: ${backupFile}`);

    // 只保留最近10个备份文件
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('main.cf.backup.'))
      .sort()
      .reverse();

    if (backupFiles.length > 10) {
      const filesToDelete = backupFiles.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        log(`删除旧备份文件: ${file}`);
      });
    }
  } catch (error) {
    log(`备份Postfix配置失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

// 读取域名配置
function loadDomainConfig() {
  try {
    if (!fs.existsSync(EMAIL_DOMAINS_CONFIG)) {
      log(`域名配置文件不存在: ${EMAIL_DOMAINS_CONFIG}`, 'WARN');
      return { domains: ['godaug.fun'] }; // 默认域名
    }

    const configData = fs.readFileSync(EMAIL_DOMAINS_CONFIG, 'utf8');
    const config = JSON.parse(configData);

    if (!config.domains || !Array.isArray(config.domains)) {
      log('域名配置格式错误，使用默认配置', 'WARN');
      return { domains: ['godaug.fun'] };
    }

    log(`读取到 ${config.domains.length} 个域名: ${config.domains.join(', ')}`);
    return config;
  } catch (error) {
    log(`读取域名配置失败: ${error.message}`, 'ERROR');
    return { domains: ['godaug.fun'] }; // 返回默认配置
  }
}

// 读取当前Postfix配置
function getCurrentPostfixDomains() {
  try {
    const configContent = fs.readFileSync(POSTFIX_MAIN_CF, 'utf8');
    const match = configContent.match(/^virtual_mailbox_domains\s*=\s*(.+)$/m);

    if (match) {
      const domains = match[1].trim().split(/\s+/).filter(d => d.length > 0);
      log(`当前Postfix配置的域名: ${domains.join(', ')}`);
      return domains;
    }

    log('未找到virtual_mailbox_domains配置', 'WARN');
    return [];
  } catch (error) {
    log(`读取Postfix配置失败: ${error.message}`, 'ERROR');
    return [];
  }
}

// 更新Postfix配置
function updatePostfixConfig(domains) {
  try {
    // 备份当前配置
    backupPostfixConfig();

    // 读取当前配置文件
    let configContent = fs.readFileSync(POSTFIX_MAIN_CF, 'utf8');

    // 构建新的域名配置行
    const newDomainsLine = `virtual_mailbox_domains = ${domains.join(' ')}`;

    // 替换或添加virtual_mailbox_domains配置
    if (configContent.includes('virtual_mailbox_domains')) {
      // 替换现有配置
      configContent = configContent.replace(
        /^virtual_mailbox_domains\s*=.*$/m,
        newDomainsLine
      );
      log('更新现有的virtual_mailbox_domains配置');
    } else {
      // 添加新配置
      configContent += `\n# 临时邮箱虚拟域名配置\n${newDomainsLine}\n`;
      log('添加新的virtual_mailbox_domains配置');
    }

    // 写入配置文件
    fs.writeFileSync(POSTFIX_MAIN_CF, configContent);
    log(`Postfix配置已更新: ${newDomainsLine}`);

    return true;
  } catch (error) {
    log(`更新Postfix配置失败: ${error.message}`, 'ERROR');
    return false;
  }
}

// 重新加载Postfix配置
function reloadPostfix() {
  try {
    execSync('postfix reload', { stdio: 'pipe' });
    log('Postfix配置已重新加载');
    return true;
  } catch (error) {
    log(`重新加载Postfix失败: ${error.message}`, 'ERROR');
    return false;
  }
}

// 验证配置是否生效
function validateConfig(expectedDomains) {
  try {
    const currentDomains = getCurrentPostfixDomains();
    const isValid = expectedDomains.every(domain => currentDomains.includes(domain));

    if (isValid) {
      log('✅ 配置验证成功，所有域名都已正确配置');
      return true;
    } else {
      const missing = expectedDomains.filter(domain => !currentDomains.includes(domain));
      log(`❌ 配置验证失败，缺少域名: ${missing.join(', ')}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`配置验证失败: ${error.message}`, 'ERROR');
    return false;
  }
}

// 检查是否为Linux环境
function isLinuxEnvironment() {
  return process.platform === 'linux' && fs.existsSync('/etc/postfix/main.cf');
}

// 主函数
function main() {
  try {
    log('开始同步Postfix域名配置...');

    // 检查环境
    if (!isLinuxEnvironment()) {
      log('非Linux环境或Postfix未安装，跳过同步', 'WARN');
      return true;
    }

    // 确保备份目录存在
    ensureBackupDir();

    // 读取域名配置
    const domainConfig = loadDomainConfig();
    const newDomains = domainConfig.domains;

    // 获取当前Postfix配置
    const currentDomains = getCurrentPostfixDomains();

    // 检查是否需要更新
    const needsUpdate = !newDomains.every(domain => currentDomains.includes(domain)) ||
      !currentDomains.every(domain => newDomains.includes(domain));

    if (!needsUpdate) {
      log('域名配置已是最新，无需更新');
      return true;
    }

    log('检测到域名配置变化，开始更新...');

    // 更新Postfix配置
    if (!updatePostfixConfig(newDomains)) {
      throw new Error('更新Postfix配置失败');
    }

    // 重新加载Postfix
    if (!reloadPostfix()) {
      throw new Error('重新加载Postfix失败');
    }

    // 验证配置
    if (!validateConfig(newDomains)) {
      throw new Error('配置验证失败');
    }

    log('✅ Postfix域名配置同步完成');
    return true;

  } catch (error) {
    log(`同步失败: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  syncPostfixDomains: main,
  loadDomainConfig,
  updatePostfixConfig,
  reloadPostfix,
  validateConfig
};
