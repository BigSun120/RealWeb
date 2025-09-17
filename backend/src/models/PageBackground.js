const mongoose = require('mongoose');

const pageBackgroundSchema = new mongoose.Schema(
  {
    // 路径匹配配置
    pathConfig: {
      path: {
        type: String,
        required: [true, '路径规则不能为空'],
        index: true
      },
      matchType: {
        type: String,
        enum: ['exact', 'prefix', 'wildcard', 'regex'],
        default: 'exact'
      },
      priority: {
        type: Number,
        default: 100,
        min: 1,
        max: 1000
      },
      description: {
        type: String,
        maxlength: [200, '描述最多200个字符']
      }
    },

    // 首页特殊配置
    homePageConfig: {
      enableBackgroundSwitch: {
        type: Boolean,
        default: false
      },
      defaultMode: {
        type: String,
        enum: ['dynamic', 'static'],
        default: 'dynamic'
      },
      allowUserSwitch: {
        type: Boolean,
        default: true
      },
      dynamicOpacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8
      }
    },
    // 背景图片信息
    backgroundImage: {
      url: {
        type: String,
        required: [true, '背景图片URL不能为空']
      },
      filename: {
        type: String
      },
      size: {
        type: Number
      },
      dimensions: {
        width: Number,
        height: Number
      },
      format: {
        type: String,
        enum: ['jpg', 'jpeg', 'png', 'webp', 'gif']
      },
      // 响应式图片
      mobileUrl: {
        type: String
      },
      tabletUrl: {
        type: String
      }
    },
    // 显示设置
    displaySettings: {
      // 透明度
      opacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 1.0
      },
      // 模糊效果
      blur: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      },
      // 亮度调节
      brightness: {
        type: Number,
        min: 0.1,
        max: 2.0,
        default: 1.0
      },
      // 对比度调节
      contrast: {
        type: Number,
        min: 0.1,
        max: 2.0,
        default: 1.0
      },
      // 饱和度调节
      saturation: {
        type: Number,
        min: 0,
        max: 2.0,
        default: 1.0
      }
    },
    // 布局设置
    layoutSettings: {
      // 背景层级
      zIndex: {
        type: Number,
        default: -1
      },
      // 缩放设置
      backgroundSize: {
        type: String,
        enum: ['cover', 'contain', 'auto', '100% 100%'],
        default: 'cover'
      },
      // 位置设置
      backgroundPosition: {
        type: String,
        default: 'center center'
      },
      // 重复设置
      backgroundRepeat: {
        type: String,
        enum: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'],
        default: 'no-repeat'
      },
      // 固定设置
      backgroundAttachment: {
        type: String,
        enum: ['scroll', 'fixed', 'local'],
        default: 'scroll'
      }
    },

    // 响应式设置
    responsiveSettings: {
      enableOnMobile: {
        type: Boolean,
        default: true
      },
      enableOnTablet: {
        type: Boolean,
        default: true
      },
      enableOnDesktop: {
        type: Boolean,
        default: true
      },
      mobileBreakpoint: {
        type: Number,
        default: 768
      },
      tabletBreakpoint: {
        type: Number,
        default: 1024
      }
    },
    // 状态控制
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    // 上传信息
    uploadInfo: {
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      lastModified: {
        type: Date,
        default: Date.now
      }
    },
    // 备注信息
    notes: {
      type: String,
      maxlength: [500, '备注最多500个字符']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引
pageBackgroundSchema.index({ 'pathConfig.path': 1, isActive: 1 });
pageBackgroundSchema.index({ 'pathConfig.priority': -1, isActive: 1 });
pageBackgroundSchema.index({ 'uploadInfo.lastModified': -1 });
pageBackgroundSchema.index({ 'pathConfig.matchType': 1 });

// 虚拟字段
pageBackgroundSchema.virtual('isConfigured').get(function () {
  return this.backgroundImage?.url && this.isActive;
});

pageBackgroundSchema.virtual('displayName').get(function () {
  return this.pathConfig?.description || this.pathConfig?.path || '未命名配置';
});

pageBackgroundSchema.virtual('isHomePage').get(function () {
  return this.pathConfig?.path === '/' || this.pathConfig?.path === '/home';
});

// 静态方法
pageBackgroundSchema.statics.findMatchingConfig = function (path) {
  return this.find({ isActive: true })
    .sort({ 'pathConfig.priority': -1, createdAt: -1 })
    .then(configs => {
      // 路径匹配逻辑
      for (const config of configs) {
        if (this.isPathMatch(path, config.pathConfig)) {
          return config;
        }
      }
      return null;
    });
};

pageBackgroundSchema.statics.isPathMatch = function (currentPath, pathConfig) {
  const { path, matchType } = pathConfig;

  switch (matchType) {
    case 'exact':
      return currentPath === path;
    case 'prefix':
      return currentPath.startsWith(path);
    case 'wildcard':
      return this.wildcardMatch(currentPath, path);
    case 'regex':
      try {
        return new RegExp(path).test(currentPath);
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
};

pageBackgroundSchema.statics.wildcardMatch = function (str, pattern) {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\*/g, '.*')                 // * 转换为 .*
    .replace(/\?/g, '.');                 // ? 转换为 .

  return new RegExp(`^${regexPattern}$`).test(str);
};

pageBackgroundSchema.statics.getAllActiveConfigs = function () {
  return this.find({ isActive: true }).sort({ 'pathConfig.priority': -1, createdAt: -1 });
};

pageBackgroundSchema.statics.createBackgroundConfig = async function (configData) {
  // 验证路径唯一性（相同路径和匹配类型）
  const existing = await this.findOne({
    'pathConfig.path': configData.pathConfig.path,
    'pathConfig.matchType': configData.pathConfig.matchType
  });

  if (existing) {
    throw new Error('相同路径和匹配类型的配置已存在');
  }

  const config = new this(configData);
  return config.save();
};

pageBackgroundSchema.statics.updateBackgroundConfig = async function (id, updateData) {
  const config = await this.findById(id);
  if (!config) {
    throw new Error('配置不存在');
  }

  // 如果更新路径配置，检查唯一性
  if (updateData.pathConfig) {
    const existing = await this.findOne({
      _id: { $ne: id },
      'pathConfig.path': updateData.pathConfig.path,
      'pathConfig.matchType': updateData.pathConfig.matchType
    });

    if (existing) {
      throw new Error('相同路径和匹配类型的配置已存在');
    }
  }

  Object.assign(config, updateData);
  config.uploadInfo.lastModified = new Date();

  return config.save();
};

pageBackgroundSchema.statics.testPathMatch = function (testPath, configs = null) {
  if (configs) {
    // 测试指定配置
    return configs.map(config => ({
      id: config._id,
      path: config.pathConfig.path,
      matchType: config.pathConfig.matchType,
      matched: this.isPathMatch(testPath, config.pathConfig)
    }));
  } else {
    // 测试所有激活配置
    return this.find({ isActive: true })
      .then(allConfigs =>
        allConfigs.map(config => ({
          id: config._id,
          path: config.pathConfig.path,
          matchType: config.pathConfig.matchType,
          matched: this.isPathMatch(testPath, config.pathConfig)
        }))
      );
  }
};

// 实例方法
pageBackgroundSchema.methods.updateSettings = function (settings) {
  if (settings.displaySettings) {
    this.displaySettings = { ...this.displaySettings, ...settings.displaySettings };
  }
  if (settings.layoutSettings) {
    this.layoutSettings = { ...this.layoutSettings, ...settings.layoutSettings };
  }
  if (settings.responsiveSettings) {
    this.responsiveSettings = { ...this.responsiveSettings, ...settings.responsiveSettings };
  }
  if (settings.homePageConfig) {
    this.homePageConfig = { ...this.homePageConfig, ...settings.homePageConfig };
  }
  if (settings.notes !== undefined) {
    this.notes = settings.notes;
  }
  this.uploadInfo.lastModified = new Date();
  return this.save();
};

pageBackgroundSchema.methods.activate = function () {
  this.isActive = true;
  this.uploadInfo.lastModified = new Date();
  return this.save();
};

pageBackgroundSchema.methods.deactivate = function () {
  this.isActive = false;
  this.uploadInfo.lastModified = new Date();
  return this.save();
};

pageBackgroundSchema.methods.updateImage = function (imageData) {
  this.backgroundImage = { ...this.backgroundImage, ...imageData };
  this.uploadInfo.lastModified = new Date();
  return this.save();
};

// 中间件
pageBackgroundSchema.pre('save', function (next) {
  // 更新最后修改时间
  if (this.isModified() && !this.isModified('uploadInfo.lastModified')) {
    this.uploadInfo.lastModified = new Date();
  }
  next();
});

pageBackgroundSchema.pre('validate', function (next) {
  // 验证路径配置
  if (this.pathConfig) {
    const { path, matchType } = this.pathConfig;

    // 验证路径格式
    if (!path || path.trim() === '') {
      return next(new Error('路径不能为空'));
    }

    // 验证正则表达式
    if (matchType === 'regex') {
      try {
        new RegExp(path);
      } catch (e) {
        return next(new Error('无效的正则表达式'));
      }
    }
  }

  // 验证显示设置
  if (this.displaySettings) {
    const ds = this.displaySettings;

    if (ds.opacity !== undefined && (ds.opacity < 0 || ds.opacity > 1)) {
      return next(new Error('透明度必须在0-1之间'));
    }

    if (ds.blur !== undefined && (ds.blur < 0 || ds.blur > 20)) {
      return next(new Error('模糊值必须在0-20之间'));
    }
  }

  next();
});

module.exports = mongoose.model('PageBackground', pageBackgroundSchema);
