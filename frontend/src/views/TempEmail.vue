<template>
  <div class="temp-email-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-loading :loading="true" :element-loading-text="loadingText">
        <div style="height: 200px;"></div>
      </el-loading>
    </div>

    <!-- 未登录状态 -->
    <div v-else-if="!isLoggedIn" class="intro-layout">
      <div class="intro-container">
        <!-- 左侧：服务介绍 -->
        <div class="intro-left">
          <div class="service-intro">
            <h2>临时邮箱 - 纯净体验，安心使用</h2>
            <p class="subtitle">为您提供最可靠的临时邮箱服务</p>

            <div class="why-choose">
              <h3>为什么选择我们？</h3>
              <ul class="feature-list">
                <li>持续优化 - 不定期更新纯净邮箱域名，保证最佳使用体验</li>
                <li>极速响应 - 邮件实时到达，验证码接收无延迟</li>
                <li>长期有效 - 邮箱地址长期保持有效，可作为专用邮箱使用</li>
                <li>隐私至上 - 无需个人信息，完美保护您的真实身份</li>
                <li>专业可靠 - 精选高质量域名，确保邮件正常收发</li>
                <li>简单易用 - 一键生成，即刻使用，操作零门槛</li>
              </ul>
            </div>

            <div class="usage-tip">
              <strong>使用建议：</strong> 可作为专用邮箱长期使用，特别适合注册验证和隐私保护场景
            </div>
          </div>
        </div>

        <!-- 右侧：登录功能 -->
        <div class="intro-right">
          <div class="action-panel">
            <el-result icon="warning" title="需要登录" sub-title="使用临时邮箱功能需要先登录账户">
              <template #extra>
                <el-button type="primary" size="large" @click="goToLogin">
                  <el-icon>
                    <User />
                  </el-icon>
                  立即登录
                </el-button>
              </template>
            </el-result>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限检查和激活流程 -->
    <div v-else-if="!accessStatus.hasAccess" class="permission-required">
      <!-- 显示激活界面 -->
      <TempEmailActivation v-if="showActivation" @success="handleActivationSuccess" @cancel="showActivation = false" />

      <!-- 未激活状态显示介绍 -->
      <div v-else class="intro-layout">
        <div class="intro-container">
          <!-- 左侧：服务介绍 -->
          <div class="intro-left">
            <div class="service-intro">
              <h2>临时邮箱 - 纯净体验，安心使用</h2>
              <p class="subtitle">为您提供最可靠的临时邮箱服务</p>

              <div class="why-choose">
                <h3>为什么选择我们？</h3>
                <ul class="feature-list">
                  <li>持续优化 - 不定期更新纯净邮箱域名，保证最佳使用体验</li>
                  <li>极速响应 - 邮件实时到达，验证码接收无延迟</li>
                  <li>长期有效 - 邮箱地址长期保持有效，可作为专用邮箱使用</li>
                  <li>隐私至上 - 无需个人信息，完美保护您的真实身份</li>
                  <li>专业可靠 - 精选高质量域名，确保邮件正常收发</li>
                  <li>简单易用 - 一键生成，即刻使用，操作零门槛</li>
                </ul>
              </div>

              <div class="usage-tip">
                <strong>使用建议：</strong> 可作为专用邮箱长期使用，特别适合注册验证和隐私保护场景
              </div>
            </div>
          </div>

          <!-- 右侧：激活功能 -->
          <div class="intro-right">
            <div class="action-panel">
              <TempEmailStatusBar :access-status="accessStatus" @show-activation="showActivation = true" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主功能界面 -->
    <div v-else class="temp-email-main">
      <!-- 页面头部 -->
      <PageHeader title="临时邮箱" subtitle="安全可靠的临时邮箱服务，保护您的隐私" :show-stats="false" :show-filters="false">
        <template #toolbar>
          <el-button type="primary" @click="generateEmail" :loading="generating" :disabled="!selectedDomain"
            class="header-generate-btn">
            <template #icon>
              <el-icon>
                <Plus />
              </el-icon>
            </template>
            {{ generating ? '生成中...' : '快速生成' }}
          </el-button>
        </template>
      </PageHeader>

      <!-- 权限状态和公告横幅合并行 -->
      <div class="status-notice-row">
        <!-- 左侧：权限状态 -->
        <div class="status-section">
          <TempEmailStatusBar :access-status="accessStatus" @show-activation="showActivation = true" />
        </div>

        <!-- 右侧：公告横幅 -->
        <div class="notice-section">
          <el-alert v-if="tempEmailNotice && tempEmailNotice.content" :title="tempEmailNotice.title || '📢 使用提醒'"
            :description="tempEmailNotice.content" :type="tempEmailNotice.type || 'info'" :closable="false" show-icon
            class="temp-email-notice" />
        </div>
      </div>



      <!-- 激活界面弹窗（已激活用户也可以使用） -->
      <el-dialog v-model="showActivation" title="激活临时邮箱权限" width="680px" :close-on-click-modal="false"
        :close-on-press-escape="false" :lock-scroll="true" :modal="true" :append-to-body="true"
        class="activation-dialog" destroy-on-close>
        <template #header>
          <div class="dialog-header">
            <div class="header-icon">
              <el-icon size="24" color="#48bb78">
                <Key />
              </el-icon>
            </div>
            <div class="header-content">
              <h3>激活临时邮箱权限</h3>
              <p>请输入激活码来获取临时邮箱使用权限</p>
            </div>
          </div>
        </template>

        <div class="activation-content">
          <TempEmailActivation @success="handleActivationSuccess" @cancel="showActivation = false" />
        </div>
      </el-dialog>

      <el-card class="main-card glass-card">

        <!-- 邮箱生成配置 -->
        <div class="email-config no-glass">
          <div class="config-header">
            <h3 class="config-title">
              <el-icon class="config-icon">
                <Message />
              </el-icon>
              邮箱生成配置
            </h3>
          </div>

          <div class="config-form">
            <div class="compact-form-row">
              <!-- 邮箱前缀输入 -->
              <el-input v-model="emailPrefix" placeholder="自定义前缀或留空自动生成" clearable class="prefix-input" />

              <!-- 随机按钮 -->
              <el-button @click="generateRandomPrefix" class="random-btn" type="info" plain>
                <el-icon>
                  <Refresh />
                </el-icon>
                随机
              </el-button>

              <!-- @ 符号分隔 -->
              <div class="at-symbol">@</div>

              <!-- 邮箱域名选择 -->
              <el-select v-model="selectedDomain" placeholder="选择域名" class="domain-select">
                <el-option v-for="domain in availableDomains" :key="domain" :label="domain" :value="domain">
                  <div class="domain-option">
                    <span class="domain-name">{{ domain }}</span>
                    <el-tag v-if="domain === 'godaug.fun'" type="success" size="small" class="domain-tag">
                      ⭐ 专属
                    </el-tag>
                  </div>
                </el-option>
              </el-select>

              <!-- 生成按钮 -->
              <el-button type="primary" @click="generateEmail" :loading="generating" :disabled="!selectedDomain"
                class="generate-btn">
                <template #icon>
                  <el-icon>
                    <Plus />
                  </el-icon>
                </template>
                {{ generating ? '生成中' : '生成邮箱' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 服务状态 请运行 npm run email:start 启动邮箱服务-->
        <el-alert v-if="!serviceOnline" title="邮箱服务未启动" description="嗷呜！" type="warning" :closable="false"
          class="status-alert glass-alert" />

        <!-- 当前邮箱 -->
        <div v-if="currentEmail" class="current-email no-glass">
          <el-descriptions title="当前邮箱" :column="1" border>
            <el-descriptions-item label="邮箱地址">
              <el-tag type="success" size="large">{{ currentEmail }}</el-tag>
              <el-button type="text" @click="copyEmail" style="margin-left: 10px">
                复制
              </el-button>
            </el-descriptions-item>

          </el-descriptions>
        </div>

        <!-- 邮件列表 -->
        <div class="email-list no-glass">
          <div class="list-header">
            <h3>📬 所有邮件</h3>
            <div class="list-actions">
              <el-tag v-if="paginatedTotal >= MAX_EMAIL_DISPLAY" type="info" size="small" style="margin-right: 8px;">
                显示最新{{ MAX_EMAIL_DISPLAY }}条
              </el-tag>
              <el-button @click="refreshAllMessages" :loading="loading" icon="Refresh" type="primary" size="small">
                刷新全部
              </el-button>
            </div>
          </div>

          <el-table :data="displayMessages" v-loading="loading" empty-text="暂无邮件" class="glass-table">
            <el-table-column prop="email" label="收件邮箱" width="260">
              <template #default="{ row }">
                <el-tag type="primary" size="small">{{ row.email }}</el-tag>
                <el-button type="text" size="small" @click="copyText(row.email)" style="margin-left: 6px">复制</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="from" label="发件人" width="200" />
            <el-table-column prop="subject" label="主题" />
            <el-table-column prop="date" label="时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.date) }}
              </template>
            </el-table-column>
            <el-table-column label="验证码" width="200">
              <template #default="{ row }">
                <span class="code-text">{{ row.code || extractCode(row) || '—' }}</span>
                <el-button v-if="row.code || extractCode(row)" size="small" type="text"
                  @click="copyText(row.code || extractCode(row))" style="margin-left: 6px">复制</el-button>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="viewMessage(row)">
                  查看
                </el-button>
                <el-button type="danger" size="small" @click="deleteMessage(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="table-pagination" v-if="paginatedTotal > pageSize">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="paginatedTotal"
              :page-size="pageSize"
              :current-page="currentPage"
              @current-change="handlePageChange"
              small
            />
          </div>
        </div>
      </el-card>

      <!-- 邮件详情对话框 -->
      <el-dialog v-model="messageDialogVisible" title="邮件详情" width="80%" :before-close="closeMessageDialog"
        class="glass-dialog">
        <template #header>
          <div class="dialog-header">
            <span>邮件详情</span>
            <div class="dialog-actions">
              <el-button size="small" @click="toggleFullscreen" type="primary" plain>
                {{ isFullscreen ? '退出全屏' : '全屏查看' }}
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="currentMessage" class="message-content" :class="{ fullscreen: isFullscreen }">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="发件人">
              {{ currentMessage.from }}
            </el-descriptions-item>
            <el-descriptions-item label="收件人">
              {{ currentMessage.to }}
            </el-descriptions-item>
            <el-descriptions-item label="主题">
              {{ currentMessage.subject }}
            </el-descriptions-item>
            <el-descriptions-item label="时间">
              {{ formatDate(currentMessage.date) }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="message-body">
            <h4>邮件内容</h4>
            <div v-if="currentMessage.body.html" v-html="currentMessage.body.html" class="html-content"></div>
            <pre v-else-if="currentMessage.body.text" class="text-content">{{ currentMessage.body.text }}</pre>
            <p v-else class="no-content">无邮件内容</p>
          </div>
        </div>
      </el-dialog>

      <!-- 全部邮件对话框 -->
      <el-dialog v-model="allEmailsDialogVisible" title="📬 全部邮件" width="90%" :before-close="closeAllEmailsDialog">
        <div class="all-emails-content">
          <el-tabs v-model="activeEmailTab" type="card">
            <el-tab-pane v-for="emailBox in allEmailBoxes" :key="emailBox.email"
              :label="`${emailBox.email} (${emailBox.displayCount})`" :name="emailBox.email">
              <div class="email-box-content">
                <el-table :data="getEmailBoxMessages(emailBox.email)" empty-text="暂无邮件" size="small">
                  <el-table-column prop="from" label="发件人" width="200" />
                  <el-table-column prop="subject" label="主题" />
                  <el-table-column prop="date" label="时间" width="180">
                    <template #default="{ row }">
                      {{ formatDate(row.date) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="100">
                    <template #default="{ row }">
                      <el-button type="primary" size="small" @click="viewMessageFromAll(emailBox.email, row)">
                        查看
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div class="email-box-pagination" v-if="emailBox.displayCount > pageSize">
                  <el-pagination background layout="prev, pager, next" :total="emailBox.displayCount"
                    :page-size="pageSize" :current-page="getEmailBoxCurrentPage(emailBox.email)"
                    @current-change="page => handleEmailBoxPageChange(emailBox.email, page)" small />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>

          <div v-if="allEmailBoxes.length === 0" class="no-emails">
            <el-empty description="还没有生成过邮箱" />
          </div>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Key, Plus, Message, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { tempEmailApi } from '@/api/tempEmail'
import { tempEmailAuthApi } from '@/api/tempEmailAuth'
import { useToolAnalytics } from '@/composables/useToolAnalytics'
import TempEmailActivation from '@/components/TempEmailActivation.vue'
import TempEmailStatusBar from '@/components/TempEmailStatusBar.vue'
import PageHeader from '@/components/common/PageHeader.vue'

// 路由和用户状态
const router = useRouter()
const userStore = useUserStore()

// 权限控制相关
const loading = ref(true)
const loadingText = ref('检查权限状态...')
const isLoggedIn = computed(() => userStore.isLoggedIn)
const accessStatus = ref({
  hasAccess: false,
  isAdmin: false,
  tempEmailAccess: null,
  remainingTime: null
})
const showActivation = ref(false)

// 原有的响应式数据
const serviceOnline = ref(true)
const currentEmail = ref('')
const messages = ref([])
const functionalLoading = ref(false) // 重命名避免冲突
const generating = ref(false)
const messageDialogVisible = ref(false)
const currentMessage = ref(null)
const isFullscreen = ref(false)
const toggleFullscreen = () => (isFullscreen.value = !isFullscreen.value)

// 邮箱配置
const emailPrefix = ref('')
const selectedDomain = ref('')
const availableDomains = ref([])

// 全部邮件
const allEmailsDialogVisible = ref(false)
const allEmailBoxes = ref([])
const emailBoxPagination = reactive({})
const activeEmailTab = ref('')
const showCurrentEmailOnly = ref(false) // 已不再使用，仅保留变量避免大范围改动
const allMessages = ref([])

// 临时邮箱公告
const tempEmailNotice = ref(null)

const MAX_EMAIL_DISPLAY = 50
const pageSize = 10
const currentPage = ref(1)

const { recordUsage, startTracking, stopTracking } = useToolAnalytics('temp-email')

const safeRecordUsage = async (action, metadata = {}) => {
  if (typeof recordUsage !== 'function') return
  try {
    await recordUsage(action, metadata)
  } catch (error) {
    console.warn('[temp-email] recordUsage failed:', error)
  }
}

const safeStartTracking = (action, metadata = {}) => {
  if (typeof startTracking === 'function') {
    try {
      startTracking(action, metadata)
    } catch (error) {
      console.warn('[temp-email] startTracking failed:', error)
    }
  }
}

const safeStopTracking = (metadata = {}) => {
  if (typeof stopTracking === 'function') {
    try {
      stopTracking(metadata)
    } catch (error) {
      console.warn('[temp-email] stopTracking failed:', error)
    }
  }
}

const latestMessages = computed(() => {
  return allMessages.value
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_EMAIL_DISPLAY)
})

const paginatedTotal = computed(() => latestMessages.value.length)

const displayMessages = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return latestMessages.value.slice(start, end)
})

watch(latestMessages, () => {
  currentPage.value = 1
})

watch(paginatedTotal, (total) => {
  if (total === 0) {
    currentPage.value = 1
    return
  }
  const maxPage = Math.max(1, Math.ceil(total / pageSize))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

const handlePageChange = (page) => {
  currentPage.value = page
}

const getEmailBoxCurrentPage = (email) => emailBoxPagination[email]?.currentPage || 1

const getEmailBoxMessages = (email) => {
  const box = allEmailBoxes.value.find(item => item.email === email)
  if (!box) return []
  const start = (getEmailBoxCurrentPage(email) - 1) * pageSize
  const end = start + pageSize
  return box.messages.slice(start, end)
}

const handleEmailBoxPageChange = (email, page) => {
  if (!emailBoxPagination[email]) {
    emailBoxPagination[email] = { currentPage: 1 }
  }
  emailBoxPagination[email].currentPage = page
}

const resetEmailBoxPagination = (boxes) => {
  Object.keys(emailBoxPagination).forEach(key => {
    if (!boxes.some(box => box.email === key)) {
      Reflect.deleteProperty(emailBoxPagination, key)
    }
  })
  boxes.forEach(box => {
    emailBoxPagination[box.email] = { currentPage: 1 }
  })
}

const normalizeMessages = (messages = []) => {
  return [...messages]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_EMAIL_DISPLAY)
}

const normalizeEmailBox = (emailBox) => {
  const rawMessages = Array.isArray(emailBox.messages) ? emailBox.messages : []
  const normalizedMessages = normalizeMessages(rawMessages)
  const totalAvailable = typeof emailBox.messageCount === 'number' ? emailBox.messageCount : rawMessages.length
  return {
    ...emailBox,
    messages: normalizedMessages,
    messageCount: totalAvailable,
    displayCount: normalizedMessages.length
  }
}

const headerStats = computed(() => [
  { value: paginatedTotal.value, label: '封邮件' },
  { value: availableDomains.value.length, label: '个域名' },
  { value: currentEmail.value ? 1 : 0, label: '个邮箱' }
])

// 加载临时邮箱公告
const loadTempEmailNotice = async () => {
  try {
    const response = await tempEmailApi.getNotice()
    const backendData = response.data

    if (backendData.success && backendData.data) {
      tempEmailNotice.value = backendData.data
    } else {
      tempEmailNotice.value = null
    }
  } catch (error) {
    // 静默处理公告加载失败，不影响主要功能
    tempEmailNotice.value = null
  }
}

// 权限控制相关方法
const checkAccessStatus = async () => {
  try {
    if (!isLoggedIn.value) {
      loading.value = false
      return
    }

    const response = await tempEmailAuthApi.checkAccessStatus()

    if (response.success) {
      const oldHasAccess = accessStatus.value.hasAccess
      accessStatus.value = response.data

      loading.value = false

      // 如果权限状态从有变为无，清除相关数据
      if (oldHasAccess && !response.data.hasAccess) {
        // 清除邮件数据
        allMessages.value = []
        currentEmail.value = ''
        selectedDomain.value = ''
      }
    }
  } catch (error) {
    loading.value = false
    console.error('获取全部邮件失败:', error)

    // 检查是否是权限问题
    if (error.response?.status === 403 && error.response?.data?.code === 'TEMP_EMAIL_ACCESS_REQUIRED') {
      ElMessage.warning('需要激活临时邮箱权限')
      // 重新检查权限状态，可能需要显示激活界面
      checkAccessStatus()
    } else if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
    } else {
      ElMessage.error('获取全部邮件失败')
    }
  } finally {
    functionalLoading.value = false
  }
}

// 生成临时邮箱
const generateEmail = async () => {
  let trackingMetadata = null
  let success = false
  let failureLogged = false
  let errorMessage = ''
  try {
    generating.value = true
    console.log('🚀 开始生成邮箱...')

    // 先检查权限状态
    await checkAccessStatus()
    if (!accessStatus.value.hasAccess) {
      ElMessage.warning('权限已失效，请重新激活')
      return
    }

    // 验证输入
    if (!selectedDomain.value) {
      ElMessage.warning('请选择邮箱域名')
      return
    }

    trackingMetadata = {
      domain: selectedDomain.value,
      hasCustomName: Boolean(emailPrefix.value),
      hadExistingEmail: Boolean(currentEmail.value)
    }
    safeStartTracking('generate-email', trackingMetadata)

    const params = {
      domain: selectedDomain.value,
      customName: emailPrefix.value || undefined
    }

    const response = await tempEmailApi.generateEmail(params)
    const responseData = response.data || {}

    if (responseData.success) {
      success = true
      const result = responseData.data || {}
      currentEmail.value = result.email
      messages.value = []
      // 清空输入框
      emailPrefix.value = ''

      await safeRecordUsage('generate-email', {
        ...trackingMetadata,
        success: true,
        isExisting: Boolean(result.isExisting),
        usernameLength: result.username ? String(result.username).length : undefined
      })

      // 自动刷新邮件列表
      setTimeout(() => {
        refreshMessages()
      }, 1000)
    } else {
      errorMessage = responseData.message || '生成邮箱失败'
      if (trackingMetadata) {
        await safeRecordUsage('generate-email', {
          ...trackingMetadata,
          success: false,
          error: errorMessage,
          responseSuccess: false
        })
        failureLogged = true
      }
      ElMessage.error('生成邮箱失败: ' + errorMessage)
    }
  } catch (error) {
    errorMessage = error.response?.data?.message || error.message
    if (trackingMetadata && !failureLogged) {
      await safeRecordUsage('generate-email', {
        ...trackingMetadata,
        success: false,
        error: errorMessage
      })
    }
    ElMessage.error('生成邮箱失败: ' + errorMessage)
  } finally {
    if (trackingMetadata) {
      const stopMetadata = {
        action: 'generate-email',
        success,
        domain: trackingMetadata.domain,
        hasCustomName: trackingMetadata.hasCustomName,
        hadExistingEmail: trackingMetadata.hadExistingEmail
      }
      if (!success && errorMessage) {
        stopMetadata.error = errorMessage
      }
      safeStopTracking(stopMetadata)
    }
    generating.value = false
  }
}

// 刷新邮件列表
const refreshMessages = async () => {
  if (!currentEmail.value) return

  const email = currentEmail.value

  try {
    functionalLoading.value = true
    const response = await tempEmailApi.getMessages(email)

    if (response.data.success) {
      const list = Array.isArray(response.data?.data?.messages) ? response.data.data.messages : []
      messages.value = list
      await safeRecordUsage('refresh-mailbox', {
        email,
        success: true,
        fetchedCount: list.length
      })
    } else {
      const message = response.data.message || '获取邮件列表失败'
      await safeRecordUsage('refresh-mailbox', {
        email,
        success: false,
        error: message,
        responseSuccess: false
      })
      ElMessage.error(message)
    }
  } catch (error) {
    const message = error.response?.data?.message || error.message
    await safeRecordUsage('refresh-mailbox', {
      email,
      success: false,
      error: message
    })
    ElMessage.error('获取邮件列表失败')
  } finally {
    functionalLoading.value = false
  }
}

// 刷新全部邮件（并补充最近5封的正文验证码）
const refreshAllMessages = async () => {
  try {
    functionalLoading.value = true

    // 先检查权限状态
    await checkAccessStatus()
    if (!accessStatus.value.hasAccess) {
      ElMessage.warning('权限已失效，请重新激活')
      return
    }

    const response = await tempEmailApi.getAllEmails()
    if (response.data.success) {
      const aggregatedMessages = []
      const emailBoxes = Array.isArray(response.data?.data?.emailBoxes)
        ? response.data.data.emailBoxes
        : []

      // 将所有邮箱的邮件聚合成一个列表
      emailBoxes.forEach(emailBox => {
        const boxEmail = emailBox.email
        const boxMessages = Array.isArray(emailBox.messages) ? emailBox.messages : []
        boxMessages.forEach(message => {
          aggregatedMessages.push({
            ...message,
            email: boxEmail
          })
        })
      })

      // 按时间排序后仅保留最新 50 条邮件
      aggregatedMessages.sort((a, b) => new Date(b.date) - new Date(a.date))
      allMessages.value = aggregatedMessages.slice(0, MAX_EMAIL_DISPLAY)
      const displayedCount = allMessages.value.length

      await safeRecordUsage('refresh-all-mailboxes', {
        success: true,
        totalMailboxes: emailBoxes.length,
        aggregatedCount: aggregatedMessages.length,
        displayedCount
      })

      // 异步补充最近5封的验证码（从正文提取），不阻塞主列表刷新
      await enrichLatestCodes()

      ElMessage.success('已加载最新 ' + displayedCount + ' 封邮件')
    } else {
      const message = response.data.message || '获取全部邮件失败'
      await safeRecordUsage('refresh-all-mailboxes', {
        success: false,
        error: message,
        responseSuccess: false
      })
      ElMessage.error(message)
    }
  } catch (error) {
    console.error('获取全部邮件失败:', error)
    loading.value = false
    const message = error.response?.data?.message || error.message
    await safeRecordUsage('refresh-all-mailboxes', {
      success: false,
      error: message,
      status: error.response?.status
    })

    // 检查是否是权限问题
    if (error.response?.status === 403 && error.response?.data?.code === 'TEMP_EMAIL_ACCESS_REQUIRED') {
      ElMessage.warning('需要激活临时邮箱权限')
      // 重新检查权限状态，可能需要显示激活界面
      checkAccessStatus()
    } else if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
    } else {
      ElMessage.error('获取全部邮件失败')
    }
  } finally {
    functionalLoading.value = false
  }
}

// 查看邮件详情
const viewMessage = async (message) => {
  if (!message) return

  const email = message.email || currentEmail.value
  if (!email) return

  try {
    const response = await tempEmailApi.getMessage(email, message.id)

    if (response.data.success) {
      const detail = response.data.data
      currentMessage.value = detail
      messageDialogVisible.value = true

      await safeRecordUsage('view-message', {
        email,
        success: true,
        messageId: message.id,
        subject: detail?.subject,
        hasHtml: Boolean(detail?.bodyHtml),
        hasAttachments: Array.isArray(detail?.attachments) && detail.attachments.length > 0
      })
    } else {
      const info = response.data.message || '获取邮件详情失败'
      await safeRecordUsage('view-message', {
        email,
        success: false,
        messageId: message.id,
        error: info,
        responseSuccess: false
      })
      ElMessage.error(info)
    }
  } catch (error) {
    const info = error.response?.data?.message || error.message
    await safeRecordUsage('view-message', {
      email,
      success: false,
      messageId: message.id,
      error: info
    })
    ElMessage.error('获取邮件详情失败')
  }
}

const enrichLatestCodes = async () => {
  const top = latestMessages.value.slice(0, 5);
  const tasks = top.map(async (row) => {
    try {
      const email = row.email || currentEmail.value;
      const res = await tempEmailApi.getMessage(email, row.id);
      if (res.data?.success) {
        const body = res.data.data?.body || {};
        const code = extractCode(body.text) || extractCode(body.html);
        if (code) row.code = code;
      }
    } catch (e) {
      console.warn(`获取邮件 ${row.id} 详情失败:`, e.message);
    }
  });
  await Promise.allSettled(tasks);
}

// 删除邮件
const deleteMessage = async (message) => {
  try {
    await ElMessageBox.confirm('确认要删除这封邮件吗', '确认删除', {
      type: 'warning'
    })

    const email = message.email || currentEmail.value
    await tempEmailApi.deleteMessage(email, message.id)
    ElMessage.success('邮件删除成功')

    await safeRecordUsage('delete-message', {
      email,
      success: true,
      messageId: message.id
    })

    // 刷新列表
    if (showCurrentEmailOnly.value) {
      refreshMessages()
    } else {
      refreshAllMessages()
    }
  } catch (error) {
    if (error !== 'cancel') {
      const errorMessage = error.response?.data?.message || error.message || '删除邮件失败'
      await safeRecordUsage('delete-message', {
        email: message?.email || currentEmail.value,
        success: false,
        messageId: message?.id,
        error: errorMessage
      })
      ElMessage.error('删除邮件失败: ' + errorMessage)
    }
  }
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
    await safeRecordUsage('copy-to-clipboard', {
      success: true,
      length: typeof text === 'string' ? text.length : String(text || '').length
    })
  } catch (error) {
    const info = error?.message || '复制失败'
    await safeRecordUsage('copy-to-clipboard', {
      success: false,
      length: typeof text === 'string' ? text.length : undefined,
      error: info
    })
    ElMessage.error('复制失败')
  }
}

// 复制邮箱地址

const copyEmail = () => copyText(currentEmail.value)

// 关闭邮件详情对话框
const closeMessageDialog = () => {
  messageDialogVisible.value = false
  currentMessage.value = null
}

// 显示全部邮件
const showAllEmails = async () => {
  try {
    ElMessage.info('正在扫描所有邮箱...')

    const response = await tempEmailApi.getAllEmails()
    if (response.data.success) {
      let boxes = Array.isArray(response.data?.data?.emailBoxes) ? response.data.data.emailBoxes : []

      if (currentEmail.value) {
        const exists = boxes.some(box => box.email === currentEmail.value)
        if (!exists && messages.value.length > 0) {
          boxes = [
            {
              email: currentEmail.value,
              domain: currentEmail.value.split('@')[1],
              messageCount: messages.value.length,
              messages: messages.value
            },
            ...boxes
          ]
        }
      }

      const processedBoxes = boxes.map(normalizeEmailBox)
      allEmailBoxes.value = processedBoxes
      resetEmailBoxPagination(processedBoxes)

      if (allEmailBoxes.value.length > 0) {
        activeEmailTab.value = allEmailBoxes.value[0].email
      }

      allEmailsDialogVisible.value = true

      const totalMessages = response.data.data.totalMessages
      const displayedCount = allEmailBoxes.value.reduce((sum, box) => sum + box.displayCount, 0)
      const shownCount = typeof totalMessages === 'number' ? Math.min(totalMessages, displayedCount) : displayedCount

      await safeRecordUsage('open-all-mailboxes', {
        success: true,
        totalMailboxes: allEmailBoxes.value.length,
        displayedCount,
        totalMessages: typeof totalMessages === 'number' ? totalMessages : undefined
      })

      if (allEmailBoxes.value.length === 0) {
        ElMessage.info('未找到任何邮件')
      } else {
        ElMessage.success(`找到 ${allEmailBoxes.value.length} 个邮箱，已展示最新 ${shownCount} 封邮件`)
      }
    } else {
      const message = response.data.message || '获取全部邮件失败'
      await safeRecordUsage('open-all-mailboxes', {
        success: false,
        error: message,
        responseSuccess: false
      })
      ElMessage.error(message)
    }
  } catch (error) {
    const info = error.response?.data?.message || error.message
    await safeRecordUsage('open-all-mailboxes', {
      success: false,
      error: info
    })
    ElMessage.error('获取全部邮件失败')
  }
}

const viewMessageFromAll = async (email, message) => {
  if (!message) return

  const targetEmail = email || message.email
  if (!targetEmail) return

  try {
    const response = await tempEmailApi.getMessage(targetEmail, message.id)

    if (response.data.success) {
      const detail = response.data.data
      currentMessage.value = detail
      messageDialogVisible.value = true

      await safeRecordUsage('view-message', {
        email: targetEmail,
        success: true,
        messageId: message.id,
        context: 'all-mailboxes',
        subject: detail?.subject,
        hasHtml: Boolean(detail?.bodyHtml),
        hasAttachments: Array.isArray(detail?.attachments) && detail.attachments.length > 0
      })
    } else {
      const info = response.data.message || '获取邮件详情失败'
      await safeRecordUsage('view-message', {
        email: targetEmail,
        success: false,
        messageId: message.id,
        context: 'all-mailboxes',
        error: info,
        responseSuccess: false
      })
      ElMessage.error(info)
    }
  } catch (error) {
    const info = error.response?.data?.message || error.message
    await safeRecordUsage('view-message', {
      email: targetEmail,
      success: false,
      messageId: message.id,
      context: 'all-mailboxes',
      error: info
    })
    ElMessage.error('获取邮件详情失败')
  }
}

const closeAllEmailsDialog = () => {
  allEmailsDialogVisible.value = false
  allEmailBoxes.value = []
  activeEmailTab.value = ''
  Object.keys(emailBoxPagination).forEach(key => {
    Reflect.deleteProperty(emailBoxPagination, key)
  })
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 获取可用域名列表
const loadAvailableDomains = async () => {
  try {
    const response = await tempEmailApi.getDomains()

    if (response.data.success) {
      availableDomains.value = response.data.data

      // 默认选择第一个域名
      if (availableDomains.value.length > 0) {
        selectedDomain.value = availableDomains.value[0]
      }
    }
  } catch (error) {
    ElMessage.error('获取域名列表失败: ' + error.message)
  }
}

// 检查服务状态
const checkServiceStatus = async () => {
  try {
    const response = await tempEmailApi.getStatus()
    serviceOnline.value = response.data.success
  } catch (error) {
    serviceOnline.value = false
  }
}

// 定期权限检查
let accessCheckInterval = null

// 全面的验证码状态检查
const performFullAccessCheck = async () => {
  try {
    loadingText.value = '检查权限状态...'

    // 1. 首先检查基本权限状态
    await checkAccessStatus()

    // 2. 如果显示有权限，进行深度验证
    if (accessStatus.value.hasAccess && accessStatus.value.tempEmailAccess) {
      loadingText.value = '验证激活码状态...'

      // 3. 使用专门的验证API进行深度检查
      try {
        const validateResponse = await tempEmailAuthApi.validateActivationCodes()
        if (validateResponse.success) {
          const validation = validateResponse.data

          // 如果验证结果与当前状态不一致，更新状态
          if (validation.hasAccess !== accessStatus.value.hasAccess) {
            await checkAccessStatus()
          }
        }
      } catch (error) {
        if (error.response?.status === 403) {
          await checkAccessStatus()
        }
      }
    }

    loadingText.value = '权限验证完成'

  } catch (error) {
    console.error('权限检查失败:', error)
    loadingText.value = '权限检查失败'
  }
}

// 组件挂载时初始化
onMounted(async () => {
  // 加载临时邮箱公告（不依赖权限状态）
  await loadTempEmailNotice()

  // 进行全面的验证码状态检查
  await performFullAccessCheck()

  // 如果有权限，再加载其他数据
  if (accessStatus.value.hasAccess) {
    checkServiceStatus()
    loadAvailableDomains()
    refreshAllMessages()
  }

  // 设置定期权限检查（每10秒检查一次，更快发现权限变化）
  accessCheckInterval = setInterval(async () => {
    if (isLoggedIn.value) {
      const oldHasAccess = accessStatus.value.hasAccess
      await checkAccessStatus()

      // 如果权限状态发生变化，给用户提示
      if (oldHasAccess && !accessStatus.value.hasAccess) {
        ElMessage.warning('您的临时邮箱权限已失效，请重新激活')
      }
    }
  }, 10000)
})

// 组件卸载时清理
onUnmounted(() => {
  if (accessCheckInterval) {
    clearInterval(accessCheckInterval)
  }
})
</script>

<style scoped>
.temp-email-container {
  padding: 8px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 120px);
  /* 确保页面有足够高度显示footer */
}

/* 权限状态和公告合并行 */
.status-notice-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  /* 改为stretch确保高度一致 */
  min-height: 80px;
  /* 设置最小高度 */
}

.status-section {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  min-width: 300px;
}

.notice-section {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.notice-section .temp-email-notice {
  margin: 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .status-notice-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-section {
    min-width: auto;
    width: 100%;
  }

  .notice-section {
    width: 100%;
  }
}

/* 权限控制相关样式 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.login-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.permission-required {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.temp-email-main {
  width: 100%;
}



.main-card {
  margin: 8px 0 8px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  color: #409eff;
}

.status-alert {
  margin-bottom: 20px;
}

.current-email {
  margin-bottom: 30px;
}

.email-list {
  margin-top: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  color: #606266;
}

.list-actions {
  display: flex;
  gap: 10px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-content {
  max-height: 70vh;
  overflow-y: auto;
}

.message-content.fullscreen {
  max-height: calc(90vh - 120px);
}

.message-body {
  margin-top: 20px;
}

.message-body h4 {
  color: #409eff;
  margin-bottom: 10px;
}

.html-content {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
  max-height: 60vh;
  min-height: 200px;
  overflow-y: auto;
}

.text-content {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
  white-space: pre-wrap;
  max-height: 60vh;
  min-height: 200px;
  overflow-y: auto;
  font-family: monospace;
}

.code-text {
  font-family: monospace;
  color: #2b6cb0;
  font-weight: 600;
}

.no-content {
  color: #909399;
  font-style: italic;
}

/* 紧凑布局的邮箱配置样式 */
.email-config {
  margin-bottom: 24px;
  padding: 0;
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}

/* 移除毛玻璃效果的样式 */
.email-config.no-glass {
  background: #ffffff !important;
  backdrop-filter: none !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

/* 配置头部 - 紧凑版 */
.config-header {
  padding: 16px 24px 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.config-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1a365d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-icon {
  font-size: 18px;
  color: #3182ce;
}

/* 紧凑表单区域 */
.config-form {
  padding: 20px 24px;
}

/* 单行紧凑布局 */
.compact-form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
}

/* @ 符号样式 - 紧凑版 */
.at-symbol {
  font-size: 20px;
  font-weight: 700;
  color: #3182ce;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-width: 24px;
  flex-shrink: 0;
}

/* 紧凑单行布局 - 所有元素统一高度44px */

/* 邮箱前缀输入框 */
.prefix-input {
  flex: 2;
  min-width: 200px;
}

.prefix-input .el-input__wrapper {
  height: 44px !important;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(15px) !important;
  border-radius: 10px !important;
  transition: all 0.3s ease !important;
}

.prefix-input .el-input__wrapper:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.prefix-input .el-input__wrapper.is-focus {
  background: rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(64, 158, 255, 0.7) !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
}

.prefix-input .el-input__inner {
  color: #2d3748 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  height: 42px !important;
  line-height: 42px !important;
}

/* 随机按钮 */
.random-btn {
  height: 32px !important;
  padding: 0 14px !important;
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 10px !important;
  color: #3182ce !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0;
}

.random-btn:hover {
  background: rgba(255, 255, 255, 0.22) !important;
  border-color: rgba(64, 158, 255, 0.4) !important;
  color: #2b6cb0 !important;
}

/* 域名选择器 */
.domain-select {
  flex: 1.5;
  min-width: 150px;
}

.domain-select .el-input__wrapper {
  height: 44px !important;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(15px) !important;
  border-radius: 10px !important;
  transition: all 0.3s ease !important;
}

.domain-select .el-input__wrapper:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.domain-select .el-input__inner {
  color: #2d3748 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  height: 42px !important;
  line-height: 42px !important;
}

/* 域名选项样式 */
.domain-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.domain-name {
  color: #2d3748;
  font-weight: 500;
}

.domain-tag {
  margin-left: 8px;
}

/* 生成按钮 */
.generate-btn {
  height: 32px !important;
  padding: 0 20px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(236, 72, 153, 0.3) !important;
  transition: all 0.3s ease !important;
  color: white !important;
  flex-shrink: 0;
  min-width: 120px !important;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4) !important;
  background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%) !important;
}

.generate-btn:disabled {
  background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%) !important;
  color: #9ca3af !important;
  box-shadow: none !important;
  transform: none !important;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 全部邮件对话框样式 */
.all-emails-content {
  max-height: 70vh;
  overflow-y: auto;
}

.email-box-content {
  margin-top: 10px;
}

.table-pagination,
.email-box-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.no-emails {
  text-align: center;
  padding: 40px;
}

/* 激活弹窗样式 */
:deep(.activation-dialog) {
  .el-dialog {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  .el-dialog__header {
    padding: 0;
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-dialog__close {
    color: white;
    font-size: 18px;
    top: 20px;
    right: 20px;
  }

  .el-dialog__close:hover {
    color: rgba(255, 255, 255, 0.8);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  padding: 24px 32px;
  gap: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.header-content p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  opacity: 0.9;
}

.activation-content {
  padding: 32px;
  background: #fafafa;
  min-height: 200px;
}

/* 左右分栏布局 */
.intro-layout {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.intro-container {
  display: flex;
  width: 100%;
  max-width: 1400px;
  min-height: 600px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 左侧介绍区域 */
.intro-left {
  flex: 1;
  padding: 48px 40px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
}

.service-intro {
  width: 100%;
}

.service-intro h2 {
  margin: 0 0 16px 0;
  font-size: 32px;
  font-weight: 700;
  color: #2d3748;
  text-align: center;
}

.service-intro .subtitle {
  margin: 0 0 36px 0;
  font-size: 18px;
  color: #4a5568;
  text-align: center;
  font-weight: 500;
}

.why-choose h3 {
  margin: 0 0 24px 0;
  font-size: 22px;
  font-weight: 600;
  color: #2d3748;
  text-align: center;
}

.feature-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.feature-list li {
  margin: 0;
  padding: 16px 20px;
  color: #2d3748;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  border-left: 4px solid #48bb78;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.feature-list li:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
}

.usage-tip {
  margin-top: 28px;
  padding: 18px 24px;
  background: rgba(72, 187, 120, 0.15);
  border-radius: 12px;
  border: 1px solid rgba(72, 187, 120, 0.3);
  text-align: center;
  font-size: 14px;
  color: #2d3748;
  backdrop-filter: blur(5px);
}

.usage-tip strong {
  color: #48bb78;
  font-weight: 600;
}

/* 右侧操作区域 */
.intro-right {
  flex: 0 0 400px;
  padding: 48px 40px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgba(255, 255, 255, 0.3);
}

.action-panel {
  width: 100%;
  text-align: center;
}

/* 右侧面板中的状态栏样式优化 */
.intro-right .temp-email-status-bar {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.intro-right .temp-email-status-bar .status-info {
  margin-bottom: 24px;
}

.intro-right .temp-email-status-bar .activation-action {
  text-align: center;

}

.intro-right .temp-email-status-bar .activation-action .el-button {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
  transition: all 0.3s ease;
}

.intro-right .temp-email-status-bar .activation-action .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(72, 187, 120, 0.4);
}

/* 登录按钮样式优化 */
.intro-right .el-result .el-button {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
  transition: all 0.3s ease;
}

.intro-right .el-result .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(72, 187, 120, 0.4);
}

/* 旧的粉色按钮样式已被新的generate-btn替代 */

/* Header中的生成按钮样式 */
.header-generate-btn {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%) !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3) !important;
  transition: all 0.3s ease !important;
  color: white !important;
}

.header-generate-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4) !important;
  background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%) !important;
}

/* 毛玻璃主卡片样式 */
.glass-card {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 24px !important;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15) !important;
}

.glass-card .el-card__body {
  background: transparent !important;
  padding: 32px !important;
}

/* 响应式设计 - 紧凑布局 */
@media (max-width: 1024px) {
  .compact-form-row {
    gap: 8px;
  }

  .prefix-input {
    flex: 1.5;
    min-width: 150px;
  }

  .domain-select {
    flex: 1.2;
    min-width: 120px;
  }

  .generate-btn {
    min-width: 100px !important;
    padding: 0 16px !important;
  }

  .random-btn {
    padding: 0 10px !important;
  }
}

@media (max-width: 768px) {
  .compact-form-row {
    flex-wrap: wrap;
    gap: 12px;
  }

  .prefix-input {
    flex: 1;
    min-width: 200px;
  }

  .random-btn {
    order: 2;
  }

  .at-symbol {
    order: 3;
    display: none;
  }

  .domain-select {
    flex: 1;
    min-width: 150px;
    order: 4;
  }

  .generate-btn {
    order: 5;
    width: 100% !important;
    min-width: auto !important;
    margin-top: 8px;
  }

  .config-form {
    padding: 16px 20px;
  }

  .config-header {
    padding: 14px 20px 10px;
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .intro-container {
    flex-direction: column;
    min-height: auto;
  }

  .intro-left {
    flex: none;
    padding: 32px 24px;
  }

  .intro-right {
    flex: none;
    padding: 32px 24px;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
  }

  .service-intro h2 {
    font-size: 28px;
  }

  .why-choose h3 {
    font-size: 20px;
  }
}

@media (max-width: 768px) {
  .intro-layout {
    padding: 16px;
    min-height: calc(100vh - 120px);
  }

  .intro-container {
    border-radius: 16px;
  }

  .intro-left,
  .intro-right {
    padding: 24px 20px;
  }

  .service-intro h2 {
    font-size: 24px;
  }

  .service-intro .subtitle {
    font-size: 16px;
    margin-bottom: 28px;
  }

  .why-choose h3 {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .feature-list li {
    padding: 14px 16px;
    font-size: 13px;
  }

  .usage-tip {
    padding: 16px 20px;
    font-size: 13px;
    margin-top: 24px;
  }
}

@media (max-width: 480px) {
  .intro-layout {
    padding: 12px;
  }

  .intro-left,
  .intro-right {
    padding: 20px 16px;
  }

  .service-intro h2 {
    font-size: 22px;
  }

  .service-intro .subtitle {
    font-size: 15px;
  }

  .why-choose h3 {
    font-size: 17px;
  }
}

/* 通用毛玻璃容器样式 */
.glass-container {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  padding: 24px !important;
  margin-bottom: 24px !important;
}

/* 移除毛玻璃效果的容器样式 */
.email-list.no-glass {
  background: #ffffff !important;
  backdrop-filter: none !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  padding: 24px !important;
  margin-bottom: 24px !important;
  border-radius: 16px !important;
}

/* 当前邮箱美化样式 */
.current-email.no-glass {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  backdrop-filter: none !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
  padding: 28px !important;
  margin-bottom: 24px !important;
  border-radius: 20px !important;
  position: relative;
  overflow: hidden;
}

.current-email.no-glass::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #059669, #047857);
  border-radius: 20px 20px 0 0;
}

.current-email.no-glass .el-descriptions {
  background: transparent !important;
  border: none !important;
  border-radius: 16px !important;
  overflow: hidden;
}

.current-email.no-glass .el-descriptions__header {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
  border-bottom: 1px solid #cbd5e1 !important;
  border-radius: 16px 16px 0 0 !important;
  padding: 20px 24px !important;
}

.current-email.no-glass .el-descriptions__title {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-email.no-glass .el-descriptions__title::before {
  content: '📧';
  font-size: 20px;
}

.current-email.no-glass .el-descriptions__body {
  background: #ffffff !important;
  border-radius: 0 0 16px 16px !important;
}

.current-email.no-glass .el-descriptions__cell {
  background: transparent !important;
  border-right: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 16px 20px !important;
  transition: background-color 0.2s ease;
}

.current-email.no-glass .el-descriptions__cell:hover {
  background: #f8fafc !important;
}

.current-email.no-glass .el-descriptions__label {
  font-weight: 600 !important;
  color: #475569 !important;
  font-size: 14px !important;
}

.current-email.no-glass .el-descriptions__content {
  font-weight: 500 !important;
  color: #1e293b !important;
  font-size: 14px !important;
}

/* 邮箱地址特殊样式 */
.current-email.no-glass .el-descriptions__content .code-text {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
  color: #166534 !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  border: 1px solid #bbf7d0 !important;
  display: inline-block;
  margin: 4px 0;
}

/* 毛玻璃警告框样式 */
.glass-alert {
  background: rgba(255, 193, 7, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 193, 7, 0.2) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 16px rgba(255, 193, 7, 0.1) !important;
}

.glass-alert .el-alert__content {
  background: transparent !important;
}

/* 毛玻璃描述列表样式 */
.glass-descriptions {
  background: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
}

.glass-descriptions .el-descriptions__header {
  background: rgba(255, 255, 255, 0.05) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.glass-descriptions .el-descriptions__body {
  background: transparent !important;
}

.glass-descriptions .el-descriptions__table {
  background: transparent !important;
}

.glass-descriptions .el-descriptions__cell {
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: transparent !important;
}

/* 毛玻璃表格样式 */
.glass-table {
  background: transparent !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.glass-table .el-table__header-wrapper {
  background: rgba(255, 255, 255, 0.1) !important;
}

.glass-table .el-table__header {
  background: transparent !important;
}

.glass-table .el-table__body-wrapper {
  background: transparent !important;
}

.glass-table .el-table__body {
  background: transparent !important;
}

.glass-table .el-table__row {
  background: transparent !important;
}

.glass-table .el-table__row:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}

.glass-table .el-table td,
.glass-table .el-table th {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: transparent !important;
  border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.glass-table .el-table th {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #1a365d !important;
  font-weight: 700 !important;
}

.glass-table .el-table__header th.el-table__cell {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 表格内的按钮和标签样式 */
.glass-table .el-tag {
  background: rgba(64, 158, 255, 0.15) !important;
  border: 1px solid rgba(64, 158, 255, 0.3) !important;
  color: #409eff !important;
}

.glass-table .el-tag--success {
  background: rgba(103, 194, 58, 0.15) !important;
  border: 1px solid rgba(103, 194, 58, 0.3) !important;
  color: #67c23a !important;
}

.glass-table .el-button--text {
  color: #409eff !important;
  background: transparent !important;
}

.glass-table .el-button--primary {
  background: rgba(64, 158, 255, 0.8) !important;
  border: 1px solid rgba(64, 158, 255, 0.3) !important;
}

.glass-table .el-button--danger {
  background: rgba(245, 108, 108, 0.8) !important;
  border: 1px solid rgba(245, 108, 108, 0.3) !important;
}

/* 毛玻璃对话框样式 */
.glass-dialog .el-dialog {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2) !important;
}

.glass-dialog .el-dialog__header {
  background: rgba(255, 255, 255, 0.05) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px 16px 0 0 !important;
}

.glass-dialog .el-dialog__body {
  background: transparent !important;
}

/* 处理其他可能的纯色背景 */
/* 表格空状态 */
.glass-table .el-table__empty-block {
  background: transparent !important;
}

.glass-table .el-table__empty-text {
  color: #909399 !important;
}

/* 加载状态 */
.glass-table .el-loading-mask {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px) !important;
}

/* 表格固定列 */
.glass-table .el-table__fixed,
.glass-table .el-table__fixed-right {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px) !important;
}

/* 输入框和选择器的毛玻璃效果 */
.glass-card .el-input__wrapper {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.glass-card .el-input__wrapper:hover {
  border-color: rgba(64, 158, 255, 0.4) !important;
}

.glass-card .el-input__wrapper.is-focus {
  border-color: rgba(64, 158, 255, 0.6) !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
}

.glass-card .el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 下拉菜单毛玻璃效果 */
.el-select-dropdown {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
}

.el-select-dropdown .el-select-dropdown__item {
  background: transparent !important;
}

.el-select-dropdown .el-select-dropdown__item:hover {
  background: rgba(64, 158, 255, 0.1) !important;
}

.el-select-dropdown .el-select-dropdown__item.selected {
  background: rgba(64, 158, 255, 0.15) !important;
  color: #409eff !important;
}

/* 表单标签样式 - 使用深蓝色显眼 */
.glass-card .el-form-item__label {
  color: #2d3748 !important;
  font-weight: 700 !important;
}

/* 权限状态栏完整毛玻璃效果 */
.status-section {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  padding: 0 !important;
  min-height: 80px !important;
}

.glass-status-bar {
  background: transparent !important;
}

/* 深度覆盖TempEmailStatusBar组件内部样式 */
.status-section .temp-email-status-bar {
  background: transparent !important;
  border: none !important;
  border-radius: 16px !important;
}

.status-section .temp-email-status-bar .el-card {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.status-section .temp-email-status-bar .el-alert {
  background: transparent !important;
  border: none !important;
}

/* 公告横幅完整毛玻璃效果 */
.notice-section {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  padding: 16px !important;
  min-height: 80px !important;
  display: flex !important;
  align-items: center !important;
}

.notice-section .temp-email-notice {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  width: 100% !important;
  margin: 0 !important;
}

/* 优化公告横幅文本颜色 - 使用默认颜色 */
.notice-section .el-alert__title {
  font-weight: 700 !important;
  font-size: 15px !important;
}

.notice-section .el-alert__description {
  font-weight: 500 !important;
  font-size: 14px !important;
}

.notice-section .el-alert__icon {
  /* 使用默认颜色 */
}

.glass-notice {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

/* 当前邮箱信息毛玻璃效果 */
.current-email.glass-container .el-descriptions {
  background: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
}

.current-email.glass-container .el-descriptions__header {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(10px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #1a365d !important;
  font-weight: 700 !important;
  border-radius: 12px 12px 0 0 !important;
}

.current-email.glass-container .el-descriptions__body {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(15px) !important;
  border-radius: 0 0 12px 12px !important;
}

.current-email.glass-container .el-descriptions__cell {
  background: transparent !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #2d3748 !important;
  font-weight: 500 !important;
}

/* 旧的邮箱配置样式已被重构 */

/* 输入框完全毛玻璃化 */
.glass-card .el-input__wrapper {
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
  transition: all 0.3s ease !important;
}

.glass-card .el-input__wrapper:hover {
  border-color: rgba(64, 158, 255, 0.6) !important;
  background: rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px) !important;
}

.glass-card .el-input__wrapper.is-focus {
  border-color: rgba(64, 158, 255, 0.8) !important;
  background: rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.25), 0 8px 28px rgba(0, 0, 0, 0.18) !important;
  transform: translateY(-2px) !important;
}

.glass-card .el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
}

/* 输入框内文字颜色 - 使用深蓝色显眼 */
.glass-card .el-input__inner {
  color: #2d3748 !important;
  font-weight: 600 !important;
}

.glass-card .el-input__inner::placeholder {
  color: #4a5568 !important;
  font-weight: 500 !important;
}

/* 列表表头毛玻璃效果 */
.glass-container .list-header {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(15px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
  padding: 16px 20px !important;
  margin-bottom: 16px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.glass-container .list-header h3 {
  margin: 0 !important;
  color: #1a365d !important;
  font-weight: 700 !important;
}

/* 深度覆盖Element Plus组件的默认背景 */
.status-section .el-card__body,
.notice-section .el-alert__content,
.glass-card .el-form-item,
.glass-container .el-descriptions,
.glass-container .el-descriptions__body {
  background: transparent !important;
}

/* 全局深度覆盖Element Plus默认背景 */
/* 卡片组件 */
.temp-email-container .el-card,
.temp-email-container .el-card__body,
.temp-email-container .el-card__header {
  background: transparent !important;
}

/* 警告框组件 */
.temp-email-container .el-alert,
.temp-email-container .el-alert__content {
  background: transparent !important;
}

/* 表单组件 */
.temp-email-container .el-form,
.temp-email-container .el-form-item,
.temp-email-container .el-form-item__content {
  background: transparent !important;
}

/* 描述列表组件 */
.temp-email-container .el-descriptions,
.temp-email-container .el-descriptions__body,
.temp-email-container .el-descriptions__table,
.temp-email-container .el-descriptions__cell {
  background: transparent !important;
}

/* 表格组件深度覆盖 */
.temp-email-container .el-table,
.temp-email-container .el-table__body,
.temp-email-container .el-table__header,
.temp-email-container .el-table tr,
.temp-email-container .el-table td,
.temp-email-container .el-table th {
  background: transparent !important;
}

/* 表格表头特殊处理 */
.temp-email-container .el-table__header-wrapper,
.temp-email-container .el-table__header th {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 表格悬停效果 */
.temp-email-container .el-table__row:hover td {
  background: rgba(255, 255, 255, 0.08) !important;
}

/* 全局文字颜色强化 - 使用深色但不全是黑色 */
.temp-email-container {
  /* 移除全局强制颜色设置，让组件使用默认颜色 */
}

/* 特殊元素保持原有颜色 */
.temp-email-container .el-tag,
.temp-email-container .el-button,
.temp-email-container .el-icon,
.temp-email-container .status-icon,
.temp-email-container .el-alert__icon {
  color: inherit !important;
}

/* 链接和按钮文字保持原有颜色 */
.temp-email-container .el-button--text,
.temp-email-container .el-link {
  color: #409eff !important;
}

/* 成功、警告、错误状态保持原有颜色 */
.temp-email-container .el-tag--success,
.temp-email-container .status-icon.status-success {
  color: #67c23a !important;
}

.temp-email-container .el-tag--warning,
.temp-email-container .status-icon.status-warning {
  color: #e6a23c !important;
}

.temp-email-container .el-tag--danger {
  color: #f56c6c !important;
}

/* 额外的协调性优化 */
/* 确保TempEmailStatusBar在父容器中完全填充 */
.status-section .temp-email-status-bar {
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
}

/* 优化选择器下拉选项的颜色 */
.el-select-dropdown .el-select-dropdown__item {
  color: #2d3748 !important;
}

.el-select-dropdown .el-select-dropdown__item.selected {
  color: #2b6cb0 !important;
}

/* 旧的前置按钮样式已在新布局中重构 */

/* 优化表格内容的可读性 */
.glass-table .el-table td {
  color: #2d3748 !important;
  font-weight: 500 !important;
}

/* 优化标签的毛玻璃效果 */
.glass-table .el-tag {
  backdrop-filter: blur(10px) !important;
  border-radius: 8px !important;
}

/* 对话框组件 */
.temp-email-container .el-dialog,
.temp-email-container .el-dialog__body,
.temp-email-container .el-dialog__header {
  background: transparent !important;
}

/* 按钮组件在毛玻璃容器中的样式 */
.glass-container .el-button,
.glass-card .el-button {
  backdrop-filter: blur(5px) !important;
}

.glass-container .el-button--primary:not(.pink-generate-btn):not(.header-generate-btn) {
  background: rgba(64, 158, 255, 0.8) !important;
  border: 1px solid rgba(64, 158, 255, 0.3) !important;
}

/* 输入框在毛玻璃容器中的增强效果 */
.glass-container .el-input__wrapper,
.glass-card .el-input__wrapper {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(10px) !important;
}

/* 选择器在毛玻璃容器中的增强效果 */
.glass-container .el-select .el-input__wrapper,
.glass-card .el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
}

/* 移除全局字体颜色强制设置，让组件使用默认颜色 */

/* 移除所有强制颜色设置，让组件使用默认颜色 */
</style>
