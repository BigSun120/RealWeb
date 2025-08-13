import request from './index'

/**
 * 临时邮箱API
 */
export const tempEmailApi = {
  /**
   * 生成临时邮箱
   * @param {Object} params - 参数
   * @param {string} params.domain - 指定域名（可选）
   * @param {string} params.customName - 自定义用户名（可选）
   */
  generateEmail(params = {}) {
    return request.post('/temp-email/generate', params)
  },

  /**
   * 获取邮箱邮件列表
   * @param {string} email - 邮箱地址
   */
  getMessages(email) {
    return request.get(`/temp-email/${email}/messages`)
  },

  /**
   * 获取邮件详情
   * @param {string} email - 邮箱地址
   * @param {string} messageId - 邮件ID
   */
  getMessage(email, messageId) {
    return request.get(`/temp-email/${email}/messages/${messageId}`)
  },

  /**
   * 删除邮件
   * @param {string} email - 邮箱地址
   * @param {string} messageId - 邮件ID
   */
  deleteMessage(email, messageId) {
    return request.delete(`/temp-email/${email}/messages/${messageId}`)
  },

  /**
   * 获取支持的域名列表
   */
  getDomains() {
    return request.get('/temp-email/domains')
  },

  /**
   * 检查邮箱服务状态
   */
  getStatus() {
    return request.get('/temp-email/status')
  },

  /**
   * 发送测试邮件
   * @param {string} email - 邮箱地址
   */
  sendTestEmail(email) {
    return request.post(`/temp-email/${email}/send-test`)
  },

  /**
   * 获取所有邮箱的邮件概览
   */
  getAllEmails() {
    return request.get('/temp-email/all-emails')
  },

  /**
   * 清空指定邮箱的所有邮件
   * @param {string} email - 邮箱地址
   */
  clearMailbox(email) {
    return request.delete(`/temp-email/${email}/clear`)
  },

  /**
   * 清空所有邮箱的邮件
   */
  clearAllEmails() {
    return request.delete('/temp-email/clear-all')
  }
}

export default tempEmailApi
