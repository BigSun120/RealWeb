<template>
  <el-dialog
    v-model="dialogVisible"
    title="令牌详情"
    width="800px"
    :close-on-click-modal="false"
  >
    <div v-if="token" class="token-details">
      <!-- 基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Key /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="邮箱备注">
            <div class="copyable-field">
              <span>{{ token.emailNote || '未设置' }}</span>
              <el-button
                v-if="token.emailNote"
                :icon="DocumentCopy"
                @click="copyToClipboard(token.emailNote, '邮箱备注')"
                size="small"
                text
              />
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="令牌来源">
            <el-tag :type="token.source === 'personal' ? 'primary' : 'success'" size="small">
              {{ token.source === 'personal' ? '个人令牌' : '令牌池' }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="所属用户">
            <div class="user-info">
              <div>{{ token.ownerInfo?.username || '未知' }}</div>
              <div class="user-email">{{ token.ownerInfo?.email || '未知' }}</div>
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="令牌状态">
            <el-tag :type="getTokenStatusTagType(token.tokenStatus)" size="small">
              {{ getTokenStatusText(token.tokenStatus) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="账号状态">
            <el-tag :type="getAccountStatusTagType(token.accountStatus)" size="small">
              {{ getAccountStatusText(token.accountStatus) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="剩余次数">
            <el-tag :type="getCreditsTagType(token.creditsBalance)" size="small">
              {{ token.creditsBalance || 0 }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 访问令牌 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Lock /></el-icon>
            <span>访问令牌</span>
          </div>
        </template>
        
        <div class="token-field">
          <el-input
            :value="token.accessToken"
            readonly
            type="textarea"
            :rows="3"
            resize="none"
          >
            <template #append>
              <el-button
                :icon="DocumentCopy"
                @click="copyToClipboard(token.accessToken, '访问令牌')"
                type="primary"
              >
                复制
              </el-button>
            </template>
          </el-input>
        </div>
      </el-card>

      <!-- URL信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Link /></el-icon>
            <span>URL信息</span>
          </div>
        </template>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Tenant URL">
            <div class="copyable-field">
              <span>{{ token.tenantUrl || '未设置' }}</span>
              <el-button
                v-if="token.tenantUrl"
                :icon="DocumentCopy"
                @click="copyToClipboard(token.tenantUrl, 'Tenant URL')"
                size="small"
                text
              />
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="Portal URL">
            <div class="copyable-field">
              <span>{{ token.portalUrl || '未设置' }}</span>
              <el-button
                v-if="token.portalUrl"
                :icon="DocumentCopy"
                @click="copyToClipboard(token.portalUrl, 'Portal URL')"
                size="small"
                text
              />
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 时间信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><Clock /></el-icon>
            <span>时间信息</span>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="创建时间">
            {{ formatDate(token.createdAt) }}
          </el-descriptions-item>
          
          <el-descriptions-item label="更新时间">
            {{ formatDate(token.updatedAt) }}
          </el-descriptions-item>
          
          <el-descriptions-item label="过期时间">
            <span v-if="token.expiryDate" :class="getExpiryDateClass(token.expiryDate)">
              {{ formatDate(token.expiryDate) }}
            </span>
            <span v-else class="text-muted">未知</span>
          </el-descriptions-item>
          
          <el-descriptions-item label="最后活跃">
            <span v-if="token.lastActive">{{ formatDate(token.lastActive) }}</span>
            <span v-else class="text-muted">未知</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Portal信息 -->
      <el-card v-if="token.portalInfo" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="header-icon"><DataBoard /></el-icon>
            <span>Portal信息</span>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item
            v-for="(value, key) in portalInfoDisplay"
            :key="key"
            :label="key"
          >
            {{ value }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Key,
  Lock,
  Link,
  Clock,
  DataBoard,
  DocumentCopy
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  token: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 计算属性
const portalInfoDisplay = computed(() => {
  if (!props.token?.portalInfo) return {}
  
  const info = typeof props.token.portalInfo === 'string' 
    ? JSON.parse(props.token.portalInfo) 
    : props.token.portalInfo

  const display = {}
  
  // 格式化显示的字段
  const fieldMap = {
    credits_balance: '剩余次数',
    total_usage: '总使用量',
    expiry_date: '过期时间',
    is_active: '是否活跃',
    customer_id: '客户ID',
    pricing_unit_id: '定价单元ID'
  }

  Object.entries(info).forEach(([key, value]) => {
    const displayKey = fieldMap[key] || key
    let displayValue = value

    if (key === 'expiry_date' && value) {
      displayValue = formatDate(value)
    } else if (key === 'is_active') {
      displayValue = value ? '是' : '否'
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value, null, 2)
    }

    display[displayKey] = displayValue
  })

  return display
})

// 方法
const copyToClipboard = async (text, label = '内容') => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '未知'
  }
}

// 状态相关方法
const getCreditsTagType = (credits) => {
  if (credits > 100) return 'success'
  if (credits > 50) return 'primary'
  if (credits > 10) return 'warning'
  return 'danger'
}

const getAccountStatusTagType = (status) => {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'SUSPENDED': return 'danger'
    case 'BANNED': return 'danger'
    default: return 'info'
  }
}

const getAccountStatusText = (status) => {
  switch (status) {
    case 'ACTIVE': return '正常'
    case 'SUSPENDED': return '暂停'
    case 'BANNED': return '封禁'
    default: return '未知'
  }
}

const getTokenStatusTagType = (status) => {
  switch (status) {
    case 'personal': return 'primary'
    case 'pool_available': return 'success'
    case 'pool_claimed': return 'warning'
    case 'pool_expired': return 'danger'
    case 'disabled': return 'info'
    default: return 'info'
  }
}

const getTokenStatusText = (status) => {
  switch (status) {
    case 'personal': return '个人令牌'
    case 'pool_available': return '池中可用'
    case 'pool_claimed': return '池中已领取'
    case 'pool_expired': return '池中过期'
    case 'disabled': return '已禁用'
    default: return '未知'
  }
}

const getExpiryDateClass = (expiryDate) => {
  if (!expiryDate) return 'text-muted'
  
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-danger'  // 已过期
  if (diffDays < 1) return 'text-danger'  // 低于1天
  if (diffDays < 3) return 'text-warning' // 低于3天
  return 'text-success'                   // 正常
}
</script>

<style scoped>
.token-details {
  max-height: 70vh;
  overflow-y: auto;
}

.info-card {
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.info-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #374151;
}

.header-icon {
  color: #3b82f6;
}

.copyable-field {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-email {
  font-size: 12px;
  color: #6b7280;
}

.token-field {
  width: 100%;
}

.text-muted {
  color: #9ca3af;
}

.text-success {
  color: #10b981;
}

.text-warning {
  color: #f59e0b;
}

.text-danger {
  color: #ef4444;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
