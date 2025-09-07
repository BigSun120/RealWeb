const express = require('express');
const Tag = require('../models/Tag');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取所有标签（公开）
router.get('/', async (req, res) => {
  try {
    const { hot, limit, admin } = req.query;
    let query = {};

    // 如果不是管理员请求，只返回活跃的标签
    if (!admin) {
      query.isActive = true;
    }

    if (hot === 'true') {
      query.isHot = true;
    }

    let tagsQuery = Tag.find(query).sort({ sort: 1, articleCount: -1, name: 1 });

    if (limit) {
      tagsQuery = tagsQuery.limit(parseInt(limit));
    }

    const tags = await tagsQuery;

    res.json({
      code: 200,
      message: '获取标签列表成功',
      data: tags
    });
  } catch (error) {
    logger.error('获取标签列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取标签列表失败'
    });
  }
});

// 获取标签详情（公开）
router.get('/:slug', async (req, res) => {
  try {
    const tag = await Tag.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    res.json({
      code: 200,
      message: '获取标签详情成功',
      data: tag
    });
  } catch (error) {
    logger.error('获取标签详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取标签详情失败'
    });
  }
});

// 创建标签（管理员）
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, color, sort, isHot } = req.body;

    // 验证必需字段
    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '标签名称不能为空'
      });
    }

    const tag = new Tag({
      name: name.trim(),
      description: description || '',
      color: color || '#6B7280',
      sort: sort || 0,
      isHot: isHot || false
    });

    await tag.save();

    res.status(201).json({
      code: 201,
      message: '创建标签成功',
      data: tag
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        code: 400,
        message: `${field === 'name' ? '标签名称' : field}已存在`
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 400,
        message: '数据验证失败',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    logger.error('创建标签失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建标签失败'
    });
  }
});

// 更新标签（管理员）
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, color, sort, isActive, isHot } = req.body;

    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, description, color, sort, isActive, isHot },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    res.json({
      code: 200,
      message: '更新标签成功',
      data: tag
    });
  } catch (error) {
    logger.error('更新标签失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新标签失败'
    });
  }
});

// 删除标签（管理员）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    // 检查是否有文章使用此标签
    const Article = require('../models/Article');
    const articleCount = await Article.countDocuments({
      tags: tag.name,
      isDeleted: { $ne: true }
    });

    if (articleCount > 0) {
      return res.status(400).json({
        code: 400,
        message: `无法删除标签，还有 ${articleCount} 篇文章正在使用此标签`,
        data: { articleCount }
      });
    }

    await Tag.findByIdAndDelete(req.params.id);

    res.json({
      code: 200,
      message: '删除标签成功'
    });
  } catch (error) {
    logger.error('删除标签失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除标签失败'
    });
  }
});

// 获取使用该标签的文章列表（管理员）
router.get('/:id/articles', adminAuth, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    const Article = require('../models/Article');
    const articles = await Article.find({
      tags: tag.name,
      isDeleted: { $ne: true }
    }).select('title status createdAt').populate('author', 'username');

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: {
        tag: tag.name,
        articles
      }
    });
  } catch (error) {
    logger.error('获取标签文章失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取标签文章失败'
    });
  }
});

// 批量创建标签（管理员）
router.post('/batch', adminAuth, async (req, res) => {
  try {
    const { tags } = req.body; // 标签名称数组

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供标签数组'
      });
    }

    const createdTags = [];
    const errors = [];

    for (const tagName of tags) {
      try {
        const existingTag = await Tag.findOne({ name: tagName.trim() });
        if (!existingTag) {
          const tag = new Tag({ name: tagName.trim() });
          await tag.save();
          createdTags.push(tag);
        }
      } catch (error) {
        errors.push({ tag: tagName, error: error.message });
      }
    }

    res.json({
      code: 200,
      message: '批量创建标签完成',
      data: {
        created: createdTags,
        errors
      }
    });
  } catch (error) {
    logger.error('批量创建标签失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量创建标签失败'
    });
  }
});

// 更新标签文章数量（管理员）
router.post('/:id/update-count', adminAuth, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }

    await tag.updateArticleCount();

    res.json({
      code: 200,
      message: '更新标签文章数量成功',
      data: { articleCount: tag.articleCount }
    });
  } catch (error) {
    logger.error('更新标签文章数量失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新标签文章数量失败'
    });
  }
});

// 批量操作标签（管理员）
router.post('/batch-operation', adminAuth, async (req, res) => {
  try {
    const { tagIds, action, data = {} } = req.body;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要操作的标签'
      });
    }

    const validActions = ['enable', 'disable', 'setHot', 'unsetHot', 'updateColor', 'updateCount', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        code: 400,
        message: '无效的操作类型'
      });
    }

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const tagId of tagIds) {
      try {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          results.failed.push({ tagId, reason: '标签不存在' });
          continue;
        }

        switch (action) {
          case 'enable':
            tag.isActive = true;
            await tag.save();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'disable':
            tag.isActive = false;
            await tag.save();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'setHot':
            tag.isHot = true;
            await tag.save();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'unsetHot':
            tag.isHot = false;
            await tag.save();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'updateColor':
            if (!data.color) {
              results.failed.push({ tagId, reason: '缺少颜色参数' });
              continue;
            }
            tag.color = data.color;
            await tag.save();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'updateCount':
            await tag.updateArticleCount();
            results.success.push({ tagId, tagName: tag.name });
            break;

          case 'delete':
            // 检查是否有文章使用此标签
            const Article = require('../models/Article');
            const articleCount = await Article.countDocuments({
              tags: tag.name,
              isDeleted: { $ne: true }
            });

            if (articleCount > 0) {
              results.skipped.push({
                tagId,
                tagName: tag.name,
                reason: `有 ${articleCount} 篇文章正在使用此标签`
              });
              continue;
            }

            await Tag.findByIdAndDelete(tagId);
            results.success.push({ tagId, tagName: tag.name });
            break;
        }
      } catch (error) {
        results.failed.push({ tagId, reason: error.message });
      }
    }

    res.json({
      code: 200,
      message: '批量操作完成',
      data: results
    });
  } catch (error) {
    logger.error('批量操作标签失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量操作失败'
    });
  }
});

module.exports = router;
