/**
 * Augment Token Manager API 服务
 * 处理与后端API的通信
 */

import axios from 'axios'
import { useUserStore } from '@/stores/user'

// 创建专用的axios实例
const augmentApi = axios.create({
  baseURL: '/api/tools/augment',
  timeout: 30000
})

// 请求拦截器：添加认证token
augmentApi.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
augmentApi.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      // 服务器返回错误状态码
      const { status, data } = error.response

      if (status === 401) {
        // 未认证，跳转到登录页
        const userStore = useUserStore()
        userStore.logout()
        throw new Error('请先登录')
      } else if (status === 403) {
        throw new Error('权限不足')
      } else if (status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      } else {
        throw new Error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      // 网络错误
      throw new Error('网络连接失败，请检查网络设置')
    } else {
      // 其他错误
      throw new Error(error.message || '未知错误')
    }
  }
)

/**
 * Augment服务类
 */
class AugmentService {
  /**
   * 生成OAuth授权URL
   * @returns {Promise<{auth_url: string, state: string}>}
   */
  async generateAuthUrl() {
    const response = await augmentApi.post('/auth-url')
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
    const response = await augmentApi.post('/token', { code, state })
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
    const response = await augmentApi.get('/tokens', {
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
    const response = await augmentApi.post('/tokens', tokenData)
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
    const response = await augmentApi.put(`/tokens/${tokenId}`, updateData)
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
    const response = await augmentApi.delete(`/tokens/${tokenId}`)
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
      const response = await augmentApi.post(`/tokens/${tokenId}/check-status`)
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
      const response = await augmentApi.post(`/tokens/${tokenId}/refresh-portal-info`)
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
      errors: []
    }

    for (const tokenData of tokensData) {
      try {
        await this.saveToken(tokenData)
        results.imported++
      } catch (error) {
        results.failed++
        results.errors.push({
          tokenData,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * 刷新单个令牌的Portal信息
   * @param {string} tokenId - 令牌ID
   * @returns {Promise<Object>}
   */
  async refreshPortalInfo(tokenId) {
    const response = await augmentApi.post(`/tokens/${tokenId}/refresh-portal-info`)

    if (!response.success) {
      throw new Error(response.message || '刷新Portal信息失败')
    }

    return response.data
  }

  /**
   * 批量刷新令牌Portal信息
   * @param {Array<string>} tokenIds - 令牌ID数组
   * @returns {Promise<Array>}
   */
  async batchRefreshPortalInfo(tokenIds) {
    const response = await augmentApi.post('/tokens/batch-refresh-portal-info', {
      tokenIds
    })

    if (!response.success) {
      throw new Error(response.message || '批量刷新Portal信息失败')
    }

    return response.data
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
    const statusMap = {
      'ACTIVE': { text: '正常', type: 'success' },
      'SUSPENDED': { text: '已暂停', type: 'danger' },
      'UNAUTHORIZED': { text: '未授权', type: 'danger' },
      'FORBIDDEN': { text: '禁止访问', type: 'danger' },
      'RATE_LIMITED': { text: '限流中', type: 'warning' },
      'SERVER_ERROR': { text: '服务器错误', type: 'info' },
      'UNKNOWN_ERROR': { text: '未知错误', type: 'info' }
    }

    return statusMap[banStatus?.status] || { text: '未知', type: 'info' }
  }
}

// 导出单例实例
export default new AugmentService()
