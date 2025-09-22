const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const PageBackground = require('../models/PageBackground');
const ToolConfig = require('../models/ToolConfig');
const { auth: requireAuth, adminAuth: requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const { createApiResponse } = require('../middleware/upload');

const router = express.Router();


// 统一上传根目录（优先使用 UPLOAD_PATH）
const baseUploadDir = path.resolve(process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'));
const backgroundsDir = path.join(baseUploadDir, 'backgrounds');

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = backgroundsDir;
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `bg-${uniqueSuffix}${ext}`);
  }
});

// 获取动态文件大小限制
const getFileSizeLimit = async () => {
  try {
    const config = await ToolConfig.findOne({ key: 'upload.maxFileSize' });
    if (config && config.value) {
      // 配置值已经是字节数，直接返回
      return config.value;
    }
    // 默认10MB
    return 10 * 1024 * 1024;
  } catch (error) {
    console.error('获取文件大小限制失败:', error);
    return 10 * 1024 * 1024; // 默认10MB
  }
};

// 创建动态上传配置
const createDynamicUpload = async () => {
  const fileSize = await getFileSizeLimit();
  return multer({
    storage,
    limits: {
      fileSize: fileSize,
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('只支持 JPG、PNG、WebP 图片格式和 MP4、WebM、OGG 视频格式'));
      }
    }
  });
};

// 默认上传配置（向后兼容）
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 默认10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、WebP 图片格式和 MP4、WebM、OGG 视频格式'));
    }
  }
});

// ==================== 前端API ====================

/**
 * 根据路径获取匹配的背景配置
 * GET /api/backgrounds/match?path=/blog/123
 */
router.get('/match', async (req, res) => {
  try {
    const { path: requestPath } = req.query;

    if (!requestPath) {
      return res.status(400).json({
        success: false,
        message: '缺少path参数'
      });
    }

    const config = await PageBackground.findMatchingConfig(requestPath);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取背景配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取背景配置失败'
    });
  }
});

/**
 * 获取特定配置详情
 * GET /api/backgrounds/config/:id
 */
router.get('/config/:id', [
  param('id').isMongoId().withMessage('无效的配置ID')
], validateRequest, async (req, res) => {
  try {
    const config = await PageBackground.findById(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取配置详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置详情失败'
    });
  }
});

// ==================== 管理员API ====================

/**
 * 获取所有背景配置
 * GET /api/admin/backgrounds
 */
router.get('/admin/configs', requireAuth, requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
], validateRequest, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const isActive = req.query.isActive;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    if (search) {
      query.$or = [
        { 'pathConfig.path': { $regex: search, $options: 'i' } },
        { 'pathConfig.description': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const [configs, total] = await Promise.all([
      PageBackground.find(query)
        .sort({ 'pathConfig.priority': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PageBackground.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        configs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取背景配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置列表失败'
    });
  }
});

/**
 * 创建背景配置
 * POST /api/admin/backgrounds
 */
router.post('/admin/configs', requireAuth, requireAdmin, [
  body('pathConfig.path').notEmpty().withMessage('路径不能为空'),
  body('pathConfig.matchType').isIn(['exact', 'prefix', 'wildcard', 'regex']).withMessage('无效的匹配类型'),
  body('pathConfig.priority').optional().isInt({ min: 1, max: 1000 }).withMessage('优先级必须在1-1000之间'),
  body('backgroundImage.url').notEmpty().withMessage('背景图片URL不能为空'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
], validateRequest, async (req, res) => {
  try {
    const configData = {
      ...req.body,
      uploadInfo: {
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        lastModified: new Date()
      }
    };

    const config = await PageBackground.createBackgroundConfig(configData);

    res.status(201).json({
      success: true,
      data: config,
      message: '背景配置创建成功'
    });
  } catch (error) {
    console.error('创建背景配置失败:', error);

    if (error.message.includes('已存在')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '创建配置失败'
    });
  }
});

/**
 * 更新背景配置
 * PUT /api/admin/backgrounds/:id
 */
router.put('/admin/configs/:id', requireAuth, requireAdmin, [
  param('id').isMongoId().withMessage('无效的配置ID'),
  body('pathConfig.path').optional().notEmpty().withMessage('路径不能为空'),
  body('pathConfig.matchType').optional().isIn(['exact', 'prefix', 'wildcard', 'regex']).withMessage('无效的匹配类型'),
  body('pathConfig.priority').optional().isInt({ min: 1, max: 1000 }).withMessage('优先级必须在1-1000之间'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
], validateRequest, async (req, res) => {
  try {
    const config = await PageBackground.updateBackgroundConfig(req.params.id, req.body);

    res.json({
      success: true,
      data: config,
      message: '背景配置更新成功'
    });
  } catch (error) {
    console.error('更新背景配置失败:', error);

    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('已存在')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
});

/**
 * 删除背景配置
 * DELETE /api/admin/backgrounds/:id
 */
router.delete('/admin/configs/:id', requireAuth, requireAdmin, [
  param('id').isMongoId().withMessage('无效的配置ID')
], validateRequest, async (req, res) => {
  try {
    const config = await PageBackground.findById(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    // 删除关联的图片文件
    if (config.backgroundImage?.url) {
      try {
        const imagePath = path.join(backgroundsDir, path.basename(config.backgroundImage.url));
        await fs.unlink(imagePath);
      } catch (error) {
        console.warn('删除图片文件失败:', error.message);
      }
    }

    await PageBackground.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '背景配置删除成功'
    });
  } catch (error) {
    console.error('删除背景配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除配置失败'
    });
  }
});

/**
 * 上传背景图片
 * POST /api/admin/backgrounds/upload
 */
router.post('/admin/upload', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // 使用动态配置创建上传实例
    const dynamicUpload = await createDynamicUpload();
    dynamicUpload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json(createApiResponse(false, null, err.message || '文件上传失败', 400));
      }
      next();
    });
  } catch (error) {
    console.error('创建上传配置失败:', error);
    res.status(500).json(createApiResponse(false, null, '服务器内部错误', 500));
  }
}, async (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file,
      body: req.body,
      headers: req.headers['content-type']
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    const file = req.file;
    const filePath = file.path;
    const isVideo = file.mimetype.startsWith('video/');

    let metadata = {};

    if (isVideo) {
      // 对于视频文件，获取基本信息
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      metadata = {
        format: file.mimetype.split('/')[1],
        size: stats.size,
        width: null, // 视频尺寸需要其他库获取，这里暂时设为null
        height: null
      };
    } else {
      // 对于图片文件，使用Sharp获取详细信息
      metadata = await sharp(filePath).metadata();
    }

    // 生成不同尺寸的图片（可选）
    const baseUrl = '/uploads/backgrounds';
    const filename = file.filename;

    // 生成移动端图片（仅对图片文件）
    let mobileUrl = null;
    if (!isVideo && req.body.generateMobile === 'true') {
      const mobileFilename = `mobile-${filename}`;
      const mobilePath = path.join(path.dirname(filePath), mobileFilename);

      await sharp(filePath)
        .resize(800, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 80 })
        .toFile(mobilePath);

      mobileUrl = `${baseUrl}/${mobileFilename}`;
    }

    const fileData = {
      url: `${baseUrl}/${filename}`,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      size: file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      format: metadata.format,
      mobileUrl,
      type: isVideo ? 'video' : 'image',
      mimetype: file.mimetype
    };

    res.json(createApiResponse(true, fileData, isVideo ? '视频上传成功' : '图片上传成功'));
  } catch (error) {
    console.error('图片上传失败:', error);

    // 清理上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('清理上传文件失败:', cleanupError);
      }
    }

    res.status(500).json(createApiResponse(false, null, '图片上传失败', 500));
  }
});

/**
 * 删除背景图片
 * DELETE /api/admin/backgrounds/image/:filename
 */
router.delete('/admin/image/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(backgroundsDir, filename);

    // 检查文件是否存在
    try {
      await fs.access(imagePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: '图片文件不存在'
      });
    }

    // 检查是否有配置在使用这个图片
    const config = await PageBackground.findOne({
      $or: [
        { 'backgroundImage.url': { $regex: filename } },
        { 'backgroundImage.mobileUrl': { $regex: filename } },
        { 'backgroundImage.tabletUrl': { $regex: filename } }
      ]
    });

    if (config) {
      return res.status(409).json({
        success: false,
        message: '该图片正在被配置使用，无法删除'
      });
    }

    // 删除文件
    await fs.unlink(imagePath);

    // 同时删除可能的移动端版本
    const mobileFilename = `mobile-${filename}`;
    const mobilePath = path.join(backgroundsDir, mobileFilename);
    try {
      await fs.unlink(mobilePath);
    } catch (error) {
      // 移动端文件可能不存在，忽略错误
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '删除图片失败'
    });
  }
});





// ==================== 批量操作API ====================

/**
 * 批量创建背景配置
 * POST /api/backgrounds/admin/batch/create
 */
router.post('/admin/batch/create', requireAdmin, [
  body('configs').isArray().withMessage('configs必须是数组'),
  body('configs.*.pathConfig.path').notEmpty().withMessage('路径不能为空'),
  body('configs.*.pathConfig.matchType').isIn(['exact', 'prefix', 'wildcard', 'regex']).withMessage('匹配类型无效')
], validateRequest, async (req, res) => {
  try {
    const { configs } = req.body;

    const results = {
      created: 0,
      failed: 0,
      errors: []
    };

    for (const configData of configs) {
      try {
        // 检查路径是否已存在
        const existingConfig = await PageBackground.findOne({
          'pathConfig.path': configData.pathConfig.path,
          'pathConfig.matchType': configData.pathConfig.matchType
        });

        if (existingConfig) {
          results.failed++;
          results.errors.push(`路径 ${configData.pathConfig.path} 已存在`);
          continue;
        }

        const newConfig = new PageBackground(configData);
        await newConfig.save();
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(`创建配置失败 (${configData.pathConfig?.path || '未知路径'}): ${error.message}`);
      }
    }

    const isSuccess = results.created > 0;
    res.json({
      success: isSuccess,
      message: isSuccess
        ? `批量创建完成，成功: ${results.created}，失败: ${results.failed}`
        : `批量创建失败，所有 ${results.failed} 个配置都创建失败`,
      data: results
    });
  } catch (error) {
    console.error('批量创建配置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量创建配置失败'
    });
  }
});

/**
 * 批量更新背景配置
 * PUT /api/backgrounds/admin/batch/update
 */
router.put('/admin/batch/update', requireAdmin, [
  body('ids').isArray().withMessage('ids必须是数组'),
  body('updateData').isObject().withMessage('updateData必须是对象')
], validateRequest, async (req, res) => {
  try {
    const { ids, updateData } = req.body;

    let updateQuery = {};

    // 处理显示设置
    if (updateData.displaySettings) {
      Object.keys(updateData.displaySettings).forEach(key => {
        updateQuery[`displaySettings.${key}`] = updateData.displaySettings[key];
      });
    }

    // 处理布局设置
    if (updateData.layoutSettings) {
      Object.keys(updateData.layoutSettings).forEach(key => {
        updateQuery[`layoutSettings.${key}`] = updateData.layoutSettings[key];
      });
    }

    // 处理激活状态
    if (updateData.isActive !== undefined) {
      updateQuery.isActive = updateData.isActive;
    }

    // 处理优先级更新
    if (updateData.priorityUpdate) {
      const { action, value } = updateData.priorityUpdate;

      if (action === 'set') {
        updateQuery['pathConfig.priority'] = value;
      } else if (action === 'increase') {
        // 需要逐个更新以支持增加操作
        for (const id of ids) {
          await PageBackground.findByIdAndUpdate(id, {
            $inc: { 'pathConfig.priority': value }
          });
        }
      } else if (action === 'decrease') {
        for (const id of ids) {
          await PageBackground.findByIdAndUpdate(id, {
            $inc: { 'pathConfig.priority': -value }
          });
        }
      }
    }

    // 执行批量更新（除了优先级增减操作）
    let result;
    if (Object.keys(updateQuery).length > 0) {
      result = await PageBackground.updateMany(
        { _id: { $in: ids } },
        { $set: updateQuery }
      );
    } else {
      result = { modifiedCount: ids.length }; // 优先级操作已经完成
    }

    res.json({
      success: true,
      message: `批量更新完成，更新了 ${result.modifiedCount} 个配置`,
      data: { updated: result.modifiedCount }
    });
  } catch (error) {
    console.error('批量更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新配置失败'
    });
  }
});

/**
 * 批量删除背景配置
 * DELETE /api/backgrounds/admin/batch/delete
 */
router.delete('/admin/batch/delete', requireAdmin, [
  body('ids').isArray().withMessage('ids必须是数组')
], validateRequest, async (req, res) => {
  try {
    const { ids } = req.body;

    const result = await PageBackground.deleteMany({
      _id: { $in: ids }
    });

    res.json({
      success: true,
      message: `批量删除完成，删除了 ${result.deletedCount} 个配置`,
      data: { deleted: result.deletedCount }
    });
  } catch (error) {
    console.error('批量删除配置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除配置失败'
    });
  }
});

/**
 * 批量启用/禁用背景配置
 * PUT /api/backgrounds/admin/batch/toggle
 */
router.put('/admin/batch/toggle', requireAdmin, [
  body('ids').isArray().withMessage('ids必须是数组'),
  body('isActive').isBoolean().withMessage('isActive必须是布尔值')
], validateRequest, async (req, res) => {
  try {
    const { ids, isActive } = req.body;

    const result = await PageBackground.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );

    res.json({
      success: true,
      message: `批量${isActive ? '启用' : '禁用'}完成，更新了 ${result.modifiedCount} 个配置`,
      data: { updated: result.modifiedCount }
    });
  } catch (error) {
    console.error('批量切换状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量切换状态失败'
    });
  }
});

/**
 * 导入背景配置
 * POST /api/backgrounds/admin/import
 */
router.post('/admin/import', requireAdmin, [
  body('configs').isArray().withMessage('configs必须是数组'),
  body('options').optional().isObject().withMessage('options必须是对象')
], validateRequest, async (req, res) => {
  try {
    const { configs, options = {} } = req.body;
    const { conflictAction = 'skip', defaultActive = true, priorityOffset = 0 } = options;

    const results = {
      created: 0,
      skipped: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const configData of configs) {
      try {
        const path = configData.pathConfig.path;
        const matchType = configData.pathConfig.matchType;

        // 检查是否存在冲突
        const existingConfig = await PageBackground.findOne({
          'pathConfig.path': path,
          'pathConfig.matchType': matchType
        });

        if (existingConfig) {
          switch (conflictAction) {
            case 'skip':
              results.skipped++;
              continue;
            case 'update':
              await PageBackground.findByIdAndUpdate(existingConfig._id, configData);
              results.updated++;
              continue;
            case 'rename':
              // 自动重命名路径
              let counter = 1;
              let newPath = `${path}-${counter}`;
              while (await PageBackground.findOne({ 'pathConfig.path': newPath, 'pathConfig.matchType': matchType })) {
                counter++;
                newPath = `${path}-${counter}`;
              }
              configData.pathConfig.path = newPath;
              break;
          }
        }

        // 应用优先级偏移
        if (priorityOffset !== 0) {
          configData.pathConfig.priority = (configData.pathConfig.priority || 100) + priorityOffset;
        }

        // 应用默认激活状态
        if (configData.isActive === undefined) {
          configData.isActive = defaultActive;
        }

        const newConfig = new PageBackground(configData);
        await newConfig.save();
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(`导入配置失败 (${configData.pathConfig?.path || '未知路径'}): ${error.message}`);
      }
    }

    const isSuccess = results.created > 0 || results.updated > 0;
    const totalProcessed = results.created + results.updated + results.skipped;

    res.json({
      success: isSuccess,
      message: isSuccess
        ? `导入完成，创建: ${results.created}，跳过: ${results.skipped}，更新: ${results.updated}，失败: ${results.failed}`
        : totalProcessed > 0
          ? `导入部分成功，跳过: ${results.skipped}，失败: ${results.failed}`
          : `导入失败，所有 ${results.failed} 个配置都导入失败`,
      data: results
    });
  } catch (error) {
    console.error('导入配置失败:', error);
    res.status(500).json({
      success: false,
      message: '导入配置失败'
    });
  }
});

module.exports = router;
