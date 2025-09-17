import request from './index';

/**
 * 用户注册
 * @param {Object} data - 注册数据
 * @param {string} data.username - 用户名
 * @param {string} data.email - 邮箱
 * @param {string} data.password - 密码
 * @param {string} data.displayName - 显示名称（可选）
 */
export const register = (data) => {
  return request.post('/auth/register', data);
};

/**
 * 用户登录
 * @param {Object} data - 登录数据
 * @param {string} data.identifier - 邮箱或用户名
 * @param {string} data.password - 密码
 */
export const login = (data) => {
  return request.post('/auth/login', data);
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = () => {
  return request.get('/auth/me');
};

/**
 * 用户登出
 */
export const logout = () => {
  return request.post('/auth/logout');
};

/**
 * 验证邮箱
 * @param {string} token - 验证令牌
 */
export const verifyEmail = (token) => {
  return request.get(`/auth/verify-email/${token}`);
};

/**
 * 重发验证邮件
 * @param {string} email - 邮箱地址
 */
export const resendVerificationEmail = (email) => {
  return request.post('/auth/resend-verification', { email });
};

/**
 * 检查邮箱验证状态
 * @param {string} email - 邮箱地址
 */
export const getVerificationStatus = (email) => {
  return request.get(`/auth/verification-status/${encodeURIComponent(email)}`);
};

/**
 * 发送密码重置邮件
 * @param {string} email - 邮箱地址
 */
export const sendPasswordResetEmail = (email) => {
  return request.post('/auth/forgot-password', { email });
};

/**
 * 刷新令牌
 */
export const refreshToken = () => {
  return request.post('/auth/refresh');
};

/**
 * 检查用户名是否可用
 * @param {string} username - 用户名
 */
export const checkUsernameAvailability = (username) => {
  return request.get(`/auth/check-username/${encodeURIComponent(username)}`);
};

/**
 * 检查邮箱是否可用
 * @param {string} email - 邮箱地址
 */
export const checkEmailAvailability = (email) => {
  return request.get(`/auth/check-email/${encodeURIComponent(email)}`);
};

/**
 * 请求密码重置
 * @param {string} email - 邮箱地址
 */
export const forgotPassword = (email) => {
  return request.post('/auth/forgot-password', { email });
};

/**
 * 验证密码重置令牌
 * @param {string} token - 重置令牌
 */
export const verifyResetToken = (token) => {
  return request.get(`/auth/verify-reset-token/${token}`);
};

/**
 * 执行密码重置
 * @param {Object} data - 重置数据
 * @param {string} data.token - 重置令牌
 * @param {string} data.newPassword - 新密码
 * @param {string} data.confirmPassword - 确认密码
 */
export const resetPassword = (data) => {
  return request.post('/auth/reset-password', data);
};
