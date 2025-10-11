const PromptUsageLog = require('../models/PromptUsageLog');
const PromptTemplate = require('../models/PromptTemplate');

/**
 * 提示词使用记录控制器
 */
class PromptUsageController {
  /**
   * 记录提示词使用
   * POST /api/prompts/:id/usage
   */
  recordUsage = async (req, res) => {
    try {
      const { id: promptId } = req.params;
      const userId = req.user._id;
      const { variables, renderedContent, performance } = req.body;

      // 验证提示词是否存在
      const prompt = await PromptTemplate.findById(promptId);
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 创建使用记录
      const usageLog = new PromptUsageLog({
        promptId,
        userId,
        variables: variables || {},
        renderedContent: renderedContent || '',
        performance: performance || {}
      });

      await usageLog.save();

      // 更新提示词的使用次数
      await PromptTemplate.findByIdAndUpdate(promptId, {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() }
      });

      res.status(201).json({
        code: 201,
        message: '使用记录已保存',
        data: {
          logId: usageLog._id,
          usedAt: usageLog.usedAt
        }
      });
    } catch (error) {
      console.error('记录使用失败:', error);
      res.status(500).json({
        code: 500,
        message: '记录使用失败',
        error: error.message
      });
    }
  }

  /**
   * 获取使用记录列表
   * GET /api/prompts/:id/usage
   */
  getUsageLogs = async (req, res) => {
    try {
      const { id: promptId } = req.params;
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const userId = req.user._id;

      // 构建查询条件
      const query = {
        promptId,
        userId
      };

      // 日期范围筛选
      if (startDate || endDate) {
        query.usedAt = {};
        if (startDate) query.usedAt.$gte = new Date(startDate);
        if (endDate) query.usedAt.$lte = new Date(endDate);
      }

      // 分页查询
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [logs, total] = await Promise.all([
        PromptUsageLog.find(query)
          .sort({ usedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'username avatar')
          .lean(),
        PromptUsageLog.countDocuments(query)
      ]);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('获取使用记录失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取使用记录失败',
        error: error.message
      });
    }
  }

  /**
   * 更新使用反馈
   * PATCH /api/prompts/usage/:logId/feedback
   */
  updateFeedback = async (req, res) => {
    try {
      const { logId } = req.params;
      const userId = req.user._id;
      const { rating, comment, isEffective } = req.body;

      // 验证评分范围
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          code: 400,
          message: '评分必须在1-5之间'
        });
      }

      // 查找使用记录
      const usageLog = await PromptUsageLog.findById(logId);
      if (!usageLog) {
        return res.status(404).json({
          code: 404,
          message: '使用记录不存在'
        });
      }

      // 验证权限：只能更新自己的记录
      if (usageLog.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '无权限更新此记录'
        });
      }

      // 更新反馈
      const feedbackUpdate = {};
      if (rating !== undefined) feedbackUpdate['feedback.rating'] = rating;
      if (comment !== undefined) feedbackUpdate['feedback.comment'] = comment;
      if (isEffective !== undefined) feedbackUpdate['feedback.isEffective'] = isEffective;
      feedbackUpdate['feedback.submittedAt'] = new Date();

      const updatedLog = await PromptUsageLog.findByIdAndUpdate(
        logId,
        { $set: feedbackUpdate },
        { new: true }
      );

      res.json({
        code: 200,
        message: '反馈已更新',
        data: updatedLog
      });
    } catch (error) {
      console.error('更新反馈失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新反馈失败',
        error: error.message
      });
    }
  }

  /**
   * 获取提示词使用统计
   * GET /api/prompts/:id/usage/statistics
   */
  getStatistics = async (req, res) => {
    try {
      const { id: promptId } = req.params;
      const { startDate, endDate, days = 7 } = req.query;

      // 验证提示词是否存在
      const prompt = await PromptTemplate.findById(promptId);
      if (!prompt) {
        return res.status(404).json({
          code: 404,
          message: '提示词不存在'
        });
      }

      // 获取基础统计数据
      const stats = await PromptUsageLog.getPromptStats(promptId, {
        startDate,
        endDate
      });

      // 获取使用趋势
      const trend = await PromptUsageLog.getUsageTrend(promptId, parseInt(days));

      // 获取最近使用记录
      const recentLogs = await PromptUsageLog.find({ promptId })
        .sort({ usedAt: -1 })
        .limit(10)
        .populate('userId', 'username avatar')
        .lean();

      // 变量使用统计
      const variableStats = await this.getVariableStats(promptId);

      res.json({
        code: 200,
        message: '获取统计数据成功',
        data: {
          totalUsage: stats.totalUsage || 0,
          averageRating: stats.averageRating || 0,
          effectiveCount: stats.effectiveCount || 0,
          usageTrend: trend,
          recentLogs,
          variableStats
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取统计数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取变量使用统计（辅助方法）
   */
  async getVariableStats(promptId) {
    try {
      const logs = await PromptUsageLog.find({ promptId })
        .select('variables')
        .lean();

      const variableStats = {};
      
      logs.forEach(log => {
        if (log.variables && typeof log.variables === 'object') {
          Object.entries(log.variables).forEach(([key, value]) => {
            if (!variableStats[key]) {
              variableStats[key] = {
                count: 0,
                values: {}
              };
            }
            variableStats[key].count++;
            
            // 统计值的使用频率
            if (value !== null && value !== undefined) {
              const valueStr = String(value);
              if (!variableStats[key].values[valueStr]) {
                variableStats[key].values[valueStr] = 0;
              }
              variableStats[key].values[valueStr]++;
            }
          });
        }
      });

      return variableStats;
    } catch (error) {
      console.error('获取变量统计失败:', error);
      return {};
    }
  }

  /**
   * 删除使用记录
   * DELETE /api/prompts/usage/:logId
   */
  deleteUsageLog = async (req, res) => {
    try {
      const { logId } = req.params;
      const userId = req.user._id;

      // 查找使用记录
      const usageLog = await PromptUsageLog.findById(logId);
      if (!usageLog) {
        return res.status(404).json({
          code: 404,
          message: '使用记录不存在'
        });
      }

      // 验证权限：只能删除自己的记录
      if (usageLog.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          code: 403,
          message: '无权限删除此记录'
        });
      }

      await PromptUsageLog.findByIdAndDelete(logId);

      res.json({
        code: 200,
        message: '使用记录已删除'
      });
    } catch (error) {
      console.error('删除使用记录失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除使用记录失败',
        error: error.message
      });
    }
  }
}

module.exports = new PromptUsageController();
