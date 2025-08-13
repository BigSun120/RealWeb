<template>
  <div class="temp-email-container">
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

      <!-- 服务状态 -->
      <el-alert
        v-if="!serviceOnline"
        title="邮箱服务未启动"
        description="请运行 npm run email:start 启动邮箱服务"
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
              v-if="currentEmail"
              @click="sendTestEmail"
              :loading="sendingTest"
              type="success"
              size="small"
              icon="Promotion"
            >
              发送测试邮件
            </el-button>
            <el-button
              @click="refreshAllMessages"
              :loading="loading"
              icon="Refresh"
              type="primary"
              size="small"
            >
              刷新全部
            </el-button>
            <el-switch
              v-model="showCurrentEmailOnly"
              active-text="仅当前邮箱"
              inactive-text="显示全部"
              style="margin-left: 10px"
            />
          </div>
        </div>

        <el-table
          :data="displayMessages"
          v-loading="loading"
          empty-text="暂无邮件"
        >
          <el-table-column prop="email" label="收件邮箱" width="200" v-if="!showCurrentEmailOnly">
            <template #default="{ row }">
              <el-tag type="primary" size="small">{{ row.email }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="from" label="发件人" width="200" />
          <el-table-column prop="subject" label="主题" />
          <el-table-column prop="date" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.date) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
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
      <div v-if="currentMessage" class="message-content">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { tempEmailApi } from '@/api/tempEmail'

// 响应式数据
const serviceOnline = ref(true)
const currentEmail = ref('')
const messages = ref([])
const loading = ref(false)
const generating = ref(false)
const sendingTest = ref(false)
const messageDialogVisible = ref(false)
const currentMessage = ref(null)

// 邮箱配置
const emailPrefix = ref('')
const selectedDomain = ref('')
const availableDomains = ref([])

// 全部邮件
const allEmailsDialogVisible = ref(false)
const allEmailBoxes = ref([])
const activeEmailTab = ref('')
const showCurrentEmailOnly = ref(false)
const allMessages = ref([])

// 计算属性：显示的邮件列表
const displayMessages = computed(() => {
  if (showCurrentEmailOnly.value && currentEmail.value) {
    return messages.value.map(msg => ({
      ...msg,
      email: currentEmail.value
    }))
  }
  return allMessages.value
})

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

    // 验证输入
    if (!selectedDomain.value) {
      ElMessage.warning('请选择邮箱域名')
      console.log('❌ 未选择域名')
      return
    }

    const params = {
      domain: selectedDomain.value,
      customName: emailPrefix.value || undefined
    }
    console.log('📤 发送参数:', params)

    const response = await tempEmailApi.generateEmail(params)
    console.log('📥 生成响应:', response.data)

    if (response.data.success) {
      currentEmail.value = response.data.data.email
      messages.value = []
      ElMessage.success('邮箱生成成功: ' + currentEmail.value)
      console.log('✅ 邮箱生成成功:', currentEmail.value)

      // 清空输入框
      emailPrefix.value = ''

      // 自动刷新邮件列表
      setTimeout(() => {
        refreshMessages()
      }, 1000)
    }
  } catch (error) {
    console.error('❌ 生成邮箱失败:', error)
    ElMessage.error('生成邮箱失败: ' + (error.response?.data?.message || error.message))
  } finally {
    generating.value = false
  }
}

// 发送测试邮件
const sendTestEmail = async () => {
  if (!currentEmail.value) return

  try {
    sendingTest.value = true
    const response = await tempEmailApi.sendTestEmail(currentEmail.value)

    if (response.data.success) {
      ElMessage.success('测试邮件发送成功，请稍等片刻后刷新')
      // 3秒后自动刷新
      setTimeout(() => {
        refreshMessages()
      }, 3000)
    }
  } catch (error) {
    console.error('发送测试邮件失败:', error)
    ElMessage.error('发送测试邮件失败')
  } finally {
    sendingTest.value = false
  }
}

// 刷新邮件列表
const refreshMessages = async () => {
  if (!currentEmail.value) return

  try {
    loading.value = true
    const response = await tempEmailApi.getMessages(currentEmail.value)

    if (response.data.success) {
      messages.value = response.data.data.messages
    }
  } catch (error) {
    console.error('获取邮件列表失败:', error)
    ElMessage.error('获取邮件列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新全部邮件
const refreshAllMessages = async () => {
  try {
    loading.value = true

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

      ElMessage.success(`已加载 ${allMessages.value.length} 封邮件`)
    }
  } catch (error) {
    console.error('获取全部邮件失败:', error)
    ElMessage.error('获取全部邮件失败')
  } finally {
    loading.value = false
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
    console.error('获取邮件详情失败:', error)
    ElMessage.error('获取邮件详情失败')
  }
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
      console.error('删除邮件失败:', error)
      ElMessage.error('删除邮件失败')
    }
  }
}

// 复制邮箱地址
const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(currentEmail.value)
    ElMessage.success('邮箱地址已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

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
    console.error('获取全部邮件失败:', error)
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
    console.error('获取邮件详情失败:', error)
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
    console.log('🔍 正在加载域名列表...')
    const response = await tempEmailApi.getDomains()
    console.log('📋 域名列表响应:', response.data)

    if (response.data.success) {
      availableDomains.value = response.data.data
      console.log('✅ 可用域名:', availableDomains.value)

      // 默认选择第一个域名
      if (availableDomains.value.length > 0) {
        selectedDomain.value = availableDomains.value[0]
        console.log('🎯 默认选择域名:', selectedDomain.value)
      }
    }
  } catch (error) {
    console.error('❌ 获取域名列表失败:', error)
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

// 组件挂载时初始化
onMounted(() => {
  checkServiceStatus()
  loadAvailableDomains()
  refreshAllMessages()
})
</script>

<style scoped>
.temp-email-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
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

.message-content {
  max-height: 70vh;
  overflow-y: auto;
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
  max-height: 400px;
  overflow-y: auto;
}

.text-content {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
}

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
</style>
