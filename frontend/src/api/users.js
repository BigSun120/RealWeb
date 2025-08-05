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
