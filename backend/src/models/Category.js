const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '分类名称不能为空'],
    unique: true,
    trim: true,
    maxlength: [50, '分类名称最多50个字符']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [200, '分类描述最多200个字符']
  },
  color: {
    type: String,
    default: '#3B82F6' // 默认蓝色
  },
  icon: {
    type: String,
    default: '📁'
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
  }
}, {
  timestamps: true
});

// 索引
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ sort: 1, name: 1 });

// 生成slug
categorySchema.pre('validate', function(next) {
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
      slug = 'category-' + Date.now();
    }

    this.slug = slug;
  }
  next();
});

// 更新文章数量
categorySchema.methods.updateArticleCount = async function() {
  const Article = mongoose.model('Article');
  this.articleCount = await Article.countDocuments({
    category: this.name,
    status: 'published',
    isDeleted: false
  });
  await this.save();
};

module.exports = mongoose.model('Category', categorySchema);
