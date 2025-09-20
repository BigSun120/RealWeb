const express = require('express')
const router = express.Router()
const TokenPool = require('../../models/TokenPool')
const AugmentToken = require('../../models/AugmentToken')
const { auth } = require('../../middleware/auth')
const logger = require('../../utils/logger')

// 验证令牌有效性的辅助函数
async function validateToken(accessToken) {
  try {
    // 这里应该调用Augment API验证令牌
    // 暂时返回模拟数据
    const response = await fetch('https://api.augmentcode.com/v1/portal-info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      return { valid: false, error: 'Invalid token' }
    }

    const portalInfo = await response.json()

    // 提取关键信息
    const creditsBalance = portalInfo.usageStats?.credits_balance || 0
    const expiryDate = portalInfo.ledgerSummary?.credit_blocks?.[0]?.expiry_date

    return {
      valid: true,
      portalInfo: JSON.stringify(portalInfo),
      creditsBalance: parseFloat(creditsBalance),
      expiryDate: expiryDate ? new Date(expiryDate) : null
    }
  } catch (error) {
    logger.error('Token validation error:', error)
    return { valid: false, error: error.message }
  }
}

// 获取令牌池列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'available' } = req.query
    const skip = (page - 1) * limit

    const query = {}
    if (status && status !== 'all') {
      query.status = status
    }

    const tokens = await TokenPool.find(query)
      .populate('uploaderId', 'email')
      .populate('claimedBy', 'email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await TokenPool.countDocuments(query)
    const availableCount = await TokenPool.getAvailableCount()

    res.json({
      success: true,
      data: {
        tokens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          available: availableCount,
          total: await TokenPool.countDocuments()
        }
      }
    })
  } catch (error) {
    logger.error('Get token pool error:', error)
    res.status(500).json({
      success: false,
      message: '获取令牌池失败',
      error: error.message
    })
  }
})

// 上传令牌到池子
router.post('/upload', auth, async (req, res) => {
  try {
    const { accessToken } = req.body

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: '请提供访问令牌'
      })
    }

    // 检查令牌是否已存在
    const existingToken = await TokenPool.findOne({ accessToken })
    if (existingToken) {
      return res.status(409).json({
        success: false,
        message: '该令牌已存在于池子中'
      })
    }

    // 验证令牌有效性
    const validation = await validateToken(accessToken)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: '令牌验证失败',
        error: validation.error
      })
    }

    // 检查池子容量（最大1000个）
    const totalCount = await TokenPool.countDocuments()
    if (totalCount >= 1000) {
      return res.status(429).json({
        success: false,
        message: '令牌池已达到最大容量限制'
      })
    }

    // 创建令牌池记录
    const tokenPool = new TokenPool({
      accessToken,
      uploaderId: req.user._id,
      uploaderEmail: req.user.email,
      portalInfo: validation.portalInfo,
      creditsBalance: validation.creditsBalance,
      expiryDate: validation.expiryDate,
      status: 'available'
    })

    await tokenPool.save()

    logger.info(`Token uploaded to pool by user ${req.user.email}`)

    res.json({
      success: true,
      message: '令牌上传成功',
      data: tokenPool
    })
  } catch (error) {
    logger.error('Upload token error:', error)
    res.status(500).json({
      success: false,
      message: '上传令牌失败',
      error: error.message
    })
  }
})

// 领取令牌
router.post('/:tokenId/claim', auth, async (req, res) => {
  try {
    const { tokenId } = req.params

    const tokenPool = await TokenPool.findById(tokenId)
    if (!tokenPool) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      })
    }

    if (tokenPool.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: '令牌不可领取'
      })
    }

    if (!tokenPool.isValid()) {
      // 标记为过期
      tokenPool.status = 'expired'
      await tokenPool.save()

      return res.status(400).json({
        success: false,
        message: '令牌已过期或无效'
      })
    }

    // 检查用户是否已有相同令牌
    const existingUserToken = await AugmentToken.findOne({
      userId: req.user._id,
      accessToken: tokenPool.accessToken
    })

    if (existingUserToken) {
      return res.status(409).json({
        success: false,
        message: '您已拥有此令牌'
      })
    }

    // 标记为已领取
    await tokenPool.claimBy(req.user._id)

    // 添加到用户的令牌列表
    const userToken = new AugmentToken({
      userId: req.user._id,
      accessToken: tokenPool.accessToken,
      tenantUrl: '', // 可以从portalInfo中提取
      portalUrl: '', // 可以从portalInfo中提取
      emailNote: `从令牌池领取 - ${new Date().toLocaleDateString()}`,
      portalInfo: tokenPool.portalInfo
    })

    await userToken.save()

    logger.info(`Token claimed by user ${req.user.email} from pool`)

    res.json({
      success: true,
      message: '令牌领取成功',
      data: {
        poolToken: tokenPool,
        userToken
      }
    })
  } catch (error) {
    logger.error('Claim token error:', error)
    res.status(500).json({
      success: false,
      message: '领取令牌失败',
      error: error.message
    })
  }
})

// 归还令牌到池子（上传者或管理员）
router.post('/:tokenId/return', auth, async (req, res) => {
  try {
    const { tokenId } = req.params

    const tokenPool = await TokenPool.findById(tokenId)
    if (!tokenPool) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      })
    }

    // 检查权限：上传者或管理员
    const isOwner = tokenPool.uploaderId.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此令牌'
      })
    }

    if (tokenPool.status !== 'claimed') {
      return res.status(400).json({
        success: false,
        message: '令牌未被领取，无需归还'
      })
    }

    // 归还到池子
    await tokenPool.returnToPool()

    // 从领取者的令牌列表中移除
    if (tokenPool.claimedBy) {
      await AugmentToken.deleteOne({
        userId: tokenPool.claimedBy,
        accessToken: tokenPool.accessToken
      })
    }

    logger.info(`Token returned to pool by user ${req.user.email}`)

    res.json({
      success: true,
      message: '令牌已归还到池子',
      data: tokenPool
    })
  } catch (error) {
    logger.error('Return token error:', error)
    res.status(500).json({
      success: false,
      message: '归还令牌失败',
      error: error.message
    })
  }
})

// 删除令牌（上传者或管理员）
router.delete('/:tokenId', auth, async (req, res) => {
  try {
    const { tokenId } = req.params

    const tokenPool = await TokenPool.findById(tokenId)
    if (!tokenPool) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      })
    }

    // 检查权限：上传者或管理员
    const isOwner = tokenPool.uploaderId.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此令牌'
      })
    }

    // 如果令牌已被领取，也要从领取者的令牌列表中移除
    if (tokenPool.status === 'claimed' && tokenPool.claimedBy) {
      await AugmentToken.deleteOne({
        userId: tokenPool.claimedBy,
        accessToken: tokenPool.accessToken
      })
    }

    await TokenPool.findByIdAndDelete(tokenId)

    logger.info(`Token deleted from pool by user ${req.user.email}`)

    res.json({
      success: true,
      message: '令牌已删除'
    })
  } catch (error) {
    logger.error('Delete token error:', error)
    res.status(500).json({
      success: false,
      message: '删除令牌失败',
      error: error.message
    })
  }
})

// 获取我的令牌（上传的）
router.get('/my-uploads', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const tokens = await TokenPool.find({ uploaderId: req.user._id })
      .populate('claimedBy', 'email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await TokenPool.countDocuments({ uploaderId: req.user._id })

    res.json({
      success: true,
      data: {
        tokens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    logger.error('Get my uploads error:', error)
    res.status(500).json({
      success: false,
      message: '获取我的上传失败',
      error: error.message
    })
  }
})

// 清理过期令牌（管理员）
router.post('/cleanup', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      })
    }

    const result = await TokenPool.cleanupExpired()

    logger.info(`Cleaned up ${result.modifiedCount} expired tokens`)

    res.json({
      success: true,
      message: `已清理 ${result.modifiedCount} 个过期令牌`,
      data: {
        cleanedCount: result.modifiedCount
      }
    })
  } catch (error) {
    logger.error('Cleanup tokens error:', error)
    res.status(500).json({
      success: false,
      message: '清理令牌失败',
      error: error.message
    })
  }
})

module.exports = router
