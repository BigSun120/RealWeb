const mongoose = require('mongoose')

const tokenPoolSchema = new mongoose.Schema({
  // 令牌信息
  accessToken: {
    type: String,
    required: true,
    unique: true
  },
  
  // 上传者信息
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderEmail: {
    type: String,
    required: true
  },
  
  // 令牌状态信息
  status: {
    type: String,
    enum: ['available', 'claimed', 'expired', 'invalid'],
    default: 'available'
  },
  
  // Portal信息（验证时获取）
  portalInfo: {
    type: String, // JSON字符串
    default: null
  },
  
  // 剩余次数
  creditsBalance: {
    type: Number,
    default: 0
  },
  
  // 过期时间
  expiryDate: {
    type: Date,
    default: null
  },
  
  // 领取者信息
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  claimedAt: {
    type: Date,
    default: null
  },
  
  // 时间戳
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 索引
tokenPoolSchema.index({ uploaderId: 1 })
tokenPoolSchema.index({ status: 1 })
tokenPoolSchema.index({ expiryDate: 1 })
tokenPoolSchema.index({ uploadedAt: -1 })

// 虚拟字段：脱敏邮箱
tokenPoolSchema.virtual('maskedEmail').get(function() {
  if (!this.uploaderEmail) return '未知'
  
  const [localPart, domain] = this.uploaderEmail.split('@')
  if (!domain) return '未知'
  
  // 保留前2位和后1位，中间用*替换
  let maskedLocal = localPart
  if (localPart.length > 3) {
    const start = localPart.substring(0, 2)
    const end = localPart.substring(localPart.length - 1)
    const middle = '*'.repeat(Math.max(1, localPart.length - 3))
    maskedLocal = start + middle + end
  } else if (localPart.length > 1) {
    maskedLocal = localPart[0] + '*'.repeat(localPart.length - 1)
  }
  
  return `${maskedLocal}@${domain}`
})

// 实例方法：验证令牌是否有效
tokenPoolSchema.methods.isValid = function() {
  if (this.status === 'invalid' || this.status === 'expired') {
    return false
  }
  
  if (this.expiryDate && new Date() > this.expiryDate) {
    return false
  }
  
  if (this.creditsBalance <= 0) {
    return false
  }
  
  return true
}

// 实例方法：标记为已领取
tokenPoolSchema.methods.claimBy = function(userId) {
  this.status = 'claimed'
  this.claimedBy = userId
  this.claimedAt = new Date()
  this.updatedAt = new Date()
  return this.save()
}

// 实例方法：归还到池子
tokenPoolSchema.methods.returnToPool = function() {
  this.status = 'available'
  this.claimedBy = null
  this.claimedAt = null
  this.updatedAt = new Date()
  return this.save()
}

// 静态方法：获取可用令牌数量
tokenPoolSchema.statics.getAvailableCount = function() {
  return this.countDocuments({ status: 'available' })
}

// 静态方法：清理过期令牌
tokenPoolSchema.statics.cleanupExpired = function() {
  const now = new Date()
  return this.updateMany(
    {
      $or: [
        { expiryDate: { $lt: now } },
        { creditsBalance: { $lte: 0 } }
      ],
      status: { $in: ['available', 'claimed'] }
    },
    {
      status: 'expired',
      updatedAt: now
    }
  )
}

// 中间件：更新时间戳
tokenPoolSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// JSON转换时包含虚拟字段
tokenPoolSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.accessToken // 不返回完整令牌
    delete ret.__v
    return ret
  }
})

module.exports = mongoose.model('TokenPool', tokenPoolSchema)
