const Category = require('../models/Category');
const Tag = require('../models/Tag');
const logger = require('./logger');

// 初始化分类数据
const initCategories = async () => {
  try {
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      logger.info('分类数据已存在，跳过初始化');
      return;
    }

    const defaultCategories = [
      {
        name: '技术分享',
        description: '技术相关的文章和教程',
        color: '#3B82F6',
        icon: '💻',
        sort: 1
      },
      {
        name: '生活随笔',
        description: '日常生活的感悟和记录',
        color: '#10B981',
        icon: '📝',
        sort: 2
      },
      {
        name: '学习笔记',
        description: '学习过程中的笔记和总结',
        color: '#F59E0B',
        icon: '📚',
        sort: 3
      },
      {
        name: '项目展示',
        description: '个人项目的介绍和展示',
        color: '#8B5CF6',
        icon: '🚀',
        sort: 4
      },
      {
        name: '其他',
        description: '其他类型的文章',
        color: '#6B7280',
        icon: '📁',
        sort: 5
      }
    ];

    await Category.insertMany(defaultCategories);
    logger.info('默认分类数据初始化完成');
  } catch (error) {
    logger.error('初始化分类数据失败:', error);
  }
};

// 初始化标签数据
const initTags = async () => {
  try {
    const existingCount = await Tag.countDocuments();
    if (existingCount > 0) {
      logger.info('标签数据已存在，跳过初始化');
      return;
    }

    const defaultTags = [
      // 技术标签
      { name: 'JavaScript', color: '#F7DF1E', isHot: true, sort: 1 },
      { name: 'Vue.js', color: '#4FC08D', isHot: true, sort: 2 },
      { name: 'React', color: '#61DAFB', isHot: true, sort: 3 },
      { name: 'Node.js', color: '#339933', isHot: true, sort: 4 },
      { name: 'CSS', color: '#1572B6', isHot: true, sort: 5 },
      { name: 'HTML', color: '#E34F26', isHot: true, sort: 6 },
      { name: 'TypeScript', color: '#3178C6', isHot: false, sort: 7 },
      { name: 'Python', color: '#3776AB', isHot: false, sort: 8 },
      { name: 'Java', color: '#ED8B00', isHot: false, sort: 9 },
      { name: 'MongoDB', color: '#47A248', isHot: false, sort: 10 },
      { name: 'MySQL', color: '#4479A1', isHot: false, sort: 11 },
      { name: 'Git', color: '#F05032', isHot: false, sort: 12 },
      
      // 框架和工具
      { name: 'Express', color: '#000000', isHot: false, sort: 13 },
      { name: 'Webpack', color: '#8DD6F9', isHot: false, sort: 14 },
      { name: 'Vite', color: '#646CFF', isHot: false, sort: 15 },
      { name: 'Docker', color: '#2496ED', isHot: false, sort: 16 },
      
      // 其他
      { name: '前端开发', color: '#FF6B6B', isHot: true, sort: 17 },
      { name: '后端开发', color: '#4ECDC4', isHot: true, sort: 18 },
      { name: '全栈开发', color: '#45B7D1', isHot: false, sort: 19 },
      { name: '算法', color: '#96CEB4', isHot: false, sort: 20 },
      { name: '数据结构', color: '#FFEAA7', isHot: false, sort: 21 },
      { name: '设计模式', color: '#DDA0DD', isHot: false, sort: 22 },
      { name: '性能优化', color: '#98D8C8', isHot: false, sort: 23 },
      { name: '代码规范', color: '#F7DC6F', isHot: false, sort: 24 },
      { name: '开发工具', color: '#BB8FCE', isHot: false, sort: 25 },
      { name: '学习心得', color: '#85C1E9', isHot: false, sort: 26 },
      { name: '技术分享', color: '#F8C471', isHot: false, sort: 27 },
      { name: '项目总结', color: '#82E0AA', isHot: false, sort: 28 }
    ];

    await Tag.insertMany(defaultTags);
    logger.info('默认标签数据初始化完成');
  } catch (error) {
    logger.error('初始化标签数据失败:', error);
  }
};

// 初始化所有数据
const initAllData = async () => {
  await initCategories();
  await initTags();
};

module.exports = {
  initCategories,
  initTags,
  initAllData
};
