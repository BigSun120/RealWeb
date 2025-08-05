const Comment = require('../models/Comment');

/**
 * 评论审核中间件
 */

// 敏感词列表（可以从数据库或配置文件加载）
const SENSITIVE_WORDS = [
  // 政治敏感词
  '政治敏感词1', '政治敏感词2',
  // 色情词汇
  '色情词汇1', '色情词汇2',
  // 暴力词汇
  '暴力词汇1', '暴力词汇2',
  // 广告词汇
  '加微信', '加QQ', '代理', '刷单', '兼职',
  // 其他不当词汇
  '垃圾', '傻逼', '白痴', '脑残'
];

// 可疑模式列表
const SUSPICIOUS_PATTERNS = [
  /\d{10,}/g, // 长数字（可能是电话号码）
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // 邮箱地址
  /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g, // 网址
  /微信|QQ|qq|vx|VX/g, // 联系方式关键词
  /[\u4e00-\u9fa5]{20,}/g // 过长的中文文本（可能是复制粘贴的广告）
];

/**
 * 检查评论内容是否包含敏感词
 * @param {string} content - 评论内容
 * @returns {Object} 检查结果
 */
function checkSensitiveWords(content) {
  const foundWords = [];
  const lowerContent = content.toLowerCase();
  
  for (const word of SENSITIVE_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }
  
  return {
    hasSensitiveWords: foundWords.length > 0,
    foundWords,
    severity: foundWords.length > 0 ? 'high' : 'none'
  };
}

/**
 * 检查评论内容是否包含可疑模式
 * @param {string} content - 评论内容
 * @returns {Object} 检查结果
 */
function checkSuspiciousPatterns(content) {
  const foundPatterns = [];
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      foundPatterns.push({
        pattern: pattern.toString(),
        matches: matches
      });
    }
  }
  
  return {
    hasSuspiciousPatterns: foundPatterns.length > 0,
    foundPatterns,
    severity: foundPatterns.length > 2 ? 'high' : foundPatterns.length > 0 ? 'medium' : 'none'
  };
}

/**
 * 检查用户行为是否可疑
 * @param {Object} user - 用户对象
 * @param {string} content - 评论内容
 * @param {string} ipAddress - IP地址
 * @returns {Object} 检查结果
 */
async function checkUserBehavior(user, content, ipAddress) {
  const issues = [];
  let severity = 'none';
  
  try {
    // 检查用户注册时间（新用户可能是垃圾账号）
    const userAge = Date.now() - new Date(user.createdAt).getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    if (userAge < oneDayInMs) {
      issues.push('新注册用户');
      severity = 'medium';
    }
    
    // 检查用户最近的评论频率
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentComments = await Comment.countDocuments({
      authorId: user._id,
      createdAt: { $gte: oneHourAgo },
      isDeleted: false
    });
    
    if (recentComments > 10) {
      issues.push('评论频率过高');
      severity = 'high';
    } else if (recentComments > 5) {
      issues.push('评论频率较高');
      severity = severity === 'none' ? 'medium' : severity;
    }
    
    // 检查相同内容的评论
    const duplicateComments = await Comment.countDocuments({
      content: content,
      authorId: { $ne: user._id },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7天内
      isDeleted: false
    });
    
    if (duplicateComments > 0) {
      issues.push('内容重复');
      severity = 'high';
    }
    
    // 检查IP地址的评论频率
    const ipComments = await Comment.countDocuments({
      ipAddress: ipAddress,
      createdAt: { $gte: oneHourAgo },
      isDeleted: false
    });
    
    if (ipComments > 15) {
      issues.push('IP评论频率过高');
      severity = 'high';
    }
    
  } catch (error) {
    console.error('检查用户行为失败:', error);
  }
  
  return {
    hasSuspiciousBehavior: issues.length > 0,
    issues,
    severity
  };
}

/**
 * 综合评估评论风险等级
 * @param {Object} sensitiveCheck - 敏感词检查结果
 * @param {Object} patternCheck - 可疑模式检查结果
 * @param {Object} behaviorCheck - 用户行为检查结果
 * @returns {Object} 综合评估结果
 */
function assessRiskLevel(sensitiveCheck, patternCheck, behaviorCheck) {
  const severities = [sensitiveCheck.severity, patternCheck.severity, behaviorCheck.severity];
  
  // 确定最高风险等级
  let riskLevel = 'low';
  let moderationStatus = 'auto_approved';
  let reason = [];
  
  if (severities.includes('high')) {
    riskLevel = 'high';
    moderationStatus = 'pending';
  } else if (severities.includes('medium')) {
    riskLevel = 'medium';
    moderationStatus = 'pending';
  }
  
  // 收集风险原因
  if (sensitiveCheck.hasSensitiveWords) {
    reason.push(`包含敏感词: ${sensitiveCheck.foundWords.join(', ')}`);
  }
  if (patternCheck.hasSuspiciousPatterns) {
    reason.push('包含可疑模式');
  }
  if (behaviorCheck.hasSuspiciousBehavior) {
    reason.push(`用户行为可疑: ${behaviorCheck.issues.join(', ')}`);
  }
  
  return {
    riskLevel,
    moderationStatus,
    reason: reason.join('; '),
    details: {
      sensitiveWords: sensitiveCheck,
      suspiciousPatterns: patternCheck,
      userBehavior: behaviorCheck
    }
  };
}

/**
 * 评论自动审核中间件
 */
const autoModeration = async (req, res, next) => {
  try {
    const { content } = req.body;
    const user = req.user;
    const ipAddress = req.ip;
    
    // 管理员的评论直接通过
    if (user.isAdmin) {
      req.moderationResult = {
        riskLevel: 'low',
        moderationStatus: 'auto_approved',
        reason: '管理员评论自动通过'
      };
      return next();
    }
    
    // 执行各项检查
    const sensitiveCheck = checkSensitiveWords(content);
    const patternCheck = checkSuspiciousPatterns(content);
    const behaviorCheck = await checkUserBehavior(user, content, ipAddress);
    
    // 综合评估
    const assessment = assessRiskLevel(sensitiveCheck, patternCheck, behaviorCheck);
    
    // 将审核结果附加到请求对象
    req.moderationResult = assessment;
    
    // 记录审核日志
    if (assessment.riskLevel !== 'low') {
      console.log(`[评论审核] 用户 ${user.username} 的评论需要审核:`, {
        riskLevel: assessment.riskLevel,
        reason: assessment.reason,
        content: content.substring(0, 100) + '...'
      });
    }
    
    next();
  } catch (error) {
    console.error('自动审核失败:', error);
    // 审核失败时，默认需要人工审核
    req.moderationResult = {
      riskLevel: 'medium',
      moderationStatus: 'pending',
      reason: '自动审核系统错误，需要人工审核'
    };
    next();
  }
};

module.exports = {
  autoModeration,
  checkSensitiveWords,
  checkSuspiciousPatterns,
  checkUserBehavior,
  assessRiskLevel
};
