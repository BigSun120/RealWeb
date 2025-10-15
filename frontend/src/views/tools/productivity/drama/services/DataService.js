/**
 * DataService - 数据访问服务层
 * 
 * 职责：
 * 1. 封装所有项目数据的访问逻辑
 * 2. 处理逻辑概念字段（如"主要配角"）和具体字段的差异
 * 3. 自动处理空值，返回友好提示
 * 4. 支持多种格式输出（text, json）
 * 
 * 优点：
 * - 单一职责：只负责数据读取
 * - 易于测试：可Mock project对象
 * - 格式统一：所有空值都有友好提示
 * - 解耦：UI层不需要知道数据结构细节
 */

import { FieldMapper } from '../mappers/FieldMapper';

export class DataService {
  /**
   * 构造函数
   * @param {Object} project - 项目对象
   */
  constructor(project) {
    this.project = project;
  }

  /**
   * 获取字段内容（统一入口）
   * @param {Object} location - 位置对象 { module, field, characterId }
   * @param {Object} options - 选项 { format: 'text'|'json' }
   * @returns {string} 字段内容
   */
  getFieldContent(location, options = {}) {
    const { module, field, characterId } = location;
    const { format = 'text' } = options;

    console.log(`📖 DataService.getFieldContent:`, { module, field, characterId, format });

    try {
      // 1. 检查是否是逻辑概念字段
      if (FieldMapper.isLogicalField(module, field)) {
        return this._getLogicalFieldContent(module, field, format);
      }

      // 2. 获取具体字段内容
      return this._getSpecificFieldContent(module, field, characterId, format);
    } catch (error) {
      console.error('❌ 获取字段内容失败:', error);
      return this._formatEmpty(module, field, format);
    }
  }

  /**
   * 获取逻辑概念字段内容
   * @private
   */
  _getLogicalFieldContent(module, field, format) {
    const config = FieldMapper.getLogicalFieldConfig(module, field);
    console.log(`🔍 逻辑字段配置:`, config);

    switch (module) {
      case 'characters':
        return this._getCharactersLogical(config, format);
      case 'outline':
        return this._getOutlineLogical(config, format);
      case 'episodes':
        return this._getEpisodesLogical(config, format);
      default:
        return this._formatEmpty(module, field, format);
    }
  }

  /**
   * 获取具体字段内容
   * @private
   */
  _getSpecificFieldContent(module, field, characterId, format) {
    switch (module) {
      case 'project':
      case 'worldview':
        return this._getProjectOrWorldviewField(module, field, format);
      case 'characters':
        return this._getCharacterField(characterId, field, format);
      case 'outline':
        return this._getOutlineField(field, format);
      case 'episodes':
        return this._getEpisodeField(field, characterId, format);
      default:
        console.warn(`⚠️ 未知模块: ${module}`);
        return this._formatEmpty(module, field, format);
    }
  }

  /**
   * 获取项目或世界观字段
   * @private
   */
  _getProjectOrWorldviewField(module, field, format) {
    // 项目级别字段
    const projectField = FieldMapper.getEnglishField('project', field);
    if (this.project[projectField] !== undefined) {
      const content = String(this.project[projectField] || '');
      if (!content.trim()) {
        return this._formatEmpty('项目', field, format);
      }
      return format === 'json' 
        ? JSON.stringify({ [projectField]: content }, null, 2)
        : content;
    }

    // 世界观字段
    const worldviewField = FieldMapper.getEnglishField('worldview', field);
    const content = this.project.worldview?.[worldviewField] || '';
    
    if (!content || !content.trim()) {
      return this._formatEmpty('世界观', field, format);
    }

    return format === 'json'
      ? JSON.stringify({ [worldviewField]: content }, null, 2)
      : content;
  }

  /**
   * 获取角色相关逻辑字段（如"主要配角"）
   * @private
   */
  _getCharactersLogical(config, format) {
    if (!this.project.characters || this.project.characters.length === 0) {
      return format === 'json' ? '[]' : '暂无角色信息';
    }

    let characters = [];

    if (config.type === 'all') {
      characters = this.project.characters;
    } else if (config.type === 'filter' && config.roleFilter) {
      characters = this.project.characters.filter(c =>
        config.roleFilter.some(roleFilter => c.role && c.role.includes(roleFilter))
      );
    }

    if (characters.length === 0) {
      return format === 'json' ? '[]' : '暂无匹配的角色';
    }

    return this._formatCharacters(characters, format);
  }

  /**
   * 获取单个角色字段
   * @private
   */
  _getCharacterField(characterId, field, format) {
    const character = this._findCharacter(characterId);
    if (!character) {
      return this._formatEmpty('角色', field, format);
    }

    // 检查是否要求显示完整信息
    const config = FieldMapper.getLogicalFieldConfig('characters', field);
    if (config && config.type === 'single-full') {
      return this._formatCharacters([character], format);
    }

    // 获取具体字段
    const englishField = FieldMapper.getEnglishField('characters', field);
    let value = character[englishField];

    // 处理数组类型
    if (Array.isArray(value)) {
      value = value.join(', ');
    }

    if (!value || String(value).trim() === '') {
      return this._formatEmpty('角色', field, format, character.name);
    }

    return format === 'json'
      ? JSON.stringify({ [englishField]: value }, null, 2)
      : String(value);
  }

  /**
   * 获取大纲逻辑字段
   * @private
   */
  _getOutlineLogical(config, format) {
    // 检查是否是worldview映射
    if (config.type === 'worldview-mapping') {
      const content = this.project.worldview?.[config.targetField] || '';
      if (!content.trim()) {
        return this._formatEmpty('世界观', config.targetField, format);
      }
      return format === 'json'
        ? JSON.stringify({ [config.targetField]: content }, null, 2)
        : content;
    }

    // 显示完整大纲
    if (!this.project.outline || !this.project.outline.acts) {
      return format === 'json' ? '{}' : '暂无大纲';
    }

    return this._formatOutline(this.project.outline, format);
  }

  /**
   * 获取大纲字段
   * @private
   */
  _getOutlineField(field, format) {
    if (!this.project.outline || !this.project.outline.acts) {
      return format === 'json' ? '{}' : '暂无大纲';
    }

    // 匹配"第X幕"
    const actMatch = field.match(/第(一|二|三|四|五|六|七|八|九|十)?幕/);
    if (actMatch) {
      const actIndex = this._parseActNumber(actMatch[1]);
      const act = this.project.outline.acts[actIndex];
      
      if (!act) {
        return this._formatEmpty('大纲', field, format);
      }

      return this._formatAct(act, format);
    }

    // 返回完整大纲
    return this._formatOutline(this.project.outline, format);
  }

  /**
   * 获取分集逻辑字段
   * @private
   */
  _getEpisodesLogical(config, format) {
    if (!this.project.episodes || this.project.episodes.length === 0) {
      return format === 'json' ? '[]' : '暂无分集';
    }

    return this._formatEpisodes(this.project.episodes, format);
  }

  /**
   * 获取分集字段
   * @private
   */
  _getEpisodeField(field, episodeNumber, format) {
    if (!this.project.episodes || this.project.episodes.length === 0) {
      return format === 'json' ? '[]' : '暂无分集';
    }

    // 匹配"第X集"
    const episodeMatch = field.match(/第(\d+)集/);
    if (episodeMatch) {
      const number = parseInt(episodeMatch[1]);
      const episode = this.project.episodes.find(ep => ep.number === number);
      
      if (!episode) {
        return this._formatEmpty('分集', field, format);
      }

      return this._formatEpisode(episode, format);
    }

    // 返回所有分集概览
    return this._formatEpisodes(this.project.episodes, format);
  }

  // ========== 格式化方法 ==========

  /**
   * 格式化角色列表
   * @private
   */
  _formatCharacters(characters, format) {
    if (format === 'json') {
      return JSON.stringify(characters, null, 2);
    }

    return characters.map((char, index) => {
      const lines = [];
      lines.push(`### ${index + 1}. ${char.name || '未命名'}${char.role ? `（${char.role}）` : ''}`);
      
      if (char.age !== undefined || char.gender) {
        const info = [];
        if (char.age !== undefined) info.push(`${char.age}岁`);
        if (char.gender) info.push(char.gender);
        lines.push(`- **基本信息**：${info.join('、')}`);
      }
      
      if (char.description) lines.push(`- **角色描述**：${char.description}`);
      if (char.personality) lines.push(`- **性格特点**：${char.personality}`);
      if (char.background) lines.push(`- **角色背景**：${char.background}`);
      if (char.motivation) lines.push(`- **行为动机**：${char.motivation}`);
      if (char.relationships) lines.push(`- **人际关系**：${char.relationships}`);
      if (char.tags && char.tags.length > 0) lines.push(`- **标签**：${char.tags.join('、')}`);
      
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * 格式化大纲
   * @private
   */
  _formatOutline(outline, format) {
    if (format === 'json') {
      return JSON.stringify(outline, null, 2);
    }

    return outline.acts.map((act, actIndex) => {
      const lines = [];
      lines.push(`## ${actIndex + 1}. ${act.title || `第${actIndex + 1}幕`}`);
      
      if (act.description) {
        lines.push(`\n${act.description}`);
      }

      if (act.plotPoints && act.plotPoints.length > 0) {
        lines.push('\n**情节点**：');
        act.plotPoints.forEach((point, idx) => {
          lines.push(`${idx + 1}. **${point.name || '未命名'}**`);
          if (point.description) {
            lines.push(`   ${point.description}`);
          }
          if (point.characters && point.characters.length > 0) {
            lines.push(`   涉及角色：${point.characters.join('、')}`);
          }
        });
      }

      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * 格式化单个幕
   * @private
   */
  _formatAct(act, format) {
    if (format === 'json') {
      return JSON.stringify(act, null, 2);
    }

    const lines = [];
    lines.push(`## ${act.title || '未命名'}`);
    
    if (act.description) {
      lines.push(`\n${act.description}`);
    }

    if (act.plotPoints && act.plotPoints.length > 0) {
      lines.push('\n**情节点**：');
      act.plotPoints.forEach((point, idx) => {
        lines.push(`${idx + 1}. **${point.name || '未命名'}**`);
        if (point.description) {
          lines.push(`   ${point.description}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * 格式化分集列表
   * @private
   */
  _formatEpisodes(episodes, format) {
    if (format === 'json') {
      return JSON.stringify(episodes, null, 2);
    }

    return episodes.map(ep => 
      `第${ep.number}集：${ep.title || '未命名'}（${ep.status || 'draft'}, ${ep.wordCount || 0}字）`
    ).join('\n');
  }

  /**
   * 格式化单个分集
   * @private
   */
  _formatEpisode(episode, format) {
    if (format === 'json') {
      return JSON.stringify(episode, null, 2);
    }

    const lines = [];
    lines.push(`# 第${episode.number}集：${episode.title || '未命名'}`);
    lines.push(`**状态**：${episode.status || 'draft'}`);
    
    if (episode.content) {
      if (episode.content.summary) {
        lines.push(`\n## 简介\n${episode.content.summary}`);
      }
      if (episode.content.script) {
        const script = episode.content.script;
        const preview = script.length > 500 ? script.substring(0, 500) + '...' : script;
        lines.push(`\n## 剧本内容\n${preview}`);
      }
    }
    
    if (episode.wordCount) {
      lines.push(`\n**字数**：${episode.wordCount}`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化空内容（友好提示）
   * @private
   */
  _formatEmpty(moduleName, field, format, characterName = null) {
    if (format === 'json') {
      return 'null';
    }

    const moduleNameMap = {
      'project': '项目',
      'worldview': '世界观',
      'characters': '角色',
      'outline': '大纲',
      'episodes': '分集'
    };

    const displayModuleName = moduleNameMap[moduleName] || moduleName;
    const prefix = characterName ? `角色"${characterName}"的` : `${displayModuleName}的`;
    
    return `【${prefix}"${field}"字段当前为空】\n\n💡 这正是AI诊断发现需要改进的地方！`;
  }

  // ========== 辅助方法 ==========

  /**
   * 查找角色（支持ID和名称）
   * @private
   */
  _findCharacter(identifier) {
    if (!this.project.characters) return null;
    
    return this.project.characters.find(c => 
      c.id === identifier || c.name === identifier
    );
  }

  /**
   * 解析幕数（中文数字转数字）
   * @private
   */
  _parseActNumber(chineseNumber) {
    const map = {
      '一': 0, '二': 1, '三': 2, '四': 3, '五': 4,
      '六': 5, '七': 6, '八': 7, '九': 8, '十': 9
    };
    return chineseNumber ? (map[chineseNumber] || 0) : 0;
  }
}

export default DataService;
