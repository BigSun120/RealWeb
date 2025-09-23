/**
 * Augment 认证相关的组合式函数
 * 处理OAuth流程和令牌管理
 */

import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import augmentService from '@/services/augmentService'

// 全局状态
const tokens = ref([])
const isLoading = ref(false)
const oauthState = reactive({
  authUrl: '',
  state: '',
  isGenerating: false
})

export function useAugmentAuth() {
  // 本地状态
  const isGettingToken = ref(false)
  const isSaving = ref(false)
  const isChecking = ref(false)

  /**
   * 生成OAuth授权URL
   */
  const generateAuthUrl = async () => {
    oauthState.isGenerating = true
    try {
      const result = await augmentService.generateAuthUrl()
      oauthState.authUrl = result.auth_url
      oauthState.state = result.state
      return result
    } catch (error) {
      ElMessage.error(`生成授权URL失败: ${error.message}`)
      throw error
    } finally {
      oauthState.isGenerating = false
    }
  }

  /**
   * 获取访问令牌
   */
  const getAccessToken = async (codeInput) => {
    isGettingToken.value = true
    try {
      // 解析授权码
      const parsedCode = augmentService.parseAuthCode(codeInput)

      // 验证状态
      if (parsedCode.state !== oauthState.state) {
        throw new Error('OAuth状态验证失败，请重新生成授权URL')
      }

      const result = await augmentService.getAccessToken(codeInput, oauthState.state)
      return result
    } catch (error) {
      ElMessage.error(`获取访问令牌失败: ${error.message}`)
      throw error
    } finally {
      isGettingToken.value = false
    }
  }

  /**
   * 保存令牌
   */
  const saveToken = async (tokenData) => {
    isSaving.value = true
    try {
      // 验证必要字段
      if (!tokenData.tenant_url || !tokenData.access_token) {
        throw new Error('缺少必要字段：tenant_url 和 access_token')
      }

      // 验证URL格式
      if (!augmentService.validateUrl(tokenData.tenant_url)) {
        throw new Error('Tenant URL格式无效')
      }

      if (tokenData.portal_url && !augmentService.validateUrl(tokenData.portal_url)) {
        throw new Error('Portal URL格式无效')
      }

      const result = await augmentService.saveToken(tokenData)

      // 刷新令牌列表
      await loadTokens()

      return result
    } catch (error) {
      ElMessage.error(`保存令牌失败: ${error.message}`)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 加载令牌列表
   */
  const loadTokens = async (activeOnly = false) => {
    isLoading.value = true
    try {
      const result = await augmentService.getTokens(activeOnly)
      tokens.value = result


      return result
    } catch (error) {
      ElMessage.error(`加载令牌列表失败: ${error.message}`)
      tokens.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新令牌
   */
  const updateToken = async (tokenId, updateData) => {
    try {
      const result = await augmentService.updateToken(tokenId, updateData)

      // 更新本地状态
      const index = tokens.value.findIndex(t => t.id === tokenId)
      if (index !== -1) {
        // 重新加载以获取最新数据
        await loadTokens()
      }

      ElMessage.success('令牌更新成功')
      return result
    } catch (error) {
      ElMessage.error(`更新令牌失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 删除令牌
   */
  const deleteToken = async (tokenId) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除这个令牌吗？此操作无法撤销。',
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )

      await augmentService.deleteToken(tokenId)

      // 从本地状态中移除
      tokens.value = tokens.value.filter(t => t.id !== tokenId)

      ElMessage.success('令牌删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(`删除令牌失败: ${error.message}`)
        throw error
      }
    }
  }

  /**
   * 检查令牌状态
   */
  const checkTokenStatus = async (tokenId) => {
    isChecking.value = true
    try {
      const result = await augmentService.checkTokenStatus(tokenId)

      // 更新本地状态
      const index = tokens.value.findIndex(t => t.id === tokenId)
      if (index !== -1) {
        tokens.value[index].ban_status = result
      }

      return result
    } catch (error) {
      ElMessage.error(`检查令牌状态失败: ${error.message}`)
      throw error
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 批量检查令牌状态
   */
  const batchCheckTokenStatus = async (tokenIds) => {
    isChecking.value = true
    try {
      const results = await augmentService.batchCheckTokenStatus(tokenIds)

      // 更新本地状态
      results.forEach(result => {
        if (result.success) {
          const index = tokens.value.findIndex(t => t.id === result.tokenId)
          if (index !== -1) {
            tokens.value[index].ban_status = result.data
          }
        }
      })

      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount > 0) {
        ElMessage.warning(`状态检查完成：${successCount} 个成功，${failCount} 个失败`)
      } else {
        ElMessage.success(`所有令牌状态检查完成`)
      }

      return results
    } catch (error) {
      ElMessage.error(`批量检查状态失败: ${error.message}`)
      throw error
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 刷新令牌使用次数
   */
  const refreshTokenUsage = async (tokenId) => {
    try {
      const result = await augmentService.refreshTokenUsage(tokenId)

      // 更新本地状态
      const index = tokens.value.findIndex(t => t.id === tokenId)
      if (index !== -1) {
        // 检查数据结构并安全更新
        if (result.data && result.data.usage_stats) {
          tokens.value[index].usage_stats = result.data.usage_stats
        } else if (result.data && result.data.portal_info) {
          // 如果没有usage_stats，从portal_info构建
          tokens.value[index].usage_stats = {
            credits_balance: result.data.portal_info.credits_balance || 0,
            total_usage: result.data.portal_info.total_usage || 0,
            last_updated: new Date()
          }
        } else if (result.usage_stats) {
          // 兼容直接返回usage_stats的情况
          tokens.value[index].usage_stats = result.usage_stats
        } else if (result.portal_info) {
          // 兼容直接返回portal_info的情况
          tokens.value[index].usage_stats = {
            credits_balance: result.portal_info.credits_balance || 0,
            total_usage: result.portal_info.total_usage || 0,
            last_updated: new Date()
          }
        }
      }

      ElMessage.success('使用次数刷新成功')
      return result
    } catch (error) {
      ElMessage.error(`刷新使用次数失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 批量刷新令牌使用次数
   */
  const batchRefreshTokenUsage = async (tokenIds) => {
    isChecking.value = true
    try {
      const results = await augmentService.batchRefreshTokenUsage(tokenIds)

      // 更新本地状态
      results.forEach(result => {
        if (result.success && result.data) {
          const index = tokens.value.findIndex(t => t.id === result.tokenId)
          if (index !== -1) {
            // 检查数据结构并安全更新
            if (result.data.usage_stats) {
              tokens.value[index].usage_stats = result.data.usage_stats
            } else if (result.data.portal_info) {
              // 如果没有usage_stats，从portal_info构建
              tokens.value[index].usage_stats = {
                credits_balance: result.data.portal_info.credits_balance || 0,
                total_usage: result.data.portal_info.total_usage || 0,
                last_updated: new Date()
              }
            }
          }
        }
      })

      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount > 0) {
        ElMessage.warning(`使用次数刷新完成：${successCount} 个成功，${failCount} 个失败`)
      } else {
        ElMessage.success(`所有令牌使用次数刷新完成`)
      }

      return results
    } catch (error) {
      ElMessage.error(`批量刷新使用次数失败: ${error.message}`)
      throw error
    } finally {
      isChecking.value = false
    }
  }

  /**
   * 导入令牌
   */
  const importTokens = async (tokensData) => {
    try {
      const result = await augmentService.importTokens(tokensData)

      // 构建结果消息
      const messages = []
      if (result.imported > 0) {
        messages.push(`成功导入 ${result.imported} 个令牌`)
      }
      if (result.duplicated > 0) {
        messages.push(`跳过 ${result.duplicated} 个重复令牌`)
      }
      if (result.failed > 0) {
        messages.push(`失败 ${result.failed} 个令牌`)
      }

      if (result.imported > 0) {
        await loadTokens()
        ElMessage.success(messages.join('，'))
      } else if (result.duplicated > 0 && result.failed === 0) {
        ElMessage.warning(messages.join('，'))
      } else if (messages.length > 0) {
        ElMessage.error(messages.join('，'))
      }

      if (result.failed > 0) {
        // 导入失败的明细已由后端返回给调用方按需处理
      }
      if (result.duplicated > 0) {
        // 重复令牌明细已由后端返回给调用方按需处理
      }

      return result
    } catch (error) {
      ElMessage.error(`导入令牌失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 导出令牌
   */
  const exportTokens = async (activeOnly = false) => {
    try {
      const result = await augmentService.exportTokens(activeOnly)

      // 创建下载链接
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `augment-tokens-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElMessage.success('令牌导出成功')
      return result
    } catch (error) {
      ElMessage.error(`导出令牌失败: ${error.message}`)
      throw error
    }
  }

  // 计算属性
  const activeTokens = computed(() => {
    return tokens.value.filter(token => token.is_active)
  })

  const bannedTokens = computed(() => {
    return tokens.value.filter(token => token.ban_status?.isBanned)
  })

  const tokenStats = computed(() => {
    return {
      total: tokens.value.length,
      active: activeTokens.value.length,
      banned: bannedTokens.value.length,
      inactive: tokens.value.filter(token => !token.is_active).length
    }
  })

  /**
   * 刷新基础信息（Portal信息）
   */
  const refreshTokenInfo = async (tokenId) => {
    try {
      const result = await augmentService.refreshPortalInfo(tokenId)

      // 不在这里更新本地状态，让调用方处理更新逻辑
      // 避免与页面组件中的更新逻辑冲突

      return result
    } catch (error) {
      ElMessage.error(`刷新基础信息失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 刷新令牌状态
   */
  const refreshTokenStatus = async (tokenId) => {

    try {
      const idxBefore = tokens.value.findIndex(t => t.id === tokenId)


      const result = await augmentService.refreshTokenStatus(tokenId)


      // 更新本地状态 - 使用后端返回的ban_status对象
      const index = tokens.value.findIndex(t => t.id === tokenId)
      if (index !== -1) {
        const newBanStatus = result.ban_status || {
          isBanned: result.is_banned,
          status: result.status,
          lastChecked: new Date(),
          errorMessage: result.error_message,
          responseCode: result.response_code
        }



        const prevRef = tokens.value[index]
        const updatedToken = { ...prevRef, _refreshingStatus: false, ban_status: newBanStatus }

        // 替换整个token对象
        tokens.value.splice(index, 1, updatedToken)

      }

      return result
    } catch (error) {
      ElMessage.error(`刷新令牌状态失败: ${error.message}`)
      throw error
    } finally {

    }
  }

  /**
   * 刷新Portal信息（保持向后兼容）
   */
  const refreshPortalInfo = async (tokenId) => {
    return await refreshTokenInfo(tokenId)
  }

  /**
   * 批量刷新基础信息
   */
  const batchRefreshTokenInfo = async (tokenIds) => {
    try {
      const results = await augmentService.batchRefreshPortalInfo(tokenIds)
      return results
    } catch (error) {
      ElMessage.error(`批量刷新基础信息失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 批量刷新令牌状态
   */
  const batchRefreshTokenStatus = async (tokenIds) => {

    try {
      const response = await augmentService.batchRefreshTokenStatus(tokenIds)
      const result = response.results || response


      // 更新本地状态
      result.forEach(item => {
        if (item.success) {
          const index = tokens.value.findIndex(t => t.id === item.tokenId)
          if (index !== -1) {
            const newBanStatus = item.data.ban_status || {
              isBanned: item.data.is_banned,
              status: item.data.status,
              lastChecked: new Date(),
              errorMessage: item.data.error_message,
              responseCode: item.data.response_code
            }



            const prevRef = tokens.value[index]
            const updatedToken = { ...prevRef, _refreshingStatus: false, ban_status: newBanStatus }

            // 替换整个token对象
            tokens.value.splice(index, 1, updatedToken)

          }
        }
      })

      return result
    } catch (error) {
      ElMessage.error(`批量刷新令牌状态失败: ${error.message}`)
      throw error
    } finally {

    }
  }

  /**
   * 批量刷新Portal信息（保持向后兼容）
   */
  const batchRefreshPortalInfo = async (tokenIds) => {
    return await batchRefreshTokenInfo(tokenIds)
  }

  // 重置OAuth状态
  const resetOAuthState = () => {
    oauthState.authUrl = ''
    oauthState.state = ''
    oauthState.isGenerating = false
  }

  return {
    // 状态
    tokens,
    isLoading,
    isGettingToken,
    isSaving,
    isChecking,
    oauthState,

    // 计算属性
    activeTokens,
    bannedTokens,
    tokenStats,

    // 方法
    generateAuthUrl,
    getAccessToken,
    saveToken,
    loadTokens,
    updateToken,
    deleteToken,
    refreshTokenInfo,
    refreshTokenStatus,
    refreshPortalInfo, // 保持向后兼容
    batchRefreshTokenInfo,
    batchRefreshTokenStatus,
    batchRefreshPortalInfo, // 保持向后兼容
    checkTokenStatus,
    batchCheckTokenStatus,
    refreshTokenUsage,
    batchRefreshTokenUsage,
    importTokens,
    exportTokens,
    resetOAuthState,

    // 工具方法
    getTokenDisplayName: augmentService.getTokenDisplayName,
    formatTokenStatus: augmentService.formatTokenStatus,
    validateUrl: augmentService.validateUrl,
    formatDate: (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatUrl: (url) => {
      if (!url) return '-'
      try {
        const urlObj = new URL(url)
        return urlObj.hostname
      } catch {
        return url
      }
    }
  }
}
