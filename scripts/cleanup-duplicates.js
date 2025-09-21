#!/usr/bin/env node

/**
 * 清理重复数据脚本
 * 用于清理开发环境中的重复分类和标签数据
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 清理重复的分类数据
async function cleanupCategories() {
  try {
    const Category = require('../backend/src/models/Category');
    
    // 查找所有分类
    const categories = await Category.find({});
    const slugMap = new Map();
    const duplicates = [];
    
    // 找出重复的 slug
    categories.forEach(category => {
      if (slugMap.has(category.slug)) {
        duplicates.push(category._id);
      } else {
        slugMap.set(category.slug, category._id);
      }
    });
    
    if (duplicates.length > 0) {
      // 删除重复的分类
      const result = await Category.deleteMany({ _id: { $in: duplicates } });
      console.log(`🗑️  清理了 ${result.deletedCount} 个重复的分类`);
    } else {
      console.log('✅ 没有发现重复的分类');
    }
  } catch (error) {
    console.error('❌ 清理分类失败:', error);
  }
}

// 清理重复的标签数据
async function cleanupTags() {
  try {
    const Tag = require('../backend/src/models/Tag');
    
    // 查找所有标签
    const tags = await Tag.find({});
    const slugMap = new Map();
    const duplicates = [];
    
    // 找出重复的 slug
    tags.forEach(tag => {
      if (slugMap.has(tag.slug)) {
        duplicates.push(tag._id);
      } else {
        slugMap.set(tag.slug, tag._id);
      }
    });
    
    if (duplicates.length > 0) {
      // 删除重复的标签
      const result = await Tag.deleteMany({ _id: { $in: duplicates } });
      console.log(`🗑️  清理了 ${result.deletedCount} 个重复的标签`);
    } else {
      console.log('✅ 没有发现重复的标签');
    }
  } catch (error) {
    console.error('❌ 清理标签失败:', error);
  }
}

// 主函数
async function main() {
  console.log('🧹 开始清理重复数据...');
  
  await connectDB();
  
  await cleanupCategories();
  await cleanupTags();
  
  console.log('✅ 重复数据清理完成');
  
  await mongoose.connection.close();
  process.exit(0);
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { cleanupCategories, cleanupTags };
