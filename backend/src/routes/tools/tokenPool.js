const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const TokenPool = require('../../models/TokenPool')
const AugmentToken = require('../../models/AugmentToken')
const { auth } = require('../../middleware/auth')
const logger = require('../../utils/logger')
const AugmentService = require('../../services/AugmentService')
const TokenManagerService = require('../../services/TokenManagerService')

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

        // 使用统一令牌管理服务检查令牌状态
        const operationValidation = await TokenManagerService.validateTokenOperation('add_pool_token', req.user._id, accessToken)
        if (!operationValidation.isValid) {
          errors.push(`令牌验证失败: ${accessToken.substring(0, 10)}... - ${operationValidation.errors.join('; ')}`)
          continue
        }

        // 检查令牌是否已存在于池中
        const existingToken = await TokenManagerService.checkPoolTokenExists(accessToken)
        if (existingToken) {
          errors.push(`令牌已存在于池子中: ${accessToken.substring(0, 10)}...`)
          continue
        }

        // 验证令牌有效性 - 使用portal_url进行验证
        const tokenValidation = await validateToken(accessToken, portalUrl)
        if (!tokenValidation.valid) {
          errors.push(`令牌验证失败: ${accessToken.substring(0, 10)}... - ${tokenValidation.error}`)
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
          portalInfo: JSON.stringify(tokenValidation.portalInfo), // 确保存储为JSON字符串
          creditsBalance: tokenValidation.creditsBalance,
          expiryDate: tokenValidation.expiryDate,
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

    // 使用统一令牌管理服务进行安全领取
    const result = await TokenManagerService.safeClaimPoolToken(req.user._id, tokenId)

    logger.info(`Token claimed by user ${req.user.email} from pool`)

    res.json({
      success: true,
      message: '令牌领取成功',
      data: result
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

    // 从领取者的令牌列表中移除（使用统一服务确保一致性）
    if (tokenPool.claimedBy) {
      try {
        await AugmentToken.deleteOne({
          userId: tokenPool.claimedBy,
          accessToken: tokenPool.accessToken
        })
        logger.info(`已从用户 ${tokenPool.claimedBy} 的令牌列表中移除归还的令牌: ${tokenPool.accessToken.substring(0, 10)}...`)
      } catch (error) {
        logger.warn(`归还令牌时清理用户令牌失败: ${error.message}`)
      }
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
    const isAdmin = req.user.role === 'admin'

    // 使用统一令牌管理服务进行安全删除
    const result = await TokenManagerService.safeDeletePoolToken(req.user._id, tokenId, isAdmin)

    logger.info(`Token deleted from pool by user ${req.user.email}`)

    res.json({
      success: true,
      message: '令牌已删除',
      data: result
    })
  } catch (error) {
    logger.error('Delete token error:', error)
    res.status(500).json({
      success: false,
      message: error.message || '删除令牌失败',
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

// 转移令牌到池子（新的转移模式）
router.post('/transfer/:tokenId', auth, async (req, res) => {
  try {
    const { tokenId } = req.params
    const tokenData = req.body

    logger.info(`Transfer token request: tokenId=${tokenId}, userId=${req.user._id}`)

    // 查找用户的个人令牌 - 支持两种ID格式
    let personalToken = null

    // 首先尝试使用 _id 查询（如果是有效的 ObjectId）
    if (mongoose.Types.ObjectId.isValid(tokenId)) {
      logger.info(`Trying to find token by _id: ${tokenId}`)
      personalToken = await AugmentToken.findOne({
        _id: tokenId,
        userId: req.user._id
      })
      logger.info(`Found by _id: ${personalToken ? 'YES' : 'NO'}`)
    }

    // 如果没找到，尝试使用 tokenId 字段查询
    if (!personalToken) {
      logger.info(`Trying to find token by tokenId: ${tokenId}`)
      personalToken = await AugmentToken.findOne({
        tokenId: tokenId,
        userId: req.user._id
      })
      logger.info(`Found by tokenId: ${personalToken ? 'YES' : 'NO'}`)
    }

    if (!personalToken) {
      return res.status(404).json({
        success: false,
        message: '令牌不存在或无权限'
      })
    }

    // 检查令牌是否已在池中
    const existingPoolToken = await TokenPool.findOne({
      accessToken: personalToken.accessToken
    })

    if (existingPoolToken) {
      return res.status(400).json({
        success: false,
        message: '该令牌已存在于池中'
      })
    }

    // 验证令牌有效性
    const tokenValidation = await validateToken(personalToken.accessToken, personalToken.portalUrl)
    if (!tokenValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `令牌验证失败: ${tokenValidation.error}`
      })
    }

    // 创建令牌池记录
    const tokenPool = new TokenPool({
      accessToken: personalToken.accessToken,
      tenantUrl: personalToken.tenantUrl,
      portalUrl: personalToken.portalUrl || '',
      uploaderId: req.user._id,
      uploaderEmail: req.user.email,
      originalUploader: req.user.username, // 添加原始上传者用户名
      portalInfo: JSON.stringify(tokenValidation.portalInfo),
      creditsBalance: tokenValidation.creditsBalance,
      expiryDate: tokenValidation.expiryDate,
      status: 'available',
      email_note: personalToken.emailNote || personalToken.email_note || ''
    })

    await tokenPool.save()

    // 删除个人令牌（转移所有权）
    await AugmentToken.deleteOne({ _id: personalToken._id, userId: req.user._id })

    logger.info(`Token transferred to pool by user ${req.user.email}: ${personalToken.accessToken.substring(0, 10)}...`)

    res.json({
      success: true,
      message: '令牌已转移到池子',
      data: tokenPool
    })
  } catch (error) {
    logger.error('Transfer token to pool error:', error)
    res.status(500).json({
      success: false,
      message: '转移令牌失败',
      error: error.message
    })
  }
})

// 从池中领取令牌（转移模式）
router.post('/:tokenId/claim-transfer', auth, async (req, res) => {
  try {
    const { tokenId } = req.params

    // 检查领取频率限制（生产环境）
    if (process.env.NODE_ENV === 'production') {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
      const recentClaims = await AugmentToken.countDocuments({
        userId: req.user._id,
        createdAt: { $gte: oneMinuteAgo },
        'metadata.source': 'pool_claim'
      })

      if (recentClaims >= 1) {
        return res.status(429).json({
          success: false,
          message: '领取过于频繁，请稍后再试（每分钟最多领取1个令牌）'
        })
      }
    }

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
        message: '令牌不可用'
      })
    }

    // 检查用户是否已拥有相同的令牌
    const existingToken = await AugmentToken.findOne({
      userId: req.user._id,
      accessToken: tokenPool.accessToken
    })

    if (existingToken) {
      return res.status(400).json({
        success: false,
        message: '您已拥有相同的令牌'
      })
    }

    // 验证令牌仍然有效
    const tokenValidation = await validateToken(tokenPool.accessToken, tokenPool.portalUrl)
    if (!tokenValidation.valid) {
      return res.status(400).json({
        success: false,
        message: '令牌已过期或无效'
      })
    }

    // 创建个人令牌
    const personalToken = new AugmentToken({
      userId: req.user._id,
      tenantUrl: tokenPool.tenantUrl,
      accessToken: tokenPool.accessToken,
      portalUrl: tokenPool.portalUrl,
      emailNote: tokenPool.email_note || '',
      metadata: {
        source: 'pool_claim',
        originalUploader: tokenPool.originalUploader,
        claimedAt: new Date()
      }
    })

    // 更新Portal信息并保存
    if (tokenValidation.portalInfo) {
      await personalToken.updatePortalInfo(tokenValidation.portalInfo)
    } else {
      await personalToken.save()
    }

    // 从池中删除令牌（转移所有权）
    await TokenPool.deleteOne({ _id: tokenId })

    logger.info(`Token claimed and transferred by user ${req.user.email} from pool`)

    res.json({
      success: true,
      message: '令牌已领取并添加到您的个人列表',
      data: personalToken
    })
  } catch (error) {
    logger.error('Claim token transfer error:', error)
    res.status(500).json({
      success: false,
      message: '领取令牌失败',
      error: error.message
    })
  }
})

module.exports = router
