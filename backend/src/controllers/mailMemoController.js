const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const MailMemoEntry = require('../models/MailMemoEntry');
const logger = require('../utils/logger');
const { parseCsv, stringifyCsv } = require('../utils/csvHelper');

class MailMemoController {
  async listEntries(req, res, next) {
    try {
      const {
        keyword,
        tag,
        usage,
        favorite,
        sort = 'updatedAt',
        order = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const favoriteFilter = favorite === 'true' ? true : favorite === 'false' ? false : undefined;

      const query = MailMemoEntry.buildFilters(req.user._id, {
        keyword,
        tag,
        usage,
        favorite: favoriteFilter
      });

      const sortMap = {
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        alias: 'alias',
        email: 'email',
        usage: 'usage',
        priority: 'priority',
        lastUsedAt: 'lastUsedAt'
      };
      const sortField = sortMap[sort] || 'updatedAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = { [sortField]: sortOrder };
      if (sortField !== 'updatedAt') {
        sortOptions.updatedAt = -1;
      }

      const [items, total] = await Promise.all([
        MailMemoEntry.find(query)
          .sort(sortOptions)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        MailMemoEntry.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        code: 200,
        message: '获取邮箱备忘录成功',
        data: {
          items,
          pagination: {
            current: pageNum,
            total: totalPages,
            totalItems: total,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      logger.error('获取邮箱备忘录列表失败:', error);
      next(error);
    }
  }

  async createEntry(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          code: 422,
          message: '参数校验失败',
          errors: errors.array()
        });
      }

      const {
        email,
        alias,
        usage,
        tags = [],
        notes,
        priority = 0,
        isFavorite = false,
        lastUsedAt
      } = req.body;

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await MailMemoEntry.findOne({
        userId: req.user._id,
        email: normalizedEmail
      });
      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '该邮箱已存在，可直接编辑'
        });
      }

      const entry = new MailMemoEntry({
        userId: req.user._id,
        email: normalizedEmail,
        alias,
        usage,
        tags,
        notes,
        priority,
        isFavorite
      });

      if (lastUsedAt) {
        const parsed = new Date(lastUsedAt);
        if (!isNaN(parsed)) {
          entry.lastUsedAt = parsed;
        }
      }

      await entry.save();

      logger.info('Mail memo entry created', {
        userId: req.user._id,
        email: entry.email
      });

      res.status(201).json({
        code: 201,
        message: '新增邮箱成功',
        data: entry
      });
    } catch (error) {
      logger.error('新增邮箱备忘录失败:', error);
      next(error);
    }
  }

  async updateEntry(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          code: 422,
          message: '参数校验失败',
          errors: errors.array()
        });
      }

      const entryId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的条目ID'
        });
      }

      const entry = await MailMemoEntry.findOne({
        _id: entryId,
        userId: req.user._id
      });

      if (!entry) {
        return res.status(404).json({
          code: 404,
          message: '条目不存在'
        });
      }

      const {
        email,
        alias,
        usage,
        tags,
        notes,
        priority,
        isFavorite,
        lastUsedAt
      } = req.body;

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail !== entry.email) {
          const duplicate = await MailMemoEntry.findOne({
            userId: req.user._id,
            email: normalizedEmail,
            _id: { $ne: entry._id }
          });
          if (duplicate) {
            return res.status(409).json({
              code: 409,
              message: '新邮箱地址已存在'
            });
          }
          entry.email = normalizedEmail;
        }
      }

      if (alias !== undefined) entry.alias = alias;
      if (usage !== undefined) entry.usage = usage;
      if (Array.isArray(tags)) entry.tags = tags;
      if (notes !== undefined) entry.notes = notes;
      if (priority !== undefined) entry.priority = priority;
      if (isFavorite !== undefined) entry.isFavorite = isFavorite;

      if (lastUsedAt !== undefined) {
        if (!lastUsedAt) {
          entry.lastUsedAt = null;
        } else {
          const parsed = new Date(lastUsedAt);
          if (!isNaN(parsed)) {
            entry.lastUsedAt = parsed;
          }
        }
      }

      await entry.save();

      logger.info('Mail memo entry updated', {
        userId: req.user._id,
        entryId
      });

      res.json({
        code: 200,
        message: '更新成功',
        data: entry
      });
    } catch (error) {
      logger.error('更新邮箱备忘录失败:', error);
      next(error);
    }
  }

  async deleteEntry(req, res, next) {
    try {
      const entryId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的条目ID'
        });
      }

      const entry = await MailMemoEntry.findOne({
        _id: entryId,
        userId: req.user._id
      });

      if (!entry) {
        return res.status(404).json({
          code: 404,
          message: '条目不存在'
        });
      }

      await MailMemoEntry.deleteOne({ _id: entryId });

      logger.info('Mail memo entry deleted', {
        userId: req.user._id,
        entryId
      });

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除邮箱备忘录失败:', error);
      next(error);
    }
  }

  async toggleFavorite(req, res, next) {
    try {
      const entryId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(entryId)) {
        return res.status(400).json({
          code: 400,
          message: '无效的条目ID'
        });
      }

      const entry = await MailMemoEntry.findOne({
        _id: entryId,
        userId: req.user._id
      });

      if (!entry) {
        return res.status(404).json({
          code: 404,
          message: '条目不存在'
        });
      }

      entry.isFavorite = !entry.isFavorite;
      await entry.save();

      res.json({
        code: 200,
        message: entry.isFavorite ? '已收藏' : '已取消收藏',
        data: entry
      });
    } catch (error) {
      logger.error('收藏状态切换失败:', error);
      next(error);
    }
  }

  async getMeta(req, res, next) {
    try {
      const userId = req.user._id;

      const [tags, usages, total, favorites] = await Promise.all([
        MailMemoEntry.distinct('tags', { userId, tags: { $nin: [null, ''] } }),
        MailMemoEntry.distinct('usage', { userId, usage: { $nin: [null, ''] } }),
        MailMemoEntry.countDocuments({ userId }),
        MailMemoEntry.countDocuments({ userId, isFavorite: true })
      ]);

      res.json({
        code: 200,
        message: '获取筛选信息成功',
        data: {
          tags: tags.filter(Boolean),
          usages: usages.filter(Boolean),
          stats: {
            total,
            favorites
          }
        }
      });
    } catch (error) {
      logger.error('获取邮箱备忘录筛选信息失败:', error);
      next(error);
    }
  }

  async importEntries(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请上传CSV文件'
        });
      }

      const strategy = (req.body?.strategy || 'skip').toLowerCase();
      const overwrite = strategy === 'overwrite';

      const records = parseCsv(req.file.buffer);
      if (!records.length) {
        return res.status(400).json({
          code: 400,
          message: '未读取到任何条目'
        });
      }

      const batchId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const summary = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };
      const details = [];

      for (const [index, record] of records.entries()) {
        const lineNo = index + 2; // header 占一行
        const emailRaw = (record.email || '').trim().toLowerCase();
        if (!emailRaw) {
          summary.errors.push({ line: lineNo, message: '邮箱地址为空' });
          continue;
        }

        const payload = {
          alias: record.alias || '',
          usage: record.usage || '',
          notes: record.notes || '',
          priority: Number.isNaN(parseInt(record.priority, 10)) ? 0 : parseInt(record.priority, 10),
          isFavorite: ['true', '1', '是', 'yes'].includes((record.isFavorite || '').toString().toLowerCase()),
          createdByImport: true,
          importBatchId: batchId
        };

        if (record.tags) {
          payload.tags = record.tags
            .split(/[,;\n]/)
            .map(tag => tag.trim())
            .filter(Boolean);
        }

        if (record.lastUsedAt) {
          const parsed = new Date(record.lastUsedAt);
          if (!isNaN(parsed)) {
            payload.lastUsedAt = parsed;
          }
        }

        const existing = await MailMemoEntry.findOne({
          userId: req.user._id,
          email: emailRaw
        });

        if (existing) {
          if (!overwrite) {
            summary.skipped += 1;
            details.push({
              email: emailRaw,
              action: 'skipped',
              reason: 'duplicate'
            });
            continue;
          }

          existing.alias = payload.alias;
          existing.usage = payload.usage;
          existing.notes = payload.notes;
          existing.priority = payload.priority;
          existing.isFavorite = payload.isFavorite;
          existing.createdByImport = true;
          existing.importBatchId = batchId;
          if (payload.tags) existing.tags = payload.tags;
          if (payload.lastUsedAt) {
            existing.lastUsedAt = payload.lastUsedAt;
          }
          await existing.save();
          summary.updated += 1;
          details.push({ email: emailRaw, action: 'updated' });
        } else {
          const entry = new MailMemoEntry({
            userId: req.user._id,
            email: emailRaw,
            ...payload
          });
          await entry.save();
          summary.created += 1;
          details.push({ email: emailRaw, action: 'created' });
        }
      }

      logger.info('Mail memo import summary', {
        userId: req.user._id,
        batchId,
        summary
      });

      res.json({
        code: 200,
        message: '导入完成',
        data: {
          summary,
          details
        }
      });
    } catch (error) {
      logger.error('邮箱备忘录导入失败:', error);
      next(error);
    }
  }

  async exportEntries(req, res, next) {
    try {
      const { scope = 'all', keyword, tag, usage, favorite } = req.query;

      let query = { userId: req.user._id };
      if (scope === 'filtered') {
        const favoriteFilter = favorite === 'true' ? true : favorite === 'false' ? false : undefined;
        query = MailMemoEntry.buildFilters(req.user._id, {
          keyword,
          tag,
          usage,
          favorite: favoriteFilter
        });
      }

      const entries = await MailMemoEntry.find(query)
        .sort({ priority: -1, updatedAt: -1 })
        .lean();

      const exportData = entries.map(entry => ({
        email: entry.email,
        alias: entry.alias || '',
        usage: entry.usage || '',
        tags: Array.isArray(entry.tags) ? entry.tags.join(';') : '',
        notes: entry.notes || '',
        priority: entry.priority ?? 0,
        isFavorite: entry.isFavorite ? 'true' : 'false',
        lastUsedAt: entry.lastUsedAt ? new Date(entry.lastUsedAt).toISOString() : '',
        updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : ''
      }));

      const csv = stringifyCsv(exportData, [
        'email',
        'alias',
        'usage',
        'tags',
        'notes',
        'priority',
        'isFavorite',
        'lastUsedAt',
        'updatedAt'
      ]);

      const filename = `mail-memo-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csv);
    } catch (error) {
      logger.error('邮箱备忘录导出失败:', error);
      next(error);
    }
  }
}

module.exports = new MailMemoController();
