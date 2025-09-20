<template>
  <div class="augment-token-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1>Augment 令牌管理器</h1>
          <p>管理您的 Augment Code 访问令牌，支持一键切换到编辑器</p>
        </div>
        <div class="header-actions">
          <el-button @click="showImportDialog = true" :icon="Upload">
            导入令牌
          </el-button>
          <el-button type="primary" @click="refreshTokens" :icon="Refresh" :loading="isRefreshing">
            刷新令牌
          </el-button>
        </div>
      </div>
    </div>

    <!-- 已保存的令牌列表 -->
    <el-card class="tokens-card">
      <template #header>
        <div class="card-header">
          <h2>已保存的令牌</h2>
          <span>点击编辑器图标可直接切换到对应编辑器</span>
        </div>
      </template>

      <div v-if="tokens.length === 0" class="empty-state">
        <el-empty description="暂无保存的令牌">
          <el-button type="primary" @click="scrollToGenerator">
            生成新令牌
          </el-button>
        </el-empty>
      </div>

      <div v-else class="tokens-table-container">
        <el-table :data="tokens" style="width: 100%" :row-key="row => row.id" table-layout="auto">
          <el-table-column prop="email_note" label="邮箱备注" min-width="120">
            <template #default="{ row }">
              <div class="email-note">
                <el-icon class="email-icon">
                  <Message />
                </el-icon>
                {{ row.email_note || '未设置' }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="创建时间" min-width="120">
            <template #default="{ row }">
              <div class="time-info">
                {{ getCreatedAt(row) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="过期时间" min-width="120">
            <template #default="{ row }">
              <div class="expiry-info">
                <span :class="getExpiryClass(row)">
                  {{ getExpiryDate(row) }}
                </span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="剩余次数" min-width="100">
            <template #default="{ row }">
              <div class="credits-info">
                <el-tag :type="getCreditsType(row)" size="small">
                  {{ getCreditsBalance(row) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="账号状态" min-width="100">
            <template #default="{ row }">
              <div class="status-info">
                <el-tag :type="getPortalStatusType(row)" size="small">
                  {{ getPortalStatusText(row) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="编辑器" min-width="100">
            <template #default="{ row }">
              <el-dropdown @command="(command) => handleEditorSwitch(row, command)">
                <el-button size="small" :icon="Monitor">
                  切换
                  <el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="vscode">
                      <span class="editor-item">🔵 VS Code</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="cursor">
                      <span class="editor-item">⚡ Cursor</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="kiro">
                      <span class="editor-item">🔥 Kiro</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="trae">
                      <span class="editor-item">🚀 Trae</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="windsurf">
                      <span class="editor-item">🌊 Windsurf</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="qoder">
                      <span class="editor-item">📝 Qoder</span>
                    </el-dropdown-item>
                    <el-dropdown-item divided command="copy">
                      <span class="editor-item">📋 复制令牌</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="refreshPortalInfo(row)" :loading="row._refreshing"
                  :icon="Refresh">
                  刷新
                </el-button>
                <el-button type="warning" size="small" @click="editToken(row)" :icon="Edit">
                  编辑
                </el-button>
                <el-button type="info" size="small" @click="exportToken(row)" :icon="Download">
                  导出
                </el-button>
                <el-button type="danger" size="small" @click="deleteToken(row)" :icon="Delete">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 生成新令牌 -->
    <el-card class="generator-card" ref="generatorCard">
      <template #header>
        <div class="card-header">
          <h2>生成新的访问令牌</h2>
          <span>按照以下步骤获取您的 Augment 访问令牌</span>
        </div>
      </template>

      <!-- 步骤 1: 生成授权URL -->
      <div class="step-section">
        <div class="step-header">
          <el-icon class="step-icon">
            <Key />
          </el-icon>
          <h3>步骤 1: 生成授权URL</h3>
        </div>

        <el-button type="primary" @click="generateAuthUrl" :loading="isGenerating" size="large">
          生成授权URL
        </el-button>

        <div v-if="authUrl" class="url-section">
          <el-form-item label="授权URL:">
            <el-input v-model="authUrl" readonly placeholder="点击上方按钮生成授权URL">
              <template #append>
                <el-button @click="copyAuthUrl" :icon="CopyDocument">
                  复制
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <div class="action-buttons">
            <el-button @click="openAuthUrl" :icon="Link">
              打开授权页面
            </el-button>
          </div>
        </div>
      </div>

      <!-- 步骤 2: 输入授权码 -->
      <div class="step-section">
        <div class="step-header">
          <el-icon class="step-icon">
            <Document />
          </el-icon>
          <h3>步骤 2: 输入授权码</h3>
        </div>

        <el-form-item label="授权码:">
          <el-input v-model="authCode" type="textarea" :rows="4" placeholder="在此粘贴授权码JSON..." />
        </el-form-item>

        <el-button type="primary" @click="getAccessToken" :loading="isGettingToken" :disabled="!canGetToken"
          size="large">
          获取访问令牌
        </el-button>
      </div>

      <!-- 步骤 3: 访问令牌结果 -->
      <div v-if="tokenResult" class="step-section">
        <div class="step-header">
          <el-icon class="step-icon">
            <Check />
          </el-icon>
          <h3>步骤 3: 保存访问令牌</h3>
        </div>

        <el-form :model="tokenForm" label-width="120px">
          <el-form-item label="访问令牌:">
            <el-input v-model="tokenResult.access_token" readonly>
              <template #append>
                <el-button @click="copyAccessToken" :icon="CopyDocument">
                  复制
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="租户URL:">
            <el-input v-model="tokenResult.tenant_url" readonly>
              <template #append>
                <el-button @click="copyTenantUrl" :icon="CopyDocument">
                  复制
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="Portal URL:">
            <el-input v-model="tokenForm.portalUrl" placeholder="请输入 Portal 地址（可选）" />
          </el-form-item>

          <el-form-item label="邮箱备注:">
            <el-input v-model="tokenForm.emailNote" placeholder="请输入邮箱相关备注（可选）" />
          </el-form-item>

          <el-form-item>
            <el-button type="success" @click="saveToken" :loading="isSaving" size="large">
              保存令牌
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 导入令牌对话框 -->
    <TokenImportDialog v-model="showImportDialog" @import-success="handleImportSuccess" />

    <!-- 编辑对话框 -->
    <TokenEditDialog v-model="showEditDialog" :token="editingToken" @save="handleEditSave" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key,
  Document,
  Check,
  Link,
  CopyDocument,
  Refresh,
  Delete,
  Message,
  Upload,
  Monitor,
  ArrowDown,
  Edit,
  Download
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import { useProtocolSwitcher } from '@/composables/useProtocolSwitcher'
import TokenImportDialog from './components/TokenImportDialog.vue'
import TokenEditDialog from './components/TokenEditDialog.vue'

// 响应式数据
const authUrl = ref('')
const authCode = ref('')
const tokenResult = ref(null)
const tokens = ref([])
const generatorCard = ref(null)
const showImportDialog = ref(false)
const showEditDialog = ref(false)
const editingToken = ref(null)

const tokenForm = ref({
  portalUrl: '',
  emailNote: ''
})

// 加载状态
const isGenerating = ref(false)
const isGettingToken = ref(false)
const isSaving = ref(false)
const isRefreshing = ref(false)

// 使用组合式函数
const {
  generateAuthUrl: generateUrl,
  getAccessToken: getToken,
  saveToken: saveTokenApi,
  loadTokens,
  updateToken: updateTokenApi,
  deleteToken: deleteTokenApi,
  refreshPortalInfo: refreshPortalInfoApi,
  batchRefreshPortalInfo: batchRefreshPortalInfoApi
} = useAugmentAuth()

const { switchToEditor, copyTokenInfo } = useProtocolSwitcher()

// 计算属性
const canGetToken = computed(() => {
  return authUrl.value && authCode.value.trim().length > 0
})

// 方法
const generateAuthUrl = async () => {
  isGenerating.value = true
  try {
    const result = await generateUrl()
    authUrl.value = result.auth_url
    ElMessage.success('授权URL生成成功')
  } catch (error) {
    ElMessage.error(`生成授权URL失败: ${error.message}`)
  } finally {
    isGenerating.value = false
  }
}

const getAccessToken = async () => {
  isGettingToken.value = true
  try {
    const result = await getToken(authCode.value)
    tokenResult.value = result
    ElMessage.success('访问令牌获取成功')
  } catch (error) {
    ElMessage.error(`获取访问令牌失败: ${error.message}`)
  } finally {
    isGettingToken.value = false
  }
}

const saveToken = async () => {
  isSaving.value = true
  try {
    await saveTokenApi({
      tenant_url: tokenResult.value.tenant_url,
      access_token: tokenResult.value.access_token,
      portal_url: tokenForm.value.portalUrl || null,
      email_note: tokenForm.value.emailNote || null
    })

    ElMessage.success('令牌保存成功')

    // 重置表单
    authUrl.value = ''
    authCode.value = ''
    tokenResult.value = null
    tokenForm.value = {
      portalUrl: '',
      emailNote: ''
    }

    // 刷新令牌列表
    await refreshTokens()
  } catch (error) {
    ElMessage.error(`保存令牌失败: ${error.message}`)
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

const copyAuthUrl = async () => {
  const success = await copyToClipboard(authUrl.value)
  ElMessage[success ? 'success' : 'error'](
    success ? 'URL已复制到剪贴板' : '复制失败'
  )
}

const copyAccessToken = async () => {
  const success = await copyToClipboard(tokenResult.value.access_token)
  ElMessage[success ? 'success' : 'error'](
    success ? '访问令牌已复制到剪贴板' : '复制失败'
  )
}

const copyTenantUrl = async () => {
  const success = await copyToClipboard(tokenResult.value.tenant_url)
  ElMessage[success ? 'success' : 'error'](
    success ? '租户URL已复制到剪贴板' : '复制失败'
  )
}

const openAuthUrl = () => {
  if (authUrl.value) {
    window.open(authUrl.value, '_blank')
  }
}

// 仅加载数据库中的令牌数据（页面初始化用）
const loadTokensOnly = async () => {
  try {
    const result = await loadTokens()
    tokens.value = result || []
  } catch (error) {
    ElMessage.error(`加载令牌失败: ${error.message}`)
  }
}

// 刷新令牌列表和Portal信息
const refreshTokens = async () => {
  isRefreshing.value = true
  try {
    // 1. 先加载令牌列表
    const result = await loadTokens()
    tokens.value = result || []

    // 2. 如果有令牌，批量刷新Portal信息
    if (tokens.value.length > 0) {
      const tokenIds = tokens.value.map(token => token.id)

      try {
        const refreshResults = await batchRefreshPortalInfoApi(tokenIds)

        // 更新本地令牌数据
        refreshResults.forEach(result => {
          if (result.success) {
            const index = tokens.value.findIndex(t => t.id === result.tokenId)
            if (index !== -1) {
              tokens.value.splice(index, 1, {
                ...tokens.value[index],
                portal_info: JSON.stringify(result.data.portal_info),
                usage_stats: result.data.usage_stats
              })
            }
          }
        })

        ElMessage.success(`令牌列表已刷新，Portal信息已更新`)
      } catch (portalError) {
        ElMessage.warning(`令牌列表已刷新，但Portal信息更新失败: ${portalError.message}`)
      }
    } else {
      ElMessage.success('令牌列表已刷新')
    }
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    isRefreshing.value = false
  }
}

// 删除令牌
const deleteToken = async (token) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除令牌 "${token.email_note || token.id}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await deleteTokenApi(token.id)
    ElMessage.success('令牌删除成功')
    await refreshTokens()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${error.message}`)
    }
  }
}

// 刷新Portal信息
const refreshPortalInfo = async (token) => {
  // 找到原始token对象并设置loading状态
  const index = tokens.value.findIndex(t => t.id === token.id)
  if (index === -1) return

  // 直接在原始对象上设置loading状态
  tokens.value[index]._refreshing = true

  try {
    const result = await refreshPortalInfoApi(token.id)

    // 根据后端返回的数据结构，正确提取portal_info
    const portalInfo = result.portal_info || {}

    // 将portal_info对象序列化为JSON字符串，因为前端解析函数期望JSON字符串格式
    const updatedToken = {
      ...tokens.value[index],
      portal_info: JSON.stringify(portalInfo),
      usage_stats: result.usage_stats || {},
      _refreshing: false // 确保清除loading状态
    }

    // 使用Vue的响应式更新
    tokens.value.splice(index, 1, updatedToken)

    ElMessage.success('Portal信息已刷新')
  } catch (error) {
    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    // 确保清除loading状态
    if (tokens.value[index]) {
      tokens.value[index]._refreshing = false
    }
  }
}

// Portal状态相关方法
const getPortalStatusType = (token) => {
  if (!token.portal_info) return 'info'
  try {
    const info = JSON.parse(token.portal_info)
    return info.is_active ? 'success' : 'danger'
  } catch {
    return 'warning'
  }
}

const getPortalStatusText = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    return info.is_active ? '活跃' : '已过期'
  } catch {
    return '解析错误'
  }
}

const getCreditsBalance = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    return info.credits_balance !== undefined ? info.credits_balance : '未知'
  } catch {
    return '未知'
  }
}

// 格式化日期函数
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

// 获取创建时间
const getCreatedAt = (token) => {
  if (!token.portal_info) return formatDate(token.created_at)
  try {
    const info = JSON.parse(token.portal_info)
    if (info.created_at) {
      const createdDate = new Date(info.created_at)
      return createdDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return formatDate(token.created_at)
  } catch {
    return formatDate(token.created_at)
  }
}

const getExpiryDate = (token) => {
  if (!token.portal_info) return '未知'
  try {
    const info = JSON.parse(token.portal_info)
    if (info.expiry_date) {
      const expiryDate = new Date(info.expiry_date)
      return expiryDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return '未知'
  } catch {
    return '未知'
  }
}

// 获取过期时间的样式类
const getExpiryClass = (token) => {
  if (!token.portal_info) return 'expiry-unknown'
  try {
    const info = JSON.parse(token.portal_info)
    if (info.expiry_date) {
      const expiryDate = new Date(info.expiry_date)
      const now = new Date()
      const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return 'expiry-expired'
      if (diffDays <= 7) return 'expiry-warning'
      if (diffDays <= 30) return 'expiry-caution'
      return 'expiry-normal'
    }
    return 'expiry-unknown'
  } catch {
    return 'expiry-unknown'
  }
}

// 获取剩余次数的标签类型
const getCreditsType = (token) => {
  const credits = parseInt(getCreditsBalance(token))
  if (isNaN(credits)) return 'info'
  if (credits <= 0) return 'danger'
  if (credits <= 10) return 'warning'
  if (credits <= 50) return ''
  return 'success'
}

// 滚动到生成器
const scrollToGenerator = () => {
  nextTick(() => {
    if (generatorCard.value) {
      generatorCard.value.$el.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

// 处理编辑器切换
const handleEditorSwitch = async (token, command) => {
  if (command === 'copy') {
    try {
      await copyTokenInfo(token)
    } catch (error) {
      console.error('复制令牌失败:', error)
    }
  } else {
    try {
      await switchToEditor(token, command)
    } catch (error) {
      console.error('编辑器切换失败:', error)
    }
  }
}

// 编辑令牌
const editToken = (token) => {
  editingToken.value = { ...token }
  showEditDialog.value = true
}

// 导出令牌
const exportToken = (token) => {
  try {
    // 创建导出数据
    const exportData = {
      id: token.id,
      tenant_url: token.tenant_url,
      access_token: token.access_token,
      portal_url: token.portal_url,
      email_note: token.email_note,
      portal_info: token.portal_info,
      created_at: token.created_at,
      updated_at: token.updated_at
    }

    // 创建下载链接
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    // 创建下载链接并触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = `augment-token-${token.email_note || token.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('令牌导出成功')
  } catch (error) {
    ElMessage.error('导出令牌失败')
  }
}

// 处理编辑保存
const handleEditSave = async (updatedToken) => {
  try {
    // 准备更新数据
    const updateData = {
      tenant_url: updatedToken.tenant_url,
      access_token: updatedToken.access_token,
      portal_url: updatedToken.portal_url,
      email_note: updatedToken.email_note
    }

    // 调用更新API
    await updateTokenApi(updatedToken.id, updateData)

    // 更新本地数据
    const index = tokens.value.findIndex(t => t.id === updatedToken.id)
    if (index !== -1) {
      tokens.value.splice(index, 1, {
        ...tokens.value[index],
        ...updateData,
        updated_at: new Date().toISOString()
      })
    }

    showEditDialog.value = false
    editingToken.value = null
    ElMessage.success('令牌更新成功')
  } catch (error) {
    ElMessage.error(`更新令牌失败: ${error.message}`)
  }
}

// 处理导入成功
const handleImportSuccess = async (result) => {
  ElMessage.success(`成功导入 ${result.imported} 个令牌${result.failed > 0 ? `，失败 ${result.failed} 个` : ''}`)

  // 刷新令牌列表
  await refreshTokens()

  // 关闭对话框
  showImportDialog.value = false
}

// 生命周期 - 页面加载时仅获取数据库中的令牌数据，不主动刷新Portal信息
onMounted(() => {
  // 仅加载数据库中存储的令牌数据（包括已保存的Portal信息）
  loadTokensOnly()
})
</script>

<style scoped>
.augment-token-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.tokens-card {
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.tokens-table-container {
  overflow-x: auto;
}

.email-note {
  display: flex;
  align-items: center;
  gap: 6px;
}

.email-icon {
  color: var(--el-color-primary);
  font-size: 14px;
}

.portal-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.portal-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.credits {
  color: var(--el-color-success);
}

.expiry {
  color: var(--el-text-color-secondary);
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
}

/* 时间和状态信息样式 */
.time-info {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.expiry-info {
  font-size: 12px;
}

.expiry-normal {
  color: var(--el-color-success);
}

.expiry-caution {
  color: var(--el-color-warning);
}

.expiry-warning {
  color: var(--el-color-danger);
  font-weight: 500;
}

.expiry-expired {
  color: var(--el-color-danger);
  font-weight: 600;
  text-decoration: line-through;
}

.expiry-unknown {
  color: var(--el-text-color-placeholder);
}

.credits-info {
  text-align: center;
}

.status-info {
  text-align: center;
}

/* 编辑器下拉菜单样式 */
.editor-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.title-section p {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 16px;
}

.generator-card {
  margin-bottom: 24px;
}

.card-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.card-header span {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.step-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.step-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.step-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.step-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.url-section {
  margin-top: 16px;
}

.action-buttons {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .augment-token-manager {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .title-section {
    text-align: center;
  }

  .title-section h1 {
    font-size: 24px;
  }
}
</style>
