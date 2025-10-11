const PromptComment = require('../models/PromptComment');
const PromptTemplate = require('../models/PromptTemplate');
const logger = require('../utils/logger');

/**
 * 评论管理控制器
 */
class CommentController {
  /**
   * 获取提示词的评论列表（树形结构）
   */
  static async getComments(req, res) {
    try {
      const { promptId } = req.params;
      const { page = 1, limit = 20, sort = 'createdAt' } = req.query;
      const userId = req.user ? req.user._id : null;

      // 验证提示词是否存在
      const prompt = await PromptTemplate.findById(promptId);
      if (!prompt || prompt.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查：私有提示词只能作者查看评论
      if (prompt.visibility === 'private' && 
          (!userId || prompt.userId.toString() !== userId.toString())) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 获取评论树
      const options = {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
        sort: { [sort]: -1 }
      };

      const comments = await PromptComment.getCommentTree(promptId, options);

      // 添加当前用户的点赞状态
      if (userId) {
        const markLikeStatus = (commentList) => {
          commentList.forEach(comment => {
            comment.isLiked = comment.likedBy && 
              comment.likedBy.some(id => id.toString() === userId.toString());
            if (comment.replies && comment.replies.length > 0) {
              markLikeStatus(comment.replies);
            }
          });
        };
        markLikeStatus(comments);
      }

      // 获取总评论数
      const total = await PromptComment.countDocuments({
        promptId,
        isDeleted: false
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          comments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total
          }
        }
      });
    } catch (error) {
      logger.error('获取评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取评论失败',
        error: error.message
      });
    }
  }

  /**
   * 创建评论或回复
   */
  static async createComment(req, res) {
    try {
      const { promptId } = req.params;
      const { content, parentId, replyToUserId } = req.body;
      const userId = req.user._id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          code: 400,
          message: '评论内容不能为空'
        });
      }

      // 验证提示词是否存在
      const prompt = await PromptTemplate.findById(promptId);
      if (!prompt || prompt.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 检查是否允许评论
      if (!prompt.allowComments) {
        return res.status(403).json({
          code: 403,
          message: '该提示词不允许评论'
        });
      }

      // 如果是回复，验证父评论是否存在
      let rootId = null;
      if (parentId) {
        const parentComment = await PromptComment.findById(parentId);
        if (!parentComment || parentComment.isDeleted) {
          return res.status(404).json({
            code: 404,
            message: '父评论不存在'
          });
        }
        // 设置 rootId（如果父评论有 rootId，使用它；否则使用父评论的 _id）
        rootId = parentComment.rootId || parentComment._id;
      }

      // 创建评论
      const comment = await PromptComment.create({
        promptId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
        replyToUserId: replyToUserId || null,
        rootId
      });

      // 更新父评论的回复数量
      if (parentId) {
        const parentComment = await PromptComment.findById(parentId);
        if (parentComment) {
          await parentComment.updateReplyCount();
        }
      }

      // 填充用户信息
      await comment.populate('userId', 'username avatar');
      if (replyToUserId) {
        await comment.populate('replyToUserId', 'username');
      }

      res.status(201).json({
        code: 201,
        message: '评论成功',
        data: comment
      });
    } catch (error) {
      logger.error('创建评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建评论失败',
        error: error.message
      });
    }
  }

  /**
   * 更新评论
   */
  static async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user._id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          code: 400,
          message: '评论内容不能为空'
        });
      }

      const comment = await PromptComment.findById(commentId);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在'
        });
      }

      // 权限检查：只有作者可以编辑
      if (comment.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有编辑权限'
        });
      }

      // 更新评论
      comment.content = content.trim();
      comment.isEdited = true;
      comment.lastEditedAt = new Date();
      await comment.save();

      // 填充用户信息
      await comment.populate('userId', 'username avatar');
      if (comment.replyToUserId) {
        await comment.populate('replyToUserId', 'username');
      }

      res.json({
        code: 200,
        message: '更新成功',
        data: comment
      });
    } catch (error) {
      logger.error('更新评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新评论失败',
        error: error.message
      });
    }
  }

  /**
   * 删除评论
   */
  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user._id;

      const comment = await PromptComment.findById(commentId);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在'
        });
      }

      // 权限检查：只有作者或提示词作者可以删除
      const prompt = await PromptTemplate.findById(comment.promptId);
      const isAuthor = comment.userId.toString() === userId.toString();
      const isPromptOwner = prompt && prompt.userId.toString() === userId.toString();

      if (!isAuthor && !isPromptOwner) {
        return res.status(403).json({
          code: 403,
          message: '没有删除权限'
        });
      }

      // 软删除
      await comment.softDelete();

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除评论失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除评论失败',
        error: error.message
      });
    }
  }

  /**
   * 点赞/取消点赞
   */
  static async toggleLike(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user._id;

      const comment = await PromptComment.findById(commentId);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({
          code: 404,
          message: '评论不存在'
        });
      }

      // 检查是否已点赞
      const isLiked = comment.likedBy.some(id => id.toString() === userId.toString());

      let liked = false;
      if (isLiked) {
        // 取消点赞
        await comment.removeLike(userId);
        liked = false;
      } else {
        // 点赞
        await comment.addLike(userId);
        liked = true;
      }

      res.json({
        code: 200,
        message: liked ? '点赞成功' : '取消点赞成功',
        data: {
          liked,
          likeCount: comment.likeCount
        }
      });
    } catch (error) {
      logger.error('点赞操作失败:', error);
      res.status(500).json({
        code: 500,
        message: '操作失败',
        error: error.message
      });
    }
  }

  /**
   * 获取评论统计
   */
  static async getCommentStats(req, res) {
    try {
      const { promptId } = req.params;

      const totalComments = await PromptComment.countDocuments({
        promptId,
        isDeleted: false
      });

      const rootComments = await PromptComment.countDocuments({
        promptId,
        parentId: null,
        isDeleted: false
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          totalComments,
          rootComments,
          replyCount: totalComments - rootComments
        }
      });
    } catch (error) {
      logger.error('获取评论统计失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取统计失败',
        error: error.message
      });
    }
  }
}

module.exports = CommentController;
