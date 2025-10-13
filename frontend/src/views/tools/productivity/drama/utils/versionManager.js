/**
 * 版本管理工具函数
 * 提供简单的版本快照、恢复、清理功能
 */

import db from '../services/db';

// 版本管理配置
export const VERSION_CONFIG = {
  MAX_VERSIONS_PER_MODULE: 20,    // 每个模块最多保留版本数
  MAX_VERSIONS_PER_PROJECT: 200,  // 每个项目最多总版本数
  KEEP_DAYS: 30,                  // 保留最近N天的版本
  AUTO_CLEANUP: true,             // 是否自动清理
  KEEP_IMPORTANT: true            // 永久保留重要版本
};

/**
 * 创建版本快照（增强版）
 * @param {string} moduleType - 模块类型：worldview/character/outline/episode
 * @param {string} moduleId - 模块ID（对于worldview和outline，使用projectId）
 * @param {object} content - 要保存的内容（会深拷贝）
 * @param {string} projectId - 项目ID
 * @param {object} options - 额外选项
 * @param {string} options.comment - 版本注释/备注
 * @param {string[]} options.tags - 版本标签
 * @param {boolean} options.isImportant - 是否重要版本
 * @param {boolean} options.isAutoSave - 是否自动保存
 * @returns {Promise<string>} 版本ID
 */
export async function createVersion(moduleType, moduleId, content, projectId, options = {}) {
  try {
    // 1. 检查版本数量限制
    await checkVersionLimits(projectId, moduleType, moduleId);
    
    // 2. 深拷贝内容，避免引用问题
    const contentCopy = JSON.parse(JSON.stringify(content));
    
    // 3. 创建版本记录
    const versionId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.versions.add({
      id: versionId,
      projectId,
      moduleType,
      moduleId,
      content: contentCopy,
      createdAt: Date.now(),
      
      // 新增字段
      comment: options.comment || null,           // 用户备注
      tags: options.tags || [],                   // 标签数组
      isImportant: options.isImportant || false, // 重要标记
      isAutoSave: options.isAutoSave || false     // 自动保存标记
    });
    
    const saveType = options.isAutoSave ? '自动保存' : '手动保存';
    console.log(`✅ 版本已创建: ${moduleType} - ${moduleId} [${saveType}]`, options.comment ? `(${options.comment})` : '');
    
    // 4. 自动清理旧版本（智能策略）
    if (VERSION_CONFIG.AUTO_CLEANUP) {
      // 如果是自动保存，使用更严格的清理策略
      if (options.isAutoSave) {
        await cleanupAutoSaveVersions(projectId, moduleType, moduleId);
      } else {
        await smartCleanup(projectId, moduleType, moduleId);
      }
    }
    
    return versionId;
  } catch (error) {
    console.error('❌ 创建版本失败:', error);
    throw error;
  }
}

/**
 * 获取项目的所有版本列表
 * @param {string} projectId - 项目ID
 * @returns {Promise<Array>} 版本列表（按时间倒序）
 */
export async function getVersions(projectId) {
  try {
    const versions = await db.versions
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt');
    
    return versions;
  } catch (error) {
    console.error('❌ 获取版本列表失败:', error);
    return [];
  }
}

/**
 * 获取特定模块的版本列表
 * @param {string} projectId - 项目ID
 * @param {string} moduleType - 模块类型
 * @param {string} moduleId - 模块ID
 * @returns {Promise<Array>} 版本列表
 */
export async function getModuleVersions(projectId, moduleType, moduleId) {
  try {
    const versions = await db.versions
      .where('[projectId+moduleType+moduleId]')
      .equals([projectId, moduleType, moduleId])
      .reverse()
      .sortBy('createdAt');
    
    return versions;
  } catch (error) {
    console.error('❌ 获取模块版本失败:', error);
    return [];
  }
}

/**
 * 获取单个版本详情
 * @param {string} versionId - 版本ID
 * @returns {Promise<object|null>} 版本对象
 */
export async function getVersion(versionId) {
  try {
    return await db.versions.get(versionId);
  } catch (error) {
    console.error('❌ 获取版本详情失败:', error);
    return null;
  }
}

/**
 * 恢复版本（返回版本内容，不直接修改数据）
 * @param {string} versionId - 版本ID
 * @returns {Promise<object|null>} 版本内容
 */
export async function restoreVersion(versionId) {
  try {
    const version = await db.versions.get(versionId);
    if (!version) {
      throw new Error('版本不存在');
    }
    
    // 返回内容的深拷贝
    return JSON.parse(JSON.stringify(version.content));
  } catch (error) {
    console.error('❌ 恢复版本失败:', error);
    throw error;
  }
}

/**
 * 删除指定版本
 * @param {string} versionId - 版本ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteVersion(versionId) {
  try {
    await db.versions.delete(versionId);
    console.log(`🗑️ 版本已删除: ${versionId}`);
    return true;
  } catch (error) {
    console.error('❌ 删除版本失败:', error);
    return false;
  }
}

/**
 * 检查版本数量限制
 * @param {string} projectId - 项目ID
 * @param {string} moduleType - 模块类型
 * @param {string} moduleId - 模块ID
 * @throws {Error} 如果超过限制则抛出错误
 */
export async function checkVersionLimits(projectId, moduleType, moduleId) {
  try {
    // 1. 检查项目总版本数
    const totalVersions = await db.versions
      .where('projectId')
      .equals(projectId)
      .count();
    
    if (totalVersions >= VERSION_CONFIG.MAX_VERSIONS_PER_PROJECT) {
      console.warn(`⚠️ 项目版本数已达上限 (${totalVersions}/${VERSION_CONFIG.MAX_VERSIONS_PER_PROJECT})，将自动清理`);
      await forceCleanupProject(projectId);
    }
    
    // 2. 检查模块版本数
    const moduleVersions = await db.versions
      .where('[projectId+moduleType+moduleId]')
      .equals([projectId, moduleType, moduleId])
      .count();
    
    if (moduleVersions >= VERSION_CONFIG.MAX_VERSIONS_PER_MODULE) {
      console.warn(`⚠️ 模块版本数已达上限 (${moduleVersions}/${VERSION_CONFIG.MAX_VERSIONS_PER_MODULE})，将自动清理`);
      // 不抛出错误，由 smartCleanup 处理
    }
  } catch (error) {
    console.error('❌ 检查版本限制失败:', error);
  }
}

/**
 * 智能清理策略（综合数量、时间、重要性）
 * @param {string} projectId - 项目ID
 * @param {string} moduleType - 模块类型
 * @param {string} moduleId - 模块ID
 * @returns {Promise<number>} 删除的版本数量
 */
export async function smartCleanup(projectId, moduleType, moduleId) {
  try {
    const versions = await db.versions
      .where('[projectId+moduleType+moduleId]')
      .equals([projectId, moduleType, moduleId])
      .sortBy('createdAt');
    
    if (versions.length === 0) return 0;
    
    const now = Date.now();
    const keepDaysMs = VERSION_CONFIG.KEEP_DAYS * 24 * 60 * 60 * 1000;
    
    // 根据策略筛选需要删除的版本
    const toDelete = [];
    
    versions.forEach((version, index) => {
      // 策略 1：永久保留重要版本
      if (VERSION_CONFIG.KEEP_IMPORTANT && version.isImportant) {
        return;
      }
      
      // 策略 2：保留最近N天的版本
      if (now - version.createdAt < keepDaysMs) {
        return;
      }
      
      // 策略 3：超过数量限制的旧版本
      if (versions.length - toDelete.length > VERSION_CONFIG.MAX_VERSIONS_PER_MODULE) {
        toDelete.push(version);
      }
    });
    
    // 执行删除
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(v => db.versions.delete(v.id)));
      console.log(`🧹 智能清理了 ${toDelete.length} 个旧版本`);
    }
    
    return toDelete.length;
  } catch (error) {
    console.error('❌ 智能清理失败:', error);
    return 0;
  }
}

/**
 * 强制清理项目版本（当超过总限制时）
 * @param {string} projectId - 项目ID
 * @returns {Promise<number>} 删除的版本数量
 */
export async function forceCleanupProject(projectId) {
  try {
    const versions = await db.versions
      .where('projectId')
      .equals(projectId)
      .sortBy('createdAt');
    
    const now = Date.now();
    const keepDaysMs = VERSION_CONFIG.KEEP_DAYS * 24 * 60 * 60 * 1000;
    
    // 保留：重要版本 + 最近N天的版本
    const toDelete = versions.filter(v => {
      if (VERSION_CONFIG.KEEP_IMPORTANT && v.isImportant) return false;
      if (now - v.createdAt < keepDaysMs) return false;
      return true;
    });
    
    // 如果还是超限，则强制删除最旧的（保留重要版本）
    let remainingCount = versions.length - toDelete.length;
    if (remainingCount > VERSION_CONFIG.MAX_VERSIONS_PER_PROJECT) {
      const needDelete = remainingCount - Math.floor(VERSION_CONFIG.MAX_VERSIONS_PER_PROJECT * 0.8);
      const nonImportantVersions = versions.filter(v => !v.isImportant);
      const additionalDelete = nonImportantVersions.slice(0, needDelete);
      toDelete.push(...additionalDelete);
    }
    
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(v => db.versions.delete(v.id)));
      console.log(`🚨 强制清理了 ${toDelete.length} 个项目版本`);
    }
    
    return toDelete.length;
  } catch (error) {
    console.error('❌ 强制清理失败:', error);
    return 0;
  }
}

/**
 * 清理自动保存版本（保留最近10个）
 * @param {string} projectId - 项目ID
 * @param {string} moduleType - 模块类型
 * @param {string} moduleId - 模块ID
 * @returns {Promise<number>} 删除的版本数量
 */
export async function cleanupAutoSaveVersions(projectId, moduleType, moduleId) {
  try {
    // 获取所有自动保存的版本
    const versions = await db.versions
      .where('[projectId+moduleType+moduleId]')
      .equals([projectId, moduleType, moduleId])
      .sortBy('createdAt');
    
    // 筛选出自动保存的版本
    const autoSaveVersions = versions.filter(v => v.isAutoSave === true);
    
    // 如果自动保存版本超过10个，删除最旧的
    const maxAutoSaveVersions = 10;
    if (autoSaveVersions.length > maxAutoSaveVersions) {
      const toDelete = autoSaveVersions.slice(0, autoSaveVersions.length - maxAutoSaveVersions);
      
      await Promise.all(toDelete.map(v => db.versions.delete(v.id)));
      console.log(`🧽 清理了 ${toDelete.length} 个自动保存版本（保留最近${maxAutoSaveVersions}个）`);
      
      return toDelete.length;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ 清理自动保存版本失败:', error);
    return 0;
  }
}

/**
 * 清理旧版本（保留最新N个） - 兼容旧接口
 * @param {string} projectId - 项目ID
 * @param {string} moduleType - 模块类型
 * @param {string} moduleId - 模块ID
 * @param {number} keepCount - 保留数量（默认5个）
 * @returns {Promise<number>} 删除的版本数量
 */
export async function cleanupOldVersions(projectId, moduleType, moduleId, keepCount = 5) {
  try {
    const versions = await db.versions
      .where('[projectId+moduleType+moduleId]')
      .equals([projectId, moduleType, moduleId])
      .sortBy('createdAt');
    
    // 如果版本数量超过保留数量，删除最旧的非重要版本
    if (versions.length > keepCount) {
      const toDelete = versions
        .filter(v => !v.isImportant)  // 保留重要版本
        .slice(0, Math.max(0, versions.length - keepCount));
      
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(v => db.versions.delete(v.id)));
        console.log(`🧹 清理了 ${toDelete.length} 个旧版本`);
        return toDelete.length;
      }
    }
    
    return 0;
  } catch (error) {
    console.error('❌ 清理旧版本失败:', error);
    return 0;
  }
}

/**
 * 清理项目的所有版本
 * @param {string} projectId - 项目ID
 * @returns {Promise<number>} 删除的版本数量
 */
export async function clearProjectVersions(projectId) {
  try {
    const versions = await db.versions
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    await Promise.all(versions.map(v => db.versions.delete(v.id)));
    
    console.log(`🗑️ 已清空项目 ${projectId} 的所有版本 (${versions.length}个)`);
    return versions.length;
  } catch (error) {
    console.error('❌ 清空项目版本失败:', error);
    return 0;
  }
}

/**
 * 获取版本统计信息
 * @param {string} projectId - 项目ID
 * @returns {Promise<object>} 统计信息
 */
export async function getVersionStats(projectId) {
  try {
    const versions = await db.versions
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    // 按模块类型分组统计
    const byType = {};
    versions.forEach(v => {
      byType[v.moduleType] = (byType[v.moduleType] || 0) + 1;
    });
    
    return {
      total: versions.length,
      byType,
      oldest: versions[0]?.createdAt || null,
      newest: versions[versions.length - 1]?.createdAt || null
    };
  } catch (error) {
    console.error('❌ 获取版本统计失败:', error);
    return {
      total: 0,
      byType: {},
      oldest: null,
      newest: null
    };
  }
}

/**
 * 简单对比两个版本的差异
 * @param {object} oldContent - 旧版本内容
 * @param {object} newContent - 新版本内容
 * @returns {Array} 差异列表
 */
export function compareVersions(oldContent, newContent) {
  const changes = [];
  
  // 获取所有键
  const allKeys = new Set([
    ...Object.keys(oldContent || {}),
    ...Object.keys(newContent || {})
  ]);
  
  allKeys.forEach(key => {
    const oldValue = oldContent?.[key];
    const newValue = newContent?.[key];
    
    // 跳过相同的值
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      return;
    }
    
    // 判断变化类型
    if (oldValue === undefined) {
      changes.push({
        field: key,
        type: 'added',
        oldValue: null,
        newValue: newValue
      });
    } else if (newValue === undefined) {
      changes.push({
        field: key,
        type: 'removed',
        oldValue: oldValue,
        newValue: null
      });
    } else {
      changes.push({
        field: key,
        type: 'modified',
        oldValue: oldValue,
        newValue: newValue
      });
    }
  });
  
  return changes;
}

/**
 * 格式化模块类型显示名称
 * @param {string} moduleType - 模块类型
 * @returns {string} 显示名称
 */
export function formatModuleType(moduleType) {
  const typeMap = {
    'worldview': '世界观',
    'character': '角色',
    'outline': '大纲',
    'episode': '分集'
  };
  return typeMap[moduleType] || moduleType;
}

/**
 * 获取版本的图标
 * @param {string} moduleType - 模块类型
 * @returns {string} 图标
 */
export function getModuleIcon(moduleType) {
  const iconMap = {
    'worldview': '🌍',
    'character': '👤',
    'outline': '📖',
    'episode': '🎬'
  };
  return iconMap[moduleType] || '📄';
}

export default {
  VERSION_CONFIG,
  createVersion,
  getVersions,
  getModuleVersions,
  getVersion,
  restoreVersion,
  deleteVersion,
  checkVersionLimits,
  smartCleanup,
  forceCleanupProject,
  cleanupAutoSaveVersions,
  cleanupOldVersions,
  clearProjectVersions,
  getVersionStats,
  compareVersions,
  formatModuleType,
  getModuleIcon
};
