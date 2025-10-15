/**
 * FieldMapper - 统一字段映射层
 * 
 * 职责：
 * 1. 管理所有模块的中英文字段映射
 * 2. 定义逻辑概念字段（如"主要配角"、"完整大纲"等）
 * 3. 提供字段查询和转换API
 * 
 * 优点：
 * - 单一数据源：所有映射集中管理
 * - 易于维护：新增字段只需修改此处
 * - 可测试：纯函数，易于单元测试
 * - 可扩展：易于导出为配置文件
 */

export class FieldMapper {
  /**
   * 所有模块的字段映射（单一数据源）
   * 格式：{ 模块名: { 中文字段名: 英文字段名 } }
   */
  static mappings = {
    // 项目级别字段
    project: {
      '项目名称': 'name',
      '剧本类型': 'type',
      '项目描述': 'description',
      '计划集数': 'episodeCount',
      '项目状态': 'status',
      '完成进度': 'progress'
    },

    // 世界观字段
    worldview: {
      '故事背景': 'background',
      '世界设定': 'setting',
      '核心主题': 'theme',
      '主要冲突': 'conflict',
      '情感基调': 'tone'
    },

    // 角色字段
    characters: {
      '角色名称': 'name',
      '角色定位': 'role',
      '角色描述': 'description',
      '年龄': 'age',
      '性别': 'gender',
      '性格描述': 'personality',
      '性格特点': 'personality',
      '角色背景': 'background',
      '行为动机': 'motivation',
      '人际关系': 'relationships',
      '标签': 'tags'
    },

    // 大纲字段
    outline: {
      '结构类型': 'structure',
      '第一幕': 'act1',
      '第二幕': 'act2',
      '第三幕': 'act3',
      '标题': 'title',
      '描述': 'description',
      '情节点': 'plotPoints'
    },

    // 分集字段
    episodes: {
      '集数': 'number',
      '标题': 'title',
      '状态': 'status',
      '简介': 'summary',
      '剧本': 'script',
      '场景': 'scenes',
      '关键对白': 'keyDialogues',
      '结尾悬念': 'cliffhanger',
      '字数': 'wordCount'
    }
  };

  /**
   * 逻辑概念字段定义
   * 这些字段不是数据库中的实际字段，而是用户友好的"逻辑概念"
   * 例如："主要配角" 不是一个字段，而是一组角色的集合
   */
  static logicalFields = {
    characters: {
      '主要配角': {
        type: 'filter',
        roleFilter: ['配角', '主要配角']
      },
      '配角': {
        type: 'filter',
        roleFilter: ['配角', '主要配角', '次要配角']
      },
      '次要角色': {
        type: 'filter',
        roleFilter: ['次要配角', '次要角色']
      },
      '全部角色': {
        type: 'all'
      },
      '角色设定': {
        type: 'all'
      },
      '角色信息': {
        type: 'single-full',
        description: '显示单个角色的完整信息'
      },
      '完整信息': {
        type: 'single-full'
      }
    },

    outline: {
      '大纲': {
        type: 'all'
      },
      '剧情大纲': {
        type: 'all'
      },
      '完整大纲': {
        type: 'all'
      },
      '所有幕': {
        type: 'all'
      },
      // 大纲顶层字段映射到世界观
      '核心冲突': {
        type: 'worldview-mapping',
        targetField: 'conflict'
      },
      '主要冲突': {
        type: 'worldview-mapping',
        targetField: 'conflict'
      },
      '核心主题': {
        type: 'worldview-mapping',
        targetField: 'theme'
      },
      '主题': {
        type: 'worldview-mapping',
        targetField: 'theme'
      }
    },

    episodes: {
      '所有分集': {
        type: 'all'
      },
      '分集列表': {
        type: 'all'
      },
      '分集概览': {
        type: 'all'
      }
    }
  };

  /**
   * 获取英文字段名
   * @param {string} module - 模块名（project, worldview, characters, outline, episodes）
   * @param {string} chineseField - 中文字段名
   * @returns {string} 英文字段名，如果没有映射则返回原值
   */
  static getEnglishField(module, chineseField) {
    return this.mappings[module]?.[chineseField] || chineseField;
  }

  /**
   * 获取中文字段名
   * @param {string} module - 模块名
   * @param {string} englishField - 英文字段名
   * @returns {string} 中文字段名，如果没有映射则返回原值
   */
  static getChineseField(module, englishField) {
    const mapping = this.mappings[module];
    if (!mapping) return englishField;
    
    return Object.keys(mapping).find(key => mapping[key] === englishField) || englishField;
  }

  /**
   * 检查是否是逻辑概念字段
   * @param {string} module - 模块名
   * @param {string} field - 字段名
   * @returns {boolean}
   */
  static isLogicalField(module, field) {
    return this.logicalFields[module]?.hasOwnProperty(field) || false;
  }

  /**
   * 获取逻辑字段配置
   * @param {string} module - 模块名
   * @param {string} field - 字段名
   * @returns {Object|null} 逻辑字段配置对象
   */
  static getLogicalFieldConfig(module, field) {
    return this.logicalFields[module]?.[field] || null;
  }

  /**
   * 获取模块的所有中文字段名
   * @param {string} module - 模块名
   * @returns {string[]} 中文字段名数组
   */
  static getChineseFields(module) {
    return Object.keys(this.mappings[module] || {});
  }

  /**
   * 获取模块的所有英文字段名
   * @param {string} module - 模块名
   * @returns {string[]} 英文字段名数组
   */
  static getEnglishFields(module) {
    return Object.values(this.mappings[module] || {});
  }

  /**
   * 获取所有支持的模块名
   * @returns {string[]} 模块名数组
   */
  static getModules() {
    return Object.keys(this.mappings);
  }

  /**
   * 检查字段是否存在于模块中
   * @param {string} module - 模块名
   * @param {string} field - 字段名（中文或英文）
   * @returns {boolean}
   */
  static hasField(module, field) {
    const mapping = this.mappings[module];
    if (!mapping) return false;
    
    return mapping.hasOwnProperty(field) || Object.values(mapping).includes(field);
  }

  /**
   * 批量获取英文字段名
   * @param {string} module - 模块名
   * @param {string[]} chineseFields - 中文字段名数组
   * @returns {string[]} 英文字段名数组
   */
  static batchGetEnglishFields(module, chineseFields) {
    return chineseFields.map(field => this.getEnglishField(module, field));
  }

  /**
   * 导出为JSON配置（用于文档或外部工具）
   * @returns {Object} JSON格式的映射配置
   */
  static exportToJSON() {
    return {
      mappings: this.mappings,
      logicalFields: this.logicalFields,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

// 导出默认实例（用于非类方法调用）
export default FieldMapper;
