/**
 * 密码强度验证工具函数
 */

/**
 * 检查密码强度
 * @param {string} password - 密码
 * @returns {Object} 包含强度等级和详细信息的对象
 */
export function checkPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      level: 'none',
      levelText: '无',
      suggestions: ['请输入密码']
    };
  }

  let score = 0;
  const suggestions = [];
  const checks = {
    length: password.length >= 8,
    minLength: password.length >= 6,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password),
    noCommon: !isCommonPassword(password)
  };

  // 基础长度检查
  if (checks.minLength) score += 1;
  if (checks.length) score += 1;
  
  // 字符类型检查
  if (checks.lowercase) score += 1;
  if (checks.uppercase) score += 1;
  if (checks.numbers) score += 1;
  if (checks.symbols) score += 1;
  
  // 常见密码检查
  if (checks.noCommon) score += 1;

  // 生成建议
  if (!checks.minLength) {
    suggestions.push('密码长度至少需要6位');
  } else if (!checks.length) {
    suggestions.push('建议密码长度至少8位');
  }
  
  if (!checks.lowercase) {
    suggestions.push('建议包含小写字母');
  }
  
  if (!checks.uppercase) {
    suggestions.push('建议包含大写字母');
  }
  
  if (!checks.numbers) {
    suggestions.push('建议包含数字');
  }
  
  if (!checks.symbols) {
    suggestions.push('建议包含特殊字符');
  }
  
  if (!checks.noCommon) {
    suggestions.push('避免使用常见密码');
  }

  // 确定强度等级
  let level, levelText;
  if (score <= 2) {
    level = 'weak';
    levelText = '弱';
  } else if (score <= 4) {
    level = 'medium';
    levelText = '中等';
  } else if (score <= 6) {
    level = 'strong';
    levelText = '强';
  } else {
    level = 'very-strong';
    levelText = '很强';
  }

  return {
    score,
    level,
    levelText,
    suggestions: suggestions.length > 0 ? suggestions : ['密码强度良好'],
    checks
  };
}

/**
 * 检查是否为常见密码
 * @param {string} password - 密码
 * @returns {boolean} 是否为常见密码
 */
function isCommonPassword(password) {
  const commonPasswords = [
    '123456',
    'password',
    '123456789',
    '12345678',
    '12345',
    '1234567',
    '1234567890',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'root',
    '000000',
    '111111',
    '888888',
    '666666',
    '123123',
    'aaaaaa',
    'qwerty123'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * 验证密码是否符合最低要求
 * @param {string} password - 密码
 * @returns {Object} 验证结果
 */
export function validatePassword(password) {
  const strength = checkPasswordStrength(password);
  
  return {
    isValid: strength.score >= 2 && password.length >= 6,
    message: strength.suggestions[0] || '密码符合要求',
    strength
  };
}

/**
 * 生成密码强度的CSS类名
 * @param {string} level - 强度等级
 * @returns {string} CSS类名
 */
export function getPasswordStrengthClass(level) {
  const classMap = {
    'none': 'password-none',
    'weak': 'password-weak',
    'medium': 'password-medium',
    'strong': 'password-strong',
    'very-strong': 'password-very-strong'
  };
  
  return classMap[level] || 'password-none';
}

/**
 * 获取密码强度的颜色
 * @param {string} level - 强度等级
 * @returns {string} 颜色值
 */
export function getPasswordStrengthColor(level) {
  const colorMap = {
    'none': '#dcdfe6',
    'weak': '#f56c6c',
    'medium': '#e6a23c',
    'strong': '#67c23a',
    'very-strong': '#409eff'
  };
  
  return colorMap[level] || '#dcdfe6';
}
