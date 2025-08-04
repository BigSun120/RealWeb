const express = require('express');
const Article = require('../models/Article');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadArticleImage, handleUploadError } = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// 获取文章列表
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      status: 'published',
      isDeleted: { $ne: true }  // 排除已删除的文章
    };
    let sort = { isTop: -1, publishedAt: -1 };

    // 分类筛选
    if (category) {
      query.category = category;
    }

    // 搜索
    if (search) {
      query.$text = { $search: search };
      sort = { score: { $meta: 'textScore' } };
    }

    const articles = await Article.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'username avatar')
      .select('-content');

    const total = await Article.countDocuments(query);

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: {
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户的文章列表（必须放在 /:id 路由之前）
router.get('/my', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      authorId: req.user._id,
      isDeleted: { $ne: true }  // 排除已删除的文章
    };

    // 状态筛选
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query.status = status;
    }

    const articles = await Article.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'username avatar');

    const total = await Article.countDocuments(query);

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取文章详情
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'username avatar bio');

    if (!article || article.status !== 'published' || article.isDeleted) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 增加浏览量
    await article.incrementViewCount();

    res.json({
      code: 200,
      message: '获取文章详情成功',
      data: article
    });
  } catch (error) {
    next(error);
  }
});

// 创建文章
router.post('/', auth, async (req, res, next) => {
  try {
    // 检查用户是否有发博客权限
    if (!req.user.isAdmin && !req.user.hasPermission('blog:create')) {
      return res.status(403).json({
        code: 403,
        message: '您没有发布博客的权限，请联系管理员'
      });
    }

    const { title, content, summary, category, tags, coverImage, status = 'draft' } = req.body;

    const article = new Article({
      title,
      content,
      excerpt: summary, // 使用summary作为excerpt
      category: category || 'other', // 确保category有值
      tags,
      coverImage,
      status,
      authorId: req.user._id
    });

    await article.save();
    await article.populate('author', 'username avatar');

    res.status(201).json({
      code: 201,
      message: '创建文章成功',
      data: article
    });
  } catch (error) {
    next(error);
  }
});

// 更新文章
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, content, summary, category, tags, coverImage, status } = req.body;

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 检查权限
    if (article.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        message: '无权限修改此文章'
      });
    }

    // 更新字段
    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;
    if (summary !== undefined) article.excerpt = summary;
    if (category !== undefined) article.category = category || 'other'; // 确保category有值
    if (tags !== undefined) article.tags = tags;
    if (coverImage !== undefined) article.coverImage = coverImage;
    if (status !== undefined) article.status = status;

    await article.save();
    await article.populate('author', 'username avatar');

    res.json({
      code: 200,
      message: '更新文章成功',
      data: article
    });
  } catch (error) {
    next(error);
  }
});

// 软删除文章
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 检查权限：只有作者或管理员可以删除
    if (article.authorId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        code: 403,
        message: '无权限删除此文章'
      });
    }

    // 检查是否已经删除
    if (article.isDeleted) {
      return res.status(400).json({
        code: 400,
        message: '文章已被删除'
      });
    }

    // 执行软删除
    await article.softDelete(req.user._id);

    res.json({
      code: 200,
      message: '删除文章成功'
    });
  } catch (error) {
    next(error);
  }
});



// 获取文章详情（包括草稿，仅作者可见）
router.get('/:id/edit', auth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'username avatar bio');

    if (!article) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 检查权限：只有作者可以查看草稿
    if (article.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        message: '无权限查看此文章'
      });
    }

    res.json({
      code: 200,
      message: '获取文章详情成功',
      data: article
    });
  } catch (error) {
    next(error);
  }
});

// 上传文章图片
router.post('/upload-image', auth, (req, res, next) => {
  uploadArticleImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择要上传的图片'
      });
    }

    const imageUrl = `/uploads/articles/${req.file.filename}`;

    logger.info(`用户 ${req.user.username} 上传文章图片成功: ${imageUrl}`);

    res.json({
      code: 200,
      message: '图片上传成功',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  });
});

module.exports = router;
