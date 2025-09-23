<template>
  <div :class="['temp-email-helper', helperClass, { collapsed: isCollapsed }]" v-if="visible">
    <!-- 折叠状态：仅显示邮件图标 -->
    <div v-if="isCollapsed" class="collapsed-helper" @click="toggleCollapse" title="展开临时邮箱助手">
      <el-icon class="collapsed-icon">
        <Message />
      </el-icon>
    </div>

    <!-- 展开状态：完整助手界面 -->
    <el-card v-else class="helper-card" shadow="always">
      <!-- 标题栏 -->
      <template #header>
        <div class="helper-header">
          <div class="header-left">
            <el-icon class="header-icon" color="#48bb78">
              <Message />
            </el-icon>
            <span class="header-title">临时邮箱助手</span>
          </div>
          <div class="header-actions">
            <el-button type="text" size="small" @click="toggleCollapse" class="collapse-btn" title="收起助手">
              <el-icon>
                <ArrowUp />
              </el-icon>
            </el-button>
            <el-button type="text" size="small" @click="$emit('close')" class="close-btn" title="关闭助手">
              <el-icon>
                <Close />
              </el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <!-- 主内容区 -->
      <!-- 权限检查 -->
      <div v-if="!hasPermission" class="permission-required">
        <el-alert title="需要权限" description="使用临时邮箱功能需要先激活权限" type="warning" :closable="false" show-icon />
        <el-button type="primary" size="small" @click="$emit('permission-denied')" class="activate-btn">
          激活权限
        </el-button>
      </div>

      <!-- 主功能区 -->
      <div v-else class="helper-content">
        <!-- 邮箱生成区 -->
        <div class="email-generation">
          <div class="generation-row">
            <el-input
              v-model="emailPrefix"
              placeholder="自定义前缀(可选)"
              size="small"
              class="prefix-input"
              clearable
              maxlength="20"
              show-word-limit
              @keyup.enter="generateEmail"
              @input="validatePrefix"
            />
            <span class="at-symbol">@</span>
            <el-select v-model="selectedDomain" placeholder="选择域名" size="small" class="domain-select">
              <el-option v-for="domain in availableDomains" :key="domain" :label="domain" :value="domain" />
            </el-select>
            <el-button type="primary" size="small" @click="generateEmail" :loading="generating"
              :disabled="!selectedDomain" class="generate-btn">
              {{ generating ? '生成中' : '生成邮箱' }}
            </el-button>
          </div>
        </div>

        <!-- 当前邮箱显示 -->
        <div v-if="currentEmail" class="current-email">
          <div class="email-label">
            <el-icon class="label-icon" color="#48bb78">
              <Message />
            </el-icon>
            <span>当前邮箱：</span>
          </div>
          <div class="email-value">
            <span class="email-text">{{ currentEmail }}</span>
            <el-button type="text" size="small" @click="copyEmail" class="copy-btn">
              <el-icon>
                <DocumentCopy />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 验证码显示 -->
        <transition name="code-appear" appear>
          <div v-if="latestVerificationCode" class="verification-code">
            <div class="code-label">
              <el-icon class="label-icon" color="#e53e3e">
                <Key />
              </el-icon>
              <span>最新验证码：</span>
            </div>
            <div class="code-value">
              <el-tag type="danger" size="large" class="code-tag">
                {{ latestVerificationCode }}
              </el-tag>
              <el-button type="primary" size="small" @click="copyCode" class="copy-code-btn">
                <el-icon>
                  <DocumentCopy />
                </el-icon>
                复制验证码
              </el-button>
            </div>
            <div v-if="codeTimestamp" class="code-time">
              <el-icon class="time-icon" color="#718096">
                <Clock />
              </el-icon>
              <span class="time-text">{{ formatTime(codeTimestamp) }}</span>
            </div>
          </div>
        </transition>

        <!-- 状态栏 -->
        <div class="status-bar">
          <div class="status-left">
            <el-icon :class="['status-icon', autoRefresh ? 'refreshing' : '']"
              :color="autoRefresh ? '#48bb78' : '#a0aec0'">
              <Refresh />
            </el-icon>
            <span class="status-text">
              {{ autoRefresh ? '自动刷新中...' : '已暂停刷新' }}
            </span>
          </div>
          <div class="status-actions">
            <el-button type="text" size="small" @click="manualRefresh" :loading="checking" class="manual-refresh-btn"
              title="手动刷新">
              <el-icon>
                <Refresh />
              </el-icon>
            </el-button>
            <el-button type="text" size="small" @click="toggleAutoRefresh" class="toggle-btn">
              {{ autoRefresh ? '暂停' : '开始' }}
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Message,
  Close,
  InfoFilled,
  DocumentCopy,
  Key,
  Clock,
  Refresh,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import { tempEmailApi } from '@/api/tempEmail'
import { tempEmailAuthApi } from '@/api/tempEmailAuth'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: String,
    default: 'right',
    validator: (value) => ['right', 'left', 'center'].includes(value)
  },
  refreshInterval: {
    type: Number,
    default: 10
  }
})

// Events
const emit = defineEmits([
  'close',
  'email-generated',
  'verification-code',
  'copy-email',
  'copy-code',
  'permission-denied'
])

// 折叠状态
const isCollapsed = ref(false)

// 响应式数据
const hasPermission = ref(false)
const availableDomains = ref([])
const selectedDomain = ref('')
const emailPrefix = ref('')
const currentEmail = ref('')
const latestVerificationCode = ref('')
const codeTimestamp = ref(null)
const autoRefresh = ref(true)
const generating = ref(false)
const loading = ref(false)
const checking = ref(false)

// 定时器
let refreshTimer = null
let permissionCheckTimer = null

// 计算属性
const helperClass = computed(() => {
  return `temp-email-helper--${props.position}`
})

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 方法
const checkPermission = async () => {
  try {
    const response = await tempEmailAuthApi.checkAccessStatus()
    hasPermission.value = response.data.hasAccess

    if (!hasPermission.value) {
      console.warn('用户没有临时邮箱权限')
    }

    return hasPermission.value
  } catch (error) {
    console.error('权限检查失败:', error)
    hasPermission.value = false

    // 根据错误类型提供不同的处理
    if (error.response?.status === 401) {
      ElMessage.warning('请先登录')
      emit('permission-denied')
    } else if (error.response?.status === 403) {
      ElMessage.warning('需要激活临时邮箱权限')
      emit('permission-denied')
    } else {
      ElMessage.error('权限检查失败，请稍后重试')
    }

    return false
  }
}

const loadDomains = async () => {
  try {
    const response = await tempEmailApi.getDomains()

    if (response.data.success) {
      availableDomains.value = response.data.data

      // 默认选择第一个域名
      if (availableDomains.value.length > 0 && !selectedDomain.value) {
        selectedDomain.value = availableDomains.value[0]
      }

      if (availableDomains.value.length === 0) {
        ElMessage.warning('暂无可用的邮箱域名')
      }
    } else {
      throw new Error(response.data.message || '获取域名列表失败')
    }
  } catch (error) {
    console.error('加载域名失败:', error)

    if (error.response?.status === 403) {
      ElMessage.warning('权限不足，无法加载域名列表')
      emit('permission-denied')
    } else if (error.response?.status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else {
      ElMessage.error('加载域名失败，请检查网络连接')
    }
  }
}

const generateEmail = async () => {
  if (!selectedDomain.value) {
    ElMessage.warning('请选择邮箱域名')
    return
  }

  // 验证自定义前缀
  if (emailPrefix.value && emailPrefix.value.trim()) {
    const prefix = emailPrefix.value.trim()
    // 检查前缀是否符合邮箱用户名规范
    if (!/^[a-zA-Z0-9._-]+$/.test(prefix)) {
      ElMessage.warning('前缀只能包含字母、数字、点号、下划线和连字符')
      return
    }
    if (prefix.length < 2) {
      ElMessage.warning('前缀至少需要2个字符')
      return
    }
  }

  try {
    generating.value = true
    const params = {
      domain: selectedDomain.value
    }

    // 如果有自定义前缀，添加到参数中
    if (emailPrefix.value && emailPrefix.value.trim()) {
      params.customName = emailPrefix.value.trim()
    }

    const response = await tempEmailApi.generateEmail(params)

    if (response.data.success) {
      currentEmail.value = response.data.data.email
      latestVerificationCode.value = ''
      codeTimestamp.value = null

      // 清空前缀输入框
      emailPrefix.value = ''

      ElMessage.success('邮箱生成成功')
      emit('email-generated', currentEmail.value)

      // 开始监控邮件
      startMonitoring()
    } else {
      throw new Error(response.data.message || '生成邮箱失败')
    }
  } catch (error) {
    console.error('生成邮箱失败:', error)

    if (error.response?.status === 403) {
      ElMessage.warning('权限不足，无法生成临时邮箱')
      emit('permission-denied')
    } else if (error.response?.status === 429) {
      ElMessage.warning('请求过于频繁，请稍后再试')
    } else if (error.response?.status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else {
      ElMessage.error(error.message || '生成邮箱失败，请重试')
    }
  } finally {
    generating.value = false
  }
}

const copyEmail = async () => {
  if (!currentEmail.value) return

  try {
    await navigator.clipboard.writeText(currentEmail.value)
    ElMessage.success('邮箱已复制到剪贴板')
    emit('copy-email', currentEmail.value)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const copyCode = async () => {
  if (!latestVerificationCode.value) return

  try {
    await navigator.clipboard.writeText(latestVerificationCode.value)
    ElMessage.success('验证码已复制到剪贴板')
    emit('copy-code', latestVerificationCode.value)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value && currentEmail.value) {
    startMonitoring()
  } else {
    stopMonitoring()
  }
}

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const manualRefresh = async () => {
  if (!currentEmail.value || checking.value) return

  checking.value = true
  try {
    await checkForNewMessages()
    ElMessage.success('刷新完成')
  } catch (error) {
    console.error('手动刷新失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    checking.value = false
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''

  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return '刚刚收到'
  if (diffMins < 60) return `${diffMins}分钟前收到`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}小时前收到`

  return time.toLocaleDateString()
}

// 验证前缀输入
const validatePrefix = (value) => {
  if (!value || !value.trim()) return

  const prefix = value.trim()
  // 移除不符合规范的字符
  const validPrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, '')

  if (validPrefix !== prefix) {
    emailPrefix.value = validPrefix
  }
}



// 验证码提取函数 - 增强版
const extractVerificationCode = (emailContent) => {
  if (!emailContent) return null

  // 清理HTML标签，保留文本内容，但保留一些结构信息
  let cleanContent = emailContent
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除脚本
    .replace(/<style[^>]*>.*?<\/style>/gi, '') // 移除样式
    .replace(/<[^>]*>/g, ' ') // 移除其他HTML标签
    .replace(/\s+/g, ' ') // 合并空白字符
    .trim()

  // 验证码提取规则（按优先级排序，更精确的匹配）
  const rules = [
    // 1. 明确的验证码关键词后的代码（最高优先级）
    {
      pattern: /(?:verification\s*code|verify\s*code|验证码|激活码|确认码)[：:\s]*([A-Z0-9]{4,8})/gi,
      priority: 10,
      description: '关键词后的验证码'
    },

    // 2. 邮件主题或标题中的验证码
    {
      pattern: /(?:your\s*code|code\s*is|代码是)[：:\s]*([A-Z0-9]{4,8})/gi,
      priority: 9,
      description: '主题中的验证码'
    },

    // 3. 6位纯数字验证码（最常见）
    {
      pattern: /\b\d{6}\b/g,
      priority: 8,
      description: '6位数字验证码'
    },

    // 4. 4-8位纯数字验证码
    {
      pattern: /\b\d{4,8}\b/g,
      priority: 7,
      description: '4-8位数字验证码'
    },

    // 5. 字母数字混合验证码（大写）
    {
      pattern: /\b[A-Z0-9]{4,8}\b/g,
      priority: 6,
      description: '字母数字混合验证码'
    },

    // 6. 特殊格式验证码（如：123-456, 123 456）
    {
      pattern: /\b\d{3}[-\s]\d{3}\b/g,
      priority: 5,
      description: '分隔符格式验证码'
    },

    // 7. 邮件中突出显示的代码（从原始HTML中提取）
    {
      pattern: /<(?:strong|b|em|span|div)[^>]*>([A-Z0-9]{4,8})<\/(?:strong|b|em|span|div)>/gi,
      priority: 4,
      description: 'HTML突出显示的验证码',
      useOriginal: true
    }
  ]

  const candidates = []

  // 按优先级提取所有可能的验证码
  for (const rule of rules) {
    const content = rule.useOriginal ? emailContent : cleanContent
    const matches = content.match(rule.pattern)

    if (matches && matches.length > 0) {
      for (const match of matches) {
        // 提取纯字母数字字符
        let code = match.replace(/[^A-Z0-9]/gi, '')

        // 验证码长度检查
        if (code.length >= 4 && code.length <= 8) {
          candidates.push({
            code: code.toUpperCase(),
            priority: rule.priority,
            description: rule.description,
            originalMatch: match
          })
        }
      }
    }
  }

  // 如果没有找到候选验证码，返回null
  if (candidates.length === 0) {
    return null
  }

  // 按优先级排序，选择最佳候选
  candidates.sort((a, b) => b.priority - a.priority)

  // 移除过滤逻辑，直接返回最佳候选验证码
  return candidates.length > 0 ? candidates[0].code : null
}

const checkForNewMessages = async () => {
  if (!currentEmail.value || !autoRefresh.value) return

  try {
    const response = await tempEmailApi.getMessages(currentEmail.value)

    // 检查API响应结构
    if (!response.data.success) {
      console.warn('获取邮件失败:', response.data.message)
      return
    }

    const messages = response.data.data?.messages || []



    // 邮件去重：仅基于邮件ID进行去重
    const uniqueMessages = messages.filter((message, index, self) => {
      return index === self.findIndex(m => m.id === message.id)
    })

    if (uniqueMessages.length > 0) {
      // 检查所有新邮件，不只是最新的一封
      for (const message of uniqueMessages.slice(0, 3)) { // 检查最新的3封邮件
        try {
          const detailResponse = await tempEmailApi.getMessage(currentEmail.value, message.id)

          // 检查邮件详情API响应结构
          if (!detailResponse.data.success) {
            console.warn('获取邮件详情失败:', detailResponse.data.message)
            continue
          }

          const messageDetail = detailResponse.data.data

          // 智能提取验证码 - 尝试多种内容源
          let emailContent = ''

          // 优先使用HTML内容（通常包含更多格式信息）
          if (messageDetail.body?.html) {
            emailContent = messageDetail.body.html
          } else if (messageDetail.body?.text) {
            emailContent = messageDetail.body.text
          } else if (messageDetail.subject) {
            // 如果邮件正文为空，尝试从主题中提取
            emailContent = messageDetail.subject
          }

          // 合并主题和正文进行更全面的检测
          const fullContent = `${messageDetail.subject || ''} ${emailContent}`.trim()

          const code = extractVerificationCode(fullContent)

          if (code && code !== latestVerificationCode.value) {
            latestVerificationCode.value = code
            codeTimestamp.value = new Date(message.date)

            ElMessage.success('检测到新的验证码！')
            emit('verification-code', code, codeTimestamp.value)

            // 找到验证码后停止检查其他邮件
            break
          }
        } catch (detailError) {
          console.warn('获取邮件详情失败:', detailError)
          // 继续检查下一封邮件
          continue
        }
      }
    }
  } catch (error) {
    console.error('检查邮件失败:', error)
    // 如果是权限问题，停止监控
    if (error.response?.status === 403) {
      autoRefresh.value = false
      stopMonitoring()
      ElMessage.warning('权限已失效，请重新激活')
      emit('permission-denied')
    }
  }
}

// 防抖的邮件检查函数
const debouncedCheckMessages = debounce(checkForNewMessages, 1000)

const startMonitoring = () => {
  stopMonitoring() // 先停止现有的监控

  if (autoRefresh.value && currentEmail.value) {
    refreshTimer = setInterval(debouncedCheckMessages, props.refreshInterval * 1000)
    // 立即检查一次
    debouncedCheckMessages()
  }
}

const stopMonitoring = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startPermissionMonitoring = () => {
  stopPermissionMonitoring()

  // 每30秒检查一次权限状态
  permissionCheckTimer = setInterval(async () => {
    if (!props.visible) return

    try {
      const hasAccess = await checkPermission()
      if (!hasAccess && hasPermission.value) {
        // 权限被撤销
        hasPermission.value = false
        stopMonitoring()
        ElMessage.warning('临时邮箱权限已失效')
        emit('permission-denied')
      }
    } catch (error) {
      console.warn('权限监控检查失败:', error)
    }
  }, 30000)
}

const stopPermissionMonitoring = () => {
  if (permissionCheckTimer) {
    clearInterval(permissionCheckTimer)
    permissionCheckTimer = null
  }
}

// 监听器
watch(() => props.visible, (newVal) => {
  if (newVal) {
    init()
    startPermissionMonitoring()
  } else {
    stopMonitoring()
    stopPermissionMonitoring()
  }
})

watch(autoRefresh, (newVal) => {
  if (newVal && currentEmail.value) {
    startMonitoring()
  } else {
    stopMonitoring()
  }
})

// 初始化
const init = async () => {
  loading.value = true
  try {
    const hasAccess = await checkPermission()
    if (hasAccess) {
      await loadDomains()
    }
  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    loading.value = false
  }
}



// 生命周期
onMounted(() => {
  if (props.visible) {
    init()
  }
})

onUnmounted(() => {
  stopMonitoring()
  stopPermissionMonitoring()
})
</script>

<style scoped>
.temp-email-helper {
  position: fixed;
  z-index: 2000;
}

/* 展开状态位置 */
.temp-email-helper:not(.collapsed) {
  top: 50%;
  transform: translateY(-50%);
  max-width: 320px;
  min-width: 280px;
}

.temp-email-helper--right:not(.collapsed) {
  right: 20px;
}

.temp-email-helper--left:not(.collapsed) {
  left: 20px;
}

.temp-email-helper--center:not(.collapsed) {
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 折叠状态位置 - 靠近滚动条 */
.temp-email-helper.collapsed {
  top: 50%;
  transform: translateY(-50%);
}

.temp-email-helper--right.collapsed {
  right: 8px; /* 更靠近滚动条 */
}

.temp-email-helper--left.collapsed {
  left: 8px;
}

.temp-email-helper--center.collapsed {
  right: 8px; /* center模式下也放在右侧 */
}

/* 折叠状态样式 */
.collapsed-helper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #48bb78, #38a169);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(72, 187, 120, 0.3);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.collapsed-helper:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(72, 187, 120, 0.4);
}

.collapsed-icon {
  font-size: 24px;
  color: white;
  transition: transform 0.3s ease;
}

.collapsed-helper:hover .collapsed-icon {
  transform: scale(1.1);
}

/* 展开状态样式 */
.helper-card {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.helper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-weight: 600;
  color: #2d3748;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.collapse-btn {
  padding: 4px;
  color: #718096;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  color: #3182ce;
  transform: scale(1.1);
}

.close-btn {
  padding: 4px;
  color: #718096;
}

.close-btn:hover {
  color: #e53e3e;
}

.collapsible-content {
  transition: all 0.3s ease;
  overflow: hidden;
}

.permission-required {
  text-align: center;
  padding: 16px 0;
}

.activate-btn {
  margin-top: 12px;
}

.helper-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.smart-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #ebf8ff 0%, #f0fff4 100%);
  border-radius: 8px;
  border-left: 4px solid #3182ce;
}

.hint-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.hint-text {
  font-size: 13px;
  color: #2d3748;
  line-height: 1.4;
}

.generation-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.prefix-input {
  flex: 1;
  min-width: 80px;
}

.at-symbol {
  font-weight: 600;
  color: #4a5568;
  font-size: 14px;
  padding: 0 2px;
}

.domain-select {
  flex: 1;
  min-width: 100px;
}

.generate-btn {
  flex-shrink: 0;
}

.current-email,
.verification-code {
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.email-label,
.code-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #4a5568;
}

.label-icon {
  font-size: 14px;
}

.email-value,
.code-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.email-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #2d3748;
  word-break: break-all;
  flex: 1;
}

.copy-btn {
  padding: 4px;
  color: #718096;
  flex-shrink: 0;
}

.copy-btn:hover {
  color: #3182ce;
}

.code-tag {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
}

.copy-code-btn {
  flex-shrink: 0;
}

.code-time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #718096;
}

.time-icon {
  font-size: 12px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 12px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.status-icon.refreshing {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* 验证码出现动画 */
.code-appear-enter-active {
  transition: all 0.5s ease;
}

.code-appear-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.code-appear-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 验证码高亮效果 */
.code-tag {
  transition: all 0.3s ease;
}

.code-highlight {
  animation: codeHighlight 2s ease-in-out;
}

@keyframes codeHighlight {

  0%,
  100% {
    box-shadow: 0 0 0 rgba(239, 68, 68, 0);
  }

  50% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  }
}

.status-text {
  color: #4a5568;
}

.manual-refresh-btn {
  font-size: 12px;
  padding: 2px 6px;
  color: #718096;
}

.manual-refresh-btn:hover {
  color: #3182ce;
}

.toggle-btn {
  font-size: 12px;
  padding: 2px 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  /* 展开状态 - 移动设备 */
  .temp-email-helper:not(.collapsed) {
    position: fixed;
    top: auto;
    bottom: 20px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    max-width: calc(100vw - 40px);
    width: 100%;
  }

  .temp-email-helper--right:not(.collapsed),
  .temp-email-helper--left:not(.collapsed),
  .temp-email-helper--center:not(.collapsed) {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  /* 折叠状态 - 移动设备 */
  .temp-email-helper.collapsed {
    bottom: 80px; /* 避免与底部导航冲突 */
    top: auto;
    transform: none;
  }

  .temp-email-helper--right.collapsed,
  .temp-email-helper--left.collapsed,
  .temp-email-helper--center.collapsed {
    right: 12px;
    left: auto;
  }
}
</style>
