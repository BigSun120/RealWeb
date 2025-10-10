const mongoose = require('mongoose');

/**
 * 提示词文件夹数据模型
 */
const promptFolderSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: [true, '文件夹名称不能为空'],
    trim: true,
    maxlength: [50, '文件夹名称最多50个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, '描述最多200个字符']
  },
  icon: {
    type: String,
    default: '📁'
  },
  color: {
    type: String,
    default: '#409EFF'
  },

  // 层级关系
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
    type: String,
    default: '',
    index: true
  },

  // 统计
  promptCount: {
    type: Number,
    default: 0
  },

  // 权限
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 排序与显示
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  isExpanded: {
    type: Boolean,
    default: false
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
promptFolderSchema.index({ userId: 1, parentId: 1, sortOrder: 1 });
promptFolderSchema.index({ userId: 1, level: 1 });

// 虚拟字段：父文件夹
promptFolderSchema.virtual('parent', {
  ref: 'PromptFolder',
  localField: 'parentId',
  foreignField: 'id',
  justOne: true
});

// 虚拟字段：子文件夹
promptFolderSchema.virtual('children', {
  ref: 'PromptFolder',
  localField: 'id',
  foreignField: 'parentId'
});

// 虚拟字段：文件夹下的提示词
promptFolderSchema.virtual('prompts', {
  ref: 'PromptTemplate',
  localField: '_id',
  foreignField: 'folderId'
});

// 中间件：更新时间戳和路径
promptFolderSchema.pre('save', async function(next) {
  this.updatedAt = new Date();

  // 自动生成ID
  if (!this.id) {
    this.id = this._id.toString();
  }

  // 设置路径和层级
  if (this.parentId && this.isModified('parentId')) {
    const parent = await this.constructor.findOne({ id: this.parentId });
    if (parent) {
      this.level = parent.level + 1;
      this.path = parent.path ? `${parent.path}/${this.id}` : this.id;
    }
  } else if (!this.parentId) {
    this.level = 0;
    this.path = this.id;
  }

  next();
});

// 静态方法：获取用户根文件夹
promptFolderSchema.statics.getRootFolders = function(userId) {
  return this.find({
    userId,
    parentId: null
  }).sort({ sortOrder: 1, createdAt: 1 });
};

// 静态方法：获取用户文件夹树
promptFolderSchema.statics.getFolderTree = async function(userId) {
  const folders = await this.find({ userId })
    .sort({ level: 1, sortOrder: 1 })
    .lean();

  // 构建树形结构
  const folderMap = {};
  const tree = [];

  // 第一遍：建立映射
  folders.forEach(folder => {
    folder.children = [];
    folderMap[folder.id] = folder;
  });

  // 第二遍：构建树并生成 pathName
  folders.forEach(folder => {
    // 递归生成层级路径名称
    const buildPathName = (f) => {
      if (!f.parentId || !folderMap[f.parentId]) {
        return f.name;
      }
      const parent = folderMap[f.parentId];
      if (!parent.pathName) {
        parent.pathName = buildPathName(parent);
      }
      return `${parent.pathName} / ${f.name}`;
    };

    folder.pathName = buildPathName(folder);

    if (!folder.parentId) {
      tree.push(folder);
    } else if (folderMap[folder.parentId]) {
      folderMap[folder.parentId].children.push(folder);
    }
  });

  return tree;
};

// 静态方法：获取文件夹及其所有子文件夹ID
promptFolderSchema.statics.getFolderAndDescendants = async function(folderId) {
  const folder = await this.findOne({ id: folderId });
  if (!folder) return [];

  const descendants = await this.find({
    path: new RegExp(`^${folder.path}`)
  }).select('_id');

  return [folder._id, ...descendants.map(f => f._id)];
};

// 实例方法：更新提示词数量
promptFolderSchema.methods.updatePromptCount = async function() {
  const PromptTemplate = require('./PromptTemplate');
  const count = await PromptTemplate.countDocuments({
    folderId: this._id,
    isDeleted: false
  });
  this.promptCount = count;
  return this.save();
};

// 实例方法：获取完整路径名称
promptFolderSchema.methods.getFullPathName = async function() {
  if (!this.parentId) {
    return this.name;
  }

  const parent = await this.constructor.findOne({ id: this.parentId });
  if (parent) {
    const parentPath = await parent.getFullPathName();
    return `${parentPath}/${this.name}`;
  }

  return this.name;
};

// 实例方法：检查是否为子孙文件夹
promptFolderSchema.methods.isDescendantOf = function(ancestorId) {
  if (!this.path) return false;
  return this.path.includes(ancestorId);
};

module.exports = mongoose.model('PromptFolder', promptFolderSchema);
