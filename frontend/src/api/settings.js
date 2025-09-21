import api from './index';

// 获取网站设置（公开API）
export const getSiteSettings = () => {
  return api.get('/settings/site');
};

// 获取个人信息（公开API）
export const getPersonalInfo = () => {
  return api.get('/settings/personal');
};

// 获取博客设置（公开API）
export const getBlogSettings = () => {
  return api.get('/settings/blog');
};

// 获取所有公开设置
export const getAllPublicSettings = () => {
  return api.get('/settings/all');
};

export default {
  getSiteSettings,
  getPersonalInfo,
  getBlogSettings,
  getAllPublicSettings
};
