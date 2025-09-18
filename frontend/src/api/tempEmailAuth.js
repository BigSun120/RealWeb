import request from '@/utils/request'

/**
 * 临时邮箱权限管理API
 */
export const tempEmailAuthApi = {
  /**
   * 检查用户临时邮箱权限状态
   */
  checkAccessStatus() {
    return request.get('/temp-email-auth/access-status')
  },

  /**
   * 验证激活码状态（深度检查）
   */
  validateActivationCodes() {
    return request.get('/temp-email-auth/validate-codes')
  },

  /**
   * 激活临时邮箱权限
   * @param {string} activationCode - 激活验证码
   */
  activateAccess(activationCode) {
    return request.post('/temp-email-auth/activate', {
      activationCode
    })
  },



  /**
   * 撤销用户权限（管理员）
   * @param {string} userId - 用户ID
   */
  revokeUserAccess(userId) {
    return request.post(`/temp-email-auth/revoke/${userId}`)
  }
}

/**
 * 管理员激活码管理API
 */
export const adminTempEmailActivationCodesApi = {
  /**
   * 获取激活码列表
   * @param {Object} params - 查询参数
   */
  getActivationCodes(params = {}) {
    return request.get('/admin/temp-email-activation-codes', { params })
  },

  /**
   * 获取激活码统计信息
   */
  getStats() {
    return request.get('/admin/temp-email-activation-codes/stats')
  },

  /**
   * 创建单个激活码
   * @param {Object} data - 激活码数据
   */
  createActivationCode(data) {
    return request.post('/admin/temp-email-activation-codes', data)
  },

  /**
   * 批量创建激活码
   * @param {Object} data - 批量创建数据
   */
  createBatchActivationCodes(data) {
    return request.post('/admin/temp-email-activation-codes/batch', data)
  },

  /**
   * 更新激活码
   * @param {string} id - 激活码ID
   * @param {Object} data - 更新数据
   */
  updateActivationCode(id, data) {
    return request.put(`/admin/temp-email-activation-codes/${id}`, data)
  },

  /**
   * 切换激活码状态
   * @param {string} id - 激活码ID
   */
  toggleActivationCodeStatus(id) {
    return request.patch(`/admin/temp-email-activation-codes/${id}/toggle`)
  },

  /**
   * 删除激活码
   * @param {string} id - 激活码ID
   */
  deleteActivationCode(id) {
    return request.delete(`/admin/temp-email-activation-codes/${id}`)
  },

  /**
   * 获取激活码使用记录
   * @param {string} id - 激活码ID
   * @param {Object} params - 查询参数
   */
  getActivationCodeUsage(id, params = {}) {
    return request.get(`/admin/temp-email-activation-codes/${id}/usage`, { params })
  },

  /**
   * 批量切换激活码状态
   * @param {Array} ids - 激活码ID数组
   * @param {boolean} isActive - 目标状态
   */
  batchToggleActivationCodeStatus(ids, isActive) {
    return request.patch('/admin/temp-email-activation-codes/batch/toggle', {
      ids,
      isActive
    })
  },

  /**
   * 批量删除激活码
   * @param {Array} ids - 激活码ID数组
   */
  batchDeleteActivationCodes(ids) {
    return request.delete('/admin/temp-email-activation-codes/batch', {
      data: { ids }
    })
  }
}

export default tempEmailAuthApi
