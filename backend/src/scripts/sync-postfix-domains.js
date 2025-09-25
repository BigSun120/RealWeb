#!/usr/bin/env node

/**
 * Postfix域名配置同步脚本（修复版）
 * 将后端域名配置同步到Postfix的transport_maps，转发给Inbucket
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置文件路径
const EMAIL_DOMAINS_CONFIG = path.join(__dirname, '../config/email-domains.json');
const POSTFIX_MAIN_CF = '/etc/postfix/main.cf';
const POSTFIX_TRANSPORT_FILE = '/etc/postfix/transport_temp_domains';
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

// 创建transport映射文件
function createTransportMaps(domains) {
  try {
    // 环境检查
    if (!isLinuxEnvironment()) {
      log('非Linux环境，跳过transport映射创建', 'WARN');
      return true;
    }

    // 为每个域名创建通配符匹配，转发给Inbucket (端口2500)
    const transportRules = domains.map(domain => {
      return `${domain} smtp:[127.0.0.1]:2500`;
    }).join('\n');

    // 写入transport文件
    fs.writeFileSync(POSTFIX_TRANSPORT_FILE, transportRules + '\n');
    log(`创建transport映射文件: ${POSTFIX_TRANSPORT_FILE}`);
    log(`映射规则:\n${transportRules}`);

    // 生成transport数据库
    execSync(`postmap ${POSTFIX_TRANSPORT_FILE}`, { stdio: 'pipe' });
    log('生成transport数据库完成');

    return true;
  } catch (error) {
    log(`创建transport映射失败: ${error.message}`, 'ERROR');
    return false;
  }
}

// 更新Postfix主配置文件
function updatePostfixMainConfig(domains) {
  try {
    // 环境检查
    if (!isLinuxEnvironment()) {
      log('非Linux环境，跳过Postfix配置更新', 'WARN');
      return true;
    }

    // 备份配置文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `main.cf.backup.${timestamp}`);
    fs.copyFileSync(POSTFIX_MAIN_CF, backupFile);
    log(`Postfix配置已备份到: ${backupFile}`);

    // 读取当前配置
    let configContent = fs.readFileSync(POSTFIX_MAIN_CF, 'utf8');

    // 移除virtual_mailbox_domains中的临时邮箱域名
    if (configContent.includes('virtual_mailbox_domains')) {
      configContent = configContent.replace(
        /^virtual_mailbox_domains\s*=.*$/m,
        '# virtual_mailbox_domains = (已移除，改用transport_maps)'
      );
      log('移除virtual_mailbox_domains配置');
    }

    // 确保mydestination只包含真实邮件域名
    const realMailDomains = 'mail.godaug.fun, localhost.godaug.fun, localhost';
    if (configContent.includes('mydestination')) {
      configContent = configContent.replace(
        /^mydestination\s*=.*$/m,
        `mydestination = ${realMailDomains}`
      );
      log(`更新mydestination: ${realMailDomains}`);
    }

    // 添加或更新transport_maps配置
    const transportMapsLine = `transport_maps = hash:${POSTFIX_TRANSPORT_FILE}`;
    if (configContent.includes('transport_maps')) {
      configContent = configContent.replace(
        /^transport_maps\s*=.*$/m,
        transportMapsLine
      );
      log('更新transport_maps配置');
    } else {
      configContent += `\n# 临时邮箱域名传输映射\n${transportMapsLine}\n`;
      log('添加transport_maps配置');
    }

    // 写入配置文件
    fs.writeFileSync(POSTFIX_MAIN_CF, configContent);
    log('Postfix主配置文件已更新');

    return true;
  } catch (error) {
    log(`更新Postfix主配置失败: ${error.message}`, 'ERROR');
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

// 验证配置
function validateConfig(domains) {
  try {
    // 检查transport文件是否存在
    if (!fs.existsSync(POSTFIX_TRANSPORT_FILE)) {
      log('Transport文件不存在', 'ERROR');
      return false;
    }

    // 检查transport数据库是否存在
    if (!fs.existsSync(POSTFIX_TRANSPORT_FILE + '.db')) {
      log('Transport数据库不存在', 'ERROR');
      return false;
    }

    // 验证transport映射内容
    const transportContent = fs.readFileSync(POSTFIX_TRANSPORT_FILE, 'utf8');
    const configuredDomains = transportContent.split('\n')
      .filter(line => line.trim())
      .map(line => line.split(' ')[0]);

    const allDomainsConfigured = domains.every(domain =>
      configuredDomains.includes(domain)
    );

    if (allDomainsConfigured) {
      log('✅ 配置验证成功，所有域名都已正确配置');
      return true;
    } else {
      log('❌ 配置验证失败，部分域名未配置', 'ERROR');
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
    log('开始同步Postfix域名配置（使用transport_maps）...');

    // 检查环境
    if (!isLinuxEnvironment()) {
      log('非Linux环境或Postfix未安装，跳过同步', 'WARN');
      return true;
    }

    // 确保备份目录存在
    ensureBackupDir();

    // 读取域名配置
    const domainConfig = loadDomainConfig();
    const domains = domainConfig.domains;

    log('开始更新配置...');

    // 创建transport映射文件
    if (!createTransportMaps(domains)) {
      throw new Error('创建transport映射失败');
    }

    // 更新Postfix主配置
    if (!updatePostfixMainConfig(domains)) {
      throw new Error('更新Postfix主配置失败');
    }

    // 重新加载Postfix
    if (!reloadPostfix()) {
      throw new Error('重新加载Postfix失败');
    }

    // 验证配置
    if (!validateConfig(domains)) {
      throw new Error('配置验证失败');
    }

    log('✅ Postfix域名配置同步完成（transport_maps模式）');
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
  createTransportMaps,
  updatePostfixMainConfig,
  updatePostfixConfig: updatePostfixMainConfig, // 保持向后兼容
  reloadPostfix,
  validateConfig
};
