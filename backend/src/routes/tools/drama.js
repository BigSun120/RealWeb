const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../../middleware/auth');
const dramaController = require('../../controllers/dramaController');

const router = express.Router();

// 所有路由都需要认证
router.use(auth);

/**
 * @route   GET /api/tools/drama/projects
 * @desc    获取项目列表
 * @access  Private
 */
router.get('/projects', dramaController.listProjects);

/**
 * @route   GET /api/tools/drama/statistics
 * @desc    获取统计信息
 * @access  Private
 */
router.get('/statistics', dramaController.getStatistics);

/**
 * @route   GET /api/tools/drama/projects/:id
 * @desc    获取项目详情
 * @access  Private
 */
router.get('/projects/:id', dramaController.getProject);

/**
 * @route   POST /api/tools/drama/projects
 * @desc    创建新项目
 * @access  Private
 */
router.post(
  '/projects',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('项目名称不能为空')
      .isLength({ min: 2, max: 50 }).withMessage('项目名称长度应在2-50个字符之间'),
    body('type')
      .trim()
      .notEmpty().withMessage('剧本类型不能为空')
      .isLength({ min: 2, max: 20 }).withMessage('剧本类型长度应在2-20个字符之间'),
    body('episodeCount')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('集数范围应在1-100之间'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('描述长度不能超过500个字符'),
    body('tags')
      .optional()
      .isArray().withMessage('标签必须是数组')
  ],
  dramaController.createProject
);

/**
 * @route   PUT /api/tools/drama/projects/:id
 * @desc    更新项目
 * @access  Private
 */
router.put(
  '/projects/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('项目名称长度应在2-50个字符之间'),
    body('type')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 }).withMessage('剧本类型长度应在2-20个字符之间'),
    body('episodeCount')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('集数范围应在1-100之间'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('描述长度不能超过500个字符'),
    body('status')
      .optional()
      .isIn(['设定中', '大纲中', '剧本中', '已完成'])
      .withMessage('无效的项目状态'),
    body('progress')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('进度范围应在0-100之间'),
    body('tags')
      .optional()
      .isArray().withMessage('标签必须是数组'),
    body('isFavorite')
      .optional()
      .isBoolean().withMessage('收藏状态必须是布尔值'),
    body('worldview')
      .optional()
      .isObject().withMessage('世界观必须是对象'),
    body('characters')
      .optional()
      .isArray().withMessage('角色列表必须是数组'),
    body('outline')
      .optional()
      .isObject().withMessage('大纲必须是对象'),
    body('episodes')
      .optional()
      .isArray().withMessage('分集列表必须是数组')
  ],
  dramaController.updateProject
);

/**
 * @route   DELETE /api/tools/drama/projects/:id
 * @desc    删除项目
 * @access  Private
 */
router.delete('/projects/:id', dramaController.deleteProject);

// 模块化 PATCH 接口（保持与 PUT 兼容）
router.patch(
  '/projects/:id/worldview',
  [
    body('worldview').isObject().withMessage('世界观必须是对象')
  ],
  dramaController.updateWorldview
);

router.patch(
  '/projects/:id/characters',
  [
    body('characters').isArray().withMessage('角色列表必须是数组')
  ],
  dramaController.updateCharacters
);

router.patch(
  '/projects/:id/outline',
  [
    body('outline').isObject().withMessage('大纲必须是对象')
  ],
  dramaController.updateOutline
);

router.patch(
  '/projects/:id/episodes',
  [
    body('episodes').isArray().withMessage('分集列表必须是数组')
  ],
  dramaController.updateEpisodes
);

router.patch(
  '/projects/:id/prompt-template',
  [
    body('promptTemplate').isObject().withMessage('提示词模板必须是对象')
  ],
  dramaController.updatePromptTemplate
);

router.patch(
  '/projects/:id/relationship-graph',
  [
    body('relationshipGraph').isArray().withMessage('关系图谱必须是数组')
  ],
  dramaController.updateRelationshipGraph
);

// AI诊断结果接口
router.patch(
  '/projects/:id/ai-diagnosis',
  [
    body('stage').isIn(['preparation', 'episodes', 'overall']).withMessage('阶段必须是preparation、episodes或overall'),
    body('issues').isArray().withMessage('问题列表必须是数组')
  ],
  dramaController.saveAIDiagnosis
);

router.get('/projects/:id/ai-diagnosis/:stage', dramaController.getAIDiagnosis);

/**
 * @route   GET /api/tools/drama/projects/:id/export
 * @desc    导出项目剧本 (GET 方法，保留向后兼容)
 * @access  Private
 * @query   format: txt|markdown|md
 * @query   includeIncomplete: true|false
 * @query   upToEpisode: number
 */
router.get('/projects/:id/export', dramaController.exportProject);

/**
 * @route   POST /api/tools/drama/projects/:id/export
 * @desc    导出项目剧本 (POST 方法，支持传递 relationshipGraph 数据)
 * @access  Private
 * @body    format: txt|markdown|md
 * @body    includeIncomplete: boolean
 * @body    upToEpisode: number
 * @body    includeMetadata: boolean
 * @body    relationshipGraph: array (可选)
 */
router.post('/projects/:id/export', dramaController.exportProject);

module.exports = router;
