import api from './index';

/**
 * 文章相关API
 */

// 获取文章列表
export const getArticles = (params = {}) => {
  return api.get('/articles', { params });
};

// 获取我的文章列表
export const getMyArticles = (params = {}) => {
  return api.get('/articles/my', { params });
};

// 获取文章详情
export const getArticle = (id) => {
  return api.get(`/articles/${id}`);
};

// 创建文章
export const createArticle = (data) => {
  return api.post('/articles', data);
};

// 更新文章
export const updateArticle = (id, data) => {
  return api.put(`/articles/${id}`, data);
};

// 删除文章
export const deleteArticle = (id) => {
  return api.delete(`/articles/${id}`);
};

// 批量操作文章
export const batchArticleOperation = (articleIds, action, data = {}) => {
  return api.post('/articles/batch', {
    articleIds,
    action,
    data
  });
};

// 批量恢复文章（从回收站）
export const batchRestoreArticles = (articleIds) => {
  return batchArticleOperation(articleIds, 'restore');
};

// 批量永久删除文章
export const batchPermanentDeleteArticles = (articleIds) => {
  return batchArticleOperation(articleIds, 'permanentDelete');
};

// 上传文章图片
export const uploadArticleImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);

  // 不要手动设置Content-Type，让浏览器自动设置boundary
  return api.post('/articles/upload-image', formData);
};

// 获取分类列表
export const getCategories = () => {
  return api.get('/categories');
};

// 获取标签列表
export const getTags = () => {
  return api.get('/tags');
};
