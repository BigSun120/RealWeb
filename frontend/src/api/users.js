import request from './index';

// 搜索用户（用于@功能）
export const searchUsers = (query, limit = 10) => {
  return request.get('/users/search', {
    params: { q: query, limit }
  });
};

// 获取用户资料
export const getUserProfile = () => {
  return request.get('/users/profile');
};

// 更新用户资料
export const updateUserProfile = (data) => {
  return request.put('/users/profile', data);
};

// 上传头像
export const uploadAvatar = (formData) => {
  return request.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 修改密码
export const changePassword = (data) => {
  return request.put('/users/password', data);
};

// ==================== 关注功能相关API ====================

// 关注/取消关注用户
export const toggleFollow = (userId, source = 'profile') => {
  return request.post(`/users/${userId}/follow`, { source });
};

// 检查关注状态
export const getFollowStatus = (userId) => {
  return request.get(`/users/${userId}/follow-status`);
};

// 获取用户的关注列表
export const getUserFollowing = (userId, params = {}) => {
  return request.get(`/users/${userId}/following`, { params });
};

// 获取用户的粉丝列表
export const getUserFollowers = (userId, params = {}) => {
  return request.get(`/users/${userId}/followers`, { params });
};

// 获取用户的关注统计
export const getUserFollowStats = (userId) => {
  return request.get(`/users/${userId}/follow-stats`);
};
