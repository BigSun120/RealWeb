const PromptTemplate = require('../models/PromptTemplate');
const UserPromptUsage = require('../models/UserPromptUsage');
const PromptFolder = require('../models/PromptFolder');
const PromptAnalytics = require('../models/PromptAnalytics');
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
        visibility,
        viewMode = 'all'
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

      // 视图模式筛选
      let prompts, total;

      if (viewMode === 'favorite' && userId) {
        // 收藏模式：通过 Bookmark 表查询
        const Bookmark = require('../models/Bookmark');

        // 先获取用户收藏的所有 prompt ID
        const bookmarks = await Bookmark.find({
          userId,
          targetType: 'prompt'
        }).lean();

        const favoritedIds = bookmarks.map(b => b.targetId);

        if (favoritedIds.length === 0) {
          // 没有收藏任何提示词
          prompts = [];
          total = 0;
        } else {
          // 查询收藏的提示词
          query._id = { $in: favoritedIds };

          // 搜索
          if (search) {
            const trimmedSearch = search.trim();
            
            // 检查是否是精确搜索（双引号包裹）
            if (trimmedSearch.startsWith('"') && trimmedSearch.endsWith('"')) {
              // 精确搜索：完全匹配
              const exactTerm = trimmedSearch.slice(1, -1);
              query.$or = [
                { title: { $regex: exactTerm, $options: 'i' } },
                { description: { $regex: exactTerm, $options: 'i' } },
                { content: { $regex: exactTerm, $options: 'i' } }
              ];
            } else {
              // 默认：模糊搜索（全文搜索）
              query.$text = { $search: trimmedSearch };
            }
          }

          // 排序
          const sort = {};
          sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

          // 分页
          const skip = (page - 1) * limit;
          prompts = await PromptTemplate.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'username avatar')
            .populate('folderId', 'id name icon color pathName')
            .lean();

          total = await PromptTemplate.countDocuments(query);

          // 标记为已收藏，并转换 folderId
          prompts.forEach(p => {
            p.isFavorited = true;
            if (p.folderId && typeof p.folderId === 'object') {
              const folderInfo = p.folderId;
              p.folderInfo = folderInfo;
              p.folderId = folderInfo.id;
            }
          });
        }
      } else {
        // 其他模式
        if (viewMode === 'mine' && userId) {
          // 只显示我创建的
          query.userId = userId;
        } else {
          // 权限过滤：只显示公开的或自己的提示词
          if (userId) {
            query.$or = [
              { visibility: 'public' },
              { userId, visibility: { $in: ['private', 'public', 'unlisted'] } }
            ];
          } else {
            query.visibility = 'public';
          }
        }

        // 搜索
        if (search) {
          const trimmedSearch = search.trim();
          
          // 检查是否是精确搜索（双引号包裹）
          if (trimmedSearch.startsWith('"') && trimmedSearch.endsWith('"')) {
            // 精确搜索：完全匹配
            const exactTerm = trimmedSearch.slice(1, -1);
            query.$or = [
              { title: { $regex: exactTerm, $options: 'i' } },
              { description: { $regex: exactTerm, $options: 'i' } },
              { content: { $regex: exactTerm, $options: 'i' } }
            ];
          } else {
            // 默认：模糊搜索（全文搜索）
            query.$text = { $search: trimmedSearch };
          }
        }

        // 排序
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // 分页
        const skip = (page - 1) * limit;
        prompts = await PromptTemplate.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'username avatar')
          .populate('folderId', 'id name icon color pathName')
          .lean();

        total = await PromptTemplate.countDocuments(query);

        // 检查收藏状态并转换 folderId
        if (userId && prompts.length > 0) {
          const Bookmark = require('../models/Bookmark');
          const promptIds = prompts.map(p => p._id);
          const bookmarks = await Bookmark.find({
            userId,
            targetType: 'prompt',
            targetId: { $in: promptIds }
          }).lean();

          const favoritedSet = new Set(bookmarks.map(b => b.targetId.toString()));
          prompts.forEach(p => {
            p.isFavorited = favoritedSet.has(p._id.toString());
            // 转换 folderId
            if (p.folderId && typeof p.folderId === 'object') {
              const folderInfo = p.folderId;
              p.folderInfo = folderInfo;
              p.folderId = folderInfo.id;
            }
          });
        } else {
          // 如果没有用户或没有提示词，也要转换 folderId
          prompts.forEach(p => {
            if (p.folderId && typeof p.folderId === 'object') {
              const folderInfo = p.folderId;
              p.folderInfo = folderInfo;
              p.folderId = folderInfo.id;
            }
          });
        }
      }

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
        .populate('folderId', 'id name icon color path pathName')
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

      // 将 folderId 从对象转换为字符串 ID，方便前端使用
      if (prompt.folderId && typeof prompt.folderId === 'object') {
        const folderInfo = prompt.folderId;
        prompt.folderInfo = folderInfo; // 保存完整的文件夹信息
        prompt.folderId = folderInfo.id; // 只保留 ID 字符串
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

      const createData = {
        ...req.body,
        userId: req.user._id
      };

      // 如果指定了folderId，转换为ObjectId
      if (createData.folderId) {
        const folder = await PromptFolder.findOne({
          id: createData.folderId,
          userId: req.user._id
        });
        if (!folder) {
          return res.status(404).json({
            code: 404,
            message: '文件夹不存在'
          });
        }
        createData.folderId = folder._id;
      }

      const prompt = await PromptTemplate.create(createData);

      // 更新文件夹中的提示词数量
      if (prompt.folderId) {
        const folder = await PromptFolder.findById(prompt.folderId);
        if (folder) {
          await folder.updatePromptCount();
        }
      }

      // 转换 folderId 为字符串 ID
      const promptData = prompt.toObject();
      if (promptData.folderId) {
        const folder = await PromptFolder.findById(promptData.folderId);
        if (folder) {
          promptData.folderInfo = {
            id: folder.id,
            name: folder.name,
            icon: folder.icon,
            color: folder.color
          };
          promptData.folderId = folder.id;
        }
      }

      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: promptData
      });
    } catch (error) {
      logger.error('创建提示词失败:', error);
      
      // 处理 Mongoose 验证错误
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });
        
        return res.status(400).json({
          code: 400,
          message: '数据验证失败',
          errors,
          details: Object.values(errors).join('; ')
        });
      }
      
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

      // 检查是否需要保存版本（内容、标题或变量发生变化）
      const hasContentChange = req.body.content && req.body.content !== prompt.content;
      const hasTitleChange = req.body.title && req.body.title !== prompt.title;
      const hasVariablesChange = req.body.variables && JSON.stringify(req.body.variables) !== JSON.stringify(prompt.variables);
      const shouldSaveVersion = hasContentChange || hasTitleChange || hasVariablesChange;
      
      // 如果需要保存版本，先保存当前状态
      if (shouldSaveVersion) {
        const changeLog = req.body.changeLog || '更新提示词';
        await prompt.saveVersion(changeLog, userId);
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

      // 转换 folderId 为字符串 ID
      const updatedData = prompt.toObject();
      if (updatedData.folderId) {
        const folder = await PromptFolder.findById(updatedData.folderId);
        if (folder) {
          updatedData.folderInfo = {
            id: folder.id,
            name: folder.name,
            icon: folder.icon,
            color: folder.color
          };
          updatedData.folderId = folder.id;
        }
      }

      res.json({
        code: 200,
        message: '更新成功',
        data: updatedData
      });
    } catch (error) {
      logger.error('更新提示词失败:', error);
      
      // 处理 Mongoose 验证错误
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });
        
        return res.status(400).json({
          code: 400,
          message: '数据验证失败',
          errors,
          details: Object.values(errors).join('; ')
        });
      }
      
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
   * 切换收藏状态
   */
  static async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false });
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 使用 Bookmark 模型切换收藏状态
      const Bookmark = require('../models/Bookmark');
      const result = await Bookmark.toggleBookmark(userId, 'prompt', prompt._id);

      res.json({
        code: 200,
        message: result.bookmarked ? '已添加到收藏' : '已取消收藏',
        data: {
          isFavorited: result.bookmarked
        }
      });
    } catch (error) {
      logger.error('切换收藏状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '操作失败',
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

  /**
   * 获取自定义选项（从用户的提示词中提取）
   * 包括：自定义分类、AI模型、常用标签
   */
  static async getCustomOptions(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const userId = req.user._id;

      // 预定义的分类和模型（同时支持中英文，以兼容老数据）
      const predefinedCategories = [
        // 中文分类
        '写作', '编程', '翻译', '分析', '创意',
        '客户服务', '产品文档', '市场营销', '教育培训', '其他',
        // 英文分类（兼容老数据）
        'writing', 'coding', 'translation', 'analysis', 'creative',
        'customer-service', 'documentation', 'marketing', 'education', 'other'
      ];

      const predefinedModels = [
        'general', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5',
        'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
        'gemini-pro', 'gemini-ultra', 'wenxin', 'tongyi',
        'chatglm', 'xinghuo', 'claude', 'gemini', 'chatgpt'
      ];

      // 获取用户所有提示词中使用的分类
      const allCategories = await PromptTemplate.distinct('category', {
        userId,
        isDeleted: false,
        category: { $ne: null, $ne: '' }
      });

      // 过滤掉预设的分类，只返回自定义的
      const categories = allCategories.filter(cat => !predefinedCategories.includes(cat));

      // 获取用户所有提示词中使用的AI模型
      const allModels = await PromptTemplate.distinct('aiModel', {
        userId,
        isDeleted: false,
        aiModel: { $ne: null, $ne: '' }
      });

      // 过滤掉预设的模型，只返回自定义的
      const models = allModels.filter(model => !predefinedModels.includes(model));

      // 获取用户所有提示词中使用的标签（展开数组）
      const allTags = await PromptTemplate.aggregate([
        {
          $match: {
            userId,
            isDeleted: false,
            tags: { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 50 },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            count: 1
          }
        }
      ]);

      const tags = allTags.map(t => t.tag);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          categories,
          models,
          tags
        }
      });
    } catch (error) {
      logger.error('获取自定义选项失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取自定义选项失败',
        error: error.message
      });
    }
  }

  /**
   * 记录提示词事件埋点
   */
  static async trackEvent(req, res) {
    try {
      const {
        event,
        promptId,
        metadata = {}
      } = req.body;

      // 验证事件类型
      const validEvents = ['view', 'search', 'copy', 'edit', 'share', 'export', 'impression'];
      if (!event || !validEvents.includes(event)) {
        return res.status(400).json({
          code: 400,
          message: `无效的事件类型，必须是: ${validEvents.join(', ')}`
        });
      }

      // 构建埋点数据
      const trackingData = {
        event,
        userId: req.user ? req.user._id : null,
        sessionId: req.headers['x-session-id'] || req.session?.id || undefined,
        userAgent: req.get('User-Agent'),
        ipAddress: req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress,
        metadata,
        device: metadata.device || {}
      };

      // 如果有 promptId，验证并转换
      if (promptId) {
        const prompt = await PromptTemplate.findOne({ id: promptId, isDeleted: false });
        if (prompt) {
          trackingData.promptId = prompt._id;
          // 自动填充提示词相关信息
          if (!metadata.promptCategory) metadata.promptCategory = prompt.category;
          if (!metadata.promptAiModel) metadata.promptAiModel = prompt.aiModel;
          if (!metadata.promptTags) metadata.promptTags = prompt.tags;
        }
      }

      // 记录事件（异步，不阻塞响应）
      PromptAnalytics.trackEvent(trackingData)
        .catch(err => logger.error('记录提示词事件失败:', err));

      res.json({
        code: 200,
        message: '记录成功'
      });
    } catch (error) {
      logger.error('记录提示词事件失败:', error);
      // 埋点失败不影响业务，返回成功
      res.json({
        code: 200,
        message: '记录成功'
      });
    }
  }

  /**
   * 获取热门搜索关键词
   */
  static async getTopSearchKeywords(req, res) {
    try {
      const { limit = 10, days = 7 } = req.query;

      const keywords = await PromptAnalytics.getTopSearchKeywords(
        parseInt(limit),
        parseInt(days)
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: keywords
      });
    } catch (error) {
      logger.error('获取热门搜索关键词失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取失败',
        error: error.message
      });
    }
  }

  /**
   * 获取转化漏斗数据
   */
  static async getConversionFunnel(req, res) {
    try {
      const { promptId, days = 30 } = req.query;

      const funnelData = await PromptAnalytics.getConversionFunnel(
        promptId || null,
        parseInt(days)
      );

      res.json({
        code: 200,
        message: '获取成功',
        data: funnelData
      });
    } catch (error) {
      logger.error('获取转化漏斗失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取失败',
        error: error.message
      });
    }
  }

  /**
   * 获取提示词版本历史
   */
  static async getVersionHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user._id : null;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false })
        .populate('versionHistory.createdBy', 'username avatar')
        .lean();

      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查：只有作者可以查看版本历史
      if (!userId || prompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 返回版本历史（从新到旧）
      const versions = prompt.versionHistory || [];
      const sortedVersions = versions.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          promptId: prompt.id,
          currentVersion: prompt.version,
          versions: sortedVersions
        }
      });
    } catch (error) {
      logger.error('获取版本历史失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取版本历史失败',
        error: error.message
      });
    }
  }

  /**
   * 获取指定版本详情
   */
  static async getVersionDetail(req, res) {
    try {
      const { id, versionId } = req.params;
      const userId = req.user ? req.user._id : null;

      const prompt = await PromptTemplate.findOne({ id, isDeleted: false })
        .populate('versionHistory.createdBy', 'username avatar')
        .lean();

      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 权限检查
      if (!userId || prompt.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '没有访问权限'
        });
      }

      // 查找指定版本
      const version = prompt.versionHistory.find(
        v => v._id.toString() === versionId
      );

      if (!version) {
        return res.status(404).json({
          code: 404,
          message: '版本不存在'
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: version
      });
    } catch (error) {
      logger.error('获取版本详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取版本详情失败',
        error: error.message
      });
    }
  }

  /**
   * 恢复到指定版本
   */
  static async restoreVersion(req, res) {
    try {
      const { id, versionId } = req.params;
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
          message: '没有操作权限'
        });
      }

      // 查找要恢复的版本
      const versionToRestore = prompt.versionHistory.find(
        v => v._id.toString() === versionId
      );

      if (!versionToRestore) {
        return res.status(404).json({
          code: 404,
          message: '版本不存在'
        });
      }

      // 保存当前版本到历史（如果内容不同）
      const hasChanges = prompt.content !== versionToRestore.content ||
                        prompt.title !== versionToRestore.title ||
                        JSON.stringify(prompt.variables) !== JSON.stringify(versionToRestore.variables);
      
      if (hasChanges) {
        await prompt.saveVersion(`恢复到版本 ${versionToRestore.version}`, userId);
      }

      // 恢复数据
      prompt.title = versionToRestore.title;
      prompt.description = versionToRestore.description;
      prompt.content = versionToRestore.content;
      prompt.variables = versionToRestore.variables;
      prompt.updatedBy = userId;

      await prompt.save();

      // 转换 folderId 为字符串 ID
      const updatedData = prompt.toObject();
      if (updatedData.folderId) {
        const folder = await PromptFolder.findById(updatedData.folderId);
        if (folder) {
          updatedData.folderInfo = {
            id: folder.id,
            name: folder.name,
            icon: folder.icon,
            color: folder.color
          };
          updatedData.folderId = folder.id;
        }
      }

      res.json({
        code: 200,
        message: '恢复成功',
        data: updatedData
      });
    } catch (error) {
      logger.error('恢复版本失败:', error);
      res.status(500).json({
        code: 500,
        message: '恢复版本失败',
        error: error.message
      });
    }
  }

  /**
   * 导出提示词
   */
  static async exportPrompts(req, res) {
    try {
      const userId = req.user._id;
      const { promptIds, folderId, exportAll } = req.query;

      let prompts = [];
      let folders = [];

      if (exportAll === 'true') {
        // 导出全部
        prompts = await PromptTemplate.find({
          userId,
          isDeleted: false
        }).populate('folderId', 'name icon color path pathName').lean();

        folders = await PromptFolder.find({
          userId
        }).lean();
      } else if (folderId) {
        // 导出文件夹
        const folder = await PromptFolder.findOne({ id: folderId, userId });
        if (!folder) {
          return res.status(404).json({
            code: 404,
            message: '文件夹不存在'
          });
        }

        // 获取文件夹及其子文件夹
        const collectFolderIds = async (folderId) => {
          const ids = [folderId];
          const children = await PromptFolder.find({ parentId: folderId, userId });
          for (const child of children) {
            ids.push(...await collectFolderIds(child._id));
          }
          return ids;
        };

        const folderIds = await collectFolderIds(folder._id);
        prompts = await PromptTemplate.find({
          userId,
          folderId: { $in: folderIds },
          isDeleted: false
        }).populate('folderId', 'name icon color path pathName').lean();

        folders = await PromptFolder.find({
          _id: { $in: folderIds }
        }).lean();
      } else if (promptIds) {
        // 导出指定提示词
        const ids = Array.isArray(promptIds) ? promptIds : promptIds.split(',');
        prompts = await PromptTemplate.find({
          id: { $in: ids },
          userId,
          isDeleted: false
        }).populate('folderId', 'name icon color path pathName').lean();

        // 收集相关文件夹
        const folderIds = [...new Set(prompts.map(p => p.folderId?._id).filter(Boolean))];
        if (folderIds.length > 0) {
          folders = await PromptFolder.find({
            _id: { $in: folderIds }
          }).lean();
        }
      }

      // 构建导出数据
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        exportedBy: userId.toString(),
        metadata: {
          totalPrompts: prompts.length,
          totalFolders: folders.length,
          source: 'AI Prompt Vault'
        },
        folders: folders.map(folder => ({
          id: folder.id || folder._id.toString(),
          name: folder.name,
          icon: folder.icon,
          color: folder.color,
          parentId: folder.parentId ? folder.parentId.toString() : null,
          path: folder.pathName || [folder.name],
          description: folder.description
        })),
        prompts: prompts.map(prompt => {
          const folderPath = prompt.folderId?.pathName || [];
          return {
            title: prompt.title,
            description: prompt.description,
            content: prompt.content,
            category: prompt.category,
            aiModel: prompt.aiModel,
            tags: prompt.tags || [],
            variables: prompt.variables || [],
            folderPath,
            visibility: prompt.visibility || 'private',
            version: prompt.version,
            examples: prompt.examples || [],
            tips: prompt.tips,
            warnings: prompt.warnings
          };
        })
      };

      res.json({
        code: 200,
        message: '导出成功',
        data: exportData
      });
    } catch (error) {
      logger.error('导出失败:', error);
      res.status(500).json({
        code: 500,
        message: '导出失败',
        error: error.message
      });
    }
  }

  /**
   * 导入提示词
   */
  static async importPrompts(req, res) {
    try {
      const userId = req.user._id;
      const { data: importData, options = {} } = req.body;

      if (!importData || !importData.prompts) {
        return res.status(400).json({
          code: 400,
          message: '导入数据格式错误'
        });
      }

      const {
        onDuplicate = 'skip', // skip, overwrite, createCopy
        createFolders = true
      } = options;

      const report = {
        total: importData.prompts.length,
        success: 0,
        skipped: 0,
        errors: [],
        createdFolders: 0
      };

      // 映射文件夹
      const folderPathMap = new Map();

      if (createFolders && importData.folders && importData.folders.length > 0) {
        // 按层级创建文件夹
        const sortedFolders = importData.folders.sort((a, b) => 
          (a.path?.length || 0) - (b.path?.length || 0)
        );

        for (const folderData of sortedFolders) {
          const pathKey = folderData.path.join('/');
          
          // 检查是否已存在
          let folder = await PromptFolder.findOne({
            userId,
            pathName: folderData.path
          });

          if (!folder) {
            // 创建新文件夹
            const parentPath = folderData.path.slice(0, -1);
            let parentId = null;
            if (parentPath.length > 0) {
              const parentPathKey = parentPath.join('/');
              parentId = folderPathMap.get(parentPathKey);
            }

            folder = await PromptFolder.create({
              name: folderData.name,
              icon: folderData.icon || '📁',
              color: folderData.color,
              description: folderData.description,
              userId,
              parentId
            });

            report.createdFolders++;
          }

          folderPathMap.set(pathKey, folder._id);
        }
      }

      // 导入提示词
      for (const promptData of importData.prompts) {
        try {
          // 检查重复
          const existing = await PromptTemplate.findOne({
            userId,
            title: promptData.title,
            content: promptData.content,
            isDeleted: false
          });

          if (existing) {
            if (onDuplicate === 'skip') {
              report.skipped++;
              continue;
            } else if (onDuplicate === 'overwrite') {
              // 更新现有提示词
              Object.assign(existing, {
                description: promptData.description,
                category: promptData.category,
                aiModel: promptData.aiModel,
                tags: promptData.tags,
                variables: promptData.variables,
                examples: promptData.examples,
                tips: promptData.tips,
                warnings: promptData.warnings
              });
              await existing.save();
              report.success++;
              continue;
            }
            // createCopy - 继续创建
          }

          // 映射文件夹
          let folderId = null;
          if (promptData.folderPath && promptData.folderPath.length > 0) {
            const pathKey = promptData.folderPath.join('/');
            folderId = folderPathMap.get(pathKey);
          }

          // 创建提示词
          const title = existing && onDuplicate === 'createCopy' 
            ? `${promptData.title} (导入)` 
            : promptData.title;

          await PromptTemplate.create({
            title,
            description: promptData.description,
            content: promptData.content,
            category: promptData.category || '其他',
            aiModel: promptData.aiModel,
            tags: promptData.tags || [],
            variables: promptData.variables || [],
            visibility: promptData.visibility || 'private',
            examples: promptData.examples || [],
            tips: promptData.tips,
            warnings: promptData.warnings,
            userId,
            folderId
          });

          report.success++;
        } catch (error) {
          report.errors.push({
            title: promptData.title,
            error: error.message
          });
        }
      }

      res.json({
        code: 200,
        message: `导入完成：成功 ${report.success} 个，跳过 ${report.skipped} 个`,
        data: report
      });
    } catch (error) {
      logger.error('导入失败:', error);
      res.status(500).json({
        code: 500,
        message: '导入失败',
        error: error.message
      });
    }
  }

  /**
   * 获取系统中所有使用过的标签
   */
  static async getAllTags(req, res) {
    try {
      const userId = req.user ? req.user._id : null;
      const mongoose = require('mongoose');
      
      // 构建查询条件：公开的或自己的
      const matchStage = {
        isDeleted: false
      };
      
      if (userId) {
        matchStage.$or = [
          { visibility: 'public' },
          { userId: new mongoose.Types.ObjectId(userId) }
        ];
      } else {
        matchStage.visibility = 'public';
      }
      
      // 使用 aggregate 展开 tags 数组并统计
      const tagsData = await PromptTemplate.aggregate([
        { $match: matchStage },
        { $match: { tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            count: 1
          }
        }
      ]);
      
      const tags = tagsData.map(t => t.tag);
      
      res.json({
        code: 200,
        data: {
          tags
        }
      });
    } catch (error) {
      logger.error('获取标签列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取失败',
        error: error.message
      });
    }
  }

  /**
   * 获取系统中使用过的所有自定义AI模型
   */
  static async getCustomAIModels(req, res) {
    try {
      const userId = req.user ? req.user._id : null;
      
      // 构建查询条件：公开的或自己的
      const query = {
        isDeleted: false
      };
      
      if (userId) {
        query.$or = [
          { visibility: 'public' },
          { userId }
        ];
      } else {
        query.visibility = 'public';
      }
      
      // 获取所有不同的 aiModel 值
      const models = await PromptTemplate.distinct('aiModel', query);
      
      // 过滤掉预设的模型，只返回自定义模型
      const presetModels = [
        'general', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5', 
        'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
        'gemini-pro', 'gemini-ultra',
        'wenxin', 'tongyi', 'chatglm', 'xinghuo'
      ];
      const customModels = models
        .filter(m => m && !presetModels.includes(m))
        .sort();
      
      res.json({
        code: 200,
        data: {
          models: customModels
        }
      });
    } catch (error) {
      logger.error('获取自定义AI模型失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取失败',
        error: error.message
      });
    }
  }
}

module.exports = PromptController;
