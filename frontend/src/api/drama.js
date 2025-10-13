import request from '@/utils/request';

/**
 * 获取项目列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
export const getDramaProjects = (params = {}) => {
  return request({
    url: '/tools/drama/projects',
    method: 'get',
    params
  });
};

/**
 * 获取项目详情
 * @param {String} id 项目ID
 * @returns {Promise}
 */
export const getDramaProject = (id) => {
  return request({
    url: `/tools/drama/projects/${id}`,
    method: 'get'
  });
};

/**
 * 创建项目
 * @param {Object} data 项目数据
 * @returns {Promise}
 */
export const createDramaProject = (data) => {
  return request({
    url: '/tools/drama/projects',
    method: 'post',
    data
  });
};

/**
 * 更新项目
 * @param {String} id 项目ID
 * @param {Object} data 项目数据
 * @returns {Promise}
 */
export const updateDramaProject = (id, data) => {
  return request({
    url: `/tools/drama/projects/${id}`,
    method: 'put',
    data
  });
};

/**
 * 删除项目
 * @param {String} id 项目ID
 * @returns {Promise}
 */
export const deleteDramaProject = (id) => {
  return request({
    url: `/tools/drama/projects/${id}`,
    method: 'delete'
  });
};

/**
 * 获取统计信息
 * @returns {Promise}
 */
export const getDramaStatistics = () => {
  return request({
    url: '/tools/drama/statistics',
    method: 'get'
  });
};

// 模块化 PATCH 接口
export const patchDramaWorldview = (id, worldview) => {
  return request({
    url: `/tools/drama/projects/${id}/worldview`,
    method: 'patch',
    data: { worldview }
  });
};

export const patchDramaCharacters = (id, characters) => {
  return request({
    url: `/tools/drama/projects/${id}/characters`,
    method: 'patch',
    data: { characters }
  });
};

export const patchDramaOutline = (id, outline) => {
  return request({
    url: `/tools/drama/projects/${id}/outline`,
    method: 'patch',
    data: { outline }
  });
};

export const patchDramaEpisodes = (id, episodes) => {
  return request({
    url: `/tools/drama/projects/${id}/episodes`,
    method: 'patch',
    data: { episodes }
  });
};

export const patchDramaPromptTemplate = (id, promptTemplate) => {
  return request({
    url: `/tools/drama/projects/${id}/prompt-template`,
    method: 'patch',
    data: { promptTemplate }
  });
};

/**
 * 导出项目剧本
 * @param {String} id 项目ID
 * @param {Object} options 导出选项
 * @param {String} options.format 格式: txt|markdown|md
 * @param {Boolean} options.includeIncomplete 是否包含未完成的剧集
 * @param {Number} options.upToEpisode 截止到哪一集
 * @param {Boolean} options.includeMetadata 是否包含创作辅助信息（关键对白、结尾悬念、备注）
 * @returns {Promise}
 */
export const exportDramaProject = async (id, options = {}) => {
  const { format = 'txt', includeIncomplete = false, upToEpisode = null, includeMetadata = true } = options;
  
  const params = { format };
  if (includeIncomplete) params.includeIncomplete = 'true';
  if (upToEpisode) params.upToEpisode = upToEpisode;
  if (includeMetadata !== undefined) params.includeMetadata = includeMetadata ? 'true' : 'false';
  
  try {
    const response = await request({
      url: `/tools/drama/projects/${id}/export`,
      method: 'get',
      params,
      responseType: 'blob'
    });
    
    // 当 responseType 为 blob 时，拦截器返回整个 response 对象
    // 我们需要提取 response.data
    const blob = response.data;
    
    // 检查是否为错误响应（后端可能返回JSON错误）
    if (blob.type && blob.type.includes('application/json')) {
      // 尝试解析错误消息
      const text = await blob.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || '导出失败');
    }
    
    return blob;
  } catch (error) {
    // 如果是网络错误或其他错误，直接抛出
    if (error.response) {
      // 尝试从 Blob 响应中提取错误消息
      const blob = error.response.data;
      if (blob && blob.type && blob.type.includes('application/json')) {
        try {
          const text = await blob.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || '导出失败');
        } catch (parseError) {
          // 如果解析失败，使用默认错误消息
        }
      }
    }
    throw error;
  }
};

export default {
  getDramaProjects,
  getDramaProject,
  createDramaProject,
  updateDramaProject,
  deleteDramaProject,
  getDramaStatistics,
  patchDramaWorldview,
  patchDramaCharacters,
  patchDramaOutline,
  patchDramaEpisodes,
  patchDramaPromptTemplate,
  exportDramaProject
};
