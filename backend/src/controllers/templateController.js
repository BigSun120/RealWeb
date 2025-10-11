const templateEngine = require('../utils/templateEngine');
const logger = require('../utils/logger');

/**
 * 模板控制器
 * 处理模板渲染和变量提取
 */
class TemplateController {
  /**
   * 渲染模板
   * POST /api/tools/prompt-vault/template/render
   */
  static async render(req, res) {
    try {
      const { content, variables = {} } = req.body;

      if (!content) {
        return res.status(400).json({
          code: 400,
          message: '模板内容不能为空'
        });
      }

      const rendered = templateEngine.render(content, variables);

      res.json({
        code: 200,
        message: '渲染成功',
        data: {
          rendered
        }
      });
    } catch (error) {
      logger.error('模板渲染失败:', error);
      res.status(500).json({
        code: 500,
        message: error.message || '模板渲染失败',
        error: error.message
      });
    }
  }

  /**
   * 提取模板变量
   * POST /api/tools/prompt-vault/template/extract-variables
   */
  static async extractVariables(req, res) {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          code: 400,
          message: '模板内容不能为空'
        });
      }

      const variables = templateEngine.extractVariables(content);

      res.json({
        code: 200,
        message: '提取成功',
        data: {
          variables
        }
      });
    } catch (error) {
      logger.error('变量提取失败:', error);
      res.status(500).json({
        code: 500,
        message: '变量提取失败',
        error: error.message
      });
    }
  }

  /**
   * 获取可用的辅助函数列表
   * GET /api/tools/prompt-vault/template/helpers
   */
  static async getHelpers(req, res) {
    try {
      const helpers = Object.keys(templateEngine.helpers).map(name => ({
        name,
        description: getHelperDescription(name)
      }));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          helpers
        }
      });
    } catch (error) {
      logger.error('获取辅助函数失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取辅助函数失败',
        error: error.message
      });
    }
  }
}

/**
 * 获取辅助函数描述
 */
function getHelperDescription(name) {
  const descriptions = {
    uppercase: '转换为大写',
    lowercase: '转换为小写',
    length: '获取数组长度',
    format: '格式化日期，格式: {{format date "YYYY-MM-DD"}}',
    capitalize: '首字母大写',
    trim: '去除首尾空格',
    default: '设置默认值，格式: {{default value "默认值"}}',
    json: '转换为 JSON 字符串',
    join: '连接数组元素，格式: {{join array ", "}}'
  };
  
  return descriptions[name] || '未知辅助函数';
}

module.exports = TemplateController;
