const mongoose = require('mongoose');

/**
 * 邮箱备忘录条目模型
 */
const mailMemoEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    alias: {
      type: String,
      trim: true
    },
    usage: {
      type: String,
      trim: true
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    notes: {
      type: String,
      trim: true
    },
    priority: {
      type: Number,
      default: 0,
      min: -10,
      max: 10
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true
    },
    lastUsedAt: {
      type: Date
    },
    importBatchId: {
      type: String,
      index: true
    },
    createdByImport: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

mailMemoEntrySchema.index({ userId: 1, email: 1 }, { unique: true });
mailMemoEntrySchema.index({ userId: 1, priority: -1, updatedAt: -1 });
mailMemoEntrySchema.index({ userId: 1, tags: 1 });

mailMemoEntrySchema.pre('save', function (next) {
  if (Array.isArray(this.tags)) {
    this.tags = this.tags
      .map(tag => (tag || '').trim())
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index);
  }
  next();
});

mailMemoEntrySchema.statics.buildFilters = function (userId, filters = {}) {
  const query = { userId };

  if (filters.keyword) {
    const keyword = filters.keyword.trim();
    query.$or = [
      { email: { $regex: keyword, $options: 'i' } },
      { alias: { $regex: keyword, $options: 'i' } },
      { usage: { $regex: keyword, $options: 'i' } },
      { notes: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ];
  }

  if (filters.tag) {
    query.tags = filters.tag;
  }

  if (filters.usage) {
    query.usage = filters.usage;
  }

  if (filters.favorite === true) {
    query.isFavorite = true;
  }

  if (filters.favorite === false) {
    query.isFavorite = false;
  }

  return query;
};

mailMemoEntrySchema.methods.markUsedNow = function () {
  this.lastUsedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('MailMemoEntry', mailMemoEntrySchema);
