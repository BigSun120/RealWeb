import request from './index';

/**
 * 添加/取消收藏
 * @param {Object} data - 收藏数据
 * @param {string} data.targetType - 目标类型 ('article' | 'comment')
 * @param {string} data.targetId - 目标ID
 * @param {Array} data.tags - 收藏标签（可选）
 * @param {string} data.note - 收藏备注（可选）
 */
export const toggleBookmark = (data) => {
  return request.post('/bookmarks', data);
};

/**
 * 获取用户收藏列表
 * @param {Object} params - 查询参数
 * @param {string} params.targetType - 目标类型筛选（可选）
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.sortBy - 排序字段
 * @param {string} params.sortOrder - 排序方向
 */
export const getUserBookmarks = (params = {}) => {
  return request.get('/bookmarks', { params });
};

/**
 * 批量检查收藏状态
 * @param {Array} targets - 目标列表
 * @param {string} targets[].type - 目标类型
 * @param {string} targets[].id - 目标ID
 */
export const checkBookmarkStatus = (targets) => {
  return request.post('/bookmarks/check', { targets });
};

/**
 * 删除收藏
 * @param {string} bookmarkId - 收藏ID
 */
export const deleteBookmark = (bookmarkId) => {
  return request.delete(`/bookmarks/${bookmarkId}`);
};

/**
 * 获取用户收藏统计
 */
export const getUserBookmarkStats = () => {
  return request.get('/bookmarks/stats');
};

/**
 * 获取内容收藏统计
 * @param {string} targetType - 目标类型
 * @param {string} targetId - 目标ID
 */
export const getContentBookmarkStats = (targetType, targetId) => {
  return request.get(`/bookmarks/content/${targetType}/${targetId}/stats`);
};
