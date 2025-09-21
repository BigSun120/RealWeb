/**
 * 协议调用切换器组合式函数
 * 处理编辑器令牌切换的协议调用功能
 */

import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export const useProtocolSwitcher = () => {
  const switching = ref(false)

  // 支持的编辑器配置
  const supportedEditors = [
    {
      type: 'vscode',
      name: 'VS Code',
      protocol: 'vscode',
      icon: '🔵',
      description: 'Visual Studio Code'
    },
    {
      type: 'cursor',
      name: 'Cursor',
      protocol: 'cursor',
      icon: '⚡',
      description: 'AI-powered code editor'
    },
    {
      type: 'kiro',
      name: 'Kiro',
      protocol: 'kiro',
      icon: '🔥',
      description: 'Kiro Editor'
    },
    {
      type: 'trae',
      name: 'Trae',
      protocol: 'trae',
      icon: '🚀',
      description: 'Trae Editor'
    },
    {
      type: 'windsurf',
      name: 'Windsurf',
      protocol: 'windsurf',
      icon: '🌊',
      description: 'Windsurf Editor'
    },
    {
      type: 'qoder',
      name: 'Qoder',
      protocol: 'qoder',
      icon: '📝',
      description: 'Qoder Editor'
    }
  ]

  /**
   * 构建协议URL
   * @param {Object} tokenData - 令牌数据
   * @param {string} editorType - 编辑器类型
   * @returns {string} 协议URL
   */
  const buildProtocolUrl = (tokenData, editorType) => {
    const editor = supportedEditors.find(e => e.type === editorType)
    if (!editor) {
      throw new Error(`不支持的编辑器类型: ${editorType}`)
    }

    // 验证必需的令牌数据
    if (!tokenData?.access_token || !tokenData?.tenant_url) {
      throw new Error('令牌数据不完整，缺少必要字段')
    }

    // 构建URL参数
    const params = new URLSearchParams({
      token: tokenData.access_token,
      url: tokenData.tenant_url,
      portal: tokenData.portal_url || ''
    })

    // 构建协议URL
    const protocolUrl = `${editor.protocol}://augment.vscode-augment/autoAuth?${params}`

    console.log(`[协议调用] 构建的 ${editor.name} URL:`, protocolUrl)
    return protocolUrl
  }

  /**
   * 切换到指定编辑器
   * @param {Object} tokenData - 令牌数据
   * @param {string} editorType - 编辑器类型
   * @returns {Promise<boolean>} 切换是否成功
   */
  const switchToEditor = async (tokenData, editorType) => {
    if (switching.value) {
      console.warn('[协议调用] 正在切换中，请稍候...')
      return false
    }

    try {
      switching.value = true

      // 验证令牌数据
      if (!tokenData?.access_token || !tokenData?.tenant_url) {
        throw new Error('令牌数据不完整')
      }

      // 获取编辑器信息
      const editor = supportedEditors.find(e => e.type === editorType)
      if (!editor) {
        throw new Error(`不支持的编辑器类型: ${editorType}`)
      }

      // 构建协议URL
      const protocolUrl = buildProtocolUrl(tokenData, editorType)

      // 调用协议
      console.log(`[协议调用] 正在调用 ${editor.name} 协议...`)
      window.open(protocolUrl, '_blank')

      // 显示成功消息
      ElMessage.success({
        message: `正在切换到 ${editor.name}...`,
        duration: 3000
      })

      return true
    } catch (error) {
      console.error('[协议调用] 切换失败:', error)
      ElMessage.error(`切换失败: ${error.message}`)
      return false
    } finally {
      switching.value = false
    }
  }

  /**
   * 检测协议支持（简单检测）
   * @param {string} editorType - 编辑器类型
   * @returns {Promise<boolean>} 是否支持协议
   */
  const checkProtocolSupport = async (editorType) => {
    try {
      const editor = supportedEditors.find(e => e.type === editorType)
      if (!editor) return false

      // 简单的协议支持检测
      const testUrl = `${editor.protocol}://test`
      const link = document.createElement('a')
      link.href = testUrl

      // 检查协议是否被识别
      return link.protocol === `${editor.protocol}:`
    } catch (error) {
      console.warn(`[协议调用] 协议支持检测失败 (${editorType}):`, error)
      return false
    }
  }

  /**
   * 批量检测所有编辑器的协议支持
   * @returns {Promise<Object>} 支持状态映射
   */
  const checkAllProtocolSupport = async () => {
    const supportStatus = {}

    for (const editor of supportedEditors) {
      supportStatus[editor.type] = await checkProtocolSupport(editor.type)
    }

    return supportStatus
  }

  /**
   * 复制令牌信息到剪贴板（降级方案）
   * @param {Object} tokenData - 令牌数据
   * @returns {Promise<boolean>} 复制是否成功
   */
  const copyTokenInfo = async (tokenData) => {
    try {
      const tokenInfo = `
Augment Token Information:
- Access Token: ${tokenData.access_token}
- Tenant URL: ${tokenData.tenant_url}
- Portal URL: ${tokenData.portal_url || 'N/A'}
- Email Note: ${tokenData.email_note || 'N/A'}

请手动配置到编辑器的 Augment 插件设置中。
      `.trim()

      await navigator.clipboard.writeText(tokenInfo)
      ElMessage.success('令牌信息已复制到剪贴板')
      return true
    } catch (error) {
      console.error('[协议调用] 复制失败:', error)
      ElMessage.error('复制失败，请手动选择文本')
      return false
    }
  }

  /**
   * 智能切换（优先协议调用，失败时提供降级方案）
   * @param {Object} tokenData - 令牌数据
   * @param {string} editorType - 编辑器类型
   * @returns {Promise<boolean>} 切换是否成功
   */
  const smartSwitch = async (tokenData, editorType) => {
    try {
      // 首先尝试协议调用
      const success = await switchToEditor(tokenData, editorType)

      if (!success) {
        // 协议调用失败，提供降级方案
        const editor = supportedEditors.find(e => e.type === editorType)
        const result = await ElMessageBox.confirm(
          `无法直接切换到 ${editor?.name || editorType}，是否复制令牌信息到剪贴板？`,
          '切换失败',
          {
            confirmButtonText: '复制令牌',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        if (result === 'confirm') {
          return await copyTokenInfo(tokenData)
        }
      }

      return success
    } catch (error) {
      console.error('[协议调用] 智能切换失败:', error)
      return false
    }
  }

  // 计算属性
  const isSwitching = computed(() => switching.value)
  const editorCount = computed(() => supportedEditors.length)

  return {
    // 状态
    switching,
    isSwitching,

    // 数据
    supportedEditors,
    editorCount,

    // 方法
    switchToEditor,
    buildProtocolUrl,
    checkProtocolSupport,
    checkAllProtocolSupport,
    copyTokenInfo,
    smartSwitch
  }
}
