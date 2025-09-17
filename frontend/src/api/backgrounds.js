import api from './index';

// ==================== 前端API ====================

/**
 * 根据路径获取匹配的背景配置
 * @param {string} path - 当前页面路径
 */
export const getBackgroundByPath = (path) => {
  return api.get('/backgrounds/match', { params: { path } });
};

/**
 * 获取特定配置详情
 * @param {string} id - 配置ID
 */
export const getBackgroundConfig = (id) => {
  return api.get(`/backgrounds/config/${id}`);
};

// ==================== 管理员API ====================

/**
 * 获取所有背景配置
 * @param {Object} params - 查询参数
 */
export const getBackgroundConfigs = (params = {}) => {
  return api.get('/backgrounds/admin/configs', { params });
};

/**
 * 创建背景配置
 * @param {Object} configData - 配置数据
 */
export const createBackgroundConfig = (configData) => {
  return api.post('/backgrounds/admin/configs', configData);
};

/**
 * 更新背景配置
 * @param {string} id - 配置ID
 * @param {Object} updateData - 更新数据
 */
export const updateBackgroundConfig = (id, updateData) => {
  return api.put(`/backgrounds/admin/configs/${id}`, updateData);
};

/**
 * 删除背景配置
 * @param {string} id - 配置ID
 */
export const deleteBackgroundConfig = (id) => {
  return api.delete(`/backgrounds/admin/configs/${id}`);
};

/**
 * 上传背景图片
 * @param {File} file - 图片文件
 * @param {Object} options - 上传选项
 * @param {Function} onProgress - 上传进度回调
 */
export const uploadBackgroundImage = (file, options = {}, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);

  if (options.generateMobile) {
    formData.append('generateMobile', 'true');
  }

  return api.post('/backgrounds/admin/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    }
  });
};

/**
 * 删除背景图片
 * @param {string} filename - 图片文件名
 */
export const deleteBackgroundImage = (filename) => {
  return api.delete(`/backgrounds/admin/image/${filename}`);
};

// ==================== 批量操作API ====================

/**
 * 批量创建背景配置
 * @param {Array} configsData - 配置数据数组
 */
export const batchCreateBackgroundConfigs = (configsData) => {
  return api.post('/backgrounds/admin/batch/create', { configs: configsData });
};

/**
 * 批量更新背景配置
 * @param {Array} ids - 配置ID数组
 * @param {Object} updateData - 更新数据
 */
export const batchUpdateBackgroundConfigs = (ids, updateData) => {
  return api.put('/backgrounds/admin/batch/update', { ids, updateData });
};

/**
 * 批量删除背景配置
 * @param {Array} ids - 配置ID数组
 */
export const batchDeleteBackgroundConfigs = (ids) => {
  return api.delete('/backgrounds/admin/batch/delete', { data: { ids } });
};

/**
 * 批量启用/禁用背景配置
 * @param {Array} ids - 配置ID数组
 * @param {boolean} isActive - 是否激活
 */
export const batchToggleBackgroundConfigs = (ids, isActive) => {
  return api.put('/backgrounds/admin/batch/toggle', { ids, isActive });
};

/**
 * 导入背景配置
 * @param {Array} configsData - 配置数据数组
 * @param {Object} options - 导入选项
 */
export const importBackgroundConfigs = (configsData, options = {}) => {
  return api.post('/backgrounds/admin/import', {
    configs: configsData,
    options
  });
};



// ==================== 工具函数 ====================

/**
 * 获取图片完整URL
 * @param {string} url - 相对URL
 */
export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return baseURL.replace('/api', '') + url;
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 获取匹配类型显示名称
 * @param {string} matchType - 匹配类型
 */
export const getMatchTypeLabel = (matchType) => {
  const labels = {
    exact: '精确匹配',
    prefix: '前缀匹配',
    wildcard: '通配符匹配',
    regex: '正则匹配'
  };
  return labels[matchType] || matchType;
};

/**
 * 验证路径格式
 * @param {string} path - 路径
 * @param {string} matchType - 匹配类型
 */
export const validatePath = (path, matchType) => {
  if (!path || path.trim() === '') {
    return '路径不能为空';
  }

  if (matchType === 'regex') {
    try {
      new RegExp(path);
    } catch (e) {
      return '无效的正则表达式';
    }
  }

  return null;
};

/**
 * 获取路径匹配示例
 * @param {string} path - 路径
 * @param {string} matchType - 匹配类型
 */
export const getPathMatchExamples = (path, matchType) => {
  if (!path || !matchType) return [];

  const examples = [];

  switch (matchType) {
    case 'exact':
      examples.push({
        path: path,
        match: true,
        description: '完全匹配'
      });
      if (path !== '/') {
        examples.push({
          path: path + '/sub',
          match: false,
          description: '子路径不匹配'
        });
      }
      break;

    case 'prefix':
      examples.push({
        path: path,
        match: true,
        description: '前缀匹配'
      });
      examples.push({
        path: path + '/sub',
        match: true,
        description: '子路径匹配'
      });
      examples.push({
        path: path + '/sub/page',
        match: true,
        description: '深层子路径匹配'
      });
      if (path !== '/') {
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        examples.push({
          path: parentPath,
          match: false,
          description: '父路径不匹配'
        });
      }
      break;

    case 'wildcard':
      examples.push({
        path: path.replace(/\*/g, 'example'),
        match: true,
        description: '通配符匹配示例'
      });
      if (path.includes('*')) {
        examples.push({
          path: path.replace(/\*/g, 'test'),
          match: true,
          description: '另一个匹配示例'
        });
        examples.push({
          path: path.replace(/\*/g, ''),
          match: true,
          description: '空字符匹配'
        });
      }
      break;

    case 'regex':
      try {
        const regex = new RegExp(path);
        // 提供一些常见的测试路径
        const testPaths = ['/', '/home', '/about', '/blog', '/blog/post-1', '/admin', '/user/profile'];
        testPaths.forEach(testPath => {
          const isMatch = regex.test(testPath);
          examples.push({
            path: testPath,
            match: isMatch,
            description: isMatch ? '正则匹配' : '正则不匹配'
          });
        });
      } catch (e) {
        examples.push({
          path: '无效的正则表达式',
          match: false,
          description: '请检查正则语法'
        });
      }
      break;

    default:
      examples.push({
        path: path,
        match: true,
        description: '默认匹配'
      });
  }

  return examples.slice(0, 5); // 最多返回5个示例
};


