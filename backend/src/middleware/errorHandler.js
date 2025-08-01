const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('API Error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    },
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Mongoose错误处理
  if (err.name === 'CastError') {
    const message = '资源未找到';
    error = { statusCode: 404, message };
  }

  // Mongoose重复字段错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在`;
    error = { statusCode: 400, message };
  }

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { statusCode: 400, message };
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的token';
    error = { statusCode: 401, message };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'token已过期';
    error = { statusCode: 401, message };
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超出限制';
    error = { statusCode: 400, message };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = '不支持的文件类型';
    error = { statusCode: 400, message };
  }

  res.status(error.statusCode || 500).json({
    code: error.statusCode || 500,
    message: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
