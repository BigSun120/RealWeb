import api from './index';

/**
 * 管理员相关API
 */

// 获取仪表板统计数据
export const getDashboardStats = () => {
  return api.get('/admin/dashboard/stats');
};

// 获取最近活动
export const getRecentActivity = (limit = 10) => {
  return api.get(`/admin/dashboard/activity?limit=${limit}`);
};

// 获取系统状态
export const getSystemStatus = () => {
  return api.get('/admin/system/status');
};

// 用户管理相关API
export const getUsers = (params = {}) => {
  const { page = 1, limit = 20, search = '', status = '' } = params;
  return api.get('/admin/users', {
    params: { page, limit, search, status }
  });
};

// 获取用户详情
export const getUserDetail = (userId) => {
  return api.get(`/admin/users/${userId}`);
};

// 更新用户状态
export const updateUserStatus = (userId, status) => {
  return api.put(`/admin/users/${userId}/status`, { status });
};

// 重置用户密码
export const resetUserPassword = (userId, newPassword) => {
  return api.put(`/admin/users/${userId}/password`, { newPassword });
};

// 删除用户
export const deleteUser = (userId) => {
  return api.delete(`/admin/users/${userId}`);
};

// 批量操作用户
export const batchUpdateUsers = (userIds, action, data = {}) => {
  return api.post('/admin/users/batch', {
    userIds,
    action,
    data
  });
};

// 网站设置相关API
export const getSiteSettings = () => {
  return api.get('/admin/settings/site');
};

export const updateSiteSettings = (settings) => {
  return api.put('/admin/settings/site', settings);
};

// 上传网站Logo
export const uploadSiteLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post('/admin/settings/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// SEO设置
export const getSeoSettings = () => {
  return api.get('/admin/settings/seo');
};

export const updateSeoSettings = (settings) => {
  return api.put('/admin/settings/seo', settings);
};

// 更新用户角色
export const updateUserRole = (id, isAdmin) => {
  return api.put(`/admin/users/${id}/role`, { isAdmin });
};

// 批量操作用户
export const batchUserOperation = (userIds, action, data = {}) => {
  return api.post('/admin/users/batch', { userIds, action, data });
};

// 创建用户
export const createUser = (userData) => {
  return api.post('/admin/users', userData);
};

// 更新用户信息
export const updateUser = (userId, userData) => {
  return api.put(`/admin/users/${userId}`, userData);
};

// 批量导入用户
export const importUsers = (users) => {
  return api.post('/admin/users/import', { users });
};

// 获取活动日志
export const getActivityLog = (params) => {
  return api.get('/admin/activity-log', { params });
};

export default {
  getDashboardStats,
  getRecentActivity,
  getSystemStatus,
  getUsers,
  getUserDetail,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  batchUpdateUsers,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteLogo,
  getSeoSettings,
  updateSeoSettings
};
