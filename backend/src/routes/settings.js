const express = require('express');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

const router = express.Router();

// 获取公开的网站设置（不需要认证）
router.get('/site', async (req, res, next) => {
  try {
    const siteSettings = await Settings.getSetting('site');
    
    // 只返回公开的设置信息
    const publicSettings = {
      name: siteSettings.name || '个人网站',
      description: siteSettings.description || '分享技术与生活',
      logo: siteSettings.logo || '',
      email: siteSettings.email || ''
    };
    
    res.json({
      code: 200,
      message: '获取网站设置成功',
      data: publicSettings
    });

  } catch (error) {
    logger.error('获取网站设置失败:', error);
    next(error);
  }
});

// 获取公开的个人信息（不需要认证）
router.get('/personal', async (req, res, next) => {
  try {
    const personalSettings = await Settings.getSetting('personal');
    
    // 只返回公开的个人信息
    const publicInfo = {
      bio: personalSettings.bio || '',
      github: personalSettings.github || '',
      weibo: personalSettings.weibo || '',
      email: personalSettings.email || ''
    };
    
    res.json({
      code: 200,
      message: '获取个人信息成功',
      data: publicInfo
    });

  } catch (error) {
    logger.error('获取个人信息失败:', error);
    next(error);
  }
});

// 获取公开的博客设置（不需要认证）
router.get('/blog', async (req, res, next) => {
  try {
    const blogSettings = await Settings.getSetting('blog');
    
    // 只返回公开的博客设置
    const publicSettings = {
      pageSize: blogSettings.pageSize || 10,
      enableComments: blogSettings.enableComments !== false,
      enableLikes: blogSettings.enableLikes !== false,
      enableShare: blogSettings.enableShare !== false
    };
    
    res.json({
      code: 200,
      message: '获取博客设置成功',
      data: publicSettings
    });

  } catch (error) {
    logger.error('获取博客设置失败:', error);
    next(error);
  }
});

// 获取所有公开设置
router.get('/all', async (req, res, next) => {
  try {
    const [siteSettings, personalSettings, blogSettings] = await Promise.all([
      Settings.getSetting('site'),
      Settings.getSetting('personal'),
      Settings.getSetting('blog')
    ]);
    
    const publicSettings = {
      site: {
        name: siteSettings.name || '个人网站',
        description: siteSettings.description || '分享技术与生活',
        logo: siteSettings.logo || '',
        email: siteSettings.email || ''
      },
      personal: {
        bio: personalSettings.bio || '',
        github: personalSettings.github || '',
        weibo: personalSettings.weibo || '',
        email: personalSettings.email || ''
      },
      blog: {
        pageSize: blogSettings.pageSize || 10,
        enableComments: blogSettings.enableComments !== false,
        enableLikes: blogSettings.enableLikes !== false,
        enableShare: blogSettings.enableShare !== false
      }
    };
    
    res.json({
      code: 200,
      message: '获取设置成功',
      data: publicSettings
    });

  } catch (error) {
    logger.error('获取设置失败:', error);
    next(error);
  }
});

module.exports = router;
