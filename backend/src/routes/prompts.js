const express = require('express');
const router = express.Router();
const PromptController = require('../controllers/promptController');
const PromptFolderController = require('../controllers/promptFolderController');
const CommentController = require('../controllers/commentController');
const TemplateController = require('../controllers/templateController');
const { auth, optionalAuth } = require('../middleware/auth');

/**
 * 提示词管理路由
 * 基础路径: /api/tools/prompt-vault
 */

// ==================== 提示词 CRUD ====================

/**
 * @route   GET /api/tools/prompt-vault/prompts
 * @desc    获取提示词列表（支持分页、筛选、搜索）
 * @access  Public (公开提示词) / Private (个人提示词需登录)
 */
router.get('/prompts', optionalAuth, PromptController.getPrompts);

/**
 * @route   GET /api/tools/prompt-vault/prompts/trending
 * @desc    获取热门提示词
 * @access  Public
 */
router.get('/prompts/trending', PromptController.getTrendingPrompts);

/**
 * @route   GET /api/tools/prompt-vault/options
 * @desc    获取自定义选项（分类、模型、标签）
 * @access  Private
 */
router.get('/options', auth, PromptController.getCustomOptions);

/**
 * @route   GET /api/tools/prompt-vault/custom-models
 * @desc    获取自定义AI模型列表
 * @access  Public (可选登录)
 */
router.get('/custom-models', optionalAuth, PromptController.getCustomAIModels);

/**
 * @route   GET /api/tools/prompt-vault/all-tags
 * @desc    获取系统中所有使用过的标签
 * @access  Public (可选登录)
 */
router.get('/all-tags', optionalAuth, PromptController.getAllTags);

/**
 * @route   GET /api/tools/prompt-vault/prompts/:id
 * @desc    获取提示词详情
 * @access  Public (公开) / Private (需权限)
 */
router.get('/prompts/:id', optionalAuth, PromptController.getPromptById);

/**
 * @route   POST /api/tools/prompt-vault/prompts
 * @desc    创建新提示词
 * @access  Private
 */
router.post('/prompts', auth, PromptController.createPrompt);

/**
 * @route   PUT /api/tools/prompt-vault/prompts/:id
 * @desc    更新提示词
 * @access  Private (仅作者)
 */
router.put('/prompts/:id', auth, PromptController.updatePrompt);

/**
 * @route   DELETE /api/tools/prompt-vault/prompts/:id
 * @desc    删除提示词（软删除）
 * @access  Private (仅作者)
 */
router.delete('/prompts/:id', auth, PromptController.deletePrompt);

// ==================== 提示词功能 ====================

/**
 * @route   POST /api/tools/prompt-vault/prompts/:id/fork
 * @desc    复制/Fork提示词
 * @access  Private
 */
router.post('/prompts/:id/fork', auth, PromptController.forkPrompt);

/**
 * @route   POST /api/tools/prompt-vault/prompts/:id/usage
 * @desc    记录提示词使用
 * @access  Private / Public (可选登录)
 */
router.post('/prompts/:id/usage', optionalAuth, PromptController.recordUsage);

/**
 * @route   POST /api/tools/prompt-vault/prompts/:id/favorite
 * @desc    切换收藏状态
 * @access  Private
 */
router.post('/prompts/:id/favorite', auth, PromptController.toggleFavorite);

/**
 * @route   GET /api/tools/prompt-vault/prompts/:id/stats
 * @desc    获取提示词统计数据
 * @access  Private (仅作者)
 */
router.get('/prompts/:id/stats', auth, PromptController.getPromptStats);

/**
 * @route   GET /api/tools/prompt-vault/prompts/:id/versions
 * @desc    获取提示词版本历史
 * @access  Private (仅作者)
 */
router.get('/prompts/:id/versions', auth, PromptController.getVersionHistory);

/**
 * @route   GET /api/tools/prompt-vault/prompts/:id/versions/:versionId
 * @desc    获取指定版本详情
 * @access  Private (仅作者)
 */
router.get('/prompts/:id/versions/:versionId', auth, PromptController.getVersionDetail);

/**
 * @route   POST /api/tools/prompt-vault/prompts/:id/versions/:versionId/restore
 * @desc    恢复到指定版本
 * @access  Private (仅作者)
 */
router.post('/prompts/:id/versions/:versionId/restore', auth, PromptController.restoreVersion);

/**
 * @route   POST /api/tools/prompt-vault/prompts/:id/share
 * @desc    生成分享链接
 * @access  Private (仅作者)
 */
router.post('/prompts/:id/share', auth, PromptController.generateShareLink);

/**
 * @route   GET /api/tools/prompt-vault/share/:token
 * @desc    通过分享token访问提示词
 * @access  Public
 */
router.get('/share/:token', PromptController.getPromptByShareToken);

// ==================== 使用历史 ====================

/**
 * @route   GET /api/tools/prompt-vault/history
 * @desc    获取用户的提示词使用历史
 * @access  Private
 */
router.get('/history', auth, PromptController.getUserHistory);

// ==================== 事件埋点 ====================

/**
 * @route   POST /api/tools/prompt-vault/track
 * @desc    记录提示词事件埋点（view/search/copy等）
 * @access  Public (可选登录)
 */
router.post('/track', optionalAuth, PromptController.trackEvent);

/**
 * @route   GET /api/tools/prompt-vault/analytics/search-keywords
 * @desc    获取热门搜索关键词
 * @access  Private
 */
router.get('/analytics/search-keywords', auth, PromptController.getTopSearchKeywords);

/**
 * @route   GET /api/tools/prompt-vault/analytics/funnel
 * @desc    获取转化漏斗数据
 * @access  Private
 */
router.get('/analytics/funnel', auth, PromptController.getConversionFunnel);

// ==================== 文件夹管理 ====================

/**
 * @route   GET /api/tools/prompt-vault/folders/tree
 * @desc    获取用户的文件夹树
 * @access  Private
 */
router.get('/folders/tree', auth, PromptFolderController.getFolderTree);

/**
 * @route   GET /api/tools/prompt-vault/folders/root
 * @desc    获取根文件夹列表
 * @access  Private
 */
router.get('/folders/root', auth, PromptFolderController.getRootFolders);

/**
 * @route   GET /api/tools/prompt-vault/folders/:id
 * @desc    获取文件夹详情
 * @access  Private
 */
router.get('/folders/:id', auth, PromptFolderController.getFolderById);

/**
 * @route   GET /api/tools/prompt-vault/folders/:id/path
 * @desc    获取文件夹完整路径
 * @access  Private
 */
router.get('/folders/:id/path', auth, PromptFolderController.getFolderPath);

/**
 * @route   POST /api/tools/prompt-vault/folders
 * @desc    创建文件夹
 * @access  Private
 */
router.post('/folders', auth, PromptFolderController.createFolder);

/**
 * @route   PUT /api/tools/prompt-vault/folders/:id
 * @desc    更新文件夹
 * @access  Private
 */
router.put('/folders/:id', auth, PromptFolderController.updateFolder);

/**
 * @route   DELETE /api/tools/prompt-vault/folders/:id
 * @desc    删除文件夹
 * @access  Private
 */
router.delete('/folders/:id', auth, PromptFolderController.deleteFolder);

/**
 * @route   POST /api/tools/prompt-vault/folders/move
 * @desc    移动提示词到文件夹
 * @access  Private
 */
router.post('/folders/move', auth, PromptFolderController.movePromptToFolder);

/**
 * @route   PUT /api/tools/prompt-vault/folders/sort
 * @desc    批量更新文件夹排序
 * @access  Private
 */
router.put('/folders/sort', auth, PromptFolderController.batchUpdateSort);

// ==================== 评论管理 ====================

/**
 * @route   GET /api/tools/prompt-vault/prompts/:promptId/comments
 * @desc    获取提示词的评论列表（树形结构）
 * @access  Public (可选登录)
 */
router.get('/prompts/:promptId/comments', optionalAuth, CommentController.getComments);

/**
 * @route   GET /api/tools/prompt-vault/prompts/:promptId/comments/stats
 * @desc    获取评论统计信息
 * @access  Public (可选登录)
 */
router.get('/prompts/:promptId/comments/stats', optionalAuth, CommentController.getCommentStats);

/**
 * @route   POST /api/tools/prompt-vault/prompts/:promptId/comments
 * @desc    创建评论或回复
 * @access  Private
 */
router.post('/prompts/:promptId/comments', auth, CommentController.createComment);

/**
 * @route   PUT /api/tools/prompt-vault/comments/:commentId
 * @desc    更新评论
 * @access  Private (仅作者)
 */
router.put('/comments/:commentId', auth, CommentController.updateComment);

/**
 * @route   DELETE /api/tools/prompt-vault/comments/:commentId
 * @desc    删除评论
 * @access  Private (仅作者或提示词作者)
 */
router.delete('/comments/:commentId', auth, CommentController.deleteComment);

/**
 * @route   POST /api/tools/prompt-vault/comments/:commentId/like
 * @desc    点赞/取消点赞
 * @access  Private
 */
router.post('/comments/:commentId/like', auth, CommentController.toggleLike);

// ==================== 导入导出 ====================

/**
 * @route   GET /api/tools/prompt-vault/export
 * @desc    导出提示词
 * @access  Private
 * @query   promptIds - 提示词ID列表（逗号分隔）
 * @query   folderId - 文件夹ID
 * @query   exportAll - 是否导出全部
 */
router.get('/export', auth, PromptController.exportPrompts);

/**
 * @route   POST /api/tools/prompt-vault/import
 * @desc    导入提示词
 * @access  Private
 * @body    data - 导入数据
 * @body    options - 导入选项（onDuplicate, createFolders）
 */
router.post('/import', auth, PromptController.importPrompts);

// ==================== 模板引擎 ====================

/**
 * @route   POST /api/tools/prompt-vault/template/render
 * @desc    渲染模板
 * @access  Public
 * @body    content - 模板内容
 * @body    variables - 变量对象
 */
router.post('/template/render', TemplateController.render);

/**
 * @route   POST /api/tools/prompt-vault/template/extract-variables
 * @desc    提取模板变量
 * @access  Public
 * @body    content - 模板内容
 */
router.post('/template/extract-variables', TemplateController.extractVariables);

/**
 * @route   GET /api/tools/prompt-vault/template/helpers
 * @desc    获取可用的辅助函数列表
 * @access  Public
 */
router.get('/template/helpers', TemplateController.getHelpers);

module.exports = router;
