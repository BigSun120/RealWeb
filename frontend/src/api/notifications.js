import request from './index';

/**
 * 通知相关API
 */

// 获取通知列表
export const getNotifications = (params = {}) => {
  return request.get('/notifications', { params });
};

// 获取未读通知数量
export const getUnreadCount = () => {
  return request.get('/notifications/unread-count');
};

// 标记单个通知为已读
export const markNotificationAsRead = (notificationId) => {
  return request.put(`/notifications/${notificationId}/read`);
};

// 批量标记通知为已读
export const markNotificationsAsRead = (notificationIds = []) => {
  return request.put('/notifications/batch-read', {
    notificationIds
  });
};

// 标记所有通知为已读
export const markAllNotificationsAsRead = () => {
  return request.put('/notifications/batch-read');
};

// 删除通知
export const deleteNotification = (notificationId) => {
  return request.delete(`/notifications/${notificationId}`);
};

// 清空所有通知
export const clearAllNotifications = () => {
  return request.delete('/notifications/clear-all');
};
