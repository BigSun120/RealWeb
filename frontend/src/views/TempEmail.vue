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
            <el-result
              icon="warning"
              title="需要登录"
              sub-title="使用临时邮箱功能需要先登录账户"
            >
              <template #extra>
                <el-button type="primary" size="large" @click="goToLogin">
                  <el-icon><User /></el-icon>
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
      <TempEmailActivation
        v-if="showActivation"
        @success="handleActivationSuccess"
        @cancel="showActivation = false"
      />

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
              <TempEmailStatusBar
                :access-status="accessStatus"
                @show-activation="showActivation = true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主功能界面 -->
    <div v-else class="temp-email-main">
      <!-- 简化的权限状态显示 -->
      <TempEmailStatusBar
        :access-status="accessStatus"
        @show-activation="showActivation = true"
      />

      <!-- 临时邮箱专用公告横幅 -->
      <el-alert
        v-if="tempEmailNotice && tempEmailNotice.content"
        :title="tempEmailNotice.title || '📢 使用提醒'"
        :description="tempEmailNotice.content"
        :type="tempEmailNotice.type || 'info'"
        :closable="tempEmailNotice.closable !== false"
        show-icon
        class="temp-email-notice"
        style="margin-bottom: 20px"
      />



      <!-- 激活界面弹窗（已激活用户也可以使用） -->
      <el-dialog
        v-model="showActivation"
        title="激活临时邮箱权限"
        width="680px"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        :lock-scroll="true"
        :modal="true"
        :append-to-body="true"
        class="activation-dialog"
        destroy-on-close
      >
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
          <TempEmailActivation
            @success="handleActivationSuccess"
            @cancel="showActivation = false"
          />
        </div>
      </el-dialog>

      <el-card class="main-card">
        <template #header>
          <div class="card-header">
            <h2>📧 临时邮箱</h2>
            <div class="header-actions">
              <el-button
                type="primary"
                @click="generateEmail"
                :loading="generating"
              >
                生成新邮箱
              </el-button>
            </div>
          </div>
        </template>

      <!-- 邮箱生成配置 -->
      <div class="email-config">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱前缀">
              <el-input
                v-model="emailPrefix"
                placeholder="留空自动生成，或输入自定义前缀"
                clearable
              >
                <template #prepend>
                  <el-button @click="generateRandomPrefix" size="small">
                    🎲 随机
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱域名">
              <el-select
                v-model="selectedDomain"
                placeholder="选择域名后缀"
                style="width: 100%"
              >
                <el-option
                  v-for="domain in availableDomains"
                  :key="domain"
                  :label="`@${domain}`"
                  :value="domain"
                >
                  <span style="float: left">@{{ domain }}</span>
                  <span
                    v-if="domain === 'godaug.fun'"
                    style="float: right; color: #67c23a; font-size: 12px"
                  >
                    ⭐ 专属
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 服务状态 请运行 npm run email:start 启动邮箱服务-->
      <el-alert
        v-if="!serviceOnline"
        title="邮箱服务未启动"
        description="嗷呜！"
        type="warning"
        :closable="false"
        class="status-alert"
      />

      <!-- 当前邮箱 -->
      <div v-if="currentEmail" class="current-email">
        <el-descriptions title="当前邮箱" :column="1" border>
          <el-descriptions-item label="邮箱地址">
            <el-tag type="success" size="large">{{ currentEmail }}</el-tag>
            <el-button 
              type="text" 
              @click="copyEmail"
              style="margin-left: 10px"
            >
              复制
            </el-button>
          </el-descriptions-item>

        </el-descriptions>
      </div>

      <!-- 邮件列表 -->
      <div class="email-list">
        <div class="list-header">
          <h3>📬 所有邮件</h3>
          <div class="list-actions">
            <el-button
              @click="refreshAllMessages"
              :loading="loading"
              icon="Refresh"
              type="primary"
              size="small"
            >
              刷新全部
            </el-button>
          </div>
        </div>

        <el-table
          :data="displayMessages"
          v-loading="loading"
          empty-text="暂无邮件"
        >
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
              <el-button
                v-if="row.code || extractCode(row)"
                size="small"
                type="text"
                @click="copyText(row.code || extractCode(row))"
                style="margin-left: 6px"
              >复制</el-button>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="viewMessage(row)"
              >
                查看
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteMessage(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 邮件详情对话框 -->
    <el-dialog
      v-model="messageDialogVisible"
      title="邮件详情"
      width="80%"
      :before-close="closeMessageDialog"
    >
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
          <div
            v-if="currentMessage.body.html"
            v-html="currentMessage.body.html"
            class="html-content"
          ></div>
          <pre
            v-else-if="currentMessage.body.text"
            class="text-content"
          >{{ currentMessage.body.text }}</pre>
          <p v-else class="no-content">无邮件内容</p>
        </div>
      </div>
    </el-dialog>

    <!-- 全部邮件对话框 -->
    <el-dialog
      v-model="allEmailsDialogVisible"
      title="📬 全部邮件"
      width="90%"
      :before-close="closeAllEmailsDialog"
    >
      <div class="all-emails-content">
        <el-tabs v-model="activeEmailTab" type="card">
          <el-tab-pane
            v-for="emailBox in allEmailBoxes"
            :key="emailBox.email"
            :label="`${emailBox.email} (${emailBox.messages.length})`"
            :name="emailBox.email"
          >
            <div class="email-box-content">
              <el-table
                :data="emailBox.messages"
                empty-text="暂无邮件"
                size="small"
              >
                <el-table-column prop="from" label="发件人" width="200" />
                <el-table-column prop="subject" label="主题" />
                <el-table-column prop="date" label="时间" width="180">
                  <template #default="{ row }">
                    {{ formatDate(row.date) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      size="small"
                      @click="viewMessageFromAll(emailBox.email, row)"
                    >
                      查看
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Key } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { tempEmailApi } from '@/api/tempEmail'
import { tempEmailAuthApi } from '@/api/tempEmailAuth'
import TempEmailActivation from '@/components/TempEmailActivation.vue'
import TempEmailStatusBar from '@/components/TempEmailStatusBar.vue'

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
const activeEmailTab = ref('')
const showCurrentEmailOnly = ref(false) // 已不再使用，仅保留变量避免大范围改动
const allMessages = ref([])

// 临时邮箱公告
const tempEmailNotice = ref(null)

// 计算属性：显示的邮件列表（默认显示全部）
const displayMessages = computed(() => allMessages.value)

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

      // 如果权限状态从有变为无，清除相关数据
      if (oldHasAccess && !response.data.hasAccess) {
        // 清除邮件数据
        allMessages.value = []
        currentEmail.value = ''
        selectedDomain.value = ''
      }
    }
  } catch (error) {
    console.error('检查权限状态失败:', error)

    // 如果是401错误，可能是登录过期
    if (error.response?.status === 401) {
      ElMessage.warning('登录状态已过期，请重新登录')
      router.push('/auth/login')
    } else {
      ElMessage.error('检查权限状态失败')
    }
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/auth/login')
}

const handleActivationSuccess = async (data) => {
  ElMessage.success('权限激活成功！')
  showActivation.value = false

  // 重新检查权限状态
  await checkAccessStatus()

  // 如果激活成功，加载相关数据并触发页面重新渲染
  if (accessStatus.value.hasAccess) {
    await checkServiceStatus()
    await loadAvailableDomains()

    // 使用nextTick确保DOM更新后再触发重新布局
    await nextTick()

    // 强制触发页面重新计算高度
    window.dispatchEvent(new Event('resize'))
  }
}



// 生成随机前缀
const generateRandomPrefix = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  emailPrefix.value = result
}

// 生成临时邮箱
const generateEmail = async () => {
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

    const params = {
      domain: selectedDomain.value,
      customName: emailPrefix.value || undefined
    }

    const response = await tempEmailApi.generateEmail(params)

    if (response.data.success) {
      currentEmail.value = response.data.data.email
      messages.value = []
      // 清空输入框
      emailPrefix.value = ''

      // 自动刷新邮件列表
      setTimeout(() => {
        refreshMessages()
      }, 1000)
    }
  } catch (error) {
    ElMessage.error('生成邮箱失败: ' + (error.response?.data?.message || error.message))
  } finally {
    generating.value = false
  }
}



// 刷新邮件列表
const refreshMessages = async () => {
  if (!currentEmail.value) return

  try {
    functionalLoading.value = true
    const response = await tempEmailApi.getMessages(currentEmail.value)

    if (response.data.success) {
      messages.value = response.data.data.messages
    }
  } catch (error) {
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
      allMessages.value = []

      // 将所有邮箱的邮件合并到一个列表中
      response.data.data.emailBoxes.forEach(emailBox => {
        emailBox.messages.forEach(message => {
          allMessages.value.push({
            ...message,
            email: emailBox.email
          })
        })
      })

      // 按时间排序，最新的在前
      allMessages.value.sort((a, b) => new Date(b.date) - new Date(a.date))

      // 异步补充最近5封的验证码（从正文提取），不阻塞主列表刷新
      await enrichLatestCodes()

      ElMessage.success(`已加载 ${allMessages.value.length} 封邮件`)
    }
  } catch (error) {
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

// 查看邮件详情
const viewMessage = async (message) => {
  try {
    const email = message.email || currentEmail.value
    const response = await tempEmailApi.getMessage(email, message.id)

    if (response.data.success) {
      currentMessage.value = response.data.data
      messageDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取邮件详情失败')
  }
}

// 从邮件的主题/纯文本/HTML中提取6位验证码
const extractCode = (msgOrString) => {
  const pick6 = (s) => (s || '').match(/\b(\d{6})\b/);
  if (!msgOrString) return '';
  if (typeof msgOrString === 'string') {
    const m = pick6(msgOrString); return m ? m[1] : '';
  }
  const bySubject = pick6(msgOrString.subject);
  if (bySubject) return bySubject[1];
  // 如果列表没有正文，等 getMessage 时再补
  return '';
}

// 批量补充最近10封的验证码（从正文获取）
const enrichLatestCodes = async () => {
  const top = displayMessages.value.slice(0, 10);
  const tasks = top.map(async (row) => {
    try {
      const email = row.email || currentEmail.value;
      const res = await tempEmailApi.getMessage(email, row.id);
      if (res.data?.success) {
        const body = res.data.data?.body || {};
        const code = extractCode(body.text) || extractCode(body.html);
        if (code) row.code = code;
      }
    } catch (e) { /* 忽略单条失败 */ }
  });
  await Promise.allSettled(tasks);
}

// 删除邮件
const deleteMessage = async (message) => {
  try {
    await ElMessageBox.confirm('确定要删除这封邮件吗？', '确认删除', {
      type: 'warning'
    })

    const email = message.email || currentEmail.value
    await tempEmailApi.deleteMessage(email, message.id)
    ElMessage.success('邮件删除成功')

    // 刷新列表
    if (showCurrentEmailOnly.value) {
      refreshMessages()
    } else {
      refreshAllMessages()
    }
  } catch (error) {
    if (error !== 'cancel') {
      const errorMessage = error.response?.data?.message || error.message || '删除邮件失败'
      ElMessage.error('删除邮件失败: ' + errorMessage)
    }
  }
}

// 复制文本通用方法
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
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
      allEmailBoxes.value = response.data.data.emailBoxes

      // 如果当前有邮箱且不在列表中，也加入列表
      if (currentEmail.value) {
        const existingIndex = allEmailBoxes.value.findIndex(box => box.email === currentEmail.value)
        if (existingIndex === -1 && messages.value.length > 0) {
          allEmailBoxes.value.unshift({
            email: currentEmail.value,
            domain: currentEmail.value.split('@')[1],
            messageCount: messages.value.length,
            messages: messages.value
          })
        }
      }

      // 设置默认选中的标签
      if (allEmailBoxes.value.length > 0) {
        activeEmailTab.value = allEmailBoxes.value[0].email
      }

      allEmailsDialogVisible.value = true

      if (allEmailBoxes.value.length === 0) {
        ElMessage.info('未找到任何邮件')
      } else {
        const totalMessages = response.data.data.totalMessages
        ElMessage.success(`找到 ${allEmailBoxes.value.length} 个邮箱，共 ${totalMessages} 封邮件`)
      }
    }
  } catch (error) {
    ElMessage.error('获取全部邮件失败')
  }
}

// 从全部邮件中查看邮件详情
const viewMessageFromAll = async (email, message) => {
  try {
    const response = await tempEmailApi.getMessage(email, message.id)

    if (response.data.success) {
      currentMessage.value = response.data.data
      messageDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取邮件详情失败')
  }
}

// 关闭全部邮件对话框
const closeAllEmailsDialog = () => {
  allEmailsDialogVisible.value = false
  allEmailBoxes.value = []
  activeEmailTab.value = ''
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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 120px); /* 确保页面有足够高度显示footer */
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
  margin-bottom: 20px;
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

.dialog-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.message-content {
  max-height: 70vh;
  overflow-y: auto;
}
.message-content.fullscreen{
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

.code-text{font-family:monospace;color:#333;}

.no-content {
  color: #909399;
  font-style: italic;
}

/* 邮箱配置样式 */
.email-config {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
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
</style>
