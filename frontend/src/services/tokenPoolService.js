import request from '@/utils/request'

export const tokenPoolService = {
  // 获取令牌池列表
  async getPoolTokens(params = {}) {
    return await request({
      url: '/tools/token-pool',
      method: 'get',
      params
    })
  },

  // 上传令牌到池子
  async uploadTokens(tokens) {
    return await request({
      url: '/tools/token-pool/upload',
      method: 'post',
      data: { tokens }
    })
  },

  // 领取令牌
  async claimToken(tokenId) {
    return await request({
      url: `/tools/token-pool/${tokenId}/claim`,
      method: 'post'
    })
  },

  // 归还令牌到池子
  async returnToken(tokenId) {
    return await request({
      url: `/tools/token-pool/${tokenId}/return`,
      method: 'post'
    })
  },

  // 删除令牌
  async deleteToken(tokenId) {
    return await request({
      url: `/tools/token-pool/${tokenId}`,
      method: 'delete'
    })
  },

  // 获取我的上传
  async getMyUploads(params = {}) {
    return await request({
      url: '/tools/token-pool/my-uploads',
      method: 'get',
      params
    })
  },

  // 清理过期令牌（管理员）
  async cleanupTokens() {
    return await request({
      url: '/tools/token-pool/cleanup',
      method: 'post'
    })
  },

  // 清空所有令牌（管理员）
  async clearAllTokens() {
    return await request({
      url: '/tools/token-pool/clear-all',
      method: 'delete'
    })
  },

  // 刷新单个令牌的Portal信息
  async refreshTokenInfo(tokenId) {
    return await request({
      url: `/tools/token-pool/${tokenId}/refresh`,
      method: 'post'
    })
  }
}

export default tokenPoolService
