const Tool = require('../models/Tool');
const ToolCategory = require('../models/ToolCategory');
const ToolConfig = require('../models/ToolConfig');
const logger = require('./logger');

/**
 * 初始化工具箱数据
 */
const initToolsData = async () => {
  try {
    logger.info('开始初始化工具箱数据...');

    // 初始化工具分类
    await initToolCategories();

    // 初始化工具数据
    await initTools();

    // 初始化工具配置
    await ToolConfig.initializeDefaults();

    logger.info('工具箱数据初始化完成');
  } catch (error) {
    logger.error('工具箱数据初始化失败:', error);
    throw error;
  }
};

/**
 * 初始化工具分类
 */
const initToolCategories = async () => {
  const categories = [
    {
      id: 'web',
      name: '网页工具',
      description: '网页相关的实用工具',
      icon: '🌐',
      color: '#409EFF',
      sortOrder: 1,
      status: 'active',
      showInMenu: true
    },
    {
      id: 'text',
      name: '文本工具',
      description: '文本处理和编辑工具',
      icon: '✏️',
      color: '#67C23A',
      sortOrder: 2,
      status: 'active',
      showInMenu: true
    },
    {
      id: 'image',
      name: '图片工具',
      description: '图片处理和编辑工具',
      icon: '🖼️',
      color: '#E6A23C',
      sortOrder: 3,
      status: 'active',
      showInMenu: true
    },
    {
      id: 'dev',
      name: '开发工具',
      description: '开发者常用工具',
      icon: '⚙️',
      color: '#909399',
      sortOrder: 4,
      status: 'active',
      showInMenu: true
    },
    {
      id: 'utility',
      name: '实用工具',
      description: '日常实用小工具',
      icon: '🔧',
      color: '#F56C6C',
      sortOrder: 5,
      status: 'active',
      showInMenu: true
    },
    {
      id: 'media',
      name: '媒体工具',
      description: '音视频处理和下载工具',
      icon: '🎬',
      color: '#9C27B0',
      sortOrder: 6,
      status: 'active',
      showInMenu: true
    }
  ];

  for (const categoryData of categories) {
    const existing = await ToolCategory.findOne({ id: categoryData.id });
    if (!existing) {
      categoryData.path = categoryData.id;
      categoryData.level = 0;
      await ToolCategory.create(categoryData);
      logger.info(`创建工具分类: ${categoryData.name}`);
    }
  }
};

/**
 * 初始化工具数据
 */
const initTools = async () => {
  const tools = [
    // 网页工具
    {
      id: 'seo-analyzer',
      name: 'SEO分析工具',
      description: '分析网站SEO优化情况',
      icon: '📊',
      category: 'web',
      route: '/tools/web/seo-analyzer',
      component: '@/views/tools/web/SeoAnalyzer.vue',
      tags: ['SEO', '网站', '分析', '优化'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'medium',
      estimatedTime: '2-3分钟',
      sortOrder: 2
    },

    // 文本工具
    {
      id: 'text-counter',
      name: '文本计数器',
      description: '统计文本的字符数、单词数、行数等信息',
      icon: '📊',
      category: 'text',
      route: '/tools/text/text-counter',
      component: '@/views/tools/text/TextCounter.vue',
      tags: ['文本', '计数', '统计', '分析'],
      featured: true,
      status: 'active',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 1
    },
    {
      id: 'json-formatter',
      name: 'JSON格式化',
      description: 'JSON数据格式化和验证',
      icon: '📝',
      category: 'text',
      route: '/tools/text/json-formatter',
      component: '@/views/tools/text/JsonFormatter.vue',
      tags: ['JSON', '格式化', '验证', '美化'],
      featured: true,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 1
    },
    {
      id: 'markdown-editor',
      name: 'Markdown编辑器',
      description: '在线Markdown编辑和预览',
      icon: '📄',
      category: 'text',
      route: '/tools/text/markdown-editor',
      component: '@/views/tools/text/MarkdownEditor.vue',
      tags: ['Markdown', '编辑器', '预览', '文档'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '持续使用',
      sortOrder: 2
    },

    // 图片工具
    {
      id: 'image-compressor',
      name: '图片压缩',
      description: '在线图片压缩优化',
      icon: '🗜️',
      category: 'image',
      route: '/tools/image/compressor',
      component: '@/views/tools/image/ImageCompressor.vue',
      tags: ['图片', '压缩', '优化', '减小'],
      featured: true,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '1分钟',
      sortOrder: 1
    },
    {
      id: 'image-converter',
      name: '图片格式转换',
      description: '支持多种图片格式转换',
      icon: '🔄',
      category: 'image',
      route: '/tools/image/converter',
      component: '@/views/tools/image/ImageConverter.vue',
      tags: ['图片', '转换', '格式', 'JPG', 'PNG'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 2
    },

    // 开发工具
    {
      id: 'color-picker',
      name: '颜色选择器',
      description: '在线颜色选择和调色板',
      icon: '🎨',
      category: 'dev',
      route: '/tools/dev/color-picker',
      component: '@/views/tools/dev/ColorPicker.vue',
      tags: ['颜色', '调色板', '设计', 'CSS'],
      featured: true,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '持续使用',
      sortOrder: 1
    },
    {
      id: 'qr-generator',
      name: '二维码生成器',
      description: '生成各种类型的二维码',
      icon: '📱',
      category: 'dev',
      route: '/tools/dev/qr-generator',
      component: '@/views/tools/dev/QrGenerator.vue',
      tags: ['二维码', '生成', '扫码', '链接'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 2
    },

    // 实用工具
    {
      id: 'timestamp-converter',
      name: '时间戳转换',
      description: '时间戳与日期格式转换',
      icon: '⏰',
      category: 'utility',
      route: '/tools/utility/timestamp-converter',
      component: '@/views/tools/utility/TimestampConverter.vue',
      tags: ['时间戳', '日期', '转换', '格式'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 1
    },
    {
      id: 'unit-converter',
      name: '单位换算器',
      description: '各种单位之间的换算',
      icon: '🧮',
      category: 'utility',
      route: '/tools/utility/unit-converter',
      component: '@/views/tools/utility/UnitConverter.vue',
      tags: ['单位', '换算', '计算', '转换'],
      featured: false,
      status: 'coming-soon',
      difficulty: 'easy',
      estimatedTime: '30秒',
      sortOrder: 2
    },

    // 媒体工具
    {
      id: 'video-downloader',
      name: '视频下载器',
      description: '支持多平台视频下载',
      icon: '📹',
      category: 'media',
      route: '/tools/media/video-downloader',
      component: '@/views/tools/media/VideoDownloader.vue',
      tags: ['视频', '下载', 'YouTube', 'B站'],
      featured: true,
      status: 'active',
      difficulty: 'easy',
      estimatedTime: '1-2分钟',
      sortOrder: 1
    }
  ];

  for (const toolData of tools) {
    const existing = await Tool.findOne({ id: toolData.id });
    if (!existing) {
      await Tool.create(toolData);
      logger.info(`创建工具: ${toolData.name}`);
    }
  }
};

/**
 * 清理工具箱测试数据
 */
const clearToolsData = async () => {
  try {
    logger.info('开始清理工具箱数据...');

    await Tool.deleteMany({});
    await ToolCategory.deleteMany({});
    await ToolConfig.deleteMany({ isSystem: { $ne: true } });

    logger.info('工具箱数据清理完成');
  } catch (error) {
    logger.error('工具箱数据清理失败:', error);
    throw error;
  }
};

module.exports = {
  initToolsData,
  initToolCategories,
  initTools,
  clearToolsData
};
