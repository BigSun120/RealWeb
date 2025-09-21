const mongoose = require('mongoose');

const publicNoticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  bodyMarkdown: { type: String, default: '' },
  bodyHtml: { type: String, default: '' }, // 可选：预渲染后的HTML
  level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  link: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  published: { type: Boolean, default: false },
  startsAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

publicNoticeSchema.index({ published: 1, startsAt: -1 });
publicNoticeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

module.exports = mongoose.model('PublicNotice', publicNoticeSchema);

