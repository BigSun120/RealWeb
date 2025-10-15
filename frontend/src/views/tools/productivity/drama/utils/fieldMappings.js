/**
 * 剧本医生 - 统一字段映射表
 * 
 * 用于处理中文字段名与数据库英文字段名之间的映射
 * 集中管理所有模块的字段映射关系，确保一致性
 */

// ====== 世界观字段映射 ======
export const WORLDVIEW_FIELD_MAP = {
  // 中文 -> 英文
  '故事背景': 'background',
  '世界设定': 'setting',
  '核心主题': 'theme',
  '主题': 'theme',  // 别名
  '主要冲突': 'conflict',
  '核心冲突': 'conflict',  // 别名
  '情感基调': 'tone',
  
  // 英文保持原样（兼容）
  'background': 'background',
  'setting': 'setting',
  'theme': 'theme',
  'conflict': 'conflict',
  'tone': 'tone'
};

// 世界观字段的反向映射（英文 -> 中文）
export const WORLDVIEW_FIELD_MAP_REVERSE = {
  'background': '故事背景',
  'setting': '世界设定',
  'theme': '核心主题',
  'conflict': '主要冲突',
  'tone': '情感基调'
};

// ====== 角色字段映射 ======
export const CHARACTER_FIELD_MAP = {
  // 中文 -> 英文
  '角色名称': 'name',
  '姓名': 'name',  // 别名
  '角色定位': 'role',
  '定位': 'role',  // 别名
  '角色描述': 'description',
  '简介': 'description',  // 别名
  '描述': 'description',  // 别名
  '年龄': 'age',
  '性别': 'gender',
  '性格描述': 'personality',
  '性格特点': 'personality',  // 别名
  '性格': 'personality',  // 别名
  '角色背景': 'background',
  '背景故事': 'background',  // 别名
  '背景': 'background',  // 别名
  '行为动机': 'motivation',
  '动机': 'motivation',  // 别名
  '人际关系': 'relationships',
  '关系': 'relationships',  // 别名
  '标签': 'tags',
  
  // 英文保持原样（兼容）
  'name': 'name',
  'role': 'role',
  'description': 'description',
  'age': 'age',
  'gender': 'gender',
  'personality': 'personality',
  'background': 'background',
  'motivation': 'motivation',
  'relationships': 'relationships',
  'tags': 'tags'
};

// 角色字段的反向映射（英文 -> 中文）
export const CHARACTER_FIELD_MAP_REVERSE = {
  'name': '角色名称',
  'role': '角色定位',
  'description': '角色描述',
  'age': '年龄',
  'gender': '性别',
  'personality': '性格描述',
  'background': '角色背景',
  'motivation': '行为动机',
  'relationships': '人际关系',
  'tags': '标签'
};

// ====== 大纲字段映射 ======
export const OUTLINE_FIELD_MAP = {
  // 顶层字段（实际属于worldview）
  '核心冲突': 'worldview.conflict',
  '主要冲突': 'worldview.conflict',
  '核心主题': 'worldview.theme',
  '主题': 'worldview.theme',
  
  // 幕结构字段
  '结构类型': 'structure',
  '幕': 'acts',
  
  // 幕内字段
  '幕序号': 'actNumber',
  '幕标题': 'title',
  '标题': 'title',
  '幕描述': 'description',
  '描述': 'description',
  '情节点': 'plotPoints',
  
  // 情节点字段
  '情节点名称': 'plotPoints.name',
  '情节点描述': 'plotPoints.description',
  '涉及角色': 'plotPoints.characters',
  '情感变化': 'plotPoints.emotion',
  '预估集数': 'plotPoints.episodeRange',
  
  // 英文保持原样（兼容）
  'structure': 'structure',
  'acts': 'acts',
  'actNumber': 'actNumber',
  'title': 'title',
  'description': 'description',
  'plotPoints': 'plotPoints'
};

// 大纲顶层字段（映射到worldview）
export const OUTLINE_TOP_LEVEL_FIELDS = {
  '核心冲突': 'conflict',
  '主要冲突': 'conflict',
  '核心主题': 'theme',
  '主题': 'theme'
};

// ====== 分集字段映射 ======
export const EPISODE_FIELD_MAP = {
  // 基本信息
  '集数': 'number',
  '标题': 'title',
  '状态': 'status',
  '字数': 'wordCount',
  
  // 内容字段
  '简介': 'content.summary',
  '概要': 'content.summary',  // 别名
  '剧本正文': 'content.script',
  '正文': 'content.script',  // 别名
  '场景': 'content.scenes',
  '关键对白': 'content.keyDialogues',
  '结尾悬念': 'content.cliffhanger',
  '悬念': 'content.cliffhanger',  // 别名
  '备注': 'content.notes',
  
  // 场景字段
  '场景序号': 'scenes.number',
  '地点': 'scenes.location',
  '时间': 'scenes.time',
  '氛围': 'scenes.atmosphere',
  '场景内容': 'scenes.content',
  
  // 英文保持原样（兼容）
  'number': 'number',
  'title': 'title',
  'status': 'status',
  'wordCount': 'wordCount',
  'summary': 'content.summary',
  'script': 'content.script',
  'scenes': 'content.scenes',
  'keyDialogues': 'content.keyDialogues',
  'cliffhanger': 'content.cliffhanger',
  'notes': 'content.notes'
};

// 分集状态映射
export const EPISODE_STATUS_MAP = {
  '草稿': 'draft',
  '进行中': 'in-progress',
  '已完成': 'completed',
  '已审核': 'reviewed',
  
  // 英文保持原样
  'draft': 'draft',
  'in-progress': 'in-progress',
  'completed': 'completed',
  'reviewed': 'reviewed'
};

// ====== 模块名称映射 ======
export const MODULE_NAME_MAP = {
  // 中文 -> 英文
  '世界观': 'worldview',
  '世界观设定': 'worldview',
  '角色管理': 'characters',
  '角色设定': 'characters',
  '角色': 'characters',
  '剧情大纲': 'outline',
  '大纲': 'outline',
  '分集剧本': 'episodes',
  '分集': 'episodes',
  '剧本': 'episodes',
  
  // 英文保持原样（兼容）
  'worldview': 'worldview',
  'characters': 'characters',
  'outline': 'outline',
  'episodes': 'episodes'
};

// 模块名称反向映射（英文 -> 中文）
export const MODULE_NAME_MAP_REVERSE = {
  'worldview': '世界观',
  'characters': '角色管理',
  'outline': '剧情大纲',
  'episodes': '分集剧本'
};

// ====== 辅助函数 ======

/**
 * 获取英文字段名
 * @param {String} module - 模块名（worldview/characters/outline/episodes）
 * @param {String} field - 中文或英文字段名
 * @returns {String} 英文字段名
 */
export function getEnglishFieldName(module, field) {
  let fieldMap;
  
  switch (module) {
    case 'worldview':
      fieldMap = WORLDVIEW_FIELD_MAP;
      break;
    case 'characters':
      fieldMap = CHARACTER_FIELD_MAP;
      break;
    case 'outline':
      fieldMap = OUTLINE_FIELD_MAP;
      break;
    case 'episodes':
      fieldMap = EPISODE_FIELD_MAP;
      break;
    default:
      return field;
  }
  
  return fieldMap[field] || field;
}

/**
 * 获取中文字段名
 * @param {String} module - 模块名（worldview/characters/outline/episodes）
 * @param {String} field - 英文字段名
 * @returns {String} 中文字段名
 */
export function getChineseFieldName(module, field) {
  let fieldMap;
  
  switch (module) {
    case 'worldview':
      fieldMap = WORLDVIEW_FIELD_MAP_REVERSE;
      break;
    case 'characters':
      fieldMap = CHARACTER_FIELD_MAP_REVERSE;
      break;
    case 'outline':
      // 大纲字段反向映射较复杂，暂时返回原值
      return field;
    case 'episodes':
      // 分集字段反向映射较复杂，暂时返回原值
      return field;
    default:
      return field;
  }
  
  return fieldMap[field] || field;
}

/**
 * 获取英文模块名
 * @param {String} moduleName - 中文或英文模块名
 * @returns {String} 英文模块名
 */
export function getEnglishModuleName(moduleName) {
  return MODULE_NAME_MAP[moduleName] || moduleName;
}

/**
 * 获取中文模块名
 * @param {String} moduleName - 英文模块名
 * @returns {String} 中文模块名
 */
export function getChineseModuleName(moduleName) {
  return MODULE_NAME_MAP_REVERSE[moduleName] || moduleName;
}

/**
 * 检查字段是否属于大纲的顶层字段（实际属于worldview）
 * @param {String} field - 字段名
 * @returns {String|null} 如果是顶层字段，返回对应的worldview字段名；否则返回null
 */
export function getOutlineTopLevelField(field) {
  return OUTLINE_TOP_LEVEL_FIELDS[field] || null;
}

// 默认导出所有映射
export default {
  WORLDVIEW_FIELD_MAP,
  WORLDVIEW_FIELD_MAP_REVERSE,
  CHARACTER_FIELD_MAP,
  CHARACTER_FIELD_MAP_REVERSE,
  OUTLINE_FIELD_MAP,
  OUTLINE_TOP_LEVEL_FIELDS,
  EPISODE_FIELD_MAP,
  EPISODE_STATUS_MAP,
  MODULE_NAME_MAP,
  MODULE_NAME_MAP_REVERSE,
  getEnglishFieldName,
  getChineseFieldName,
  getEnglishModuleName,
  getChineseModuleName,
  getOutlineTopLevelField
};
