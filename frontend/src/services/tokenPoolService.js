import axios from 'axios'

const API_BASE = '/api/tools/token-pool'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除token并跳转到登录页
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export const tokenPoolService = {
  // 获取令牌池列表
  async getPoolTokens(params = {}) {
    return await api.get('/', { params })
  },

  // 上传令牌到池子
  async uploadToken(accessToken) {
    return await api.post('/upload', { accessToken })
  },

  // 领取令牌
  async claimToken(tokenId) {
    return await api.post(`/${tokenId}/claim`)
  },

  // 归还令牌到池子
  async returnToken(tokenId) {
    return await api.post(`/${tokenId}/return`)
  },

  // 删除令牌
  async deleteToken(tokenId) {
    return await api.delete(`/${tokenId}`)
  },

  // 获取我的上传
  async getMyUploads(params = {}) {
    return await api.get('/my-uploads', { params })
  },

  // 清理过期令牌（管理员）
  async cleanupTokens() {
    return await api.post('/cleanup')
  }
}

export default tokenPoolService
