const express = require('express');
const { adminAuth } = require('../../middleware/auth');
const router = express.Router();

// 内存存储域名配置（生产环境建议使用数据库）
let domainConfig = {
  domains: [
    'godaug.fun',
    'localhost',
    'test.local'
  ],
  lastUpdated: new Date()
};

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
 * 更新tempEmail路由中的域名列表
 */
function updateTempEmailDomains(domains) {
  try {
    // 这里可以通过事件或直接修改来更新tempEmail路由的域名列表
    // 为了简单起见，我们将在tempEmail路由中添加一个获取动态域名的方法
    global.emailDomains = domains;
  } catch (error) {
    console.error('更新tempEmail域名列表失败:', error);
  }
}

// 导出域名配置获取函数
function getDomains() {
  return domainConfig.domains;
}

module.exports = router;
module.exports.getDomains = getDomains;
