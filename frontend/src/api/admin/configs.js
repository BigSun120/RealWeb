import request from '@/utils/request'

/**
 * 配置管理API
 */

// 获取配置列表
export const getConfigs = (params = {}) => {
  return request({
    url: '/admin/configs',
    method: 'get',
    params: {
      group: '',
      includeSystem: false,
      ...params
    }
  })
}

// 获取配置分组
export const getConfigGroups = () => {
  return request({
    url: '/admin/configs/groups',
    method: 'get'
  })
}

// 获取单个配置
export const getConfig = (key) => {
  return request({
    url: `/admin/configs/${key}`,
    method: 'get'
  })
}

// 设置配置值
export const setConfig = (key, data) => {
  return request({
    url: `/admin/configs/${key}`,
    method: 'put',
    data
  })
}

// 批量设置配置
export const setBatchConfigs = (configs) => {
  return request({
    url: '/admin/configs/batch',
    method: 'post',
    data: { configs }
  })
}

// 删除配置
export const deleteConfig = (key) => {
  return request({
    url: `/admin/configs/${key}`,
    method: 'delete'
  })
}

// 重置配置为默认值
export const resetConfig = (key) => {
  return request({
    url: `/admin/configs/${key}/reset`,
    method: 'post'
  })
}

// 导出配置
export const exportConfigs = (params = {}) => {
  return request({
    url: '/admin/configs/export/all',
    method: 'get',
    params: {
      includeSystem: false,
      includeSensitive: false,
      ...params
    }
  })
}

// 导入配置
export const importConfigs = (data) => {
  return request({
    url: '/admin/configs/import',
    method: 'post',
    data
  })
}

// 获取工具箱相关配置
export const getToolsSettings = async () => {
  try {
    const response = await getConfigs({ group: 'general,limits,analytics,cache,security,upload,notifications' })
    
    // 将配置数组转换为分组对象
    const settings = {
      general: {},
      analytics: {},
      cache: {},
      security: {},
      upload: {},
      notifications: {}
    }
    
    response.data.forEach(config => {
      const group = config.group || 'general'
      const key = config.key.split('.').pop() // 获取最后一部分作为键名
      
      if (settings[group] !== undefined) {
        settings[group][key] = config.value
      }
    })
    
    return { data: settings }
  } catch (error) {
    throw error
  }
}

// 保存工具箱设置
export const saveToolsSettings = async (settings) => {
  try {
    const configs = []
    
    // 将设置对象转换为配置数组
    Object.keys(settings).forEach(group => {
      Object.keys(settings[group]).forEach(key => {
        configs.push({
          key: `tools.${key}`,
          value: settings[group][key],
          group: group === 'general' ? 'general' : group,
          description: getConfigDescription(key)
        })
      })
    })
    
    return await setBatchConfigs(configs)
  } catch (error) {
    throw error
  }
}

// 获取配置描述
function getConfigDescription(key) {
  const descriptions = {
    enabled: '是否启用工具箱功能',
    requireAuth: '工具箱是否需要登录访问',
    maxUsagePerDay: '每日最大使用次数限制',
    maxUsagePerUser: '单用户每日最大使用次数',
    retentionDays: '统计数据保留天数',
    trackAnonymous: '是否跟踪匿名用户',
    ttl: '缓存过期时间（秒）',
    rateLimitEnabled: '是否启用频率限制',
    rateLimitWindow: '频率限制时间窗口（秒）',
    rateLimitMax: '频率限制最大请求数',
    maxFileSize: '最大文件上传大小（MB）',
    emailEnabled: '是否启用邮件通知'
  }
  
  return descriptions[key] || `${key}配置`
}

export default {
  getConfigs,
  getConfigGroups,
  getConfig,
  setConfig,
  setBatchConfigs,
  deleteConfig,
  resetConfig,
  exportConfigs,
  importConfigs,
  getToolsSettings,
  saveToolsSettings
}
