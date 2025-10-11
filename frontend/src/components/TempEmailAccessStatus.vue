<template>
  <div class="temp-email-access-status">
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon" :class="statusIconClass">
            <component :is="statusIcon" />
          </el-icon>
          <span class="status-title">{{ statusTitle }}</span>
          <el-tag :type="statusTagType" class="status-tag">
            {{ statusText }}
          </el-tag>
        </div>
      </template>

      <div class="status-content">
        <!-- 权限详情 -->
        <div class="access-details" v-if="accessStatus.hasAccess">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="激活时间">
              <el-icon>
                <Calendar />
              </el-icon>
              {{ formatDate(accessStatus.tempEmailAccess.activatedAt) }}
            </el-descriptions-item>

            <el-descriptions-item label="激活码" v-if="accessStatus.tempEmailAccess.activatedBy">
              <el-icon>
                <Key />
              </el-icon>
              <el-tag type="info" size="small">
                {{ accessStatus.tempEmailAccess.activatedBy }}
              </el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="有效期" v-if="accessStatus.tempEmailAccess.expiresAt">
              <el-icon>
                <Clock />
              </el-icon>
              <span :class="expirationClass">
                {{ formatDate(accessStatus.tempEmailAccess.expiresAt) }}
                <span v-if="accessStatus.remainingTime !== null" class="remaining-time">
                  （剩余 {{ accessStatus.remainingTime }} 天）
                </span>
              </span>
            </el-descriptions-item>

            <el-descriptions-item label="有效期" v-else>
              <el-icon>
                <Unlock />
              </el-icon>
              <el-tag type="success" size="small">永久有效</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="最后使用" v-if="accessStatus.tempEmailAccess.lastUsedAt">
              <el-icon>
                <Clock />
              </el-icon>
              {{ formatDate(accessStatus.tempEmailAccess.lastUsedAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 管理员提示 -->
        <div class="admin-notice" v-if="accessStatus.isAdmin">
          <el-alert title="管理员权限" type="success" :closable="false" show-icon>
            <template #default>
              您拥有管理员权限，可以无限制使用临时邮箱功能。
            </template>
          </el-alert>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons" v-if="accessStatus.hasAccess">
          <el-button type="primary" @click="$emit('start-using')" :icon="Message">
            开始使用临时邮箱
          </el-button>

          <el-button @click="showUsageStats = true" :icon="DataAnalysis">
            查看使用统计
          </el-button>
        </div>

        <!-- 激活按钮 -->
        <div class="activation-prompt" v-else>
          <p class="prompt-text">
            您还没有临时邮箱使用权限，需要激活后才能使用。
          </p>
          <el-button type="primary" size="large" @click="$emit('show-activation')" :icon="Key">
            激活临时邮箱权限
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 使用统计对话框 -->
    <el-dialog v-model="showUsageStats" title="使用统计" width="600px" :before-close="closeUsageStats">
      <div class="usage-stats-content">
        <el-loading :loading="loadingStats" element-loading-text="加载统计数据...">
          <div v-if="usageStats">
            <el-descriptions title="30天使用统计" :column="2" border>
              <el-descriptions-item label="生成邮箱">
                {{ usageStats.generate?.count || 0 }} 次
              </el-descriptions-item>
              <el-descriptions-item label="查看邮件">
                {{ usageStats.view?.count || 0 }} 次
              </el-descriptions-item>
              <el-descriptions-item label="发送测试">
                {{ usageStats.send_test?.count || 0 }} 次
              </el-descriptions-item>
              <el-descriptions-item label="清空邮箱">
                {{ usageStats.clear?.count || 0 }} 次
              </el-descriptions-item>
            </el-descriptions>

            <div class="last-actions" v-if="hasRecentActions">
              <h4>最近操作时间</h4>
              <el-timeline>
                <el-timeline-item v-for="(action, key) in recentActions" :key="key"
                  :timestamp="formatDate(action.lastAction)" placement="top">
                  {{ getActionName(key) }}：{{ action.count }} 次
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </el-loading>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Calendar,
  Key,
  Clock,
  Unlock,
  Message,
  DataAnalysis,
  CircleCheck,
  CircleClose,
  Warning
} from '@element-plus/icons-vue'
import { tempEmailAuthApi } from '@/api/tempEmailAuth'

// 定义props
const props = defineProps({
  accessStatus: {
    type: Object,
    required: true
  }
})

// 定义事件
const emit = defineEmits(['start-using', 'show-activation'])

// 响应式数据
const showUsageStats = ref(false)
const loadingStats = ref(false)
const usageStats = ref(null)

// 计算属性
const statusIcon = computed(() => {
  if (props.accessStatus.isAdmin) return CircleCheck
  if (props.accessStatus.hasAccess) return CircleCheck
  return CircleClose
})

const statusIconClass = computed(() => {
  if (props.accessStatus.isAdmin) return 'admin-icon'
  if (props.accessStatus.hasAccess) return 'success-icon'
  return 'error-icon'
})

const statusTitle = computed(() => {
  if (props.accessStatus.isAdmin) return '管理员权限'
  if (props.accessStatus.hasAccess) return '权限已激活'
  return '权限未激活'
})

const statusText = computed(() => {
  if (props.accessStatus.isAdmin) return '管理员'
  if (props.accessStatus.hasAccess) return '已激活'
  return '未激活'
})

const statusTagType = computed(() => {
  if (props.accessStatus.isAdmin) return 'success'
  if (props.accessStatus.hasAccess) return 'success'
  return 'danger'
})

const expirationClass = computed(() => {
  if (!props.accessStatus.remainingTime) return ''
  if (props.accessStatus.remainingTime <= 7) return 'expiring-soon'
  if (props.accessStatus.remainingTime <= 30) return 'expiring-warning'
  return ''
})

const hasRecentActions = computed(() => {
  return usageStats.value && Object.keys(recentActions.value).length > 0
})

const recentActions = computed(() => {
  if (!usageStats.value) return {}

  const actions = {}
  Object.entries(usageStats.value).forEach(([key, value]) => {
    if (value.lastAction) {
      actions[key] = value
    }
  })

  return actions
})

// 方法
const formatDate = (dateString) => {
  if (!dateString) return '未知'

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const getActionName = (action) => {
  const actionNames = {
    generate: '生成邮箱',
    view: '查看邮件',
    send_test: '发送测试',
    clear: '清空邮箱',
    delete: '删除邮件'
  }
  return actionNames[action] || action
}

const loadUsageStats = async () => {
  try {
    loadingStats.value = true
    const response = await tempEmailAuthApi.getUsageStats(30)

    if (response.data.success) {
      usageStats.value = response.data.data.stats
    } else {
      ElMessage.error('加载使用统计失败')
    }
  } catch (error) {
    console.error('加载使用统计失败:', error)
    ElMessage.error('加载使用统计失败')
  } finally {
    loadingStats.value = false
  }
}

const closeUsageStats = () => {
  showUsageStats.value = false
  usageStats.value = null
}

// 监听统计对话框显示
watch(showUsageStats, (newValue) => {
  if (newValue) {
    loadUsageStats()
  }
})
</script>

<style scoped>
.temp-email-access-status {
  margin-bottom: 24px;
}

.status-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
}

.success-icon {
  color: #67c23a;
}

.error-icon {
  color: #f56c6c;
}

.admin-icon {
  color: #e6a23c;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
}

.status-tag {
  font-weight: 500;
}

.status-content {
  padding: 0;
}

.access-details {
  margin-bottom: 20px;
}

.remaining-time {
  font-weight: 500;
  color: #909399;
}

.expiring-soon {
  color: #f56c6c;
  font-weight: 600;
}

.expiring-warning {
  color: #e6a23c;
  font-weight: 500;
}

.admin-notice {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.activation-prompt {
  text-align: center;
  padding: 20px;
}

.prompt-text {
  margin-bottom: 16px;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.usage-stats-content {
  min-height: 200px;
}

.last-actions {
  margin-top: 24px;
}

.last-actions h4 {
  margin-bottom: 16px;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .status-title {
    font-size: 14px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
