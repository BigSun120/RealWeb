<template>
  <div class="token-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon class="title-icon">
              <Key />
            </el-icon>
            全部令牌管理
          </h1>
          <p class="page-description">管理系统中所有用户的Augment令牌，包括个人令牌和令牌池</p>
        </div>
        <div class="header-right">
          <el-button type="primary" :icon="Refresh" @click="refreshAllTokens" :loading="loading.refresh" size="default">
            刷新数据
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon personal">
                <el-icon>
                  <User />
                </el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ statistics.personalTokens }}</div>
                <div class="stats-label">个人令牌</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon pool">
                <el-icon>
                  <Share />
                </el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ statistics.poolTokens }}</div>
                <div class="stats-label">令牌池</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon active">
                <el-icon>
                  <CircleCheck />
                </el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ statistics.activeTokens }}</div>
                <div class="stats-label">活跃令牌</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total">
                <el-icon>
                  <DataBoard />
                </el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ statistics.totalTokens }}</div>
                <div class="stats-label">总计</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-content">
        <div class="filter-left">
          <el-input v-model="filters.search" placeholder="搜索邮箱备注、用户名或邮箱" :prefix-icon="Search" clearable
            style="width: 300px" @input="handleSearch" />
          <el-select v-model="filters.source" placeholder="令牌来源" clearable style="width: 120px"
            @change="handleFilterChange">
            <el-option label="个人" value="personal" />
            <el-option label="令牌池" value="pool" />
          </el-select>
          <el-select v-model="filters.status" placeholder="状态筛选" clearable style="width: 120px"
            @change="handleFilterChange">
            <el-option label="活跃" value="active" />
            <el-option label="禁用" value="inactive" />
            <el-option label="过期" value="expired" />
          </el-select>
        </div>
        <div class="filter-right">
          <el-text type="info" size="small">
            共找到 {{ filteredTokens.length }} 个令牌
          </el-text>
        </div>
      </div>
    </el-card>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedTokens.length > 0" class="batch-toolbar">
      <div class="batch-info">
        <el-icon class="batch-icon"><Select /></el-icon>
        <span>已选择 <strong>{{ selectedTokens.length }}</strong> 个令牌</span>
      </div>
      <div class="batch-actions">
        <el-popover placement="bottom-start" trigger="hover" width="240" popper-class="batch-popover">
          <div class="batch-popover-actions">
            <el-button type="success" size="small" :loading="loading.batchRefresh" @click="handleBatchRefreshInfo">
              批量基础信息刷新
            </el-button>
            <el-button type="primary" size="small" :loading="loading.batchRefresh" @click="handleBatchRefreshStatus">
              批量令牌状态刷新
            </el-button>
          </div>
          <template #reference>
            <el-button type="success" :icon="Refresh" :loading="loading.batchRefresh" size="small">
              批量刷新
            </el-button>
          </template>
        </el-popover>
        <el-button type="primary" :icon="Download" @click="handleBatchExport" size="small">
          批量导出
        </el-button>
        <el-button type="warning" :icon="Switch" @click="showTransferDialog = true" size="small">
          批量转移
        </el-button>
        <el-button type="info" :icon="Upload" @click="handleBatchReclaim" size="small">
          批量回收
        </el-button>
        <el-button type="danger" :icon="Delete" @click="handleBatchDelete" size="small">
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 进度条已移除 -->

    <!-- 令牌表格 -->
    <el-card class="table-card" shadow="never">
      <el-table ref="tokenTable" :data="paginatedTokens" style="width: 100%" @selection-change="handleSelectionChange"
        row-key="id" border stripe size="default" :header-cell-style="tableHeaderStyle" v-loading="loading.refresh"
        element-loading-text="加载中...">
        <el-table-column type="selection" width="50" align="center" />

        <el-table-column label="序号" width="80" align="center">
          <template #default="{ $index }">
            {{ (pagination.current - 1) * pagination.size + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column prop="emailNote" label="邮箱备注" min-width="200">
          <template #default="{ row }">
            <div class="email-note-cell">
              <div class="email-note-content">
                <pre class="email-note-text">{{ row.emailNote || '未设置' }}</pre>
              </div>
              <el-button v-if="row.emailNote" :icon="DocumentCopy" @click="copyToClipboard(row.emailNote, '邮箱备注')"
                size="small" text class="copy-btn" title="复制邮箱备注" />
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="ownerInfo" label="所属用户" min-width="160">
          <template #default="{ row }">
            <div class="owner-info">
              <div class="owner-username">{{ row.ownerInfo?.username || '未知' }}</div>
              <div class="owner-email">{{ row.ownerInfo?.email || '未知' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="source" label="来源" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.source === 'personal' ? 'primary' : 'success'" size="small">
              {{ row.source === 'personal' ? '个人' : '令牌池' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="creditsBalance" label="剩余次数" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getCreditsTagType(row.creditsBalance)" size="small">
              {{ row.creditsBalance || 0 }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="accountStatus" label="账号状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getAccountStatusTagType(row.accountStatus)" size="small">
              {{ getAccountStatusText(row.accountStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="tokenStatus" label="令牌状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTokenStatusTagType(row.tokenStatus)" size="small">
              {{ getTokenStatusText(row.tokenStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="expiryDate" label="过期时间" width="160" align="center">
          <template #default="{ row }">
            <span v-if="row.expiryDate" :class="getExpiryDateClass(row.expiryDate)">
              {{ formatDate(row.expiryDate) }}
            </span>
            <span v-else class="text-muted">未知</span>
          </template>
        </el-table-column>

        <el-table-column prop="lastActive" label="最后活跃" width="160" align="center">
          <template #default="{ row }">
            <span v-if="row.lastActive">{{ formatDate(row.lastActive) }}</span>
            <span v-else class="text-muted">未知</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button :icon="View" @click="viewTokenDetails(row)" size="small" text type="primary">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.size"
          :page-sizes="[20, 50, 100, 200]" :total="filteredTokens.length"
          layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 转移所有权对话框 -->
    <TransferOwnershipDialog v-model="showTransferDialog" :selected-tokens="selectedTokens"
      @success="handleTransferSuccess" />

    <!-- 令牌详情对话框 -->
    <TokenDetailsDialog v-model="showDetailsDialog" :token="selectedToken" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key,
  Refresh,
  User,
  Share,
  CircleCheck,
  DataBoard,
  Search,
  Select,
  Switch,
  Upload,
  Delete,
  DocumentCopy,
  View,
  Download
} from '@element-plus/icons-vue'
import * as adminTokensApi from '@/api/adminTokens'
import TransferOwnershipDialog from '@/components/admin/dialogs/TransferOwnershipDialog.vue'
import TokenDetailsDialog from '@/components/admin/dialogs/TokenDetailsDialog.vue'

// 响应式数据
const loading = ref({
  refresh: false,
  batchRefresh: false
})

const allTokens = ref([])
const selectedTokens = ref([])
const showTransferDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedToken = ref(null)

// 筛选和搜索
const filters = ref({
  search: '',
  source: '',
  status: ''
})

// 分页
const pagination = ref({
  current: 1,
  size: 20
})

// 进度条相关代码已移除

// 计算属性
const statistics = computed(() => {
  const personal = allTokens.value.filter(token => token.source === 'personal').length
  const pool = allTokens.value.filter(token => token.source === 'pool').length
  const active = allTokens.value.filter(token => token.isActive).length
  const total = allTokens.value.length

  return {
    personalTokens: personal,
    poolTokens: pool,
    activeTokens: active,
    totalTokens: total
  }
})

const filteredTokens = computed(() => {
  let tokens = [...allTokens.value]

  // 搜索过滤
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    tokens = tokens.filter(token =>
      (token.emailNote && token.emailNote.toLowerCase().includes(searchLower)) ||
      (token.ownerInfo?.username && token.ownerInfo.username.toLowerCase().includes(searchLower)) ||
      (token.ownerInfo?.email && token.ownerInfo.email.toLowerCase().includes(searchLower))
    )
  }

  // 来源过滤
  if (filters.value.source) {
    tokens = tokens.filter(token => token.source === filters.value.source)
  }

  // 状态过滤
  if (filters.value.status) {
    if (filters.value.status === 'active') {
      tokens = tokens.filter(token => token.isActive)
    } else if (filters.value.status === 'inactive') {
      tokens = tokens.filter(token => !token.isActive)
    } else if (filters.value.status === 'expired') {
      tokens = tokens.filter(token => {
        if (!token.expiryDate) return false
        return new Date(token.expiryDate) < new Date()
      })
    }
  }

  return tokens
})

const paginatedTokens = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.size
  const end = start + pagination.value.size
  return filteredTokens.value.slice(start, end)
})

// progressPercentage 计算属性已移除

// 表格样式
const tableHeaderStyle = {
  background: '#f5f7fa',
  color: '#606266',
  fontWeight: '600',
  textAlign: 'center'
}

// 方法
const refreshAllTokens = async () => {
  loading.value.refresh = true
  try {
    const response = await adminTokensApi.getAllTokens()
    allTokens.value = response.data?.data?.tokens || []

    if (allTokens.value.length > 0) {
      ElMessage.success(`刷新成功，加载了 ${allTokens.value.length} 个令牌`)
    } else {
      ElMessage.info('当前系统中没有令牌数据')
    }
  } catch (error) {

    ElMessage.error(`刷新失败: ${error.message}`)
  } finally {
    loading.value.refresh = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
}

const handleFilterChange = () => {
  pagination.value.current = 1
}

const handleSelectionChange = (selection) => {
  selectedTokens.value = selection
}

const handleSizeChange = (size) => {
  pagination.value.size = size
  pagination.value.current = 1
}

const handleCurrentChange = (current) => {
  pagination.value.current = current
}

// 批量操作
const handleBatchRefreshInfo = async () => {
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请选择要刷新的令牌')
    return
  }

  loading.value.batchRefresh = true

  try {
    let successCount = 0
    let failCount = 0

    // 顺序刷新（不要并发），逐个请求
    for (const token of selectedTokens.value) {
      try {
        const resp = await adminTokensApi.batchRefreshPortalInfo([token.id])
        const ok = resp.data?.success || resp.data?.data?.success || false
        // 部分接口可能仅返回统计，尽量容错
        if (ok || (resp.data?.data?.successCount || 0) >= 1) {
          successCount += 1
        } else {
          failCount += 1
        }
      } catch (e) {
        failCount += 1
      }
    }

    ElMessage[failCount > 0 ? 'warning' : 'success'](`批量刷新完成，成功 ${successCount} 个，失败 ${failCount} 个`)

    // 刷新数据，确保表格内的剩余次数/账号状态等最新
    await refreshAllTokens()
  } catch (error) {
    ElMessage.error(`批量刷新失败: ${error.message}`)
  } finally {
    loading.value.batchRefresh = false
  }
}

const handleBatchReclaim = async () => {
  const personalTokens = selectedTokens.value.filter(token => token.source === 'personal')
  if (personalTokens.length === 0) {
    ElMessage.warning('请选择个人令牌进行回收')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${personalTokens.length} 个个人令牌回收到令牌池吗？`,
      '确认回收',
      { type: 'warning' }
    )

    const tokenIds = personalTokens.map(token => token.id)
    const response = await adminTokensApi.batchReclaimToPool(tokenIds)

    ElMessage.success(`批量回收完成，成功 ${response.data?.data?.successCount || 0} 个，失败 ${response.data?.data?.failCount || 0} 个`)

    // 刷新数据
    await refreshAllTokens()
    selectedTokens.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`批量回收失败: ${error.message}`)
    }
  }
}

const handleBatchDelete = async () => {
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请选择要删除的令牌')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTokens.value.length} 个令牌吗？此操作不可恢复！`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )



    const tokenIds = selectedTokens.value.map(token => token.id)
    const response = await adminTokensApi.batchDeleteTokens(tokenIds)

    ElMessage.success(`批量删除完成，成功 ${response.data?.data?.successCount || 0} 个，失败 ${response.data?.data?.failCount || 0} 个`)

    // 刷新数据
    await refreshAllTokens()
    selectedTokens.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`批量删除失败: ${error.message}`)
    }
  }
}

const handleBatchExport = () => {
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请选择要导出的令牌')
    return
  }

  try {
    // 准备导出数据
    const exportData = selectedTokens.value.map(token => ({
      '邮箱备注': token.emailNote || '未设置',
      '访问令牌': token.accessToken || '***',
      '来源': token.source === 'personal' ? '个人' : '令牌池',
      '所属用户': token.ownerInfo?.username || '未知',
      '用户邮箱': token.ownerInfo?.email || '未知',
      '剩余次数': token.creditsBalance || 0,
      '账号状态': token.accountStatus || '未知',
      '令牌状态': token.tokenStatus || '未知',
      '创建时间': token.createdAt ? new Date(token.createdAt).toLocaleString('zh-CN') : '未知',
      '过期时间': token.expiryDate ? new Date(token.expiryDate).toLocaleString('zh-CN') : '无'
    }))

    // 转换为CSV格式
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header] || ''
          // 处理包含逗号或换行的值
          return value.toString().includes(',') || value.toString().includes('\n')
            ? `"${value.toString().replace(/"/g, '""')}"`
            : value
        }).join(',')
      )
    ].join('\n')

    // 创建并下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `令牌导出_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)


    URL.revokeObjectURL(url)

    ElMessage.success(`成功导出 ${selectedTokens.value.length} 个令牌`)
  } catch (error) {

    ElMessage.error('导出失败，请重试')
  }
}

const handleTransferSuccess = () => {
  refreshAllTokens()
  selectedTokens.value = []
}

const viewTokenDetails = (token) => {
  selectedToken.value = token
  showDetailsDialog.value = true
}

// 工具方法
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

// 生命周期
onMounted(() => {
  refreshAllTokens()
})

// 监听筛选变化
watch(
  () => [filters.value.search, filters.value.source, filters.value.status],
  () => {
    pagination.value.current = 1
  }
)

// 批量刷新令牌状态（账号状态）
const handleBatchRefreshStatus = async () => {
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请选择要刷新的令牌')
    return
  }

  loading.value.batchRefresh = true

  try {
    let successCount = 0
    let failCount = 0

    for (const token of selectedTokens.value) {
      try {
        const resp = await adminTokensApi.batchRefreshStatus([token.id])
        const ok = resp.data?.success || resp.data?.data?.success || false
        if (ok || (resp.data?.data?.successCount || 0) >= 1) {
          successCount += 1
        } else {
          failCount += 1
        }
      } catch (e) {
        failCount += 1
      }
    }

    ElMessage[failCount > 0 ? 'warning' : 'success'](`批量刷新完成，成功 ${successCount} 个，失败 ${failCount} 个`)

    await refreshAllTokens()
  } catch (error) {
    ElMessage.error(error.message || '批量刷新失败')
  } finally {
    loading.value.batchRefresh = false
  }
}

</script>

<style scoped>
.token-management {
  padding: 0;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.title-icon {
  font-size: 28px;
  color: #3b82f6;
}

.page-description {
  margin: 0;
  color: #6b7280;
  font-size: 14px;

  line-height: 1.5;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 统计卡片 */
.stats-cards {
  margin-bottom: 24px;
}

.stats-card {
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stats-icon.personal {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.stats-icon.pool {
  background: linear-gradient(135deg, #10b981, #047857);
}

.stats-icon.active {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stats-icon.total {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.filter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.filter-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-right {
  display: flex;
  align-items: center;
}

/* 批量操作工具栏 */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 16px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-weight: 500;
}

.batch-icon {
  color: #3b82f6;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

/* 进度条样式已移除 */

/* 表格卡片 */
.table-card {
  border: 1px solid #e5e7eb;
}

/* 表格单元格样式 */
.email-note-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 32px;
}

.email-note-content {
  flex: 1;
  min-width: 0;
}

.email-note-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  background: none;
  border: none;
  max-width: 100%;
}

.copy-btn {
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
  min-width: auto;
  flex-shrink: 0;
  margin-top: 2px;
}

.email-note-cell:hover .copy-btn {
  opacity: 1;
}

.owner-info {
  text-align: left;
}

.owner-username {
  font-weight: 500;
  color: #374151;
  margin-bottom: 2px;
}

.owner-email {
  font-size: 12px;
  color: #6b7280;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* 文本颜色类 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-toolbar {
    flex-direction: column;
    gap: 12px;
  }

  .batch-actions {
    justify-content: center;
  }
}
</style>
