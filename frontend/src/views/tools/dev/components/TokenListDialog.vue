<template>
  <el-dialog
    v-model="visible"
    title="已保存的令牌"
    width="90%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button
          type="primary"
          @click="showTokenForm = true"
          :icon="Plus"
        >
          添加令牌
        </el-button>
        <el-button
          @click="refreshTokens"
          :loading="isLoading"
          :icon="Refresh"
        >
          刷新
        </el-button>
        <el-button
          @click="batchCheckStatus"
          :loading="isChecking"
          :icon="Check"
        >
          批量检查状态
        </el-button>
        <el-button
          @click="batchRefreshUsage"
          :loading="isChecking"
          :icon="Refresh"
        >
          批量刷新使用次数
        </el-button>
      </div>
      
      <div class="toolbar-right">
        <el-button @click="exportTokens" :icon="Download">
          导出
        </el-button>
        <el-button @click="showImportDialog = true" :icon="Upload">
          导入
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <el-tag>总计: {{ tokenStats.total }}</el-tag>
      <el-tag type="success">活跃: {{ tokenStats.active }}</el-tag>
      <el-tag type="danger">已封: {{ tokenStats.banned }}</el-tag>
      <el-tag type="info">停用: {{ tokenStats.inactive }}</el-tag>
    </div>

    <!-- 令牌列表 -->
    <div class="token-list" v-loading="isLoading">
      <div v-if="tokens.length === 0" class="empty-state">
        <el-empty description="暂无保存的令牌">
          <el-button type="primary" @click="showTokenForm = true">
            添加第一个令牌
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="token-grid">
        <TokenCard
          v-for="token in tokens"
          :key="token.id"
          :token="token"
          @edit="handleEditToken"
          @delete="handleDeleteToken"
          @check-status="handleCheckStatus"
          @refresh-usage="handleRefreshUsage"
          @copy-token="handleCopyToken"
          @open-portal="handleOpenPortal"
        />
      </div>
    </div>

    <!-- 令牌表单对话框 -->
    <TokenFormDialog
      v-model="showTokenForm"
      :token="editingToken"
      @success="handleTokenFormSuccess"
    />

    <!-- 导入对话框 -->
    <ImportDialog
      v-model="showImportDialog"
      @success="handleImportSuccess"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Plus, 
  Refresh, 
  Check, 
  Download, 
  Upload 
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import TokenCard from './TokenCard.vue'
import TokenFormDialog from './TokenFormDialog.vue'
import ImportDialog from './ImportDialog.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'refresh'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const showTokenForm = ref(false)
const showImportDialog = ref(false)
const editingToken = ref(null)

// 使用组合式函数
const {
  tokens,
  isLoading,
  isChecking,
  tokenStats,
  loadTokens,
  deleteToken,
  checkTokenStatus,
  batchCheckTokenStatus,
  refreshTokenUsage,
  batchRefreshTokenUsage,
  exportTokens: exportTokensApi
} = useAugmentAuth()

// 方法
const handleClose = () => {
  visible.value = false
}

const refreshTokens = async () => {
  try {
    await loadTokens()
    ElMessage.success('令牌列表刷新成功')
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const handleEditToken = (token) => {
  editingToken.value = token
  showTokenForm.value = true
}

const handleDeleteToken = async (token) => {
  try {
    await deleteToken(token.id)
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const handleCheckStatus = async (token) => {
  try {
    await checkTokenStatus(token.id)
    ElMessage.success('令牌状态检查完成')
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const handleRefreshUsage = async (token) => {
  try {
    await refreshTokenUsage(token.id)
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const batchCheckStatus = async () => {
  if (tokens.value.length === 0) {
    ElMessage.warning('没有可检查的令牌')
    return
  }

  try {
    const tokenIds = tokens.value.map(t => t.id)
    await batchCheckTokenStatus(tokenIds)
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const batchRefreshUsage = async () => {
  if (tokens.value.length === 0) {
    ElMessage.warning('没有可刷新的令牌')
    return
  }

  try {
    const tokenIds = tokens.value.map(t => t.id)
    await batchRefreshTokenUsage(tokenIds)
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const handleCopyToken = async (token) => {
  try {
    // 这里应该复制完整的令牌，但需要先解密
    // 暂时复制脱敏的令牌作为占位符
    await navigator.clipboard.writeText(token.display_name || token.tenant_url)
    ElMessage.success('令牌信息已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const handleOpenPortal = (token) => {
  if (token.portal_url) {
    window.open(token.portal_url, '_blank')
  } else {
    ElMessage.warning('该令牌没有配置 Portal URL')
  }
}

const exportTokens = async () => {
  try {
    await exportTokensApi()
  } catch (error) {
    // 错误已在组合式函数中处理
  }
}

const handleTokenFormSuccess = () => {
  showTokenForm.value = false
  editingToken.value = null
  refreshTokens()
}

const handleImportSuccess = () => {
  showImportDialog.value = false
  refreshTokens()
}

// 监听对话框打开，自动加载数据
watch(visible, (newValue) => {
  if (newValue) {
    loadTokens()
  }
})

// 重置编辑状态
watch(showTokenForm, (newValue) => {
  if (!newValue) {
    editingToken.value = null
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stats-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.token-list {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    justify-content: center;
  }
  
  .token-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-bar {
    justify-content: center;
  }
}

/* 对话框样式调整 */
:deep(.el-dialog) {
  max-width: 1200px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
}
</style>
