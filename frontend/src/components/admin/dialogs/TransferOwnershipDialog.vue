<template>
  <el-dialog
    v-model="dialogVisible"
    title="批量转移所有权"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="transfer-dialog-content">
      <!-- 选中令牌信息 -->
      <div class="selected-tokens-info">
        <h4>选中的令牌 ({{ selectedTokens.length }} 个)</h4>
        <div class="tokens-preview">
          <div
            v-for="token in selectedTokens.slice(0, 5)"
            :key="token.id"
            class="token-item"
          >
            <el-tag size="small" type="info">
              {{ token.emailNote || '未设置' }}
            </el-tag>
            <span class="token-owner">
              {{ token.ownerInfo?.username || '未知' }}
            </span>
          </div>
          <div v-if="selectedTokens.length > 5" class="more-tokens">
            还有 {{ selectedTokens.length - 5 }} 个令牌...
          </div>
        </div>
      </div>

      <!-- 目标用户选择 -->
      <div class="target-user-section">
        <h4>选择目标用户</h4>
        <el-select
          v-model="form.targetUserId"
          placeholder="输入用户名或邮箱搜索用户"
          filterable
          remote
          reserve-keyword
          :remote-method="searchUsers"
          :loading="searching"
          style="width: 100%"
          size="large"
          clearable
        >
          <el-option
            v-for="user in availableUsers"
            :key="user._id"
            :label="`${user.username} (${user.email})`"
            :value="user._id"
          >
            <div class="user-option">
              <div class="user-info">
                <div class="user-primary">
                  <span class="username">{{ user.username }}</span>
                  <span class="user-email">({{ user.email }})</span>
                  <el-tag
                    size="small"
                    :type="user.isAdmin ? 'danger' : 'info'"
                    class="role-tag"
                  >
                    {{ user.isAdmin ? '管理员' : '普通用户' }}
                  </el-tag>
                </div>
                <div class="user-secondary" v-if="user.displayName">
                  <span class="display-name">{{ user.displayName }}</span>
                </div>
              </div>
            </div>
          </el-option>
        </el-select>

        <!-- 选中用户信息 -->
        <div v-if="selectedUserInfo" class="selected-user-info">
          <el-alert
            :title="`已选择用户：${selectedUserInfo.username} (${selectedUserInfo.email})`"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <div class="user-token-info">
                <span>该用户当前拥有 <strong>{{ selectedUserInfo.tokenCount || 0 }}</strong> 个令牌</span>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- 确认信息 -->
      <div v-if="form.targetUserId" class="confirm-section">
        <el-alert
          title="转移确认"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>
              即将将 <strong>{{ selectedTokens.length }}</strong> 个令牌的所有权转移给用户：
              <strong>{{ getSelectedUserInfo() }}</strong>
            </p>
            <p class="warning-text">
              ⚠️ 此操作不可撤销，请确认目标用户信息正确！
            </p>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel" :disabled="transferring">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="transferring"
          :disabled="!form.targetUserId"
        >
          确认转移
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as adminTokensApi from '@/api/adminTokens'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedTokens: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = ref({
  targetUserId: ''
})

const availableUsers = ref([])
const searching = ref(false)
const transferring = ref(false)
const selectedUserInfo = ref(null)

// 方法
const searchUsers = async (query) => {
  if (!query) {
    availableUsers.value = []
    return
  }

  searching.value = true
  try {
    const response = await adminTokensApi.getUsersForTransfer(query)
    availableUsers.value = response.data?.data || []
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('搜索用户失败')
  } finally {
    searching.value = false
  }
}

const getSelectedUserInfo = () => {
  const user = availableUsers.value.find(u => u._id === form.value.targetUserId)
  return user ? `${user.username} (${user.email})` : '未知用户'
}

const handleCancel = () => {
  dialogVisible.value = false
  resetForm()
}

const handleConfirm = async () => {
  if (!form.value.targetUserId) {
    ElMessage.warning('请选择目标用户')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将 ${props.selectedTokens.length} 个令牌转移给 ${getSelectedUserInfo()} 吗？`,
      '最终确认',
      {
        type: 'warning',
        confirmButtonText: '确定转移',
        cancelButtonText: '取消'
      }
    )

    transferring.value = true

    const tokenIds = props.selectedTokens.map(token => token.id)
    const targetUser = availableUsers.value.find(u => u._id === form.value.targetUserId)

    const response = await adminTokensApi.batchTransferOwnership({
      tokenIds,
      targetUserId: form.value.targetUserId,
      targetUsername: targetUser.username
    })

    ElMessage.success(
      `转移完成，成功 ${response.data?.data?.successCount || 0} 个，失败 ${response.data?.data?.failCount || 0} 个`
    )

    dialogVisible.value = false
    resetForm()
    emit('success')

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`转移失败: ${error.message}`)
    }
  } finally {
    transferring.value = false
  }
}

const resetForm = () => {
  form.value = {
    targetUserId: ''
  }
  availableUsers.value = []
}

// 监听选中用户变化
watch(() => form.value.targetUserId, async (newUserId) => {
  if (newUserId) {
    const user = availableUsers.value.find(u => u._id === newUserId)
    if (user) {
      try {
        // 获取用户的令牌数量
        const response = await adminTokensApi.getUserTokenCount(newUserId)
        selectedUserInfo.value = {
          ...user,
          tokenCount: response.data?.data?.count || 0
        }
      } catch (error) {
        console.error('获取用户令牌数量失败:', error)
        selectedUserInfo.value = {
          ...user,
          tokenCount: 0
        }
      }
    }
  } else {
    selectedUserInfo.value = null
  }
})

// 监听对话框关闭
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.transfer-dialog-content {
  padding: 8px 0;
}

.selected-tokens-info {
  margin-bottom: 24px;
}

.selected-tokens-info h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-weight: 600;
}

.tokens-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  max-height: 120px;
  overflow-y: auto;
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #e5e7eb;
}

.token-item:last-child {
  border-bottom: none;
}

.token-owner {
  font-size: 12px;
  color: #6b7280;
}

.more-tokens {
  text-align: center;
  color: #6b7280;
  font-size: 12px;
  padding: 8px 0;
  font-style: italic;
}

.target-user-section {
  margin-bottom: 24px;
}

.target-user-section h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-weight: 600;
}

.user-option {
  display: flex;
  align-items: center;
  padding: 8px 0;
  width: 100%;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.user-email {
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
}

.role-tag {
  font-size: 11px;
  height: 18px;
  line-height: 16px;
  padding: 0 6px;
}

.user-secondary {
  margin-top: 2px;
}

.display-name {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.selected-user-info {
  margin-top: 12px;
}

.user-token-info {
  font-size: 13px;
  color: #374151;
}

.confirm-section {
  margin-bottom: 16px;
}

.warning-text {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #d97706;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
