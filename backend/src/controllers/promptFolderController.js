const PromptFolder = require('../models/PromptFolder');
const PromptTemplate = require('../models/PromptTemplate');
const logger = require('../utils/logger');

/**
 * 提示词文件夹管理控制器
 */
class PromptFolderController {
  /**
   * 获取用户的文件夹树
   */
  static async getFolderTree(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const tree = await PromptFolder.getFolderTree(req.user._id);

      res.json({
        code: 200,
        message: '获取成功',
        data: tree
      });
    } catch (error) {
      logger.error('获取文件夹树失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取文件夹树失败',
        error: error.message
      });
    }
  }

  /**
   * 获取根文件夹列表
   */
  static async getRootFolders(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const folders = await PromptFolder.getRootFolders(req.user._id);

      res.json({
        code: 200,
        message: '获取成功',
        data: folders
      });
    } catch (error) {
      logger.error('获取根文件夹失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取根文件夹失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文件夹详情
   */
  static async getFolderById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const folder = await PromptFolder.findOne({ id, userId })
        .populate('parent')
        .populate('children')
        .lean();

      if (!folder) {
        return res.status(404).json({
          code: 404,
          message: '文件夹不存在'
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: folder
      });
    } catch (error) {
      logger.error('获取文件夹详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取文件夹详情失败',
        error: error.message
      });
    }
  }

  /**
   * 创建文件夹
   */
  static async createFolder(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: 401,
          message: '需要登录'
        });
      }

      const { name, description, icon, color, parentId } = req.body;

      // 验证父文件夹
      if (parentId) {
        const parentFolder = await PromptFolder.findOne({
          id: parentId,
          userId: req.user._id
        });

        if (!parentFolder) {
          return res.status(404).json({
            code: 404,
            message: '父文件夹不存在'
          });
        }

        // 检查层级限制（最多5层）
        if (parentFolder.level >= 4) {
          return res.status(400).json({
            code: 400,
            message: '文件夹层级不能超过5层'
          });
        }
      }

      const folder = await PromptFolder.create({
        name,
        description,
        icon: icon || '📁',
        color: color || '#409EFF',
        parentId: parentId || null,
        userId: req.user._id
      });

      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: folder
      });
    } catch (error) {
      logger.error('创建文件夹失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建文件夹失败',
        error: error.message
      });
    }
  }

  /**
   * 更新文件夹
   */
  static async updateFolder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { name, description, icon, color, parentId, isExpanded, sortOrder } = req.body;

      const folder = await PromptFolder.findOne({ id, userId });
      if (!folder) {
        return res.status(404).json({
          code: 404,
          message: '文件夹不存在'
        });
      }

      // 更新字段
      if (name !== undefined) folder.name = name;
      if (description !== undefined) folder.description = description;
      if (icon !== undefined) folder.icon = icon;
      if (color !== undefined) folder.color = color;
      if (isExpanded !== undefined) folder.isExpanded = isExpanded;
      if (sortOrder !== undefined) folder.sortOrder = sortOrder;

      // 如果更新父文件夹
      if (parentId !== undefined) {
        // 不能将文件夹移动到自己或自己的子文件夹下
        if (parentId === folder.id) {
          return res.status(400).json({
            code: 400,
            message: '不能将文件夹移动到自己下'
          });
        }

        if (parentId) {
          const newParent = await PromptFolder.findOne({ id: parentId, userId });
          if (!newParent) {
            return res.status(404).json({
              code: 404,
              message: '目标文件夹不存在'
            });
          }

          // 检查是否为子孙文件夹
          if (newParent.isDescendantOf(folder.id)) {
            return res.status(400).json({
              code: 400,
              message: '不能将文件夹移动到其子文件夹下'
            });
          }

          // 检查层级限制
          if (newParent.level >= 4) {
            return res.status(400).json({
              code: 400,
              message: '目标位置层级过深'
            });
          }
        }

        folder.parentId = parentId;
      }

      await folder.save();

      res.json({
        code: 200,
        message: '更新成功',
        data: folder
      });
    } catch (error) {
      logger.error('更新文件夹失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新文件夹失败',
        error: error.message
      });
    }
  }

  /**
   * 删除文件夹
   */
  static async deleteFolder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { deletePrompts = false, migrateToFolderId } = req.body;

      const folder = await PromptFolder.findOne({ _id: id, userId });
      if (!folder) {
        return res.status(404).json({
          code: 404,
          message: '文件夹不存在'
        });
      }

      // 检查文件夹是否有子文件夹
      const childrenCount = await PromptFolder.countDocuments({
        parentId: folder.id,
        userId
      });

      if (childrenCount > 0) {
        return res.status(400).json({
          code: 400,
          message: '请先删除子文件夹'
        });
      }

      // 处理文件夹中的提示词
      const promptsCount = await PromptTemplate.countDocuments({
        folderId: folder._id,
        isDeleted: false
      });

      if (promptsCount > 0 && !deletePrompts) {
        return res.status(400).json({
          code: 400,
          message: '文件夹不为空，请先删除或移动其中的提示词',
          data: { promptsCount }
        });
      }

      if (deletePrompts) {
        // 软删除文件夹中的所有提示词
        await PromptTemplate.updateMany(
          { folderId: folder._id, isDeleted: false },
          {
            isDeleted: true,
            deletedAt: new Date()
          }
        );
      } else {
        // 将提示词迁移到指定文件夹或根目录
        await PromptTemplate.updateMany(
          { folderId: folder._id },
          { folderId: migrateToFolderId || null }
        );
      }

      // 删除文件夹
      await folder.deleteOne();

      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      logger.error('删除文件夹失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除文件夹失败',
        error: error.message
      });
    }
  }

  /**
   * 移动提示词到文件夹
   */
  static async movePromptToFolder(req, res) {
    try {
      const { promptId, folderId } = req.body;
      const userId = req.user._id;

      const prompt = await PromptTemplate.findOne({
        id: promptId,
        userId,
        isDeleted: false
      });

      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      const oldFolderId = prompt.folderId;

      // 验证目标文件夹
      if (folderId) {
        const folder = await PromptFolder.findOne({ id: folderId, userId });
        if (!folder) {
          return res.status(404).json({
            code: 404,
            message: '目标文件夹不存在'
          });
        }
        prompt.folderId = folder._id;
      } else {
        prompt.folderId = null;
      }

      await prompt.save();

      // 更新文件夹计数
      if (oldFolderId) {
        const oldFolder = await PromptFolder.findById(oldFolderId);
        if (oldFolder) await oldFolder.updatePromptCount();
      }
      if (prompt.folderId) {
        const newFolder = await PromptFolder.findById(prompt.folderId);
        if (newFolder) await newFolder.updatePromptCount();
      }

      res.json({
        code: 200,
        message: '移动成功'
      });
    } catch (error) {
      logger.error('移动提示词失败:', error);
      res.status(500).json({
        code: 500,
        message: '移动提示词失败',
        error: error.message
      });
    }
  }

  /**
   * 批量更新文件夹排序
   */
  static async batchUpdateSort(req, res) {
    try {
      const { folders } = req.body; // [{ id, sortOrder }, ...]
      const userId = req.user._id;

      if (!Array.isArray(folders)) {
        return res.status(400).json({
          code: 400,
          message: '参数格式错误'
        });
      }

      const updatePromises = folders.map(({ id, sortOrder }) =>
        PromptFolder.updateOne(
          { id, userId },
          { sortOrder }
        )
      );

      await Promise.all(updatePromises);

      res.json({
        code: 200,
        message: '更新成功'
      });
    } catch (error) {
      logger.error('批量更新排序失败:', error);
      res.status(500).json({
        code: 500,
        message: '批量更新排序失败',
        error: error.message
      });
    }
  }

  /**
   * 获取文件夹的完整路径
   */
  static async getFolderPath(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const folder = await PromptFolder.findOne({ id, userId });
      if (!folder) {
        return res.status(404).json({
          code: 404,
          message: '文件夹不存在'
        });
      }

      const pathName = await folder.getFullPathName();

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          path: folder.path,
          pathName
        }
      });
    } catch (error) {
      logger.error('获取文件夹路径失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取文件夹路径失败',
        error: error.message
      });
    }
  }
}

module.exports = PromptFolderController;
