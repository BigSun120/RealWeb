<template>
  <el-card class="token-card" :class="{ 'banned': token.ban_status?.isBanned }">
    <!-- 卡片头部 -->
    <template #header>
      <div class="card-header">
        <div class="token-info">
          <h3 class="token-title">{{ displayName }}</h3>
          <p class="token-url">{{ token.tenant_url }}</p>
        </div>
        <div class="token-actions">
          <el-dropdown @command="handleCommand">
            <el-button type="text" :icon="MoreFilled" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                <el-dropdown-item command="copy" :icon="CopyDocument">复制</el-dropdown-item>
                <el-dropdown-item command="check" :icon="Check">检查状态</el-dropdown-item>
                <el-dropdown-item command="refresh-usage" :icon="Refresh">刷新使用次数</el-dropdown-item>
                <el-dropdown-item 
                  v-if="token.portal_url" 
                  command="portal" 
                  :icon="Link"
                >
                  打开Portal
                </el-dropdown-item>
                <el-dropdown-item 
                  command="delete" 
                  :icon="Delete"
                  class="danger-item"
                >
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 状态信息 -->
      <div class="status-section">
        <div class="status-item">
          <span class="label">状态:</span>
          <el-tag 
            :type="statusInfo.type" 
            size="small"
          >
            {{ statusInfo.text }}
          </el-tag>
        </div>
        
        <div v-if="token.ban_status?.lastChecked" class="status-item">
          <span class="label">检查时间:</span>
          <span class="value">{{ formatDate(token.ban_status.lastChecked) }}</span>
        </div>
      </div>

      <!-- 令牌信息 -->
      <div class="token-details">
        <div class="detail-item">
          <span class="label">令牌:</span>
          <span class="value masked-token">{{ token.masked_token }}</span>
        </div>
        
        <div v-if="token.portal_url" class="detail-item">
          <span class="label">Portal:</span>
          <el-link 
            :href="token.portal_url" 
            target="_blank" 
            type="primary"
            class="portal-link"
          >
            {{ formatUrl(token.portal_url) }}
          </el-link>
        </div>
        
        <div v-if="token.email_note" class="detail-item">
          <span class="label">备注:</span>
          <span class="value">{{ token.email_note }}</span>
        </div>
      </div>

      <!-- 使用统计 -->
      <div v-if="token.usage_stats" class="usage-stats">
        <div class="stats-item">
          <span class="label">剩余次数:</span>
          <span class="value">{{ parseFloat(token.usage_stats.credits_balance || 0) }} User Messages</span>
        </div>

        <div v-if="token.usage_stats.last_updated" class="stats-item">
          <span class="label">更新时间:</span>
          <span class="value">{{ formatDate(token.usage_stats.last_updated) }}</span>
        </div>
      </div>

      <!-- 编辑器切换区域 -->
      <div class="editor-switcher">
        <div class="switcher-header">
          <span class="label">快速切换到编辑器:</span>
        </div>
        <div class="editor-buttons">
          <el-tooltip
            v-for="editor in supportedEditors"
            :key="editor.type"
            :content="`切换到 ${editor.name}`"
            placement="top"
          >
            <el-button
              size="small"
              :loading="switching && switchingEditor === editor.type"
              @click="handleEditorSwitch(editor.type)"
              class="editor-btn"
            >
              <span class="editor-icon">{{ editor.icon }}</span>
              <span class="editor-name">{{ editor.name }}</span>
            </el-button>
          </el-tooltip>
        </div>

        <!-- 降级方案按钮 -->
        <div class="fallback-actions">
          <el-button
            size="small"
            type="text"
            @click="handleCopyToken"
            class="copy-btn"
          >
            📋 复制令牌信息
          </el-button>
        </div>
      </div>

      <!-- 创建时间 -->
      <div class="meta-info">
        <span class="create-time">
          创建于 {{ formatDate(token.created_at) }}
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  MoreFilled,
  Edit,
  Delete,
  CopyDocument,
  Check,
  Link,
  Refresh
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import { useProtocolSwitcher } from '@/composables/useProtocolSwitcher'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps({
  token: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits([
  'edit',
  'delete',
  'check-status',
  'refresh-usage',
  'copy-token',
  'open-portal'
])

// 使用组合式函数
const { formatTokenStatus, getTokenDisplayName, formatDate, formatUrl } = useAugmentAuth()
const { switching, supportedEditors, switchToEditor, copyTokenInfo } = useProtocolSwitcher()

// 响应式数据
const switchingEditor = ref(null)

// 计算属性
const displayName = computed(() => {
  return getTokenDisplayName(props.token)
})

const statusInfo = computed(() => {
  return formatTokenStatus(props.token.ban_status)
})

// 计算属性
const canSwitchToEditor = computed(() => {
  return props.token?.access_token && props.token?.tenant_url
})

// 方法
const handleCommand = (command) => {
  switch (command) {
    case 'edit':
      emit('edit', props.token)
      break
    case 'delete':
      emit('delete', props.token)
      break
    case 'copy':
      emit('copy-token', props.token)
      break
    case 'check':
      emit('check-status', props.token)
      break
    case 'refresh-usage':
      emit('refresh-usage', props.token)
      break
    case 'portal':
      emit('open-portal', props.token)
      break
  }
}

// 编辑器切换方法
const handleEditorSwitch = async (editorType) => {
  if (!canSwitchToEditor.value) {
    ElMessage.warning('令牌数据不完整，无法切换编辑器')
    return
  }

  try {
    switchingEditor.value = editorType

    const success = await switchToEditor(props.token, editorType)

    if (success) {
      const editor = supportedEditors.find(e => e.type === editorType)
      console.log(`[TokenCard] 成功切换到 ${editor?.name || editorType}`)
    }
  } catch (error) {
    console.error('[TokenCard] 编辑器切换失败:', error)
  } finally {
    switchingEditor.value = null
  }
}

// 复制令牌信息方法
const handleCopyToken = async () => {
  try {
    await copyTokenInfo(props.token)
  } catch (error) {
    console.error('[TokenCard] 复制令牌失败:', error)
  }
}
</script>

<style scoped>
.token-card {
  transition: all 0.3s ease;
  border: 1px solid var(--el-border-color-light);
}

.token-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.token-card.banned {
  border-color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.token-info {
  flex: 1;
  min-width: 0;
}

.token-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.token-url {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.token-actions {
  flex-shrink: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-section,
.token-details,
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item,
.detail-item,
.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

.value {
  font-size: 12px;
  color: var(--el-text-color-primary);
  text-align: right;
  word-break: break-word;
}

.masked-token {
  font-family: 'Courier New', monospace;
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.portal-link {
  font-size: 12px;
}

.meta-info {
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.create-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

/* 下拉菜单危险项样式 */
:deep(.danger-item) {
  color: var(--el-color-danger);
}

:deep(.danger-item:hover) {
  background-color: var(--el-color-danger-light-9);
}

/* 编辑器切换样式 */
.editor-switcher {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.switcher-header {
  margin-bottom: 12px;
}

.switcher-header .label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.editor-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  transition: all 0.3s ease;
}

.editor-btn:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.editor-icon {
  font-size: 16px;
}

.editor-name {
  font-size: 12px;
  font-weight: 500;
}

.fallback-actions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
}

.copy-btn {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.copy-btn:hover {
  color: var(--el-color-primary);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .status-item,
  .detail-item,
  .stats-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .value {
    text-align: left;
  }
  
  .token-title {
    font-size: 14px;
  }
  
  .token-url {
    font-size: 11px;
  }
}
</style>
