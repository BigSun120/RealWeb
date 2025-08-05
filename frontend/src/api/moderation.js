import request from './index';

/**
 * 审核管理相关API
 */

// 获取待审核评论列表
export const getPendingComments = (params = {}) => {
  return request.get('/moderation/comments/pending', { params });
};

// 获取所有评论（包含审核状态）
export const getAllComments = (params = {}) => {
  return request.get('/moderation/comments', { params });
};

// 审核单个评论
export const moderateComment = (commentId, data) => {
  return request.put(`/moderation/comments/${commentId}/moderate`, data);
};

// 批量审核评论
export const batchModerateComments = (data) => {
  return request.put('/moderation/comments/batch-moderate', data);
};

// 获取审核统计信息
export const getModerationStats = () => {
  return request.get('/moderation/stats');
};

// 批准评论
export const approveComment = (commentId, reason = '') => {
  return moderateComment(commentId, {
    action: 'approve',
    reason
  });
};

// 拒绝评论
export const rejectComment = (commentId, reason = '') => {
  return moderateComment(commentId, {
    action: 'reject',
    reason
  });
};

// 批量批准评论
export const batchApproveComments = (commentIds, reason = '') => {
  return batchModerateComments({
    commentIds,
    action: 'approve',
    reason
  });
};

// 批量拒绝评论
export const batchRejectComments = (commentIds, reason = '') => {
  return batchModerateComments({
    commentIds,
    action: 'reject',
    reason
  });
};
