const express = require('express');
const fs = require('fs');
const path = require('path');
const { adminAuth } = require('../../middleware/auth');
const router = express.Router();

// 导入Postfix同步脚本
const { syncPostfixDomains } = require('../../scripts/sync-postfix-domains');

// 域名配置文件路径
const CONFIG_FILE = path.join(__dirname, '../../config/email-domains.json');

// 默认域名配置
const DEFAULT_CONFIG = {
  domains: [
    'godaug.fun',
    // 'localhost',
    // 'test.local'
  ],
  lastUpdated: new Date()
};

// 确保配置目录存在
const configDir = path.dirname(CONFIG_FILE);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 加载域名配置
function loadDomainConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载域名配置失败:', error);
  }
  return DEFAULT_CONFIG;
}

// 保存域名配置
function saveDomainConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('保存域名配置失败:', error);
    return false;
  }
}

// 初始化域名配置
let domainConfig = loadDomainConfig();

/**
 * 获取域名配置
 * GET /api/admin/email-domains
 */
router.get('/', adminAuth, (req, res) => {
  res.json({
    success: true,
    data: domainConfig
  });
});

/**
 * 更新域名配置
 * POST /api/admin/email-domains
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const { domains } = req.body;

    // 验证输入
    if (!Array.isArray(domains)) {
      return res.status(400).json({
        success: false,
        message: '域名列表必须是数组格式'
      });
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const invalidDomains = domains.filter(domain => !domainRegex.test(domain));

    if (invalidDomains.length > 0) {
      return res.status(400).json({
        success: false,
        message: `无效的域名格式: ${invalidDomains.join(', ')}`
      });
    }

    // 更新配置
    domainConfig = {
      domains: [...new Set(domains)], // 去重
      lastUpdated: new Date()
    };

    // 保存到文件
    if (!saveDomainConfig(domainConfig)) {
      return res.status(500).json({
        success: false,
        message: '保存域名配置失败'
      });
    }

    // 更新tempEmail路由中的域名列表
    updateTempEmailDomains(domainConfig.domains);

    res.json({
      success: true,
      data: domainConfig,
      message: '域名配置更新成功'
    });
  } catch (error) {
    console.error('更新域名配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新域名配置失败'
    });
  }
});

/**
 * 添加单个域名
 * POST /api/admin/email-domains/add
 */
router.post('/add', adminAuth, (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: '域名不能为空'
      });
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        success: false,
        message: '无效的域名格式'
      });
    }

    // 检查是否已存在
    if (domainConfig.domains.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: '域名已存在'
      });
    }

    // 添加域名
    domainConfig.domains.push(domain);
    domainConfig.lastUpdated = new Date();

    // 保存到文件
    if (!saveDomainConfig(domainConfig)) {
      return res.status(500).json({
        success: false,
        message: '保存域名配置失败'
      });
    }

    // 更新tempEmail路由中的域名列表
    updateTempEmailDomains(domainConfig.domains);

    res.json({
      success: true,
      data: domainConfig,
      message: '域名添加成功'
    });
  } catch (error) {
    console.error('添加域名失败:', error);
    res.status(500).json({
      success: false,
      message: '添加域名失败'
    });
  }
});

/**
 * 删除域名
 * DELETE /api/admin/email-domains/:domain
 */
router.delete('/:domain', adminAuth, (req, res) => {
  try {
    const { domain } = req.params;

    const index = domainConfig.domains.indexOf(domain);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '域名不存在'
      });
    }

    // 删除域名
    domainConfig.domains.splice(index, 1);
    domainConfig.lastUpdated = new Date();

    // 保存到文件
    if (!saveDomainConfig(domainConfig)) {
      return res.status(500).json({
        success: false,
        message: '保存域名配置失败'
      });
    }

    // 更新tempEmail路由中的域名列表
    updateTempEmailDomains(domainConfig.domains);

    res.json({
      success: true,
      data: domainConfig,
      message: '域名删除成功'
    });
  } catch (error) {
    console.error('删除域名失败:', error);
    res.status(500).json({
      success: false,
      message: '删除域名失败'
    });
  }
});

/**
 * 重新排序域名（设置优先级）
 * POST /api/admin/email-domains/reorder
 */
router.post('/reorder', adminAuth, (req, res) => {
  try {
    const { domains } = req.body;

    if (!Array.isArray(domains)) {
      return res.status(400).json({
        success: false,
        message: '域名列表必须是数组格式'
      });
    }

    // 验证所有域名都存在
    const missingDomains = domains.filter(domain => !domainConfig.domains.includes(domain));
    if (missingDomains.length > 0) {
      return res.status(400).json({
        success: false,
        message: `域名不存在: ${missingDomains.join(', ')}`
      });
    }

    // 更新排序
    domainConfig.domains = domains;
    domainConfig.lastUpdated = new Date();

    // 保存到文件
    if (!saveDomainConfig(domainConfig)) {
      return res.status(500).json({
        success: false,
        message: '保存域名配置失败'
      });
    }

    // 更新tempEmail路由中的域名列表
    updateTempEmailDomains(domainConfig.domains);

    res.json({
      success: true,
      data: domainConfig,
      message: '域名排序更新成功'
    });
  } catch (error) {
    console.error('更新域名排序失败:', error);
    res.status(500).json({
      success: false,
      message: '更新域名排序失败'
    });
  }
});

/**
 * 更新tempEmail路由中的域名列表并同步Postfix配置
 */
function updateTempEmailDomains(domains) {
  try {
    // 更新全局域名列表
    global.emailDomains = domains;

    // 异步同步Postfix和Inbucket配置（不阻塞主流程）
    setImmediate(() => {
      try {
        // 只在Linux环境中执行同步
        if (process.platform === 'linux') {
          syncPostfixDomains();
          syncInbucketDomains(domains);
        }
      } catch (syncError) {
        console.error('配置同步失败:', syncError.message);
      }
    });
  } catch (error) {
    console.error('更新tempEmail域名列表失败:', error);
  }
}

/**
 * 同步Inbucket域名配置
 */
function syncInbucketDomains(domains) {
  try {
    const { execSync } = require('child_process');

    // 检查当前Inbucket容器
    try {
      const containerInfo = execSync('docker inspect inbucket-temp --format="{{.State.Running}}"', { encoding: 'utf8' }).trim();

      if (containerInfo !== 'true') {
        return;
      }
    } catch (error) {
      return;
    }

    // 构建新的域名列表（包含默认域名）
    const allDomains = [...new Set([...domains, 'localhost', 'test.local'])];
    const domainString = allDomains.join(',');

    // 重启Inbucket容器并更新域名配置
    const restartScript = `
      # 停止当前容器
      docker stop inbucket-temp

      # 启动新容器，包含更新的域名
      docker run -d --name inbucket-temp-new \\
        -p 9000:9000 -p 2500:2500 -p 1100:1100 \\
        -e INBUCKET_SMTP_DOMAIN="${domainString}" \\
        -e INBUCKET_SMTP_ADDR=0.0.0.0:2500 \\
        -e INBUCKET_WEB_ADDR=0.0.0.0:9000 \\
        -e INBUCKET_STORAGE_TYPE=memory \\
        -e INBUCKET_STORAGE_RETENTIONPERIOD=24h \\
        inbucket/inbucket:latest

      # 删除旧容器
      docker rm inbucket-temp

      # 重命名新容器
      docker rename inbucket-temp-new inbucket-temp
    `;

    // 执行重启脚本
    execSync(restartScript, { encoding: 'utf8' });

  } catch (error) {
    console.error('Inbucket域名配置同步失败:', error.message);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 手动同步Postfix配置
 * POST /api/admin/email-domains/sync-postfix
 */
router.post('/sync-postfix', adminAuth, (req, res) => {
  try {
    // 检查环境
    if (process.platform !== 'linux') {
      return res.json({
        success: true,
        message: '非Linux环境，无需同步Postfix配置',
        data: {
          domains: domainConfig.domains,
          syncTime: new Date(),
          platform: process.platform
        }
      });
    }

    // 执行同步
    syncPostfixDomains();

    res.json({
      success: true,
      message: 'Postfix配置同步成功',
      data: {
        domains: domainConfig.domains,
        syncTime: new Date()
      }
    });
  } catch (error) {
    console.error('同步Postfix配置失败:', error);
    res.status(500).json({
      success: false,
      message: '同步Postfix配置失败: ' + error.message
    });
  }
});

/**
 * 手动同步Inbucket配置
 * POST /api/admin/email-domains/sync-inbucket
 */
router.post('/sync-inbucket', adminAuth, (req, res) => {
  try {
    // 检查环境
    if (process.platform !== 'linux') {
      return res.json({
        success: true,
        message: '非Linux环境，无需同步Inbucket配置',
        data: {
          domains: domainConfig.domains,
          syncTime: new Date(),
          platform: process.platform
        }
      });
    }

    // 执行同步
    syncInbucketDomains(domainConfig.domains);

    res.json({
      success: true,
      message: 'Inbucket配置同步成功',
      data: {
        domains: domainConfig.domains,
        syncTime: new Date()
      }
    });
  } catch (error) {
    console.error('同步Inbucket配置失败:', error);
    res.status(500).json({
      success: false,
      message: '同步Inbucket配置失败: ' + error.message
    });
  }
});

/**
 * 同步所有配置（Postfix + Inbucket）
 * POST /api/admin/email-domains/sync-all
 */
router.post('/sync-all', adminAuth, (req, res) => {
  try {
    // 检查环境
    if (process.platform !== 'linux') {
      return res.json({
        success: true,
        message: '非Linux环境，无需同步配置',
        data: {
          domains: domainConfig.domains,
          syncTime: new Date(),
          platform: process.platform
        }
      });
    }

    // 执行同步
    syncPostfixDomains();
    syncInbucketDomains(domainConfig.domains);

    res.json({
      success: true,
      message: '所有配置同步成功',
      data: {
        domains: domainConfig.domains,
        syncTime: new Date()
      }
    });
  } catch (error) {
    console.error('同步配置失败:', error);
    res.status(500).json({
      success: false,
      message: '同步配置失败: ' + error.message
    });
  }
});

// 导出域名配置获取函数
function getDomains() {
  return domainConfig.domains;
}

module.exports = router;
module.exports.getDomains = getDomains;
