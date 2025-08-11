const express = require('express');
const { auth } = require('../../middleware/auth');
const ToolCategory = require('../../models/ToolCategory');
const Tool = require('../../models/Tool');
const ActivityLogger = require('../../middleware/activityLogger');
const ToolsPermission = require('../../middleware/toolsPermission');
const logger = require('../../utils/logger');

const router = express.Router();

// 应用权限验证
router.use(auth);
router.use(ToolsPermission.requireAdmin);
router.use(ToolsPermission.checkCategoryManagePermission);

// 获取分类列表
router.get('/', async (req, res) => {
  try {
    const {
      includeTools = false,
      status,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // 构建查询条件
    const query = {};
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 分页
    const skip = (page - 1) * limit;

    let categories = await ToolCategory.find(query)
      .populate('parent')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ level: 1, sortOrder: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (includeTools === 'true') {
      categories = await ToolCategory.populate(categories, {
        path: 'tools',
        select: 'id name status usageCount'
      });
    }

    const total = await ToolCategory.countDocuments(query);

    res.json({
      code: 200,
      message: 'success',
      data: {
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
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

// 获取分类树结构
router.get('/tree', async (req, res) => {
  try {
    const categories = await ToolCategory.find({ status: 'active' })
      .sort({ level: 1, sortOrder: 1 });

    // 构建树结构
    const categoryMap = new Map();
    const rootCategories = [];

    // 第一遍：创建所有分类的映射
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category.toObject(),
        children: []
      });
    });

    // 第二遍：构建父子关系
    categories.forEach(category => {
      const categoryData = categoryMap.get(category.id);

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryData);
        }
      } else {
        rootCategories.push(categoryData);
      }
    });

    res.json({
      code: 200,
      message: 'success',
      data: rootCategories
    });
  } catch (error) {
    logger.error('获取分类树失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取分类树失败'
    });
  }
});

// 获取分类详情
router.get('/:id', async (req, res) => {
  try {
    const category = await ToolCategory.findById(req.params.id)
      .populate('parent')
      .populate('children')
      .populate('tools')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!category) {
      return res.status(404).json({
        code: 404,
        message: '分类不存在'
      });
    }

    res.json({
      code: 200,
      message: 'success',
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

// 创建分类
router.post('/', async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    // 如果有父分类，设置层级和路径
    if (categoryData.parentId) {
      const parent = await ToolCategory.findOne({ id: categoryData.parentId });
      if (!parent) {
        return res.status(400).json({
          code: 400,
          message: '父分类不存在'
        });
      }

      categoryData.level = parent.level + 1;
      categoryData.path = `${parent.path}/${categoryData.id}`;
    } else {
      categoryData.level = 0;
      categoryData.path = categoryData.id;
    }

    const category = new ToolCategory(categoryData);
    await category.save();

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '创建工具分类',
      `创建了工具分类: ${category.name}`,
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

    // 检查是否修改了父分类
    if (req.body.parentId !== undefined && req.body.parentId !== category.parentId) {
      // 验证新的父分类
      if (req.body.parentId) {
        const parent = await ToolCategory.findOne({ id: req.body.parentId });
        if (!parent) {
          return res.status(400).json({
            code: 400,
            message: '父分类不存在'
          });
        }

        // 防止循环引用
        if (parent.path.includes(category.id)) {
          return res.status(400).json({
            code: 400,
            message: '不能将分类设置为其子分类的子分类'
          });
        }

        req.body.level = parent.level + 1;
        req.body.path = `${parent.path}/${category.id}`;
      } else {
        req.body.level = 0;
        req.body.path = category.id;
      }
    }

    Object.assign(category, req.body);
    category.updatedBy = req.user._id;

    await category.save();

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '更新工具分类',
      `更新了工具分类: ${category.name}`,
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

    // 检查是否有子分类
    const childrenCount = await ToolCategory.countDocuments({ parentId: category.id });
    if (childrenCount > 0) {
      return res.status(400).json({
        code: 400,
        message: '该分类下还有子分类，请先删除子分类'
      });
    }

    // 检查是否有工具使用该分类
    const toolsCount = await Tool.countDocuments({ category: category.id });
    if (toolsCount > 0) {
      return res.status(400).json({
        code: 400,
        message: '该分类下还有工具，请先移动或删除相关工具'
      });
    }

    await ToolCategory.findByIdAndDelete(req.params.id);

    // 记录活动日志
    await ActivityLogger.logAdminAction(
      req.user._id,
      '删除工具分类',
      `删除了工具分类: ${category.name}`,
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
