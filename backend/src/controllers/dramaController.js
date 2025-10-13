const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const DramaProject = require('../models/DramaProject');
const logger = require('../utils/logger');

/**
 * 短剧项目控制器
 */
class DramaController {
  /**
   * 获取项目列表
   */
  async listProjects(req, res, next) {
    try {
      const {
        keyword,
        status,
        type,
        favorite,
        sort = 'updatedAt',
        order = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const favoriteFilter = favorite === 'true' ? true : favorite === 'false' ? false : undefined;

      const query = DramaProject.buildFilters(req.user._id, {
        keyword,
        status,
        type,
        isFavorite: favoriteFilter
      });

      // 排序映射
      const sortMap = {
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        name: 'name',
        progress: 'progress',
        episodeCount: 'episodeCount'
      };
      const sortField = sortMap[sort] || 'updatedAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = { [sortField]: sortOrder };
      
      // 二级排序
      if (sortField !== 'updatedAt') {
        sortOptions.updatedAt = -1;
      }

      const [items, total] = await Promise.all([
        DramaProject.find(query)
          .sort(sortOptions)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        DramaProject.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        code: 200,
        message: '获取项目列表成功',
        data: {
          items,
          pagination: {
            current: pageNum,
            total: totalPages,
            totalItems: total,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      logger.error('获取短剧项目列表失败:', error);
      next(error);
    }
  }

  /**
   * 获取单个项目详情
   */
  async getProject(req, res, next) {
    try {
      const projectId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的项目ID'
        });
      }

      const project = await DramaProject.findOne({
        _id: projectId,
        userId: req.user._id
      });

      if (!project) {
        return res.status(404).json({
          code: 404,
          message: '项目不存在'
        });
      }

      res.json({
        code: 200,
        message: '获取项目详情成功',
        data: project
      });
    } catch (error) {
      logger.error('获取短剧项目详情失败:', error);
      next(error);
    }
  }

  /**
   * 创建新项目
   */
  async createProject(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          code: 422,
          message: '参数校验失败',
          errors: errors.array()
        });
      }

      const {
        name,
        type,
        episodeCount = 60,
        description,
        tags = []
      } = req.body;

      // 检查项目名称是否已存在
      const existing = await DramaProject.findOne({
        userId: req.user._id,
        name: name.trim()
      });

      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '该项目名称已存在，请使用其他名称'
        });
      }

      const project = new DramaProject({
        userId: req.user._id,
        name: name.trim(),
        type,
        episodeCount,
        description: description ? description.trim() : '',
        tags,
        status: '设定中',
        progress: 0
      });

      await project.save();

      logger.info('Drama project created', {
        userId: req.user._id,
        projectId: project._id,
        name: project.name
      });

      res.status(201).json({
        code: 201,
        message: '项目创建成功',
        data: project
      });
    } catch (error) {
      logger.error('创建短剧项目失败:', error);
      next(error);
    }
  }

  /**
   * 更新项目
   */
  async updateProject(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          code: 422,
          message: '参数校验失败',
          errors: errors.array()
        });
      }

      const projectId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的项目ID'
        });
      }

      const project = await DramaProject.findOne({
        _id: projectId,
        userId: req.user._id
      });

      if (!project) {
        return res.status(404).json({
          code: 404,
          message: '项目不存在'
        });
      }

      const {
        name,
        type,
        episodeCount,
        description,
        status,
        progress,
        worldview,
        characters,
        outline,
        episodes,
        promptTemplate,
        tags,
        isFavorite
      } = req.body;

      // 更新基本信息
      if (name !== undefined) {
        const trimmedName = name.trim();
        if (trimmedName !== project.name) {
          // 检查新名称是否已存在
          const duplicate = await DramaProject.findOne({
            userId: req.user._id,
            name: trimmedName,
            _id: { $ne: project._id }
          });

          if (duplicate) {
            return res.status(409).json({
              code: 409,
              message: '该项目名称已存在'
            });
          }
          project.name = trimmedName;
        }
      }

      if (type !== undefined) project.type = type;
      if (episodeCount !== undefined) project.episodeCount = episodeCount;
      if (description !== undefined) project.description = description.trim();
      if (status !== undefined) project.status = status;
      if (progress !== undefined) project.progress = progress;
      if (tags !== undefined) project.tags = tags;
      if (isFavorite !== undefined) project.isFavorite = isFavorite;

      // 更新世界观
      if (worldview !== undefined) {
        project.worldview = {
          ...project.worldview,
          ...worldview
        };
      }

      // 更新角色
      if (characters !== undefined) {
        project.characters = characters;
      }

      // 更新大纲
      if (outline !== undefined) {
        project.outline = {
          ...project.outline,
          ...outline
        };
      }

      // 更新分集
      if (episodes !== undefined) {
        project.episodes = episodes;
        // 自动更新进度
        project.updateProgress();
      }

// 修复：添加提示词模板的更新逻辑（服务端统一写入 lastModified）
      if (promptTemplate !== undefined) {
        project.promptTemplate = {
          useCustom: promptTemplate.useCustom ?? false,
          customTemplate: promptTemplate.customTemplate ?? null,
          lastModified: new Date()
        };
        
        logger.info('Prompt template updated', {
          userId: req.user._id,
          projectId: project._id,
          useCustom: project.promptTemplate.useCustom,
          hasCustomTemplate: !!project.promptTemplate.customTemplate
        });
      }

      await project.save();

      logger.info('Drama project updated', {
        userId: req.user._id,
        projectId: project._id
      });

      res.json({
        code: 200,
        message: '项目更新成功',
        data: project
      });
    } catch (error) {
      logger.error('更新短剧项目失败:', error);
      next(error);
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(req, res, next) {
    try {
      const projectId = req.params.id;
      
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的项目ID'
        });
      }

      const project = await DramaProject.findOneAndDelete({
        _id: projectId,
        userId: req.user._id
      });

      if (!project) {
        return res.status(404).json({
          code: 404,
          message: '项目不存在'
        });
      }

      logger.info('Drama project deleted', {
        userId: req.user._id,
        projectId: project._id,
        name: project.name
      });

      res.json({
        code: 200,
        message: '项目删除成功',
        data: { id: projectId }
      });
    } catch (error) {
      logger.error('删除短剧项目失败:', error);
      next(error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(req, res, next) {
    try {
      const userId = req.user._id;

      const [
        total,
        completed,
        inProgress,
        totalEpisodesResult
      ] = await Promise.all([
        DramaProject.countDocuments({ userId }),
        DramaProject.countDocuments({ userId, status: '已完成' }),
        DramaProject.countDocuments({
          userId,
          status: { $in: ['设定中', '大纲中', '剧本中'] }
        }),
        DramaProject.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, total: { $sum: '$episodeCount' } } }
        ])
      ]);

      const totalEpisodes = totalEpisodesResult.length > 0 ? totalEpisodesResult[0].total : 0;

      res.json({
        code: 200,
        message: '获取统计信息成功',
        data: {
          total,
          completed,
          inProgress,
          totalEpisodes
        }
      });
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      next(error);
    }
  }

  /**
   * PATCH: 更新世界观
   */
  async updateWorldview(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ code: 422, message: '参数校验失败', errors: errors.array() });
      }

      const projectId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ code: 400, message: '无效的项目ID' });
      }

      const project = await DramaProject.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(404).json({ code: 404, message: '项目不存在' });
      }

      const { worldview } = req.body;
      project.worldview = { ...project.worldview, ...worldview };
      await project.save();

      res.json({ code: 200, message: '世界观已更新', data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH: 更新角色列表
   */
  async updateCharacters(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ code: 422, message: '参数校验失败', errors: errors.array() });
      }

      const projectId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ code: 400, message: '无效的项目ID' });
      }

      const project = await DramaProject.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(404).json({ code: 404, message: '项目不存在' });
      }

      const { characters } = req.body;
      project.characters = Array.isArray(characters) ? characters : [];
      await project.save();

      res.json({ code: 200, message: '角色已更新', data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH: 更新大纲
   */
  async updateOutline(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ code: 422, message: '参数校验失败', errors: errors.array() });
      }

      const projectId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ code: 400, message: '无效的项目ID' });
      }

      const project = await DramaProject.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(404).json({ code: 404, message: '项目不存在' });
      }

      const { outline } = req.body;
      project.outline = { ...project.outline, ...outline };
      await project.save();

      res.json({ code: 200, message: '大纲已更新', data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH: 更新分集
   */
  async updateEpisodes(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ code: 422, message: '参数校验失败', errors: errors.array() });
      }

      const projectId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ code: 400, message: '无效的项目ID' });
      }

      const project = await DramaProject.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(404).json({ code: 404, message: '项目不存在' });
      }

      const { episodes } = req.body;
      project.episodes = Array.isArray(episodes) ? episodes : [];
      project.updateProgress();
      await project.save();

      res.json({ code: 200, message: '分集已更新', data: project });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH: 更新提示词模板（由服务端写入lastModified）
   */
  async updatePromptTemplate(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ code: 422, message: '参数校验失败', errors: errors.array() });
      }

      const projectId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ code: 400, message: '无效的项目ID' });
      }

      const project = await DramaProject.findOne({ _id: projectId, userId: req.user._id });
      if (!project) {
        return res.status(404).json({ code: 404, message: '项目不存在' });
      }

      const { promptTemplate } = req.body;
      project.promptTemplate = {
        useCustom: promptTemplate.useCustom ?? false,
        customTemplate: promptTemplate.customTemplate ?? null,
        lastModified: new Date()
      };
      await project.save();

      res.json({ code: 200, message: '提示词模板已更新', data: project });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DramaController();
