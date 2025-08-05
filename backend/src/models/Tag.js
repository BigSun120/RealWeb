const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '标签名称不能为空'],
    unique: true,
    trim: true,
    maxlength: [30, '标签名称最多30个字符']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [200, '标签描述最多200个字符']
  },
  color: {
    type: String,
    default: '#6B7280' // 默认灰色
  },
  sort: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  articleCount: {
    type: Number,
    default: 0
  },
  isHot: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 索引
tagSchema.index({ name: 1 });
tagSchema.index({ slug: 1 });
tagSchema.index({ sort: 1, name: 1 });
tagSchema.index({ isHot: -1, articleCount: -1 });

// 生成slug
tagSchema.pre('validate', function(next) {
  if (!this.slug || this.isModified('name')) {
    // 生成slug：移除特殊字符，转换为小写，用连字符替换空格
    let slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[\s\u4e00-\u9fff]+/g, '-') // 处理中文和空格
      .replace(/[^\w\-]/g, '') // 移除非字母数字和连字符的字符
      .replace(/\-+/g, '-') // 合并多个连字符
      .replace(/^\-|\-$/g, ''); // 移除开头和结尾的连字符

    // 如果slug为空，使用时间戳
    if (!slug) {
      slug = 'tag-' + Date.now();
    }

    this.slug = slug;
  }
  next();
});

// 更新文章数量
tagSchema.methods.updateArticleCount = async function() {
  const Article = mongoose.model('Article');
  this.articleCount = await Article.countDocuments({
    tags: this.name,
    status: 'published',
    isDeleted: false
  });
  await this.save();
};

module.exports = mongoose.model('Tag', tagSchema);
