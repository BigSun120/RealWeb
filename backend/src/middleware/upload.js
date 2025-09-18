const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 基础上传目录：优先使用环境变量 UPLOAD_PATH，否则回退到 backend/uploads
const baseUploadDir = path.resolve(
  process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
);
const avatarDir = path.join(baseUploadDir, 'avatars');
const articlesDir = path.join(baseUploadDir, 'articles');

// 启动时打印一次关键路径，便于定位（生产可临时开启）
console.log('[UploadInit]', {
  UPLOAD_PATH: process.env.UPLOAD_PATH || '',
  baseUploadDir,
  articlesDir,
  cwd: process.cwd(),
  __dirname
});

// 确保上传目录存在
[baseUploadDir, avatarDir, articlesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型选择不同的目录
    let uploadPath = baseUploadDir;

    if (file.fieldname === 'avatar') {
      uploadPath = avatarDir;
    }

    // 打印一次头像上传目的地
    console.log('[UploadAvatar] destination resolved:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.fieldname === 'avatar') {
    // 头像只允许图片格式
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('头像只能上传图片文件'), false);
    }
  } else {
    // 其他文件类型的处理
    cb(null, true);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 1 // 单次只能上传一个文件
  },
  fileFilter: fileFilter
});

// 头像上传中间件
const uploadAvatar = upload.single('avatar');

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        code: 400,
        message: '文件大小不能超过5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        code: 400,
        message: '一次只能上传一个文件'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        code: 400,
        message: '不支持的文件字段'
      });
    }
  }

  if (error.message) {
    return res.status(400).json({
      code: 400,
      message: error.message
    });
  }

  logger.error('文件上传错误:', error);
  res.status(500).json({
    code: 500,
    message: '文件上传失败'
  });
};

// 删除文件的工具函数
const deleteFile = filePath => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`文件删除成功: ${filePath}`);
    }
  } catch (error) {
    logger.error(`文件删除失败: ${filePath}`, error);
  }
};

// 文章图片上传配置
const uploadArticleImage = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = articlesDir;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      console.log('[UploadArticle] destination resolved:', uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, 'article-' + uniqueSuffix + ext);
    }
  }),
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('image');

module.exports = {
  uploadAvatar,
  uploadArticleImage,
  handleUploadError,
  deleteFile
};
