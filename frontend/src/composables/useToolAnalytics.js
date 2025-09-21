import { ref, onMounted, onUnmounted } from 'vue'
import { recordToolUsage } from '@/api/tools'

/**
 * 工具使用统计组合式函数
 */
export function useToolAnalytics(toolId) {
  const startTime = ref(null)
  const isTracking = ref(false)
  const usageData = ref({
    action: 'use',
    duration: 0,
    metadata: {}
  })

  // 开始跟踪使用
  const startTracking = (action = 'use', metadata = {}) => {
    startTime.value = Date.now()
    isTracking.value = true
    usageData.value = {
      action,
      duration: 0,
      metadata: {
        startTime: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        ...metadata
      }
    }
  }

  // 停止跟踪并记录使用
  const stopTracking = async (additionalMetadata = {}) => {
    if (!isTracking.value || !startTime.value) {
      return
    }

    const endTime = Date.now()
    const duration = Math.floor((endTime - startTime.value) / 1000) // 转换为秒

    try {
      await recordToolUsage(toolId, {
        ...usageData.value,
        duration,
        metadata: {
          ...usageData.value.metadata,
          endTime: new Date().toISOString(),
          ...additionalMetadata
        }
      })
      
      console.log(`工具 ${toolId} 使用记录已保存，使用时长: ${duration}秒`)
    } catch (error) {
      console.error('记录工具使用失败:', error)
    } finally {
      isTracking.value = false
      startTime.value = null
    }
  }

  // 记录单次使用（不需要持续跟踪）
  const recordUsage = async (action = 'use', metadata = {}) => {
    try {
      await recordToolUsage(toolId, {
        action,
        duration: 0,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          ...metadata
        }
      })
      
      console.log(`工具 ${toolId} 使用记录已保存`)
    } catch (error) {
      console.error('记录工具使用失败:', error)
    }
  }

  // 记录工具查看
  const recordView = () => {
    return recordUsage('view', {
      action: 'view',
      timestamp: new Date().toISOString()
    })
  }

  // 记录工具下载
  const recordDownload = (filename = '', fileSize = 0) => {
    return recordUsage('download', {
      action: 'download',
      filename,
      fileSize,
      timestamp: new Date().toISOString()
    })
  }

  // 记录工具分享
  const recordShare = (platform = '') => {
    return recordUsage('share', {
      action: 'share',
      platform,
      timestamp: new Date().toISOString()
    })
  }

  // 记录工具收藏
  const recordFavorite = () => {
    return recordUsage('favorite', {
      action: 'favorite',
      timestamp: new Date().toISOString()
    })
  }

  // 页面可见性变化处理
  const handleVisibilityChange = () => {
    if (document.hidden && isTracking.value) {
      // 页面隐藏时暂停跟踪
      stopTracking({ reason: 'page_hidden' })
    }
  }

  // 页面卸载处理
  const handleBeforeUnload = () => {
    if (isTracking.value) {
      stopTracking({ reason: 'page_unload' })
    }
  }

  // 组件挂载时自动记录查看
  onMounted(() => {
    recordView()
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听页面卸载
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  // 组件卸载时清理
  onUnmounted(() => {
    if (isTracking.value) {
      stopTracking({ reason: 'component_unmount' })
    }
    
    // 移除事件监听器
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    isTracking,
    startTracking,
    stopTracking,
    recordUsage,
    recordView,
    recordDownload,
    recordShare,
    recordFavorite
  }
}
