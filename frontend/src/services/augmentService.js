/**
 * Augment Token Manager API 服务
 * 处理与后端API的通信
 */

import request from '@/utils/request'

/**
 * Augment服务类
 */
class AugmentService {
  /**
   * 生成OAuth授权URL
   * @returns {Promise<{auth_url: string, state: string}>}
   */
  async generateAuthUrl() {
    const response = await request({
      url: '/tools/augment/auth-url',
      method: 'post'
    })
    if (!response.success) {
      throw new Error(response.message || '生成授权URL失败')
    }
    return response.data
  }

  /**
   * 获取访问令牌
   * @param {string} code - 授权码JSON字符串
   * @param {string} state - OAuth状态
   * @returns {Promise<{access_token: string, tenant_url: string}>}
   */
  async getAccessToken(code, state) {
    const response = await request({
      url: '/tools/augment/token',
      method: 'post',
      data: { code, state }
    })
    if (!response.success) {
      throw new Error(response.message || '获取访问令牌失败')
    }
    return response.data
  }

  /**
   * 获取用户的所有令牌
   * @param {boolean} activeOnly - 是否只获取活跃令牌
   * @returns {Promise<Array>}
   */
  async getTokens(activeOnly = false) {
    const response = await request({
      url: '/tools/augment/tokens',
      method: 'get',
      params: { active_only: activeOnly }
    })
    if (!response.success) {
      throw new Error(response.message || '获取令牌列表失败')
    }
    return response.data
  }

  /**
   * 保存新令牌
   * @param {Object} tokenData - 令牌数据
   * @param {string} tokenData.tenant_url - 租户URL
   * @param {string} tokenData.access_token - 访问令牌
   * @param {string} [tokenData.portal_url] - Portal URL
   * @param {string} [tokenData.email_note] - 邮箱备注
   * @returns {Promise<{id: string, message: string}>}
   */
  async saveToken(tokenData) {
    const response = await request({
      url: '/tools/augment/tokens',
      method: 'post',
      data: tokenData
    })
    if (!response.success) {
      throw new Error(response.message || '保存令牌失败')
    }
    return response.data
  }

  /**
   * 更新令牌
   * @param {string} tokenId - 令牌ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<{id: string, message: string}>}
   */
  async updateToken(tokenId, updateData) {
    const response = await request({
      url: `/tools/augment/tokens/${tokenId}`,
      method: 'put',
      data: updateData
    })
    if (!response.success) {
      throw new Error(response.message || '更新令牌失败')
    }
    return response.data
  }

  /**
   * 删除令牌
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<{message: string}>}
   */
  async deleteToken(tokenId) {
    const response = await request({
      url: `/tools/augment/tokens/${tokenId}`,
      method: 'delete'
    })
    if (!response.success) {
      throw new Error(response.message || '删除令牌失败')
    }
    return response.data
  }

  /**
   * 检查令牌状态
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async checkTokenStatus(tokenId) {
    try {
      const response = await request({
        url: `/tools/augment/tokens/${tokenId}/check-status`,
        method: 'post'
      })
      return response.data.data
    } catch (error) {
      throw new Error(`检查令牌状态失败: ${error.message}`)
    }
  }

  /**
   * 批量检查令牌状态
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchCheckTokenStatus(tokenIds) {
    const results = []

    // 并发检查，但限制并发数量
    const concurrency = 3
    for (let i = 0; i < tokenIds.length; i += concurrency) {
      const batch = tokenIds.slice(i, i + concurrency)
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const result = await this.checkTokenStatus(tokenId)
          return { tokenId, success: true, data: result }
        } catch (error) {
          return { tokenId, success: false, error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * 刷新令牌使用次数
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async refreshTokenUsage(tokenId) {
    try {
      const response = await request({
        url: `/tools/augment/tokens/${tokenId}/refresh-portal-info`,
        method: 'post'
      })
      return response.data
    } catch (error) {
      throw new Error(`刷新使用次数失败: ${error.message}`)
    }
  }

  /**
   * 批量刷新令牌使用次数
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchRefreshTokenUsage(tokenIds) {
    const results = []

    // 并发刷新，但限制并发数量
    const concurrency = 3
    for (let i = 0; i < tokenIds.length; i += concurrency) {
      const batch = tokenIds.slice(i, i + concurrency)
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const result = await this.refreshTokenUsage(tokenId)
          return { tokenId, success: true, data: result }
        } catch (error) {
          return { tokenId, success: false, error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * 导入令牌数据
   * @param {Array} tokensData - 令牌数据数组
   * @returns {Promise<{imported: number, failed: number, errors: Array}>}
   */
  async importTokens(tokensData) {
    const results = {
      imported: 0,
      failed: 0,
      duplicated: 0,
      errors: [],
      duplicates: []
    }

    for (const tokenData of tokensData) {
      try {
        await this.saveToken(tokenData)
        results.imported++
      } catch (error) {
        // 检查是否是重复令牌错误（409状态码）
        if (error.response && error.response.status === 409) {
          results.duplicated++
          results.duplicates.push({
            tokenData,
            error: error.response.data.message,
            existingInfo: error.response.data.data
          })
        } else {
          results.failed++
          results.errors.push({
            tokenData,
            error: error.message
          })
        }
      }
    }

    return results
  }

  /**
   * 刷新令牌基础信息（Portal信息）
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async refreshTokenInfo(tokenId) {
    const response = await request({
      url: `/tools/augment/tokens/${tokenId}/refresh-info`,
      method: 'post'
    })

    if (!response.success) {
      throw new Error(response.message || '刷新基础信息失败')
    }

    return response.data
  }

  /**
   * 刷新令牌状态
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async refreshTokenStatus(tokenId) {
    const response = await request({
      url: `/tools/augment/tokens/${tokenId}/refresh-status`,
      method: 'post'
    })

    if (!response.success) {
      throw new Error(response.message || '刷新令牌状态失败')
    }

    return response.data
  }

  /**
   * 刷新单个令牌的Portal信息（保持向后兼容）
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async refreshPortalInfo(tokenId) {
    return await this.refreshTokenInfo(tokenId)
  }

  /**
   * 批量刷新令牌基础信息
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchRefreshTokenInfo(tokenIds) {
    const response = await request({
      url: '/tools/augment/tokens/batch-refresh-info',
      method: 'post',
      data: { tokenIds }
    })

    if (!response.success) {
      throw new Error(response.message || '批量刷新基础信息失败')
    }

    return response.data.results || response.data
  }

  /**
   * 批量刷新令牌状态
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchRefreshTokenStatus(tokenIds) {
    const response = await request({
      url: '/tools/augment/tokens/batch-refresh-status',
      method: 'post',
      data: { tokenIds }
    })

    if (!response.success) {
      throw new Error(response.message || '批量刷新令牌状态失败')
    }

    return response.data.results || response.data
  }

  /**
   * 批量刷新令牌Portal信息（保持向后兼容）
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchRefreshPortalInfo(tokenIds) {
    return await this.batchRefreshTokenInfo(tokenIds)
  }

  /**
   * 导出令牌数据
   * @param {boolean} activeOnly - 是否只导出活跃令牌
   * @returns {Promise<Array>}
   */
  async exportTokens(activeOnly = false) {
    const tokens = await this.getTokens(activeOnly)

    // 转换为导出格式（移除敏感信息）
    return tokens.map(token => ({
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note,
      created_at: token.created_at
    }))
  }

  /**
   * 解析授权码JSON
   * @param {string} codeInput - 授权码输入
   * @returns {Object}
   */
  parseAuthCode(codeInput) {
    try {
      const parsed = JSON.parse(codeInput)
      if (!parsed.code || !parsed.state || !parsed.tenant_url) {
        throw new Error('授权码格式不完整')
      }
      return parsed
    } catch (error) {
      throw new Error('授权码格式无效，请确保是有效的JSON格式')
    }
  }

  /**
   * 验证URL格式
   * @param {string} url - URL字符串
   * @returns {boolean}
   */
  validateUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取令牌显示名称
   * @param {Object} token - 令牌对象
   * @returns {string}
   */
  getTokenDisplayName(token) {
    if (token.email_note) {
      const domain = token.tenant_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
      return `${token.email_note} (${domain})`
    }
    return token.tenant_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  /**
   * 格式化令牌状态
   * @param {Object} banStatus - 状态对象
   * @returns {Object}
   */
  formatTokenStatus(banStatus) {
    // 如果没有状态信息，显示未检查
    if (!banStatus) {
      return { text: '未检查', type: 'info' }
    }

    // 首先检查是否被封禁
    if (banStatus.isBanned) {
      const statusMap = {
        'UNAUTHORIZED': { text: '已封禁', type: 'danger' },
        'FORBIDDEN': { text: '禁止访问', type: 'danger' },
        'SUSPENDED': { text: '已暂停', type: 'danger' },
        'RATE_LIMITED': { text: '限流中', type: 'warning' }
      }
      return statusMap[banStatus.status] || { text: '已封禁', type: 'danger' }
    }

    // 如果没有被封禁，检查具体状态
    const statusMap = {
      'ACTIVE': { text: '正常', type: 'success' },
      'SERVER_ERROR': { text: '服务器错误', type: 'info' },
      'UNKNOWN_ERROR': { text: '未知错误', type: 'info' }
    }

    return statusMap[banStatus.status] || { text: '正常', type: 'success' }
  }
}

// 导出单例实例
export default new AugmentService()
