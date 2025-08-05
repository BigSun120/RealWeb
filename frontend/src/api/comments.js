import api from './index';

// 评论相关API
export const commentApi = {
  // 获取文章的评论列表
  getArticleComments(articleId, params = {}) {
    return api.get(`/comments/article/${articleId}`, { params });
  },

  // 获取评论的回复列表
  getCommentReplies(commentId, params = {}) {
    return api.get(`/comments/${commentId}/replies`, { params });
  },

  // 发表评论
  createComment(data) {
    return api.post('/comments', data);
  },

  // 编辑评论
  updateComment(commentId, data) {
    return api.put(`/comments/${commentId}`, data);
  },

  // 删除评论
  deleteComment(commentId) {
    return api.delete(`/comments/${commentId}`);
  },

  // 点赞/取消点赞评论
  toggleCommentLike(commentId) {
    return api.post(`/comments/${commentId}/like`);
  },

  // 获取评论的点赞用户列表
  getCommentLikes(commentId, params = {}) {
    return api.get(`/comments/${commentId}/likes`, { params });
  },

  // 获取用户的评论列表
  getUserComments(userId, params = {}) {
    return api.get(`/comments/user/${userId}`, { params });
  },

  // 查找评论所在页面
  findCommentPage(commentId, limit = 10) {
    return api.get(`/comments/find-page/${commentId}`, {
      params: { limit }
    });
  }
};

export default commentApi;
