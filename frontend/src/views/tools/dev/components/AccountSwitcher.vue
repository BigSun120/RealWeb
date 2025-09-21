<template>
  <div class="account-switcher">
    <!-- 当前账号显示 -->
    <div class="current-account" v-if="currentAccount">
      <div class="account-info">
        <div class="account-avatar">
          <el-icon><User /></el-icon>
        </div>
        <div class="account-details">
          <div class="account-name">{{ currentAccount.email || '当前账号' }}</div>
          <div class="account-tenant">{{ formatTenantUrl(currentAccount.tenant_url) }}</div>
        </div>
      </div>
      
      <div class="account-actions">
        <el-button
          size="small"
          @click="refreshCurrentAccount"
          :loading="isRefreshing"
          :icon="Refresh"
        >
          刷新
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="handleLogout"
          :icon="SwitchButton"
        >
          登出
        </el-button>
      </div>
    </div>

    <!-- 账号切换器 -->
    <div class="switcher-section">
      <div class="section-header">
        <h4>快速切换账号</h4>
        <el-button
          size="small"
          @click="refreshAccounts"
          :loading="isLoadingAccounts"
          :icon="Refresh"
        >
          刷新列表
        </el-button>
      </div>

      <!-- 可用账号列表 -->
      <div v-if="availableAccounts.length > 0" class="accounts-list">
        <div
          v-for="account in availableAccounts"
          :key="account.id"
          class="account-item"
          :class="{ 'current': isCurrentAccount(account) }"
          @click="handleSwitchAccount(account)"
        >
          <div class="account-content">
            <div class="account-avatar">
              <el-icon><User /></el-icon>
            </div>
            <div class="account-info">
              <div class="account-name">{{ account.display_name }}</div>
              <div class="account-url">{{ formatTenantUrl(account.tenant_url) }}</div>
              <div v-if="account.email_note" class="account-note">{{ account.email_note }}</div>
            </div>
            <div class="account-status">
              <el-tag
                :type="getStatusType(account.ban_status)"
                size="small"
              >
                {{ getStatusText(account.ban_status) }}
              </el-tag>
            </div>
          </div>
          
          <div v-if="isCurrentAccount(account)" class="current-indicator">
            <el-icon><Check /></el-icon>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isLoadingAccounts" class="empty-accounts">
        <el-empty
          description="暂无可切换的账号"
          :image-size="80"
        >
          <el-button type="primary" @click="$emit('add-account')">
            添加账号
          </el-button>
        </el-empty>
      </div>

      <!-- 加载状态 -->
      <div v-else class="loading-accounts">
        <el-skeleton :rows="3" animated />
      </div>
    </div>

    <!-- 切换方式选择 -->
    <div v-if="availableAccounts.length > 0" class="switch-options">
      <el-radio-group v-model="switchMethod" size="small">
        <el-radio-button 
          label="auto" 
          :disabled="!hasAdvancedFeatures"
        >
          自动切换
        </el-radio-button>
        <el-radio-button label="manual">
          手动切换
        </el-radio-button>
      </el-radio-group>
      
      <div class="method-description">
        <span v-if="switchMethod === 'auto' && hasAdvancedFeatures">
          将自动在桌面应用中切换账号
        </span>
        <span v-else-if="switchMethod === 'auto'">
          需要本地代理支持自动切换
        </span>
        <span v-else>
          将复制令牌信息，需要手动在桌面应用中使用
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  Refresh, 
  SwitchButton, 
  Check 
} from '@element-plus/icons-vue'
// import { useLocalProxy } from '@/composables/useLocalProxy' // 已移除本地代理功能
import { useAugmentAuth } from '@/composables/useAugmentAuth'

// Emits
const emit = defineEmits(['add-account', 'account-switched'])

// 响应式数据
const isRefreshing = ref(false)
const isLoadingAccounts = ref(false)
const switchMethod = ref('auto')

// 使用组合式函数 - 本地代理功能已移除
// const {
//   proxyStatus,
//   hasAdvancedFeatures,
//   accounts,
//   currentAccount,
//   getAccounts,
//   getCurrentAccount,
//   smartSwitchAccount,
//   logout
// } = useLocalProxy() // 已移除本地代理功能

// 临时替代变量
const hasAdvancedFeatures = ref(false)
const accounts = ref([])
const currentAccount = ref(null)

const {
  tokens,
  loadTokens,
  formatTokenStatus
} = useAugmentAuth()

// 计算属性
const availableAccounts = computed(() => {
  // 合并本地代理的账号和Web端的令牌
  const proxyAccounts = accounts.value.map(account => ({
    ...account,
    source: 'proxy'
  }))
  
  const webTokens = tokens.value
    .filter(token => token.is_active)
    .map(token => ({
      id: token.id,
      tenant_url: token.tenant_url,
      display_name: token.display_name,
      email_note: token.email_note,
      ban_status: token.ban_status,
      source: 'web'
    }))
  
  // 去重合并（优先使用代理账号）
  const merged = [...proxyAccounts]
  webTokens.forEach(webToken => {
    const exists = merged.find(acc => acc.tenant_url === webToken.tenant_url)
    if (!exists) {
      merged.push(webToken)
    }
  })
  
  return merged
})

// 方法
const refreshCurrentAccount = async () => {
  isRefreshing.value = true
  try {
    if (hasAdvancedFeatures.value) {
      await getCurrentAccount()
    }
    ElMessage.success('当前账号信息已刷新')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshing.value = false
  }
}

const refreshAccounts = async () => {
  isLoadingAccounts.value = true
  try {
    // 并行加载代理账号和Web令牌
    const promises = []
    
    if (hasAdvancedFeatures.value) {
      promises.push(getAccounts())
    }
    
    promises.push(loadTokens(true)) // 只加载活跃令牌
    
    await Promise.all(promises)
    ElMessage.success('账号列表已刷新')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isLoadingAccounts.value = false
  }
}

const isCurrentAccount = (account) => {
  if (!currentAccount.value) return false
  return currentAccount.value.tenant_url === account.tenant_url
}

const handleSwitchAccount = async (account) => {
  try {
    if (isCurrentAccount(account)) {
      ElMessage.info('该账号已是当前账号')
      return
    }

    if (switchMethod.value === 'auto' && hasAdvancedFeatures.value) {
      // 自动切换
      await smartSwitchAccount({
        tenant_url: account.tenant_url,
        access_token: account.access_token || 'from-proxy'
      })
      
      emit('account-switched', account)
    } else {
      // 手动切换 - 复制信息
      await handleManualSwitch(account)
    }
  } catch (error) {
    ElMessage.error(`切换账号失败: ${error.message}`)
  }
}

const handleManualSwitch = async (account) => {
  try {
    // 如果是Web令牌，需要获取完整信息
    let copyText = ''
    
    if (account.source === 'web') {
      // 从Web令牌获取信息
      const token = tokens.value.find(t => t.id === account.id)
      if (token) {
        copyText = `租户URL: ${token.tenant_url}\n备注: ${token.email_note || '无'}`
      }
    } else {
      // 从代理获取信息
      copyText = `租户URL: ${account.tenant_url}\n邮箱: ${account.email || '无'}`
    }
    
    await navigator.clipboard.writeText(copyText)
    
    ElMessageBox.alert(
      '账号信息已复制到剪贴板，请在桌面应用中手动切换账号。',
      '手动切换',
      {
        confirmButtonText: '知道了',
        type: 'info'
      }
    )
  } catch (error) {
    ElMessage.error('复制账号信息失败')
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要登出当前账号吗？',
      '确认登出',
      {
        confirmButtonText: '登出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (hasAdvancedFeatures.value) {
      await logout()
    } else {
      ElMessage.info('请在桌面应用中手动登出')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`登出失败: ${error.message}`)
    }
  }
}

const formatTenantUrl = (url) => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

const getStatusType = (banStatus) => {
  const status = formatTokenStatus(banStatus)
  return status.type
}

const getStatusText = (banStatus) => {
  const status = formatTokenStatus(banStatus)
  return status.text
}

// 生命周期
onMounted(() => {
  refreshAccounts()
  if (hasAdvancedFeatures.value) {
    getCurrentAccount()
  }
})
</script>

<style scoped>
.account-switcher {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-account {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.account-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
}

.account-details {
  flex: 1;
}

.account-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.account-tenant {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.account-actions {
  display: flex;
  gap: 8px;
}

.switcher-section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-item {
  position: relative;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.account-item:hover {
  border-color: var(--el-color-primary-light-5);
  background-color: var(--el-color-primary-light-9);
}

.account-item.current {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.account-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-url {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 2px;
}

.account-note {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.account-status {
  flex-shrink: 0;
}

.current-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--el-color-primary);
  font-size: 16px;
}

.empty-accounts,
.loading-accounts {
  padding: 20px;
  text-align: center;
}

.switch-options {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
}

.method-description {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .current-account {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .account-actions {
    justify-content: center;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .section-header h4 {
    text-align: center;
  }
  
  .account-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .account-info {
    text-align: center;
  }
}
</style>
