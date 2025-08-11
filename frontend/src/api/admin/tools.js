/**
 * 后台工具管理API
 */
import request from '@/utils/request'

// 工具管理API
export const toolsAPI = {
  // 获取工具列表
  getTools(params = {}) {
    return request({
      url: '/admin/tools',
      method: 'get',
      params: {
        page: 1,
        pageSize: 20,
        category: '',
        status: '',
        keyword: '',
        ...params
      }
    })
  },

  // 获取单个工具详情
  getToolById(id) {
    return request({
      url: `/admin/tools/${id}`,
      method: 'get'
    })
  },

  // 创建工具
  createTool(data) {
    return request({
      url: '/admin/tools',
      method: 'post',
      data
    })
  },

  // 更新工具
  updateTool(id, data) {
    return request({
      url: `/admin/tools/${id}`,
      method: 'put',
      data
    })
  },

  // 删除工具
  deleteTool(id) {
    return request({
      url: `/admin/tools/${id}`,
      method: 'delete'
    })
  },

  // 批量删除工具
  batchDeleteTools(ids) {
    return request({
      url: '/admin/tools/batch-delete',
      method: 'post',
      data: { ids }
    })
  },

  // 切换工具状态
  toggleToolStatus(id, status) {
    return request({
      url: `/admin/tools/${id}/status`,
      method: 'patch',
      data: { status }
    })
  },

  // 批量更新工具状态
  batchUpdateStatus(ids, status) {
    return request({
      url: '/admin/tools/batch-status',
      method: 'patch',
      data: { ids, status }
    })
  },

  // 更新工具排序
  updateToolSort(data) {
    return request({
      url: '/admin/tools/sort',
      method: 'patch',
      data
    })
  }
}

// 工具分类管理API
export const categoriesAPI = {
  // 获取分类列表
  getCategories() {
    return request({
      url: '/admin/categories',
      method: 'get'
    })
  },

  // 创建分类
  createCategory(data) {
    return request({
      url: '/admin/categories',
      method: 'post',
      data
    })
  },

  // 更新分类
  updateCategory(id, data) {
    return request({
      url: `/admin/categories/${id}`,
      method: 'put',
      data
    })
  },

  // 删除分类
  deleteCategory(id) {
    return request({
      url: `/admin/categories/${id}`,
      method: 'delete'
    })
  }
}

// 工具统计分析API
export const analyticsAPI = {
  // 获取概览统计
  getOverviewStats() {
    return request({
      url: '/admin/tools/analytics/overview',
      method: 'get'
    })
  },

  // 获取工具使用统计
  getToolUsageStats(params = {}) {
    return request({
      url: '/admin/tools/analytics/usage',
      method: 'get',
      params: {
        period: '7d', // 7d, 30d, 90d, 1y
        toolId: '',
        ...params
      }
    })
  },

  // 获取用户行为分析
  getUserBehaviorStats(params = {}) {
    return request({
      url: '/admin/tools/analytics/behavior',
      method: 'get',
      params
    })
  },

  // 获取性能监控数据
  getPerformanceStats(params = {}) {
    return request({
      url: '/admin/tools/analytics/performance',
      method: 'get',
      params
    })
  },

  // 导出统计报表
  exportReport(params = {}) {
    return request({
      url: '/admin/tools/analytics/export',
      method: 'post',
      data: params,
      responseType: 'blob'
    })
  }
}

// 系统管理API
export const systemAPI = {
  // 获取系统配置
  getSystemConfig() {
    return request({
      url: '/admin/tools/system/config',
      method: 'get'
    })
  },

  // 更新系统配置
  updateSystemConfig(data) {
    return request({
      url: '/admin/tools/system/config',
      method: 'put',
      data
    })
  },

  // 获取操作日志
  getLogs(params = {}) {
    return request({
      url: '/admin/tools/system/logs',
      method: 'get',
      params: {
        page: 1,
        pageSize: 50,
        level: '',
        action: '',
        startDate: '',
        endDate: '',
        ...params
      }
    })
  },

  // 清理缓存
  clearCache() {
    return request({
      url: '/admin/tools/system/cache/clear',
      method: 'post'
    })
  },

  // 系统健康检查
  healthCheck() {
    return request({
      url: '/admin/tools/system/health',
      method: 'get'
    })
  },

  // 获取系统监控数据
  getMonitorData() {
    return request({
      url: '/admin/tools/system/monitor',
      method: 'get'
    })
  }
}
