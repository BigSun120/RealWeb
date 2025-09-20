const express = require('express')
const router = express.Router()
const TokenPool = require('../../models/TokenPool')
const AugmentToken = require('../../models/AugmentToken')
const { auth } = require('../../middleware/auth')
const logger = require('../../utils/logger')
const AugmentService = require('../../services/AugmentService')

// 验证令牌有效性的辅助函数 - 使用真实API
async function validateToken(accessToken, portalUrl = null) {
  try {
    logger.info('Validating token with real API:', accessToken.substring(0, 10) + '...')

    // 使用真实的AugmentService获取Portal信息
    const portalInfo = await AugmentService.getCustomerInfo(accessToken, portalUrl)

    // 检查令牌是否有效
    const isValid = portalInfo && portalInfo.credits_balance !== undefined

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid token or no customer data available'
      }
    }

    return {
      valid: true,
      portalInfo: portalInfo,
      creditsBalance: portalInfo.credits_balance || 0,
      expiryDate: portalInfo.expiry_date ? new Date(portalInfo.expiry_date) : null
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
      .populate('uploaderId', 'username email')
      .populate('claimedBy', 'username email')
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
    const { tokens } = req.body

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的令牌数组'
      })
    }

    const results = []
    const errors = []

    for (const tokenData of tokens) {
      try {
        const { access_token: accessToken, tenant_url: tenantUrl, portal_url: portalUrl, email_note: emailNote } = tokenData

        if (!accessToken) {
          errors.push(`令牌缺少access_token: ${JSON.stringify(tokenData)}`)
          continue
        }

        // 检查令牌是否已存在
        const existingToken = await TokenPool.findOne({ accessToken })
        if (existingToken) {
          errors.push(`令牌已存在于池子中: ${accessToken.substring(0, 10)}...`)
          continue
        }

        // 验证令牌有效性 - 使用portal_url进行验证
        const validation = await validateToken(accessToken, portalUrl)
        if (!validation.valid) {
          errors.push(`令牌验证失败: ${accessToken.substring(0, 10)}... - ${validation.error}`)
          continue
        }

        // 检查池子容量（最大1000个）
        const totalCount = await TokenPool.countDocuments()
        if (totalCount >= 1000) {
          errors.push(`令牌池已达到最大容量限制`)
          continue
        }

        // 创建令牌池记录
        const tokenPool = new TokenPool({
          accessToken,
          tenantUrl: tenantUrl || 'https://api.augmentcode.com/',
          portalUrl: portalUrl || '',
          uploaderId: req.user._id,
          uploaderEmail: req.user.email,
          portalInfo: JSON.stringify(validation.portalInfo), // 确保存储为JSON字符串
          creditsBalance: validation.creditsBalance,
          expiryDate: validation.expiryDate,
          status: 'available'
        })

        await tokenPool.save()
        results.push(tokenPool)

        logger.info(`Token uploaded to pool by user ${req.user.email}: ${accessToken.substring(0, 10)}...`)

      } catch (tokenError) {
        logger.error('Upload single token error:', tokenError)
        errors.push(`令牌处理失败: ${tokenData.access_token?.substring(0, 10)}... - ${tokenError.message}`)
      }
    }

    // 返回批量处理结果
    res.json({
      success: true,
      message: `处理完成：成功 ${results.length} 个，失败 ${errors.length} 个`,
      data: {
        uploaded: results.length,
        failed: errors.length,
        errors: errors,
        tokens: results
      }
    })
  } catch (error) {
    logger.error('Upload tokens error:', error)
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

    // 检查令牌有效性，但先刷新一下数据
    const validation = await validateToken(tokenPool.accessToken, tokenPool.portalUrl)
    if (validation.valid) {
      // 更新最新的令牌信息
      const portalInfo = validation.portalInfo || {}

      tokenPool.portalInfo = JSON.stringify(portalInfo)
      tokenPool.creditsBalance = portalInfo.credits_balance || validation.creditsBalance || 0
      tokenPool.expiryDate = validation.expiryDate

      await tokenPool.save()
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

    // 检查用户是否已有相同令牌（但允许领取自己上传的令牌）
    const existingUserToken = await AugmentToken.findOne({
      userId: req.user._id,
      accessToken: tokenPool.accessToken
    })

    if (existingUserToken && tokenPool.uploaderId.toString() !== req.user._id.toString()) {
      return res.status(409).json({
        success: false,
        message: '您已拥有此令牌'
      })
    }

    // 标记为已领取
    await tokenPool.claimBy(req.user._id)

    // 添加到用户的令牌列表
    // 使用TokenPool中保存的tenantUrl和portalUrl
    const userToken = new AugmentToken({
      userId: req.user._id,
      accessToken: tokenPool.accessToken,
      tenantUrl: tokenPool.tenantUrl || 'https://api.augmentcode.com/',
      portalUrl: tokenPool.portalUrl || '',
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
      .populate('claimedBy', 'username email')
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

// 清空所有令牌（管理员）
router.delete('/clear-all', auth, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      })
    }

    const result = await TokenPool.deleteMany({})

    logger.info(`All tokens cleared by admin ${req.user.email}, deleted ${result.deletedCount} tokens`)

    res.json({
      success: true,
      message: `已清空所有令牌，共删除 ${result.deletedCount} 个`,
      data: { deletedCount: result.deletedCount }
    })
  } catch (error) {
    logger.error('Clear all tokens error:', error)
    res.status(500).json({
      success: false,
      message: '清空失败',
      error: error.message
    })
  }
})

// 刷新单个令牌的Portal信息
router.post('/:tokenId/refresh', auth, async (req, res) => {
  try {
    const { tokenId } = req.params

    const token = await TokenPool.findById(tokenId)
    if (!token) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在'
      })
    }

    // 检查权限：只有上传者或管理员可以刷新
    if (token.uploaderId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限刷新此令牌'
      })
    }

    // 验证令牌并获取最新信息 - 使用真实API
    const validation = await validateToken(token.accessToken, token.portalUrl)
    if (!validation.valid) {
      // 如果令牌无效，更新状态
      token.status = 'invalid'
      await token.save()

      return res.status(400).json({
        success: false,
        message: '令牌已失效',
        error: validation.error
      })
    }

    // 更新令牌信息 - 与已保存令牌的刷新逻辑一致
    const portalInfo = validation.portalInfo || {}
    token.portalInfo = JSON.stringify(portalInfo)

    // 提取剩余次数和过期时间
    token.creditsBalance = portalInfo.credits_balance || validation.creditsBalance || 0

    // 处理过期时间
    token.expiryDate = validation.expiryDate

    token.lastRefreshed = new Date()

    await token.save()

    logger.info(`Token ${tokenId} refreshed by user ${req.user.email}`)

    res.json({
      success: true,
      message: 'Portal信息刷新成功',
      data: token
    })
  } catch (error) {
    logger.error('Refresh token info error:', error)
    res.status(500).json({
      success: false,
      message: '刷新失败',
      error: error.message
    })
  }
})

module.exports = router
