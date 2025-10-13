/**
 * IndexedDB 数据库服务
 * 使用 Dexie.js 封装
 */

import Dexie from 'dexie';

// 数据库名称和版本
const DB_NAME = 'drama_script_db';
const DB_VERSION = 1;

// 创建数据库实例
class DramaDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    
    // 定义数据库结构
    this.version(DB_VERSION).stores({
      // 项目表
      projects: 'id, status, updatedAt',
      
      // 角色表
      characters: 'id, projectId, [projectId+role]',
      
      // 大纲表
      outlines: 'id, &projectId',  // & 表示 unique
      
      // 分集梗概表
      episodes: 'id, projectId, [projectId+episodeNumber]',
      
      // 剧本表
      scripts: 'id, projectId, [projectId+episodeNumber]',
      
      // 模板表
      templates: 'id, category, type',
      
      // 版本历史表
      versions: 'id, [projectId+moduleType+moduleId], createdAt'
    });

    // 表的类型声明（可选，但推荐用于 TypeScript）
    this.projects = this.table('projects');
    this.characters = this.table('characters');
    this.outlines = this.table('outlines');
    this.episodes = this.table('episodes');
    this.scripts = this.table('scripts');
    this.templates = this.table('templates');
    this.versions = this.table('versions');
  }
}

// 创建单例
const db = new DramaDatabase();

// 数据库初始化
export async function initDatabase() {
  try {
    // 打开数据库
    await db.open();
    console.log('✅ Drama Script Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// 清空所有数据（谨慎使用）
export async function clearAllData() {
  try {
    await db.delete();
    console.log('🗑️ All data cleared');
    // 重新初始化
    await initDatabase();
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    throw error;
  }
}

// 获取数据库信息
export async function getDatabaseInfo() {
  try {
    const tables = await Promise.all([
      db.projects.count(),
      db.characters.count(),
      db.outlines.count(),
      db.episodes.count(),
      db.scripts.count(),
      db.templates.count(),
      db.versions.count()
    ]);

    return {
      name: DB_NAME,
      version: DB_VERSION,
      tables: {
        projects: tables[0],
        characters: tables[1],
        outlines: tables[2],
        episodes: tables[3],
        scripts: tables[4],
        templates: tables[5],
        versions: tables[6]
      },
      totalRecords: tables.reduce((sum, count) => sum + count, 0)
    };
  } catch (error) {
    console.error('❌ Failed to get database info:', error);
    throw error;
  }
}

// 导出数据库实例
export default db;
