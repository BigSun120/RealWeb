const express = require('express');
const { auth } = require('../../middleware/auth');
const ToolCategory = require('../../models/ToolCategory');
const Tool = require('../../models/Tool');
const ActivityLogger = require('../../middleware/activityLogger');
const ToolsPermission = require('../../middleware/toolsPermission');
const logger = require('../../utils/logger');

const router = express.Router();

const isTruthy = (value) => value === true || value === 'true';

// 应用权限校验
router.use(auth);
router.use(ToolsPermission.requireAdmin);
router.use(ToolsPermission.checkCategoryManagePermission);

// 获取分类列表（扁平化）
router.get('/', async (req, res) => {
  try {
    const {
      includeTools = false,
      includeCounts = false,
      status,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = Math.max(pageNum - 1, 0) * limitNum;

    let categories = await ToolCategory.find(query)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const categoryIds = categories.map((cat) => cat.id);
    const sendTools = isTruthy(includeTools) && categoryIds.length > 0;
    const sendCounts = isTruthy(includeCounts) && categoryIds.length > 0;

    let toolsByCategory = {};
    if (sendTools) {
      const tools = await Tool.find({ category: { $in: categoryIds } })
        .select('id name status usageCount category')
        .lean();

      toolsByCategory = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) {
          acc[tool.category] = [];
        }
        acc[tool.category].push(tool);
        return acc;
      }, {});
    }

    let countsByCategory = new Map();
    if (sendCounts) {
      const counts = await Tool.aggregate([
        { $match: { category: { $in: categoryIds } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      counts.forEach(({ _id, count }) => countsByCategory.set(_id, count));
    }

    categories = categories.map((cat) => {
      const enriched = { ...cat };
      enriched.parentId = null;
      enriched.level = 0;
      enriched.path = cat.id;

      if (sendTools) {
        enriched.tools = toolsByCategory[cat.id] || [];
      }

      if (sendCounts) {
        enriched.toolCount = countsByCategory.get(cat.id) || 0;
      } else if (sendTools) {
        enriched.toolCount = (toolsByCategory[cat.id] || []).length;
      }

      return enriched;
    });

    const total = await ToolCategory.countDocuments(query);

    res.json({
      code: 200,
      message: 'success',
      data: {
        categories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类列表失败'
    });
  }
});

// 获取分类详情（扁平化）
router.get('/:id', async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .lean();

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    const tools = await Tool.find({ category: category.id })
      .select('id name status usageCount')
      .lean();

    const data = {
      ...category,
      parentId: null,
      level: 0,
      path: category.id,
      tools,
      toolCount: tools.length
    };

    res.json({
      code: 200,
      message: 'success',
      data
    });
  } catch (error) {
    logger.error('获取分类详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类详情失败'
    });
  }
});

// 创建分类
router.post('/', async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      parentId: null,
      level: 0,
      path: req.body.id,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    const category = new ToolCategory(categoryData);
    await category.save();

    await ActivityLogger.logAdminAction(
      req.user._id,
      '创建工具分类',
      `创建了工具分类 ${category.name}`,
      req,
      category._id,
      'category'
    );

    res.status(201).json({
      code: 201,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    logger.error('创建分类失败:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        code: 400,
        message: '分类ID已存在'
      });
    }

    res.status(500).json({
      code: 500,
      message: '创建分类失败'
    });
  }
});

// 更新分类
router.put('/:id', async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    const updates = { ...req.body };
    delete updates.parentId;
    updates.level = 0;
    updates.path = category.id;

    Object.assign(category, updates);
    category.updatedBy = req.user._id;

    await category.save();

    await ActivityLogger.logAdminAction(
      req.user._id,
      '更新工具分类',
      `更新了工具分类 ${category.name}`,
      req,
      category._id,
      'category'
    );

    res.json({
      code: 200,
      message: '分类更新成功',
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

// 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    const toolsCount = await Tool.countDocuments({ category: category.id });
    if (toolsCount > 0) {
      return res.status(400).json({
        code: 400,
        message: '该分类下仍有关联工具，请先调整或删除相关工具'
      });
    }

    await ToolCategory.findByIdAndDelete(req.params.id);

    const orphanChildren = await ToolCategory.find({ parentId: category.id });
    for (const child of orphanChildren) {
      child.parentId = null;
      child.level = 0;
      child.path = child.id;
      child.updatedBy = req.user._id;
      await child.save();
    }

    await ActivityLogger.logAdminAction(
      req.user._id,
      '删除工具分类',
      `删除了工具分类 ${category.name}`,
      req,
      category._id,
      'category'
    );

    res.json({
      code: 200,
      message: '分类删除成功'
    });
  } catch (error) {
    logger.error('删除分类失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除分类失败'
    });
  }
});

module.exports = router;
