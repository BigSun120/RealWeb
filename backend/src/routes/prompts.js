const express = require('express');
const router = express.Router();
const PromptController = require('../controllers/promptController');
const PromptFolderController = require('../controllers/promptFolderController');
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

module.exports = router;
