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

export default {
  getTools,
  getToolCategories,
  getToolById,
  recordToolUsage,
  getToolStats,
  favoriteTools,
  unfavoriteTools,
  getFavoriteTools
}
