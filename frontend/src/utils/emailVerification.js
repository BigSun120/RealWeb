import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { resendVerificationEmail } from '@/api/auth'

/**
 * 邮箱验证相关的用户体验工具函数
 */

/**
 * 显示邮箱验证提醒对话框
 * @param {Object} options - 配置选项
 * @param {string} options.email - 用户邮箱
 * @param {string} options.feature - 功能名称
 * @param {Function} options.onVerified - 验证成功回调
 */
export const showEmailVerificationDialog = async (options = {}) => {
  const { email, feature = '此功能', onVerified } = options

  try {
    await ElMessageBox.confirm(
      `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; color: #409eff; margin-bottom: 16px;">📧</div>
          <h3 style="color: #409eff; margin-bottom: 16px;">需要验证邮箱</h3>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            使用 <strong>${feature}</strong> 需要先验证您的邮箱地址。<br>
            我们已向 <strong style="color: #409eff;">${email}</strong> 发送了验证邮件。
          </p>
          <div style="background: #f8f9fa; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <i class="fas fa-lightbulb" style="color: #409eff; margin-right: 8px;"></i>
              请检查您的邮箱（包括垃圾邮件文件夹），点击验证链接完成验证。
            </p>
          </div>
        </div>
      `,
      '邮箱验证',
      {
        confirmButtonText: '重新发送验证邮件',
        cancelButtonText: '稍后验证',
        type: 'info',
        dangerouslyUseHTMLString: true,
        customClass: 'email-verification-dialog',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            handleResendVerification(email, instance, done)
          } else {
            done()
          }
        }
      }
    )
  } catch (error) {
    // 用户取消或关闭对话框
    console.log('用户取消邮箱验证对话框')
  }
}

/**
 * 处理重发验证邮件
 * @param {string} email - 邮箱地址
 * @param {Object} instance - MessageBox 实例
 * @param {Function} done - 完成回调
 */
const handleResendVerification = async (email, instance, done) => {
  // 显示加载状态
  instance.confirmButtonLoading = true
  instance.confirmButtonText = '发送中...'

  try {
    await resendVerificationEmail(email)
    
    ElNotification({
      title: '发送成功',
      message: '验证邮件已重新发送，请检查您的邮箱',
      type: 'success',
      duration: 5000
    })
    
    done()
  } catch (error) {
    console.error('重发验证邮件失败:', error)
    ElMessage.error(error.response?.data?.message || '发送失败，请稍后重试')
    
    // 恢复按钮状态
    instance.confirmButtonLoading = false
    instance.confirmButtonText = '重新发送验证邮件'
  }
}

/**
 * 显示功能受限提示
 * @param {string} feature - 功能名称
 * @param {string} reason - 受限原因
 */
export const showFeatureRestrictedNotification = (feature = '此功能', reason = '需要验证邮箱') => {
  ElNotification({
    title: `${feature}暂时不可用`,
    message: `${reason}后才能使用此功能。请先完成邮箱验证。`,
    type: 'warning',
    duration: 4000,
    customClass: 'feature-restricted-notification'
  })
}

/**
 * 显示验证成功通知
 * @param {Object} options - 配置选项
 */
export const showVerificationSuccessNotification = (options = {}) => {
  const { 
    title = '邮箱验证成功', 
    message = '恭喜！您现在可以使用所有功能了',
    duration = 5000 
  } = options

  ElNotification({
    title,
    message,
    type: 'success',
    duration,
    customClass: 'verification-success-notification'
  })
}

/**
 * 检查邮箱验证状态并显示相应提示
 * @param {Object} user - 用户对象
 * @param {string} feature - 功能名称
 * @returns {boolean} - 是否已验证
 */
export const checkEmailVerificationStatus = (user, feature = '此功能') => {
  if (!user) {
    ElMessage.warning('请先登录')
    return false
  }

  if (user.isAdmin) {
    return true // 管理员跳过验证
  }

  if (!user.emailVerified) {
    showEmailVerificationDialog({
      email: user.email,
      feature
    })
    return false
  }

  return true
}

/**
 * 创建邮箱验证状态监听器
 * @param {Function} callback - 状态变化回调
 */
export const createEmailVerificationWatcher = (callback) => {
  // 监听本地存储变化（用于跨标签页同步）
  const handleStorageChange = (event) => {
    if (event.key === 'emailVerificationStatus') {
      const status = JSON.parse(event.newValue || '{}')
      callback(status)
    }
  }

  window.addEventListener('storage', handleStorageChange)

  // 返回清理函数
  return () => {
    window.removeEventListener('storage', handleStorageChange)
  }
}

/**
 * 更新邮箱验证状态到本地存储
 * @param {boolean} verified - 验证状态
 * @param {string} email - 邮箱地址
 */
export const updateEmailVerificationStatus = (verified, email) => {
  const status = {
    verified,
    email,
    timestamp: Date.now()
  }
  
  localStorage.setItem('emailVerificationStatus', JSON.stringify(status))
  
  // 触发自定义事件
  window.dispatchEvent(new CustomEvent('emailVerificationChanged', {
    detail: status
  }))
}

/**
 * 获取邮箱验证友好提示文本
 * @param {Object} user - 用户对象
 * @returns {Object} - 提示文本对象
 */
export const getEmailVerificationHints = (user) => {
  if (!user || user.emailVerified || user.isAdmin) {
    return null
  }

  const hints = {
    banner: {
      title: '📧 邮箱验证提醒',
      message: `您的邮箱 ${user.email} 尚未验证。验证后可享受完整功能！`,
      action: '立即验证'
    },
    feature: {
      comment: '发表评论需要先验证邮箱',
      article: '发布文章需要先验证邮箱',
      upload: '上传文件需要先验证邮箱',
      profile: '修改个人资料需要先验证邮箱'
    },
    steps: [
      '打开您的邮箱应用',
      '查找验证邮件（检查垃圾邮件文件夹）',
      '点击邮件中的验证链接',
      '完成验证，享受完整功能'
    ]
  }

  return hints
}

/**
 * 邮箱验证相关的 CSS 样式
 */
export const emailVerificationStyles = `
  .email-verification-dialog .el-message-box {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .email-verification-dialog .el-message-box__header {
    background: linear-gradient(135deg, #409eff, #67c23a);
    color: white;
    padding: 20px;
  }
  
  .email-verification-dialog .el-message-box__title {
    color: white;
  }
  
  .feature-restricted-notification {
    border-left: 4px solid #e6a23c;
  }
  
  .verification-success-notification {
    border-left: 4px solid #67c23a;
  }
`

// 自动注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = emailVerificationStyles
  document.head.appendChild(styleElement)
}
