<template>
  <div class="email-management-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>📧 邮件管理</h2>
          <div class="header-actions">
            <el-button @click="refreshData" :loading="loading" icon="Refresh">
              刷新数据
            </el-button>
            <el-button @click="clearAllEmails" type="danger" icon="Delete">
              清空所有邮件
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalEmails }}</div>
              <div class="stat-label">总邮件数</div>
            </div>
            <el-icon class="stat-icon"><Message /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalMailboxes }}</div>
              <div class="stat-label">活跃邮箱</div>
            </div>
            <el-icon class="stat-icon"><User /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ stats.todayEmails }}</div>
              <div class="stat-label">今日邮件</div>
            </div>
            <el-icon class="stat-icon"><Calendar /></el-icon>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ formatSize(stats.totalSize) }}</div>
              <div class="stat-label">总大小</div>
            </div>
            <el-icon class="stat-icon"><Folder /></el-icon>
          </el-card>
        </el-col>
      </el-row>

      <!-- 邮箱列表 -->
      <el-table 
        :data="mailboxes" 
        v-loading="loading"
        empty-text="暂无邮箱"
      >
        <el-table-column prop="email" label="邮箱地址" width="250">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.email }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="messageCount" label="邮件数量" width="100" />
        <el-table-column prop="totalSize" label="总大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.totalSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastActivity" label="最后活动" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastActivity) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="viewEmails(row)"
              icon="View"
            >
              查看邮件
            </el-button>
            <el-button 
              type="danger" 
              size="small"
              @click="clearMailbox(row.email)"
              icon="Delete"
            >
              清空
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 邮件详情对话框 -->
    <el-dialog
      v-model="emailDialogVisible"
      :title="`${currentMailbox} 的邮件`"
      width="80%"
    >
      <el-table :data="currentEmails" empty-text="暂无邮件">
        <el-table-column prop="from" label="发件人" width="200" />
        <el-table-column prop="subject" label="主题" />
        <el-table-column prop="date" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="viewEmailContent(row)"
            >
              查看内容
            </el-button>
            <el-button 
              type="danger" 
              size="small"
              @click="deleteEmail(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 邮件内容对话框 -->
    <el-dialog
      v-model="contentDialogVisible"
      title="邮件内容"
      width="70%"
    >
      <div v-if="currentEmailContent">
        <el-descriptions :column="1" border style="margin-bottom: 20px">
          <el-descriptions-item label="发件人">
            {{ currentEmailContent.from }}
          </el-descriptions-item>
          <el-descriptions-item label="收件人">
            {{ currentEmailContent.to }}
          </el-descriptions-item>
          <el-descriptions-item label="主题">
            {{ currentEmailContent.subject }}
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatDate(currentEmailContent.date) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="email-body">
          <h4>邮件内容</h4>
          <div 
            v-if="currentEmailContent.body.html"
            v-html="currentEmailContent.body.html"
            class="html-content"
          ></div>
          <pre 
            v-else-if="currentEmailContent.body.text"
            class="text-content"
          >{{ currentEmailContent.body.text }}</pre>
          <p v-else class="no-content">无邮件内容</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Message, User, Calendar, Folder } from '@element-plus/icons-vue'
import request from '@/api/index'

// 响应式数据
const loading = ref(false)
const mailboxes = ref([])
const stats = ref({
  totalEmails: 0,
  totalMailboxes: 0,
  todayEmails: 0,
  totalSize: 0
})

const emailDialogVisible = ref(false)
const contentDialogVisible = ref(false)
const currentMailbox = ref('')
const currentEmails = ref([])
const currentEmailContent = ref(null)

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    
    // 获取所有邮箱数据
    const response = await request.get('/temp-email/all-emails')
    if (response.data.success) {
      mailboxes.value = response.data.data.emailBoxes.map(box => ({
        email: box.email,
        messageCount: box.messageCount,
        totalSize: box.messages.reduce((sum, msg) => sum + (msg.size || 0), 0),
        lastActivity: box.messages.length > 0 ? 
          Math.max(...box.messages.map(msg => new Date(msg.date).getTime())) : null,
        messages: box.messages
      }))
      
      // 计算统计数据
      stats.value = {
        totalEmails: response.data.data.totalMessages,
        totalMailboxes: mailboxes.value.length,
        todayEmails: calculateTodayEmails(),
        totalSize: mailboxes.value.reduce((sum, box) => sum + box.totalSize, 0)
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 计算今日邮件数量
const calculateTodayEmails = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return mailboxes.value.reduce((count, box) => {
    return count + box.messages.filter(msg => {
      const msgDate = new Date(msg.date)
      msgDate.setHours(0, 0, 0, 0)
      return msgDate.getTime() === today.getTime()
    }).length
  }, 0)
}

// 查看邮箱邮件
const viewEmails = (mailbox) => {
  currentMailbox.value = mailbox.email
  currentEmails.value = mailbox.messages
  emailDialogVisible.value = true
}

// 查看邮件内容
const viewEmailContent = async (email) => {
  try {
    const response = await request.get(`/temp-email/${currentMailbox.value}/messages/${email.id}`)
    if (response.data.success) {
      currentEmailContent.value = response.data.data
      contentDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取邮件内容失败')
  }
}

// 删除单个邮件
const deleteEmail = async (email) => {
  try {
    await ElMessageBox.confirm('确定要删除这封邮件吗？', '确认删除', {
      type: 'warning'
    })
    
    await request.delete(`/temp-email/${currentMailbox.value}/messages/${email.id}`)
    ElMessage.success('邮件删除成功')
    
    // 刷新当前邮箱邮件列表
    const mailbox = mailboxes.value.find(box => box.email === currentMailbox.value)
    if (mailbox) {
      viewEmails(mailbox)
    }
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除邮件失败')
    }
  }
}

// 清空邮箱
const clearMailbox = async (email) => {
  try {
    await ElMessageBox.confirm(
      `确定要清空邮箱 "${email}" 的所有邮件吗？此操作不可恢复。`,
      '确认清空',
      { type: 'warning' }
    )

    const response = await request.delete(`/temp-email/${email}/clear`)
    if (response.data.success) {
      ElMessage.success(response.data.message || '邮箱清空成功')
      loadData()
    } else {
      ElMessage.error(response.data.message || '清空邮箱失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空邮箱失败:', error)
      ElMessage.error('清空邮箱失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 清空所有邮件
const clearAllEmails = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有邮箱的邮件吗？此操作不可恢复。',
      '确认清空',
      { type: 'warning' }
    )

    const response = await request.delete('/temp-email/clear-all')
    if (response.data.success) {
      ElMessage.success(response.data.message || '所有邮件清空成功')
      loadData()
    } else {
      ElMessage.error(response.data.message || '清空失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空所有邮件失败:', error)
      ElMessage.error('清空失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.email-management-container {
  padding: 20px;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 2;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32px;
  color: #e6f7ff;
  z-index: 1;
}

.email-body {
  margin-top: 20px;
}

.html-content {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.text-content {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}

.no-content {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px;
}
</style>
