import api from './index';

export const getPublicNoticeSettings = () => api.get('/public-notices/settings');
export const getLatestPublicNotices = (limit = 5) => api.get(`/public-notices/latest`, { params: { limit } });

// 用户阅读状态相关API
export const getPublicNoticeReadStatus = (noticeIds) => {
  const params = Array.isArray(noticeIds) ? { noticeIds: noticeIds.join(',') } : { noticeIds };
  return api.get('/public-notices/read-status', { params });
};

export const markPublicNoticeAsRead = (noticeId) => api.put(`/public-notices/${noticeId}/read`);

export const markPublicNoticeAsDismissed = (noticeId) => api.put(`/public-notices/${noticeId}/dismiss`);

export const markMultiplePublicNoticesAsRead = (noticeIds) => api.put('/public-notices/batch-read', { noticeIds });

export const getUnreadPublicNoticeCount = () => api.get('/public-notices/unread-count');

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

