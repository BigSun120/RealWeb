/**
 * 工具服务 - 完全基于API的工具数据管理
 * 替代原有的工具注册系统
 */

import request from '@/utils/request';
import staticToolsConfig from '../../../shared/static-tools.json';

const STATIC_TOOLS = staticToolsConfig.map(tool => ({
  ...tool,
  isStatic: true
}));

class ToolsService {
  constructor() {
    this.tools = [];
    this.categories = [];
    this.loading = false;
    this.error = null;
    this.apiLoaded = false;
  }

  /**
   * 获取所有工具
   */
  async getAllTools(params = {}) {
    try {
      this.loading = true;
      this.error = null;
      const response = await request({
        url: '/tools',
        method: 'get',
        params
      });
      if (response.code === 200) {
        const tools = Array.isArray(response?.data?.tools) ? response.data.tools : [];
        this.tools = tools;
        this.apiLoaded = true;
        return this.tools;
      }
      throw new Error(response.message || '获取工具列表失败');
    } catch (error) {
      this.apiLoaded = false;
      this.error = error.message;
      // eslint-disable-next-line no-console
      console.error('获取工具列表失败:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }


  /**
   * 获取所有分类
   */
  async getAllCategories() {
    try {
      const response = await request({
        url: '/tools/categories/list',
        method: 'get'
      });
      if (response.code === 200) {
        this.categories = response.data;
        return this.categories;
      }
      throw new Error(response.message || '获取分类列表失败');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('获取分类列表失败:', error);
      // 返回默认分类作为降级方案
      this.categories = [
        { id: 'web', name: '网页工具', icon: '🌐', description: '网页相关的实用工具' },
        { id: 'text', name: '文本工具', icon: '✏️', description: '文本处理和编辑工具' },
        { id: 'image', name: '图片工具', icon: '🖼️', description: '图片处理和编辑工具' },
        { id: 'dev', name: '开发工具', icon: '⚙️', description: '开发者常用工具' },
        { id: 'productivity', name: '效率工具', icon: '??', description: '个人效率与备忘工具' },
        { id: 'utility', name: '实用工具', icon: '🔧', description: '日常实用小工具' },
        { id: 'media', name: '媒体工具', icon: '🎬', description: '音视频处理和下载工具' }
      ];
      return this.categories;
    }
  }

  /**
   * 根据分类获取工具
   */
  getToolsByCategory(categoryId) {
    return this.tools.filter(tool => tool.category === categoryId);
  }

  /**
   * 获取推荐工具
   */
  getFeaturedTools() {
    return this.tools.filter(tool => tool.featured);
  }

  /**
   * 根据状态获取工具
   */
  getToolsByStatus(status) {
    return this.tools.filter(tool => tool.status === status);
  }

  /**
   * 搜索工具
   */
  searchTools(keyword) {
    if (!keyword) return this.tools;
    const lowerKeyword = keyword.toLowerCase();
    return this.tools.filter(
      tool =>
        tool.name.toLowerCase().includes(lowerKeyword) ||
        tool.description.toLowerCase().includes(lowerKeyword) ||
        (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
    );
  }

  /**
   * 根据ID获取工具
   */
  getToolById(toolId) {
    return this.tools.find(tool => tool.id === toolId) || null;
  }

  /**
   * 根据ID获取分类
   */
  getCategoryById(categoryId) {
    return this.categories.find(category => category.id === categoryId) || null;
  }

  /**
   * 获取有工具的分类
   */
  getCategoriesWithTools() {
    return this.categories.filter(category => {
      return this.getToolsByCategory(category.id).length > 0;
    });
  }

  /**
   * 筛选工具
   */
  filterTools(filters = {}) {
    let tools = [...this.tools];
    // 按分类筛选
    if (filters.category && filters.category !== 'all') {
      tools = tools.filter(tool => tool.category === filters.category);
    }
    // 按状态筛选
    if (filters.status) {
      tools = tools.filter(tool => tool.status === filters.status);
    }
    // 按关键词搜索
    if (filters.keyword) {
      tools = this.searchTools(filters.keyword);
    }
    // 按是否推荐筛选
    if (filters.featured !== undefined) {
      tools = tools.filter(tool => tool.featured === filters.featured);
    }
    return tools;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalTools: this.tools.length,
      totalCategories: this.categories.length,
      activeTools: this.tools.filter(tool => tool.status === 'active').length,
      featuredTools: this.tools.filter(tool => tool.featured).length,
      comingSoonTools: this.tools.filter(tool => tool.status === 'coming-soon').length
    };
  }

  /**
   * 获取固定工具列表（写死在代码中的工具）
   */
  getStaticTools() {
    return STATIC_TOOLS.map(tool => ({ ...tool }));
  }

  /**
   * 初始化数据
   */
  async initialize() {
    try {
      await Promise.all([this.getAllTools(), this.getAllCategories()]);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('工具服务初始化失败:', error);

      // 即使API失败，也要加载静态工具
      const staticTools = this.getStaticTools();
      this.tools = staticTools;

      // 确保分类至少有降级数据
      if (this.categories.length === 0) {
        try {
          await this.getAllCategories();
        } catch (categoryError) {
          // getAllCategories 内部已记录日志
        }
      }

      return false;
    }
  }
}

// 创建单例实例
const toolsService = new ToolsService();

export default toolsService;

