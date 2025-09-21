const express = require('express');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取所有分类（公开）
router.get('/', async (req, res) => {
  try {
    const { admin } = req.query;
    let query = {};

    // 如果不是管理员请求，只返回活跃的分类
    if (!admin) {
      query.isActive = true;
    }

    const categories = await Category.find(query)
      .sort({ sort: 1, name: 1 });

    res.json({
      code: 200,
      message: '获取分类列表成功',
      data: categories
    });
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类列表失败'
    });
  }
});

// 获取分类详情（公开）
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    res.json({
      code: 200,
      message: '获取分类详情成功',
      data: category
    });
  } catch (error) {
    logger.error('获取分类详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类详情失败'
    });
  }
});

// 创建分类（管理员）
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, color, icon, sort } = req.body;

    // 验证必需字段
    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '分类名称不能为空'
      });
    }

    const category = new Category({
      name: name.trim(),
      description: description || '',
      color: color || '#3B82F6',
      icon: icon || '📁',
      sort: sort || 0
    });

    await category.save();

    res.status(201).json({
      code: 201,
      message: '创建分类成功',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        code: 400,
        message: `${field === 'name' ? '分类名称' : field}已存在`
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 400,
        message: '数据验证失败',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    logger.error('创建分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建分类失败'
    });
  }
});

// 更新分类（管理员）
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, color, icon, sort, isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, color, icon, sort, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    res.json({
      code: 200,
      message: '更新分类成功',
      data: category
    });
  } catch (error) {
    logger.error('更新分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新分类失败'
    });
  }
});

// 删除分类（管理员）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    // 检查是否有文章使用此分类
    const Article = require('../models/Article');
    const articleCount = await Article.countDocuments({
      category: category.name,
      isDeleted: { $ne: true }
    });

    if (articleCount > 0) {
      return res.status(400).json({
        code: 400,
        message: `无法删除分类，还有 ${articleCount} 篇文章正在使用此分类`,
        data: { articleCount }
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      code: 200,
      message: '删除分类成功'
    });
  } catch (error) {
    logger.error('删除分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除分类失败'
    });
  }
});

// 获取使用该分类的文章列表（管理员）
router.get('/:id/articles', adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    const Article = require('../models/Article');
    const articles = await Article.find({
      category: category.name,
      isDeleted: { $ne: true }
    }).select('title status createdAt').populate('author', 'username');

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: {
        category: category.name,
        articles
      }
    });
  } catch (error) {
    logger.error('获取分类文章失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类文章失败'
    });
  }
});

// 更新分类文章数量（管理员）
router.post('/:id/update-count', adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    await category.updateArticleCount();

    res.json({
      code: 200,
      message: '更新分类文章数量成功',
      data: { articleCount: category.articleCount }
    });
  } catch (error) {
    logger.error('更新分类文章数量失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新分类文章数量失败'
    });
  }
});

// 重新初始化分类数据（管理员）
router.post('/reinit', adminAuth, async (req, res) => {
  try {
    console.log('开始重新初始化分类数据...');

    // 删除所有现有分类
    const deleteResult = await Category.deleteMany({});
    console.log('删除现有分类:', deleteResult);

    // 重新创建默认分类
    const defaultCategories = [
      {
        name: '技术分享',
        description: '技术相关的文章和教程',
        color: '#3B82F6',
        icon: '💻',
        sort: 1
      },
      {
        name: '生活随笔',
        description: '日常生活的感悟和记录',
        color: '#10B981',
        icon: '📝',
        sort: 2
      },
      {
        name: '学习笔记',
        description: '学习过程中的笔记和总结',
        color: '#F59E0B',
        icon: '📚',
        sort: 3
      },
      {
        name: '项目展示',
        description: '个人项目的介绍和展示',
        color: '#8B5CF6',
        icon: '🚀',
        sort: 4
      },
      {
        name: '其他',
        description: '其他类型的文章',
        color: '#6B7280',
        icon: '📁',
        sort: 5
      }
    ];

    console.log('准备创建默认分类:', defaultCategories.length, '个');
    const categories = await Category.insertMany(defaultCategories);
    console.log('成功创建分类:', categories.length, '个');

    res.json({
      code: 200,
      message: '重新初始化分类成功',
      data: categories
    });
  } catch (error) {
    console.error('重新初始化分类失败:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({
      code: 500,
      message: '重新初始化分类失败: ' + error.message
    });
  }
});

module.exports = router;
