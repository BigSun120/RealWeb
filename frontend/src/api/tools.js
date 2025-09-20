import request from '@/utils/request'

/**
 * 工具相关API
 */

// 获取工具列表
export const getTools = (params = {}) => {
  return request({
    url: '/tools',
    method: 'get',
    params: {
      category: '',
      status: 'active',
      featured: '',
      ...params
    }
  })
}

// 获取工具分类
export const getToolCategories = () => {
  return request({
    url: '/tools/categories',
    method: 'get'
  })
}

// 获取单个工具详情
export const getToolById = (id) => {
  return request({
    url: `/tools/${id}`,
    method: 'get'
  })
}

// 记录工具使用统计
export const recordToolUsage = (toolId, data = {}) => {
  return request({
    url: `/tools/${toolId}/usage`,
    method: 'post',
    data: {
      action: 'use',
      duration: 0,
      metadata: {},
      ...data
    }
  })
}

// 获取工具使用统计
export const getToolStats = (toolId) => {
  return request({
    url: `/tools/${toolId}/stats`,
    method: 'get'
  })
}

// 收藏工具
export const favoriteTools = (toolId) => {
  return request({
    url: `/tools/${toolId}/favorite`,
    method: 'post'
  })
}

// 取消收藏工具
export const unfavoriteTools = (toolId) => {
  return request({
    url: `/tools/${toolId}/favorite`,
    method: 'delete'
  })
}

// 获取用户收藏的工具
export const getFavoriteTools = () => {
  return request({
    url: '/tools/favorites/list',
    method: 'get'
  })
}

// ==================== 视频下载工具API ====================

// 解析视频信息
export const parseVideo = (url) => {
  return request({
    url: '/tools/video/parse',
    method: 'post',
    data: { url }
  })
}

// 下载视频
export const downloadVideo = (url, format, audioOnly = false) => {
  return request({
    url: '/tools/video/download',
    method: 'post',
    data: { url, format, audioOnly }
  })
}

// ==================== YouTube工具API ====================

// 解析YouTube视频
export const parseYouTubeVideo = (url) => {
  return request({
    url: '/tools/youtube/parse',
    method: 'post',
    data: { url }
  })
}

// 下载YouTube视频
export const downloadYouTubeVideo = (url, format, audioOnly = false) => {
  return request({
    url: '/tools/youtube/download',
    method: 'post',
    data: { url, format, audioOnly }
  })
}

// 检查YouTube Cookies状态
export const checkYouTubeCookiesStatus = () => {
  return request({
    url: '/tools/youtube/cookies/status',
    method: 'get'
  })
}

// 上传YouTube Cookies
export const uploadYouTubeCookies = (cookies) => {
  return request({
    url: '/tools/youtube/cookies/upload',
    method: 'post',
    data: { cookies }
  })
}

// 删除YouTube Cookies
export const deleteYouTubeCookies = () => {
  return request({
    url: '/tools/youtube/cookies',
    method: 'delete'
  })
}

// ==================== 爱奇艺工具API ====================

// 解析爱奇艺视频
export const parseIqiyiVideo = (url) => {
  return request({
    url: '/tools/iqiyi/parse',
    method: 'post',
    data: { url }
  })
}

// 下载爱奇艺视频
export const downloadIqiyiVideo = (url, tvid, vid) => {
  return request({
    url: '/tools/iqiyi/download',
    method: 'post',
    data: { url, tvid, vid }
  })
}

export default {
  getTools,
  getToolCategories,
  getToolById,
  recordToolUsage,
  getToolStats,
  favoriteTools,
  unfavoriteTools,
  getFavoriteTools,
  // 视频下载
  parseVideo,
  downloadVideo,
  // YouTube
  parseYouTubeVideo,
  downloadYouTubeVideo,
  checkYouTubeCookiesStatus,
  uploadYouTubeCookies,
  deleteYouTubeCookies,
  // 爱奇艺
  parseIqiyiVideo,
  downloadIqiyiVideo
}
