import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { resendVerificationEmail, getVerificationStatus } from '@/api/auth'
import { useUserStore } from './user'

/**
 * 邮箱验证状态管理 Store
 */
export const useEmailVerificationStore = defineStore('emailVerification', () => {
  // 状态
  const isResending = ref(false)
  const lastResendTime = ref(null)
  const resendCooldown = ref(0)
  const verificationReminders = ref(new Set())
  
  // 计算属性
  const canResend = computed(() => {
    return resendCooldown.value === 0 && !isResending.value
  })
  
  const resendButtonText = computed(() => {
    if (isResending.value) {
      return '发送中...'
    }
    if (resendCooldown.value > 0) {
      return `${resendCooldown.value}秒后可重发`
    }
    return '重新发送验证邮件'
  })
  
  // 获取用户 store
  const userStore = useUserStore()
  
  // 需要邮箱验证的用户
  const needsVerification = computed(() => {
    return userStore.isLoggedIn && 
           userStore.user && 
           !userStore.user.emailVerified && 
           !userStore.user.isAdmin
  })
  
  // 方法
  
  /**
   * 重发验证邮件
   * @param {string} email - 邮箱地址
   */
  const resendVerification = async (email) => {
    if (!canResend.value) {
      return false
    }
    
    isResending.value = true
    
    try {
      await resendVerificationEmail(email)
      
      ElNotification({
        title: '发送成功',
        message: '验证邮件已发送，请检查您的邮箱',
        type: 'success',
        duration: 5000
      })
      
      // 开始冷却倒计时
      startCooldown(300) // 5分钟
      
      return true
    } catch (error) {
      console.error('重发验证邮件失败:', error)
      ElMessage.error(error.response?.data?.message || '发送失败，请稍后重试')
      return false
    } finally {
      isResending.value = false
    }
  }
  
  /**
   * 开始冷却倒计时
   * @param {number} seconds - 冷却秒数
   */
  const startCooldown = (seconds) => {
    resendCooldown.value = seconds
    lastResendTime.value = Date.now()
    
    const timer = setInterval(() => {
      resendCooldown.value--
      if (resendCooldown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }
  
  /**
   * 检查验证状态
   * @param {string} email - 邮箱地址
   */
  const checkVerificationStatus = async (email) => {
    try {
      const response = await getVerificationStatus(email)
      return response.data.data
    } catch (error) {
      console.error('检查验证状态失败:', error)
      return null
    }
  }
  
  /**
   * 标记功能提醒已显示
   * @param {string} feature - 功能名称
   */
  const markReminderShown = (feature) => {
    verificationReminders.value.add(feature)
  }
  
  /**
   * 检查功能提醒是否已显示
   * @param {string} feature - 功能名称
   */
  const isReminderShown = (feature) => {
    return verificationReminders.value.has(feature)
  }
  
  /**
   * 清除所有提醒记录
   */
  const clearReminders = () => {
    verificationReminders.value.clear()
  }
  
  /**
   * 处理验证成功
   */
  const handleVerificationSuccess = () => {
    // 清除冷却时间
    resendCooldown.value = 0
    lastResendTime.value = null
    
    // 清除提醒记录
    clearReminders()
    
    // 显示成功通知
    ElNotification({
      title: '🎉 邮箱验证成功',
      message: '恭喜！您现在可以使用所有功能了',
      type: 'success',
      duration: 5000
    })
    
    // 更新用户信息
    userStore.fetchUserInfo()
  }
  
  /**
   * 获取验证提示信息
   */
  const getVerificationHints = () => {
    if (!needsVerification.value) {
      return null
    }
    
    return {
      email: userStore.user.email,
      canResend: canResend.value,
      resendButtonText: resendButtonText.value,
      steps: [
        '打开您的邮箱应用或网页版邮箱',
        '查找来自我们的验证邮件（检查垃圾邮件文件夹）',
        '点击邮件中的"验证邮箱"按钮',
        '完成验证，开始使用完整功能'
      ],
      troubleshooting: [
        '检查垃圾邮件文件夹 - 验证邮件可能被误判',
        '确认邮箱地址正确 - 检查注册时填写的邮箱',
        '等待几分钟 - 邮件发送可能需要一些时间',
        '重新发送 - 点击"重新发送验证邮件"按钮',
        '联系客服 - 如果问题持续存在'
      ]
    }
  }
  
  /**
   * 初始化 store
   */
  const initialize = () => {
    // 恢复冷却状态
    const savedTime = localStorage.getItem('emailVerificationLastResend')
    if (savedTime) {
      const elapsed = Math.floor((Date.now() - parseInt(savedTime)) / 1000)
      const remaining = Math.max(0, 300 - elapsed) // 5分钟冷却
      if (remaining > 0) {
        startCooldown(remaining)
      }
    }
    
    // 监听用户状态变化
    userStore.$subscribe((mutation, state) => {
      if (state.user?.emailVerified) {
        clearReminders()
      }
    })
  }
  
  /**
   * 保存冷却状态到本地存储
   */
  const saveCooldownState = () => {
    if (lastResendTime.value) {
      localStorage.setItem('emailVerificationLastResend', lastResendTime.value.toString())
    }
  }
  
  // 监听冷却状态变化，保存到本地存储
  const unwatchCooldown = computed(() => {
    if (lastResendTime.value) {
      saveCooldownState()
    }
  })
  
  return {
    // 状态
    isResending,
    lastResendTime,
    resendCooldown,
    verificationReminders,
    
    // 计算属性
    canResend,
    resendButtonText,
    needsVerification,
    
    // 方法
    resendVerification,
    startCooldown,
    checkVerificationStatus,
    markReminderShown,
    isReminderShown,
    clearReminders,
    handleVerificationSuccess,
    getVerificationHints,
    initialize,
    saveCooldownState
  }
})
