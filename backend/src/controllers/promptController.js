const PromptTemplate = require('../models/PromptTemplate');
const UserPromptUsage = require('../models/UserPromptUsage');
const PromptFolder = require('../models/PromptFolder');
const logger = require('../utils/logger');

/**
 * AI提示词管理控制器
 */
class PromptController {
  /**
   * 获取提示词列表
   */
  static async getPrompts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        aiModel,
        folderId,
        tags,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        visibility
      } = req.query;

      const userId = req.user ? req.user._id : null;
      const query = { isDeleted: false };

      // 构建查询条件
      if (category) query.category = category;
      if (aiModel) query.aiModel = aiModel;
      if (folderId) {
        const folder = await PromptFolder.findOne({ id: folderId });
        if (folder) query.folderId = folder._id;
      }
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagArray };
      }

      // 权限过滤：只显示公开的或自己的提示词
      if (userId) {
        query.$or = [
          { visibility: 'public' },
          { userId, visibility: { $in: ['private', 'public', 'unlisted'] } }
        ];
      } else {
        query.visibility = 'public';
      }

      // 搜索
      if (search) {
        query.$text = { $search: search };
      }

      // 排序
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 分页
      const skip = (page - 1) * limit;
      const prompts = await PromptTemplate.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username avatar')
        .populate('folderId', 'name icon color')
        .lean();

      const total = await PromptTemplate.countDocuments(query);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          prompts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取提示词列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取提示词列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取提示词详情
   */
  static async getPromptById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user._id : null;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false })
        .populate('userId', 'username avatar bio')
        .populate('folderId', 'name icon color path')
        .lean();

      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      if (prompt.visibility === 'private' &&
          (!userId || prompt.userId._id.toString() !== userId.toString())) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 增加浏览量
      await PromptTemplate.findByIdAndUpdate(
        prompt._id,
        { $inc: { viewCount: 1 } }
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: prompt
      });
    } catch (error) {
      logger.error('获取提示词详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取提示词详情失败',
        error: error.message
      });
    }
  }

  /**
   * 创建提示词
   */
  static async createPrompt(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const promptData = {
        ...req.body,
        userId: req.user._id
      };

      // 如果指定了folderId，转换为ObjectId
      if (promptData.folderId) {
        const folder = await PromptFolder.findOne({
          id: promptData.folderId,
          userId: req.user._id
        });
        if (!folder) {
          return res.status(404).json({
            code: 404,
            message: '文件夹不存在'
          });
        }
        promptData.folderId = folder._id;
      }

      const prompt = await PromptTemplate.create(promptData);

      // 更新文件夹中的提示词数量
      if (prompt.folderId) {
        const folder = await PromptFolder.findById(prompt.folderId);
        if (folder) {
          await folder.updatePromptCount();
        }
      }

      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: prompt
      });
    } catch (error) {
      logger.error('创建提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 更新提示词
   */
  static async updatePrompt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      if (prompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有修改权限'
        });
      }

      // 保存版本历史
      const shouldSaveVersion = req.body.content && req.body.content !== prompt.content;
      if (shouldSaveVersion) {
        await prompt.saveVersion(userId);
      }

      // 更新字段
      const allowedUpdates = [
        'title', 'content', 'description', 'category', 'aiModel',
        'tags', 'variables', 'visibility', 'folderId', 'allowFork',
        'metadata'
      ];

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          prompt[field] = req.body[field];
        }
      });

      // 如果更新了folderId，转换为ObjectId
      if (req.body.folderId) {
        const folder = await PromptFolder.findOne({
          id: req.body.folderId,
          userId
        });
        if (folder) {
          const oldFolderId = prompt.folderId;
          prompt.folderId = folder._id;

          // 更新旧文件夹和新文件夹的计数
          if (oldFolderId) {
            const oldFolder = await PromptFolder.findById(oldFolderId);
            if (oldFolder) await oldFolder.updatePromptCount();
          }
          await folder.updatePromptCount();
        }
      }

      await prompt.save();

      res.json({
        code: 200,
        message: '更新成功',
        data: prompt
      });
    } catch (error) {
      logger.error('更新提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 删除提示词（软删除）
   */
  static async deletePrompt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      if (prompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有删除权限'
        });
      }

      prompt.isDeleted = true;
      prompt.deletedAt = new Date();
      await prompt.save();

      // 更新文件夹计数
      if (prompt.folderId) {
        const folder = await PromptFolder.findById(prompt.folderId);
        if (folder) await folder.updatePromptCount();
      }

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 复制/Fork提示词
   */
  static async forkPrompt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const originalPrompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!originalPrompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 检查是否允许复制
      if (!originalPrompt.allowFork && originalPrompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '该提示词不允许复制'
        });
      }

      // 创建副本
      const forkedPrompt = new PromptTemplate({
        title: `${originalPrompt.title} (副本)`,
        content: originalPrompt.content,
        description: originalPrompt.description,
        category: originalPrompt.category,
        aiModel: originalPrompt.aiModel,
        tags: [...originalPrompt.tags],
        variables: originalPrompt.variables.map(v => ({ ...v })),
        userId,
        originalPromptId: originalPrompt._id,
        forkCount: 0,
        visibility: 'private'
      });

      await forkedPrompt.save();

      // 增加原提示词的fork计数
      originalPrompt.forkCount += 1;
      await originalPrompt.save();

      res.status(201).json({
        code: 201,
        message: '复制成功',
        data: forkedPrompt
      });
    } catch (error) {
      logger.error('复制提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '复制提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 记录提示词使用
   */
  static async recordUsage(req, res) {
    try {
      const { id } = req.params;
      const { variableValues, rating, feedback, aiModel, responseQuality } = req.body;
      const userId = req.user ? req.user._id : null;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 生成最终提示词（替换变量）
      let generatedPrompt = prompt.content;
      if (variableValues) {
        Object.entries(variableValues).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}(?::[^}]*)?\\}\\}`, 'g');
          generatedPrompt = generatedPrompt.replace(regex, value);
        });
      }

      // 记录使用
      const usageData = {
        userId,
        promptId: prompt._id,
        variableValues,
        generatedPrompt,
        rating,
        feedback,
        aiModel,
        responseQuality
      };

      const usage = await UserPromptUsage.recordUsage(usageData);

      // 如果有评分，更新提示词评分
      if (rating) {
        await prompt.updateRating(rating);
      }

      res.json({
        code: 200,
        message: '记录成功',
        data: {
          generatedPrompt,
          usage
        }
      });
    } catch (error) {
      logger.error('记录使用失败:', error);
      res.status(500).json({
        code: 500,
        message: '记录使用失败',
        error: error.message
      });
    }
  }

  /**
   * 获取提示词统计
   */
  static async getPromptStats(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      const userId = req.user ? req.user._id : null;
      if (prompt.userId.toString() !== userId?.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      const stats = await UserPromptUsage.getPromptStats(prompt._id, startDate, endDate);
      const trend = await UserPromptUsage.getUsageTrend(prompt._id);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          stats: stats[0] || {},
          trend
        }
      });
    } catch (error) {
      logger.error('获取统计失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取统计失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户的提示词历史
   */
  static async getUserHistory(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const { promptId, startDate, endDate, limit = 50 } = req.query;
      const options = {
        promptId,
        startDate,
        endDate,
        limit: parseInt(limit)
      };

      const history = await UserPromptUsage.getUserHistory(req.user._id, options);

      res.json({
        code: 200,
        message: '获取成功',
        data: history
      });
    } catch (error) {
      logger.error('获取历史记录失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取历史记录失败',
        error: error.message
      });
    }
  }

  /**
   * 获取热门提示词
   */
  static async getTrendingPrompts(req, res) {
    try {
      const { limit = 10, days = 7 } = req.query;
      const prompts = await PromptTemplate.getTrendingPrompts(parseInt(limit), parseInt(days));

      res.json({
        code: 200,
        message: '获取成功',
        data: prompts
      });
    } catch (error) {
      logger.error('获取热门提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取热门提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 生成分享链接
   */
  static async generateShareLink(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      if (prompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有分享权限'
        });
      }

      // 如果是私有的，自动改为unlisted
      if (prompt.visibility === 'private') {
        prompt.visibility = 'unlisted';
        await prompt.save();
      }

      const shareToken = await prompt.generateShareToken();
      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/tools/prompt-vault/share/${shareToken}`;

      res.json({
        code: 200,
        message: '生成成功',
        data: {
          shareToken,
          shareUrl
        }
      });
    } catch (error) {
      logger.error('生成分享链接失败:', error);
      res.status(500).json({
        code: 500,
        message: '生成分享链接失败',
        error: error.message
      });
    }
  }

  /**
   * 通过分享token访问提示词
   */
  static async getPromptByShareToken(req, res) {
    try {
      const { token } = req.params;

      const prompt = await PromptTemplate.findOne({
        shareToken: token,
        isDeleted: false
      })
        .populate('userId', 'username avatar')
        .lean();

      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '分享链接无效或已过期'
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: prompt
      });
    } catch (error) {
      logger.error('获取分享提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取分享提示词失败',
        error: error.message
      });
    }
  }
}

module.exports = PromptController;
