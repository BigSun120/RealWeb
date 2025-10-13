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
  patchDramaPromptTemplate
};
