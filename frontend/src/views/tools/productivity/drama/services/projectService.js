/**
 * 项目管理服务
 * 负责项目的 CRUD 操作
 */

import db from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 创建新项目
 */
export async function createProject(projectData) {
  try {
    const now = Date.now();
    const project = {
      id: uuidv4(),
      name: projectData.name || '未命名项目',
      type: projectData.type || '霸道总裁',
      episodeCount: projectData.episodeCount || 30,
      episodeDuration: projectData.episodeDuration || 1,
      status: '设定中',
      progress: 0,
      currentStep: 'step1',
      targetAudience: projectData.targetAudience || [],
      coreConflict: projectData.coreConflict || '',
      emotionalTone: projectData.emotionalTone || '',
      specialRequirements: projectData.specialRequirements || '',
      createdAt: now,
      updatedAt: now
    };

    await db.projects.add(project);
    console.log('✅ Project created:', project.id);
    return project;
  } catch (error) {
    console.error('❌ Failed to create project:', error);
    throw error;
  }
}

/**
 * 获取所有项目
 */
export async function getAllProjects(options = {}) {
  try {
    let query = db.projects;

    // 按状态筛选
    if (options.status) {
      query = query.where('status').equals(options.status);
    }

    // 获取结果
    let projects = await query.toArray();

    // 排序
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    
    projects.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return projects;
  } catch (error) {
    console.error('❌ Failed to get projects:', error);
    throw error;
  }
}

/**
 * 根据ID获取项目
 */
export async function getProjectById(projectId) {
  try {
    const project = await db.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  } catch (error) {
    console.error('❌ Failed to get project:', error);
    throw error;
  }
}

/**
 * 更新项目
 */
export async function updateProject(projectId, updates) {
  try {
    const now = Date.now();
    const updateData = {
      ...updates,
      updatedAt: now
    };

    const count = await db.projects.update(projectId, updateData);
    
    if (count === 0) {
      throw new Error(`Project not found: ${projectId}`);
    }

    console.log('✅ Project updated:', projectId);
    return await getProjectById(projectId);
  } catch (error) {
    console.error('❌ Failed to update project:', error);
    throw error;
  }
}

/**
 * 删除项目（及所有关联数据）
 */
export async function deleteProject(projectId) {
  try {
    // 使用事务确保数据一致性
    await db.transaction('rw', [
      db.projects,
      db.characters,
      db.outlines,
      db.episodes,
      db.scripts,
      db.versions
    ], async () => {
      // 删除项目
      await db.projects.delete(projectId);
      
      // 删除角色
      await db.characters.where('projectId').equals(projectId).delete();
      
      // 删除大纲
      await db.outlines.where('projectId').equals(projectId).delete();
      
      // 删除分集
      await db.episodes.where('projectId').equals(projectId).delete();
      
      // 删除剧本
      await db.scripts.where('projectId').equals(projectId).delete();
      
      // 删除版本历史
      await db.versions.where('projectId').equals(projectId).delete();
    });

    console.log('✅ Project and related data deleted:', projectId);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete project:', error);
    throw error;
  }
}

/**
 * 更新项目进度
 */
export async function updateProgress(projectId, progress) {
  try {
    // 根据进度更新状态
    let status = '设定中';
    if (progress > 0 && progress <= 25) status = '设定中';
    else if (progress > 25 && progress <= 50) status = '大纲中';
    else if (progress > 50 && progress <= 90) status = '剧本中';
    else if (progress > 90) status = '已完成';

    return await updateProject(projectId, { progress, status });
  } catch (error) {
    console.error('❌ Failed to update progress:', error);
    throw error;
  }
}

/**
 * 获取项目统计信息
 */
export async function getProjectStats(projectId) {
  try {
    const [
      project,
      charactersCount,
      outline,
      episodesCount,
      scriptsCount
    ] = await Promise.all([
      db.projects.get(projectId),
      db.characters.where('projectId').equals(projectId).count(),
      db.outlines.where('projectId').equals(projectId).first(),
      db.episodes.where('projectId').equals(projectId).count(),
      db.scripts.where('projectId').equals(projectId).count()
    ]);

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // 获取总字数
    const scripts = await db.scripts.where('projectId').equals(projectId).toArray();
    const totalWords = scripts.reduce((sum, script) => sum + (script.totalWordCount || 0), 0);

    return {
      project,
      charactersCount,
      hasOutline: !!outline,
      episodesCount,
      scriptsCount,
      totalWords,
      completionRate: {
        characters: charactersCount > 0,
        outline: !!outline,
        episodes: episodesCount > 0,
        scripts: scriptsCount > 0
      }
    };
  } catch (error) {
    console.error('❌ Failed to get project stats:', error);
    throw error;
  }
}

/**
 * 搜索项目
 */
export async function searchProjects(keyword) {
  try {
    const allProjects = await db.projects.toArray();
    const lowerKeyword = keyword.toLowerCase();

    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowerKeyword) ||
      project.type.toLowerCase().includes(lowerKeyword) ||
      project.coreConflict?.toLowerCase().includes(lowerKeyword)
    );
  } catch (error) {
    console.error('❌ Failed to search projects:', error);
    throw error;
  }
}

/**
 * 导出项目数据（JSON格式）
 */
export async function exportProject(projectId) {
  try {
    const [
      project,
      characters,
      outline,
      episodes,
      scripts
    ] = await Promise.all([
      db.projects.get(projectId),
      db.characters.where('projectId').equals(projectId).toArray(),
      db.outlines.where('projectId').equals(projectId).first(),
      db.episodes.where('projectId').equals(projectId).toArray(),
      db.scripts.where('projectId').equals(projectId).toArray()
    ]);

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return {
      version: '1.0',
      exportDate: Date.now(),
      project,
      characters,
      outline,
      episodes,
      scripts
    };
  } catch (error) {
    console.error('❌ Failed to export project:', error);
    throw error;
  }
}

/**
 * 导入项目数据
 */
export async function importProject(data) {
  try {
    // 验证数据格式
    if (!data.project || !data.version) {
      throw new Error('Invalid import data format');
    }

    // 生成新ID避免冲突
    const oldId = data.project.id;
    const newId = uuidv4();

    // 使用事务导入所有数据
    await db.transaction('rw', [
      db.projects,
      db.characters,
      db.outlines,
      db.episodes,
      db.scripts
    ], async () => {
      // 导入项目
      const project = { ...data.project, id: newId };
      await db.projects.add(project);

      // 导入角色
      if (data.characters) {
        const characters = data.characters.map(char => ({
          ...char,
          id: uuidv4(),
          projectId: newId
        }));
        await db.characters.bulkAdd(characters);
      }

      // 导入大纲
      if (data.outline) {
        const outline = { ...data.outline, id: uuidv4(), projectId: newId };
        await db.outlines.add(outline);
      }

      // 导入分集
      if (data.episodes) {
        const episodes = data.episodes.map(ep => ({
          ...ep,
          id: uuidv4(),
          projectId: newId
        }));
        await db.episodes.bulkAdd(episodes);
      }

      // 导入剧本
      if (data.scripts) {
        const scripts = data.scripts.map(script => ({
          ...script,
          id: uuidv4(),
          projectId: newId
        }));
        await db.scripts.bulkAdd(scripts);
      }
    });

    console.log('✅ Project imported:', newId);
    return newId;
  } catch (error) {
    console.error('❌ Failed to import project:', error);
    throw error;
  }
}

// 导出所有函数
export default {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  updateProgress,
  getProjectStats,
  searchProjects,
  exportProject,
  importProject
};
