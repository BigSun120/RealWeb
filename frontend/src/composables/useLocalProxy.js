/**
 * 本地代理服务相关的组合式函数
 * 处理与桌面应用的通信和服务发现
 */

import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 全局状态
const proxyStatus = reactive({
  isAvailable: false,
  isChecking: false,
  serviceUrl: null,
  lastChecked: null,
  error: null,
  version: null,
  features: []
})

// 配置
const PROXY_CONFIG = {
  // 常用端口范围
  commonPorts: [8899, 8900, 8901, 8902, 8903],
  // 检测超时时间
  timeout: 2000,
  // 重试间隔
  retryInterval: 30000,
  // 服务标识
  serviceIdentifier: 'augment-token-manager',
  // API端点
  endpoints: {
    ping: '/ping',
    status: '/status',
    accounts: '/accounts',
    currentAccount: '/current-account',
    switchAccount: '/switch-account',
    logout: '/logout'
  }
}

export function useLocalProxy() {
  // 本地状态
  const isConnecting = ref(false)
  const accounts = ref([])
  const currentAccount = ref(null)

  /**
   * 检测单个端口的服务
   */
  const checkPort = async (port) => {
    const url = `http://localhost:${port}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout)

      const response = await fetch(`${url}${PROXY_CONFIG.endpoints.ping}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()

        // 验证服务标识
        if (data.service === PROXY_CONFIG.serviceIdentifier) {
          return {
            url,
            version: data.version,
            features: data.features || [],
            timestamp: Date.now()
          }
        }
      }

      return null
    } catch (error) {
      // 网络错误或超时，返回null
      return null
    }
  }

  /**
   * 扫描所有端口寻找服务
   */
  const discoverService = async () => {
    proxyStatus.isChecking = true
    proxyStatus.error = null

    try {
      // 并发检测所有端口
      const checkPromises = PROXY_CONFIG.commonPorts.map(port => checkPort(port))
      const results = await Promise.all(checkPromises)

      // 找到第一个可用的服务
      const availableService = results.find(result => result !== null)

      if (availableService) {
        proxyStatus.isAvailable = true
        proxyStatus.serviceUrl = availableService.url
        proxyStatus.version = availableService.version
        proxyStatus.features = availableService.features
        proxyStatus.lastChecked = new Date()
        proxyStatus.error = null

        return availableService
      } else {
        proxyStatus.isAvailable = false
        proxyStatus.serviceUrl = null
        proxyStatus.version = null
        proxyStatus.features = []
        proxyStatus.lastChecked = new Date()
        proxyStatus.error = '未找到本地代理服务'

        return null
      }
    } catch (error) {
      proxyStatus.isAvailable = false
      proxyStatus.serviceUrl = null
      proxyStatus.error = `服务发现失败: ${error.message}`
      proxyStatus.lastChecked = new Date()

      return null
    } finally {
      proxyStatus.isChecking = false
    }
  }

  /**
   * 调用代理服务API
   */
  const callProxyApi = async (endpoint, options = {}) => {
    if (!proxyStatus.isAvailable || !proxyStatus.serviceUrl) {
      throw new Error('本地代理服务不可用')
    }

    const url = `${proxyStatus.serviceUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        timeout: PROXY_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        ...options
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // 如果是网络错误，可能服务已断开
      if (error.name === 'TypeError' || error.name === 'AbortError') {
        proxyStatus.isAvailable = false
        proxyStatus.serviceUrl = null
        proxyStatus.error = '与本地代理服务的连接已断开'
      }

      throw error
    }
  }

  /**
   * 获取服务状态
   */
  const getServiceStatus = async () => {
    try {
      const data = await callProxyApi(PROXY_CONFIG.endpoints.status)
      return data
    } catch (error) {
      throw new Error(`获取服务状态失败: ${error.message}`)
    }
  }

  /**
   * 获取账号列表
   */
  const getAccounts = async () => {
    try {
      const data = await callProxyApi(PROXY_CONFIG.endpoints.accounts)
      accounts.value = data.accounts || []
      return accounts.value
    } catch (error) {
      throw new Error(`获取账号列表失败: ${error.message}`)
    }
  }

  /**
   * 获取当前账号
   */
  const getCurrentAccount = async () => {
    try {
      const data = await callProxyApi(PROXY_CONFIG.endpoints.currentAccount)
      currentAccount.value = data.account || null
      return currentAccount.value
    } catch (error) {
      throw new Error(`获取当前账号失败: ${error.message}`)
    }
  }

  /**
   * 切换账号
   */
  const switchAccount = async (accountData) => {
    isConnecting.value = true

    try {
      const data = await callProxyApi(PROXY_CONFIG.endpoints.switchAccount, {
        method: 'POST',
        body: JSON.stringify(accountData)
      })

      // 更新当前账号
      currentAccount.value = data.account || accountData

      ElMessage.success('账号切换成功')
      return data
    } catch (error) {
      ElMessage.error(`账号切换失败: ${error.message}`)
      throw error
    } finally {
      isConnecting.value = false
    }
  }

  /**
   * 登出当前账号
   */
  const logout = async () => {
    try {
      await callProxyApi(PROXY_CONFIG.endpoints.logout, {
        method: 'POST'
      })

      currentAccount.value = null
      ElMessage.success('已登出当前账号')
    } catch (error) {
      ElMessage.error(`登出失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 通过协议调用本地程序
   */
  const callProtocol = (action, data = {}) => {
    try {
      const params = new URLSearchParams(data).toString()
      const protocolUrl = `augment-switch://${action}${params ? '?' + params : ''}`

      // 尝试调用协议
      window.location.href = protocolUrl

      return true
    } catch (error) {
      console.warn('协议调用失败:', error)
      return false
    }
  }

  /**
   * 检测协议支持
   */
  const checkProtocolSupport = () => {
    return new Promise((resolve) => {
      // 创建一个隐藏的iframe来测试协议
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'augment-switch://ping'

      let resolved = false

      // 设置超时
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          document.body.removeChild(iframe)
          resolve(false)
        }
      }, 2000)

      // 监听加载事件
      iframe.onload = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          document.body.removeChild(iframe)
          resolve(true)
        }
      }

      iframe.onerror = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          document.body.removeChild(iframe)
          resolve(false)
        }
      }

      document.body.appendChild(iframe)
    })
  }

  /**
   * 注册协议处理器（如果支持）
   */
  const registerProtocolHandler = () => {
    if ('registerProtocolHandler' in navigator) {
      try {
        navigator.registerProtocolHandler(
          'augment-switch',
          window.location.origin + '/tools/dev/augment-token-manager?protocol=%s',
          'Augment Token Manager'
        )
        return true
      } catch (error) {
        console.warn('协议注册失败:', error)
        return false
      }
    }
    return false
  }

  /**
   * 智能切换账号（优先使用HTTP，备用协议）
   */
  const smartSwitchAccount = async (accountData) => {
    // 优先尝试HTTP API
    if (proxyStatus.isAvailable) {
      try {
        return await switchAccount(accountData)
      } catch (error) {
        console.warn('HTTP切换失败，尝试协议方式:', error)
      }
    }

    // 备用协议方式
    const success = callProtocol('switch-account', {
      tenant_url: accountData.tenant_url,
      access_token: accountData.access_token
    })

    if (success) {
      ElMessage.info('已通过协议切换账号，请检查桌面应用')
    } else {
      ElMessage.error('账号切换失败，请确保桌面应用正在运行')
    }

    return success
  }

  /**
   * 定期检查服务状态
   */
  let statusCheckInterval = null

  const startStatusCheck = () => {
    if (statusCheckInterval) return

    statusCheckInterval = setInterval(async () => {
      if (proxyStatus.isAvailable) {
        try {
          await getServiceStatus()
        } catch (error) {
          // 服务可能已断开，重新发现
          await discoverService()
        }
      } else {
        // 尝试重新发现服务
        await discoverService()
      }
    }, PROXY_CONFIG.retryInterval)
  }

  const stopStatusCheck = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }
  }

  // 计算属性
  const hasAdvancedFeatures = computed(() => {
    return proxyStatus.isAvailable && proxyStatus.features.includes('account-switching')
  })

  const connectionStatus = computed(() => {
    if (proxyStatus.isChecking) return 'checking'
    if (proxyStatus.isAvailable) return 'connected'
    return 'disconnected'
  })

  const statusText = computed(() => {
    switch (connectionStatus.value) {
      case 'checking':
        return '正在检测本地服务...'
      case 'connected':
        return `已连接到本地服务 (${proxyStatus.version || 'unknown'})`
      case 'disconnected':
        return proxyStatus.error || '本地服务不可用'
      default:
        return '未知状态'
    }
  })

  // 生命周期
  onMounted(() => {
    // 初始检测
    discoverService()
    // 开始定期检查
    startStatusCheck()
  })

  onUnmounted(() => {
    stopStatusCheck()
  })

  return {
    // 状态
    proxyStatus,
    isConnecting,
    accounts,
    currentAccount,

    // 计算属性
    hasAdvancedFeatures,
    connectionStatus,
    statusText,

    // 方法
    discoverService,
    getServiceStatus,
    getAccounts,
    getCurrentAccount,
    switchAccount,
    logout,
    callProtocol,
    checkProtocolSupport,
    registerProtocolHandler,
    smartSwitchAccount,
    startStatusCheck,
    stopStatusCheck,

    // 配置
    PROXY_CONFIG
  }
}
