const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const { auth } = require('../../middleware/auth');
const mailMemoController = require('../../controllers/mailMemoController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const baseFieldValidators = [
  body('alias').optional().isString().withMessage('alias 应为字符串'),
  body('usage').optional().isString().withMessage('usage 应为字符串'),
  body('tags').optional().isArray().withMessage('tags 应为数组'),
  body('notes').optional().isString().withMessage('notes 应为字符串'),
  body('priority').optional().isInt({ min: -10, max: 10 }).withMessage('priority 范围为 -10 ~ 10').toInt(),
  body('isFavorite').optional().isBoolean().withMessage('isFavorite 应为布尔值').toBoolean(),
  body('lastUsedAt').optional({ nullable: true }).isISO8601().withMessage('lastUsedAt 需为 ISO 日期格式').toDate()
];

const createValidators = [
  body('email').trim().isEmail().withMessage('请输入有效的邮箱地址'),
  ...baseFieldValidators
];

const updateValidators = [
  body('email').optional().trim().isEmail().withMessage('请输入有效的邮箱地址'),
  ...baseFieldValidators
];

router.get('/entries', auth, (req, res, next) => mailMemoController.listEntries(req, res, next));
router.get('/meta', auth, (req, res, next) => mailMemoController.getMeta(req, res, next));
router.post('/entries', auth, createValidators, (req, res, next) => mailMemoController.createEntry(req, res, next));
router.put('/entries/:id', auth, updateValidators, (req, res, next) => mailMemoController.updateEntry(req, res, next));
router.delete('/entries/:id', auth, (req, res, next) => mailMemoController.deleteEntry(req, res, next));
router.patch('/entries/:id/favorite', auth, (req, res, next) => mailMemoController.toggleFavorite(req, res, next));
router.post('/import', auth, upload.single('file'), (req, res, next) => mailMemoController.importEntries(req, res, next));
router.get('/export', auth, (req, res, next) => mailMemoController.exportEntries(req, res, next));

module.exports = router;

