const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const PageBackground = require('../models/PageBackground');
const { auth: requireAuth, adminAuth: requireAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/backgrounds');
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

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、WebP 格式的图片'));
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
        const imagePath = path.join(__dirname, '../../uploads/backgrounds', path.basename(config.backgroundImage.url));
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
router.post('/admin/upload', requireAuth, requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || '文件上传失败',
        error: err.code || 'UPLOAD_ERROR'
      });
    }
    next();
  });
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
    const imagePath = file.path;

    // 获取图片信息
    const metadata = await sharp(imagePath).metadata();

    // 生成不同尺寸的图片（可选）
    const baseUrl = '/uploads/backgrounds';
    const filename = file.filename;

    // 生成移动端图片（可选）
    let mobileUrl = null;
    if (req.body.generateMobile === 'true') {
      const mobileFilename = `mobile-${filename}`;
      const mobilePath = path.join(path.dirname(imagePath), mobileFilename);

      await sharp(imagePath)
        .resize(800, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 80 })
        .toFile(mobilePath);

      mobileUrl = `${baseUrl}/${mobileFilename}`;
    }

    const imageData = {
      url: `${baseUrl}/${filename}`,
      filename: file.originalname,
      size: file.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      format: metadata.format,
      mobileUrl
    };

    res.json({
      success: true,
      data: imageData,
      message: '图片上传成功'
    });
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

    res.status(500).json({
      success: false,
      message: '图片上传失败'
    });
  }
});

/**
 * 删除背景图片
 * DELETE /api/admin/backgrounds/image/:filename
 */
router.delete('/admin/image/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/backgrounds', filename);

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
    const mobilePath = path.join(__dirname, '../../uploads/backgrounds', mobileFilename);
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





module.exports = router;
