const mongoose = require('mongoose');

/**
 * 短剧项目模型
 */
const dramaProjectSchema = new mongoose.Schema(
  {
    // 用户ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // 项目名称
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    // 剧本类型
    type: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
      index: true
    },
    // 计划集数
    episodeCount: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 60
    },
    // 项目描述
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // 项目状态
    status: {
      type: String,
      enum: ['设定中', '大纲中', '剧本中', '已完成'],
      default: '设定中',
      index: true
    },
    // 完成进度 (0-100)
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // 世界观设定
    worldview: {
      background: { type: String, trim: true },
      setting: { type: String, trim: true },
      theme: { type: String, trim: true },
      conflict: { type: String, trim: true },
      tone: { type: String, trim: true }
    },
    // 角色列表
    characters: [
      {
        id: { type: String }, // 前端临时ID（可选）
        name: { type: String, required: true, trim: true },
        role: { type: String, trim: true }, // 主角、配角、反派等
        description: { type: String, trim: true },
        age: { type: Number }, // 年龄
        gender: { type: String, trim: true }, // 性别
        personality: { type: String, trim: true }, // 性格特点
        background: { type: String, trim: true }, // 角色背景
        motivation: { type: String, trim: true }, // 行为动机
        relationships: { type: String, trim: true }, // 人际关系
        tags: [{ type: String, trim: true }] // 标签
      }
    ],
    // 角色关系图谱
    relationshipGraph: [
      {
        from: { type: String, required: true, trim: true }, // 起始角色
        to: { type: String, required: true, trim: true }, // 目标角色
        type: { type: String, required: true, trim: true }, // 关系类型
        description: { type: String, trim: true } // 关系描述
      }
    ],
    // 剧情大纲
    outline: {
      structure: { type: String, default: 'three-act' }, // 结构类型
      acts: [
        {
          actNumber: { type: Number },
          title: { type: String },
          description: { type: String },
          plotPoints: [
            {
              id: { type: String },
              name: { type: String },
              description: { type: String },
              characters: [{ type: String }], // 涉及角色名字
              emotion: [{ type: String }], // 情感变化（支持多个）
              episodeRange: { type: String } // 预估集数范围
            }
          ]
        }
      ]
    },
    // 提示词模板设置
    promptTemplate: {
      useCustom: { type: Boolean, default: false }, // 是否使用自定义模板
      customTemplate: { type: String, trim: true }, // 自定义模板内容
      lastModified: { type: Date } // 最后修改时间
    },
    // AI诊断结果（剧本医生）
    aiDiagnosis: {
      preparation: { // 前期检查
        issues: [{
          severity: { type: String }, // critical | medium | low
          title: { type: String },
          description: { type: String },
          location: {
            module: { type: String },
            field: { type: String },
            characterId: { type: String }
          },
          status: { type: String, default: 'pending' }, // pending | solution_ready | solved | ignored
          generating: { type: Boolean, default: false },
          solution: { // AI生成的解决方案
            suggestedContent: { type: String },
            explanation: { type: String },
            generatedAt: { type: Date }
          }
        }],
        lastUpdated: { type: Date }
      },
      episodes: { // 分集检查
        issues: [{
          severity: { type: String },
          title: { type: String },
          description: { type: String },
          location: {
            module: { type: String },
            field: { type: String },
            characterId: { type: String }
          },
          status: { type: String, default: 'pending' },
          generating: { type: Boolean, default: false },
          solution: { // AI生成的解决方案
            suggestedContent: { type: String },
            explanation: { type: String },
            generatedAt: { type: Date }
          }
        }],
        lastUpdated: { type: Date }
      },
      overall: { // 整体检查
        issues: [{
          severity: { type: String },
          title: { type: String },
          description: { type: String },
          dimension: { type: String }, // 诊断维度：主线一致性、角色弧光完整性等
          location: {
            module: { type: String },
            field: { type: String },
            characterId: { type: String }
          },
          status: { type: String, default: 'pending' },
          generating: { type: Boolean, default: false },
          solution: { // AI生成的解决方案
            suggestedContent: { type: String }, // 旧格式：纯文本方案
            explanation: { type: String },
            suggestedEpisodes: { type: Array }, // 新格式：结构化剧集数据
            generatedAt: { type: Date }
          }
        }],
        lastUpdated: { type: Date }
      }
    },
    // 分集剧本元数据
    episodes: [
      {
        id: { type: String }, // 前端生成的唯一ID
        number: { type: Number, required: true },
        title: { type: String },
        status: { 
          type: String, 
          enum: ['draft', 'in-progress', 'completed', 'reviewed'], 
          default: 'draft' 
        },
        content: {
          summary: { type: String }, // 简介
          script: { type: String }, // 剧本正文
          scenes: [ // 场景列表（结构化）
            {
              number: { type: Number },
              location: { type: String },
              time: { type: String },
              atmosphere: { type: String },
              content: { type: String }
            }
          ],
          keyDialogues: [{ type: String }], // 关键对白
          cliffhanger: { type: String }, // 结尾悬念
          notes: { type: String } // 备注
        },
        wordCount: { type: Number, default: 0 }, // 字数统计
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    // 标签
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    // 是否收藏
    isFavorite: {
      type: Boolean,
      default: false,
      index: true
    },
    // 最后编辑时间（自动更新）
    lastEditedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 索引优化
dramaProjectSchema.index({ userId: 1, updatedAt: -1 });
dramaProjectSchema.index({ userId: 1, status: 1 });
dramaProjectSchema.index({ userId: 1, type: 1 });
dramaProjectSchema.index({ userId: 1, isFavorite: 1 });
// 文本检索索引（用于关键词搜索加速）
dramaProjectSchema.index({ name: 'text', description: 'text', tags: 'text', type: 'text' });

// 更新 lastEditedAt
dramaProjectSchema.pre('save', function (next) {
  this.lastEditedAt = new Date();
  next();
});

// 虚拟字段：完成的分集数
dramaProjectSchema.virtual('completedEpisodes').get(function () {
  return this.episodes ? this.episodes.filter(e => e.status === 'completed' || e.status === 'reviewed').length : 0;
});

// 静态方法：构建查询过滤器
dramaProjectSchema.statics.buildFilters = function (userId, filters = {}) {
  const query = { userId };

  if (filters.keyword) {
    const keyword = String(filters.keyword).trim();
    if (keyword.length >= 2) {
      // 优先使用全文检索（需要 text 索引）
      query.$text = { $search: keyword };
    } else {
      // 过短关键字回退到正则匹配，避免 $text 行为不稳定
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { type: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ];
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.isFavorite === true) {
    query.isFavorite = true;
  }

  if (filters.isFavorite === false) {
    query.isFavorite = false;
  }

  return query;
};

// 实例方法：更新进度
dramaProjectSchema.methods.updateProgress = function () {
  if (this.episodeCount > 0 && this.episodes && this.episodes.length > 0) {
    const completed = this.episodes.filter(e => e.status === 'completed' || e.status === 'reviewed').length;
    this.progress = Math.round((completed / this.episodeCount) * 100);
  } else {
    this.progress = 0;
  }
  return this;
};

// 实例方法：添加角色
dramaProjectSchema.methods.addCharacter = function (character) {
  if (!this.characters) {
    this.characters = [];
  }
  this.characters.push(character);
  return this;
};

// 实例方法：添加分集（与schema保持一致）
dramaProjectSchema.methods.addEpisode = function (episodeData = {}) {
  if (!this.episodes) {
    this.episodes = [];
  }

  const number = this.episodes.length + 1;
  const now = new Date();
  const episode = {
    id: episodeData.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    number,
    title: episodeData.title || `第${number}集`,
    status: 'draft',
    content: {
      summary: episodeData.content?.summary || '',
      script: episodeData.content?.script || '',
      scenes: Array.isArray(episodeData.content?.scenes) ? episodeData.content.scenes : [],
      keyDialogues: Array.isArray(episodeData.content?.keyDialogues) ? episodeData.content.keyDialogues : [],
      cliffhanger: episodeData.content?.cliffhanger || '',
      notes: episodeData.content?.notes || ''
    },
    wordCount: typeof episodeData.wordCount === 'number' ? episodeData.wordCount : 0,
    createdAt: now,
    updatedAt: now
  };

  this.episodes.push(episode);
  // 自动更新进度（可选）
  this.updateProgress();
  return this;
};

module.exports = mongoose.model('DramaProject', dramaProjectSchema);
