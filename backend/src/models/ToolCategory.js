const mongoose = require('mongoose');

/**
 * 工具分类数据模型
 */
const toolCategorySchema = new mongoose.Schema({
  // 基本信息
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '📁'
  },
  color: {
    type: String,
    default: '#409EFF'
  },
  
  // 层级结构
  parentId: {
    type: String,
    default: null,
    index: true
  },
  level: {
    type: Number,
    default: 0,
    index: true
  },
  path: {
    type: String, // 如: "web/frontend/vue"
    index: true
  },
  
  // 状态和配置
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // 排序和显示
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  
  // 权限控制
  requiresAuth: {
    type: Boolean,
    default: false
  },
  allowedRoles: [{
    type: String
  }],
  
  // 配置选项
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 统计信息
  toolCount: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：父分类
toolCategorySchema.virtual('parent', {
  ref: 'ToolCategory',
  localField: 'parentId',
  foreignField: 'id',
  justOne: true
});

// 虚拟字段：子分类
toolCategorySchema.virtual('children', {
  ref: 'ToolCategory',
  localField: 'id',
  foreignField: 'parentId'
});

// 虚拟字段：分类下的工具
toolCategorySchema.virtual('tools', {
  ref: 'Tool',
  localField: 'id',
  foreignField: 'category'
});

// 索引
toolCategorySchema.index({ parentId: 1, sortOrder: 1 });
toolCategorySchema.index({ status: 1, showInMenu: 1 });
toolCategorySchema.index({ level: 1, sortOrder: 1 });

// 中间件：更新时间戳
toolCategorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // 自动设置路径
  if (this.parentId) {
    // 这里需要查询父分类来构建完整路径
    // 在实际使用时需要在控制器中处理
  } else {
    this.path = this.id;
    this.level = 0;
  }
  
  next();
});

// 静态方法：获取根分类
toolCategorySchema.statics.getRootCategories = function() {
  return this.find({ 
    parentId: null, 
    status: 'active',
    showInMenu: true 
  }).sort({ sortOrder: 1 });
};

// 静态方法：获取分类树
toolCategorySchema.statics.getCategoryTree = function() {
  return this.find({ status: 'active' })
    .populate('children')
    .sort({ level: 1, sortOrder: 1 });
};

// 静态方法：获取分类及其子分类
toolCategorySchema.statics.getCategoryWithChildren = function(categoryId) {
  return this.findOne({ id: categoryId })
    .populate({
      path: 'children',
      match: { status: 'active' },
      options: { sort: { sortOrder: 1 } }
    });
};

// 实例方法：获取完整路径
toolCategorySchema.methods.getFullPath = async function() {
  if (!this.parentId) {
    return this.id;
  }
  
  const parent = await this.constructor.findOne({ id: this.parentId });
  if (parent) {
    const parentPath = await parent.getFullPath();
    return `${parentPath}/${this.id}`;
  }
  
  return this.id;
};

// 实例方法：更新工具数量
toolCategorySchema.methods.updateToolCount = async function() {
  const Tool = require('./Tool');
  const count = await Tool.countDocuments({ category: this.id });
  this.toolCount = count;
  return this.save();
};

// 实例方法：检查用户权限
toolCategorySchema.methods.checkPermission = function(user) {
  // 如果不需要认证，直接允许
  if (!this.requiresAuth) {
    return true;
  }
  
  // 需要认证但用户未登录
  if (!user) {
    return false;
  }
  
  // 检查角色权限
  if (this.allowedRoles.length > 0) {
    return this.allowedRoles.includes(user.role);
  }
  
  return true;
};

module.exports = mongoose.model('ToolCategory', toolCategorySchema);
