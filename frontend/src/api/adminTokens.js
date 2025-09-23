import api from './index';

/**
 * 管理员令牌管理API
 */

/**
 * 获取所有令牌
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export const getAllTokens = (params = {}) => {
  return api.get('/admin/tokens/all', { params });
};

/**
 * 批量刷新Portal信息
 * @param {Array} tokenIds - 令牌ID数组
 * @returns {Promise}
 */
export const batchRefreshPortalInfo = (tokenIds) => {
  return api.post('/admin/tokens/batch/refresh-portal', { tokenIds });
};


/**
 * 批量刷新令牌状态
 * @param {Array} tokenIds - 令牌ID数组
 * @returns {Promise}
 */
export const batchRefreshStatus = (tokenIds) => {
  return api.post('/admin/tokens/batch/refresh-status', { tokenIds });
};

/**
 * 批量转移所有权
 * @param {Object} data - 转移数据
 * @returns {Promise}
 */
export const batchTransferOwnership = (data) => {
  return api.post('/admin/tokens/batch/transfer-ownership', data);
};

/**
 * 批量回收到池
 * @param {Array} tokenIds - 令牌ID数组
 * @returns {Promise}
 */
export const batchReclaimToPool = (tokenIds) => {
  return api.post('/admin/tokens/batch/reclaim', { tokenIds });
};



/**
 * 批量删除令牌
 * @param {Array} tokenIds - 令牌ID数组
 * @returns {Promise}
 */
export const batchDeleteTokens = (tokenIds) => {
  return api.delete('/admin/tokens/batch', { data: { tokenIds } });
};

/**
 * 获取用户列表（用于转移所有权）
 * @param {string} search - 搜索关键词
 * @returns {Promise}
 */
export const getUsersForTransfer = (search = '') => {
  return api.get('/admin/tokens/users', { params: { search } });
};

/**
 * 获取用户的令牌数量
 * @param {string} userId - 用户ID
 * @returns {Promise}
 */
export const getUserTokenCount = (userId) => {
  return api.get(`/admin/tokens/users/${userId}/count`);
};
