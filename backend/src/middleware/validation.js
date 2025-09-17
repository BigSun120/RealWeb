const { validationResult } = require('express-validator');

/**
 * 验证请求中间件
 * 检查express-validator的验证结果，如果有错误则返回400状态码
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array()
    });
  }
  
  next();
};

module.exports = {
  validateRequest
};
