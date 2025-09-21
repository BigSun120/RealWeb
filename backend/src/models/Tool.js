const mongoose = require('mongoose');

/**
 * 工具数据模型
 */
const toolSchema = new mongoose.Schema({
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
    default: '🔧'
  },
  
  // 分类和标签
  category: {
    type: String,
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // 路由和访问
  route: {
    type: String,
    required: true
  },
  component: {
    type: String, // Vue组件路径
    required: true
  },
  
  // 状态和配置
  status: {
    type: String,
    enum: ['active', 'inactive', 'coming-soon', 'maintenance'],
    default: 'coming-soon',
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  estimatedTime: {
    type: String,
    default: '1分钟'
  },
  
  // 权限控制
  requiresAuth: {
    type: Boolean,
    default: false
  },
  requiresAdmin: {
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
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastUsedAt: {
    type: Date
  },
  
  // 版本信息
  version: {
    type: String,
    default: '1.0.0'
  },
  changelog: [{
    version: String,
    changes: [String],
    date: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 元数据
  metadata: {
    author: String,
    license: String,
    repository: String,
    documentation: String,
    keywords: [String]
  },
  
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0,
    index: true
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

// 虚拟字段：分类信息
toolSchema.virtual('categoryInfo', {
  ref: 'ToolCategory',
  localField: 'category',
  foreignField: 'id',
  justOne: true
});

// 虚拟字段：使用统计
toolSchema.virtual('usageStats', {
  ref: 'ToolUsage',
  localField: '_id',
  foreignField: 'toolId'
});

// 索引
toolSchema.index({ category: 1, status: 1 });
toolSchema.index({ featured: 1, sortOrder: 1 });
toolSchema.index({ tags: 1 });
toolSchema.index({ usageCount: -1 });
toolSchema.index({ createdAt: -1 });

// 中间件：更新时间戳
toolSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：获取活跃工具
toolSchema.statics.getActiveTools = function() {
  return this.find({ status: 'active' }).sort({ sortOrder: 1, usageCount: -1 });
};

// 静态方法：获取推荐工具
toolSchema.statics.getFeaturedTools = function() {
  return this.find({ featured: true, status: 'active' }).sort({ sortOrder: 1 });
};

// 静态方法：按分类获取工具
toolSchema.statics.getToolsByCategory = function(category) {
  return this.find({ category, status: 'active' }).sort({ sortOrder: 1 });
};

// 实例方法：增加使用次数
toolSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// 实例方法：检查用户权限
toolSchema.methods.checkPermission = function(user) {
  // 如果不需要认证，直接允许
  if (!this.requiresAuth) {
    return true;
  }
  
  // 需要认证但用户未登录
  if (!user) {
    return false;
  }
  
  // 需要管理员权限
  if (this.requiresAdmin && !user.isAdmin) {
    return false;
  }
  
  // 检查角色权限
  if (this.allowedRoles.length > 0) {
    return this.allowedRoles.includes(user.role);
  }
  
  return true;
};

module.exports = mongoose.model('Tool', toolSchema);
