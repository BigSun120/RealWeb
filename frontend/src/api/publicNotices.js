import api from './index';

export const getPublicNoticeSettings = () => api.get('/public-notices/settings');
export const getLatestPublicNotices = (limit = 5) => api.get(`/public-notices/latest`, { params: { limit } });

// Admin
export const adminListPublicNotices = () => api.get('/admin/public-notices');
export const adminCreatePublicNotice = (data) => api.post('/admin/public-notices', data);
export const adminUpdatePublicNotice = (id, data) => api.patch(`/admin/public-notices/${id}`, data);
export const adminPublishPublicNotice = (id, published) => api.post(`/admin/public-notices/${id}/publish`, { published });
export const adminDeletePublicNotice = (id) => api.delete(`/admin/public-notices/${id}`);

export default {
  getLatestPublicNotices,
  adminListPublicNotices,
  adminCreatePublicNotice,
  adminUpdatePublicNotice,
  adminPublishPublicNotice,
  adminDeletePublicNotice
};

