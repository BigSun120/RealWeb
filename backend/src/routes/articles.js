const express = require('express');
const Article = require('../models/Article');
const { auth, optionalAuth, adminAuth } = require('../middleware/auth');
const { uploadArticleImage, handleUploadError } = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// 提取文章内容中的第一张图片
const extractFirstImage = (content) => {
  if (!content) return null;

  // 匹配Markdown图片语法 ![alt](url) 和 HTML img标签
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
  const htmlImageRegex = /<img[^>]+src\s*=\s*['"](.*?)['"][^>]*>/i;

  let match = content.match(markdownImageRegex);
  if (match && match[1]) {
    return match[1];
  }

  match = content.match(htmlImageRegex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

// 处理文章数据，添加自动封面
const processArticleData = (article) => {
  const articleObj = article.toObject ? article.toObject() : article;

  // 如果没有设置封面图，尝试从内容中提取
  if (!articleObj.coverImage && articleObj.content) {
    articleObj.coverImage = extractFirstImage(articleObj.content);
  }

  return articleObj;
};

// 获取文章列表
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      tag,
      author,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      hasImage
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      status: 'published',
      isDeleted: { $ne: true }  // 排除已删除的文章
    };

    // 构建排序对象
    let sort = { isTop: -1 }; // 置顶文章优先

    // 分类筛选
    if (category && category !== '全部') {
      query.category = category;
    }

    // 标签筛选
    if (tag && tag !== '全部') {
      query.tags = { $in: [tag] };
    }

    // 作者筛选
    if (author) {
      query['author.username'] = new RegExp(author, 'i');
    }

    // 日期范围筛选
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) {
        query.publishedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.publishedAt.$lte = new Date(dateTo);
      }
    }

    // 搜索
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 排序
    if (sortBy === 'publishedAt') {
      sort.publishedAt = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'viewCount') {
      sort.viewCount = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'title') {
      sort.title = sortOrder === 'asc' ? 1 : -1;
    }

    const articles = await Article.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'username avatar');

    // 处理文章数据，提取封面图片
    const processedArticles = articles.map(article => {
      const processed = processArticleData(article);
      // 移除content字段以减少数据传输
      delete processed.content;
      return processed;
    });

    const total = await Article.countDocuments(query);

    res.json({
      code: 200,
      message: '获取文章列表成功',
      data: {
        articles: processedArticles,
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

// 获取筛选选项数据
router.get('/filter-options', async (req, res) => {
  try {
    const Category = require('../models/Category');
    const Tag = require('../models/Tag');

    // 获取活跃的分类
    const categories = await Category.find({ isActive: true })
      .sort({ sort: 1, name: 1 })
      .select('name articleCount');

    // 获取活跃的标签
    const tags = await Tag.find({ isActive: true })
      .sort({ isHot: -1, articleCount: -1, sort: 1, name: 1 })
      .select('name articleCount isHot');

    // 获取作者列表
    const articles = await Article.find({
      status: 'published',
      isDeleted: { $ne: true }
    }).populate('author', 'username').select('author');

    const authors = [...new Set(articles.map(a => a.author?.username).filter(Boolean))];

    // 统计数据
    const stats = {
      totalArticles: articles.length,
      categoriesCount: categories.length,
      tagsCount: tags.length,
      authorsCount: authors.length
    };

    res.json({
      code: 200,
      message: '获取筛选选项成功',
      data: {
        categories: ['全部', ...categories.map(c => c.name)],
        tags: ['全部', ...tags.map(t => t.name)],
        authors,
        stats,
        categoryDetails: categories,
        tagDetails: tags
      }
    });
  } catch (error) {
    logger.error('获取筛选选项失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取筛选选项失败'
    });
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
      category: category || '其他', // 确保category有值
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

// 批量操作文章 (管理员权限)
router.post('/batch', adminAuth, async (req, res, next) => {
  try {
    const { articleIds, action, data = {} } = req.body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要操作的文章'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: '请指定操作类型'
      });
    }

    let result;
    let message;

    switch (action) {
      case 'delete':
        // 批量软删除（移动到回收站）
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.user._id
          }
        );
        message = `成功删除 ${result.modifiedCount} 篇文章，已移动到回收站`;
        break;

      case 'publish':
        // 批量发布
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          {
            status: 'published',
            publishedAt: new Date()
          }
        );
        message = `成功发布 ${result.modifiedCount} 篇文章`;
        break;

      case 'unpublish':
        // 批量取消发布
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          {
            status: 'draft',
            publishedAt: null
          }
        );
        message = `成功取消发布 ${result.modifiedCount} 篇文章`;
        break;

      case 'updateCategory':
        // 批量更新分类
        if (!data.categoryId) {
          return res.status(400).json({
            success: false,
            message: '请指定分类'
          });
        }
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          { category: data.categoryId }
        );
        message = `成功更新 ${result.modifiedCount} 篇文章的分类`;
        break;

      case 'updateTags':
        // 批量更新标签
        if (!data.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({
            success: false,
            message: '请指定标签'
          });
        }
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          { tags: data.tags }
        );
        message = `成功更新 ${result.modifiedCount} 篇文章的标签`;
        break;

      case 'addTags':
        // 批量添加标签
        if (!data.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({
            success: false,
            message: '请指定要添加的标签'
          });
        }
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          { $addToSet: { tags: { $each: data.tags } } }
        );
        message = `成功为 ${result.modifiedCount} 篇文章添加标签`;
        break;

      case 'removeTags':
        // 批量移除标签
        if (!data.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({
            success: false,
            message: '请指定要移除的标签'
          });
        }
        result = await Article.updateMany(
          { _id: { $in: articleIds } },
          { $pullAll: { tags: data.tags } }
        );
        message = `成功为 ${result.modifiedCount} 篇文章移除标签`;
        break;

      case 'permanentDelete':
        // 批量永久删除（仅限回收站中的文章）
        result = await Article.deleteMany({
          _id: { $in: articleIds },
          isDeleted: true // 只能永久删除已在回收站的文章
        });
        message = `成功永久删除 ${result.deletedCount} 篇文章`;
        break;

      case 'restore':
        // 批量恢复（从回收站恢复）
        result = await Article.updateMany(
          {
            _id: { $in: articleIds },
            isDeleted: true // 只能恢复回收站中的文章
          },
          {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            deleteReason: null
          }
        );
        message = `成功恢复 ${result.modifiedCount} 篇文章`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '不支持的操作类型'
        });
    }

    // 记录操作日志
    logger.info(`Admin ${req.user.username} performed batch ${action} on ${articleIds.length} articles`, {
      userId: req.user._id,
      action,
      articleIds,
      data,
      result
    });

    res.json({
      success: true,
      message,
      data: {
        affectedCount: result.modifiedCount || result.deletedCount,
        operation: action
      }
    });

  } catch (error) {
    logger.error('Batch article operation failed:', error);
    next(error);
  }
});

module.exports = router;
