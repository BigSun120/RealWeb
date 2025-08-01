const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const SecurityConfig = require('../models/SecurityConfig');
const logger = require('../utils/logger');

const router = express.Router();

// 获取当前激活的安全配置（公开接口）
router.get('/config', async (req, res, next) => {
  try {
    const config = await SecurityConfig.getActiveConfig();
    
    res.json({
      code: 200,
      message: '获取安全配置成功',
      data: {
        level: config.level,
        name: config.name,
        description: config.description,
        rules: config.rules
      }
    });
  } catch (error) {
    logger.error('获取安全配置失败:', error);
    next(error);
  }
});

// 获取所有安全配置（管理员接口）
router.get('/configs', auth, async (req, res, next) => {
  try {
    const configs = await SecurityConfig.find().sort({ level: 1 });
    
    res.json({
      code: 200,
      message: '获取安全配置列表成功',
      data: configs
    });
  } catch (error) {
    logger.error('获取安全配置列表失败:', error);
    next(error);
  }
});

// 更新安全配置（管理员接口）
router.put('/config/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 验证必填字段
    if (!updateData.name || !updateData.description || !updateData.rules) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }
    
    // 验证规则
    const { rules } = updateData;
    if (!rules.minLength || rules.minLength < 4 || rules.minLength > 20) {
      return res.status(400).json({
        code: 400,
        message: '密码最小长度必须在4-20之间'
      });
    }
    
    const config = await SecurityConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '安全配置不存在'
      });
    }
    
    logger.info(`用户 ${req.user.username} 更新安全配置: ${config.name}`);
    
    res.json({
      code: 200,
      message: '安全配置更新成功',
      data: config
    });
  } catch (error) {
    logger.error('更新安全配置失败:', error);
    next(error);
  }
});

// 激活安全配置（管理员接口）
router.post('/config/:id/activate', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const config = await SecurityConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        code: 404,
        message: '安全配置不存在'
      });
    }
    
    config.isActive = true;
    await config.save();
    
    logger.info(`用户 ${req.user.username} 激活安全配置: ${config.name}`);
    
    res.json({
      code: 200,
      message: '安全配置激活成功',
      data: config
    });
  } catch (error) {
    logger.error('激活安全配置失败:', error);
    next(error);
  }
});

// 重置为默认配置（管理员接口）
router.post('/reset-defaults', auth, async (req, res, next) => {
  try {
    // 删除所有现有配置
    await SecurityConfig.deleteMany({});
    
    // 重新初始化默认配置
    await SecurityConfig.initializeDefaults();
    
    const configs = await SecurityConfig.find().sort({ level: 1 });
    
    logger.info(`用户 ${req.user.username} 重置安全配置为默认值`);
    
    res.json({
      code: 200,
      message: '安全配置重置成功',
      data: configs
    });
  } catch (error) {
    logger.error('重置安全配置失败:', error);
    next(error);
  }
});

module.exports = router;
