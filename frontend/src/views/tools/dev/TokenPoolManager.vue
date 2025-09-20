<template>
  <div class="token-pool-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon">
              <Coin />
            </el-icon>
            Augment 令牌池
          </h1>
          <p class="page-description">共享令牌池，上传和领取 Augment Code 访问令牌</p>
        </div>
        <div class="header-actions">
          <el-button @click="showUploadDialog = true" :icon="Upload" type="primary" round>
            上传令牌
          </el-button>
          <el-button @click="refreshPool" :icon="Refresh" :loading="isRefreshing" round>
            刷新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStats.available || 0 }}</div>
              <div class="stat-label">可用令牌</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStats.total || 0 }}</div>
              <div class="stat-label">总令牌数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ myUploadsCount || 0 }}</div>
              <div class="stat-label">我的上传</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">1000</div>
              <div class="stat-label">池子容量</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="pool-tabs">
      <!-- 令牌池 -->
      <el-tab-pane label="令牌池" name="pool">
        <el-card class="pool-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Coin />
                </el-icon>
                <h2>可用令牌池</h2>
              </div>
              <span class="card-subtitle">从池子中领取令牌到您的账户</span>
            </div>
          </template>

          <div v-if="poolTokens.length === 0" class="empty-state">
            <el-empty description="暂无可用令牌" />
          </div>

          <div v-else class="pool-table-container">
            <el-table :data="poolTokens" style="width: 100%" :header-cell-style="{
              background: '#f8fafc',
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderBottom: '2px solid #e5e7eb'
            }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>

              <el-table-column label="上传者" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="uploader-info">
                    <el-icon class="uploader-icon">
                      <User />
                    </el-icon>
                    {{ row.maskedEmail }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="上传时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="upload-time">
                    {{ formatDate(row.uploadedAt) }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="令牌状态" min-width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row)" size="default" effect="light" round>
                    {{ getStatusText(row) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                    {{ row.creditsBalance || '未知' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="expiry-time" :class="getExpiryClass(row)">
                    {{ formatDate(row.expiryDate) || '未知' }}
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="操作" min-width="120" align="center">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="claimToken(row)" :loading="row._claiming"
                    :disabled="row.status !== 'available'" round>
                    领取
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 我的上传 -->
      <el-tab-pane label="我的上传" name="uploads">
        <el-card class="uploads-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Upload />
                </el-icon>
                <h2>我的上传</h2>
              </div>
              <span class="card-subtitle">管理您上传到池子的令牌</span>
            </div>
          </template>

          <div v-if="myUploads.length === 0" class="empty-state">
            <el-empty description="您还没有上传任何令牌">
              <el-button type="primary" @click="showUploadDialog = true">
                上传令牌
              </el-button>
            </el-empty>
          </div>

          <div v-else class="uploads-table-container">
            <el-table :data="myUploads" style="width: 100%" :header-cell-style="{
              background: '#f8fafc',
              color: '#000000',
              fontWeight: '600',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderBottom: '2px solid #e5e7eb'
            }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>

              <el-table-column label="上传时间" min-width="140" align="center">
                <template #default="{ row }">
                  {{ formatDate(row.uploadedAt) }}
                </template>
              </el-table-column>

              <el-table-column label="状态" min-width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row)" size="default" effect="light" round>
                    {{ getStatusText(row) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                    {{ row.creditsBalance || '未知' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="领取者" min-width="140" align="center">
                <template #default="{ row }">
                  <div v-if="row.claimedBy">
                    <el-icon>
                      <User />
                    </el-icon>
                    {{ row.claimedBy.email ? maskEmail(row.claimedBy.email) : '已领取' }}
                  </div>
                  <span v-else class="not-claimed">未领取</span>
                </template>
              </el-table-column>

              <el-table-column label="操作" min-width="160" align="center">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <el-button v-if="row.status === 'claimed'" type="warning" size="small" @click="returnToken(row)"
                      :loading="row._returning" round>
                      归还
                    </el-button>
                    <el-button type="danger" size="small" @click="deleteToken(row)" :loading="row._deleting" round>
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 上传令牌对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传令牌到池子" width="500px">
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="访问令牌" required>
          <el-input v-model="uploadForm.accessToken" type="textarea" :rows="4" placeholder="请输入 Augment 访问令牌..."
            :disabled="isUploading" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showUploadDialog = false" :disabled="isUploading">
          取消
        </el-button>
        <el-button type="primary" @click="uploadToken" :loading="isUploading">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Coin,
  Upload,
  Refresh,
  User
} from '@element-plus/icons-vue'
import { tokenPoolService } from '@/services/tokenPoolService'

// 响应式数据
const activeTab = ref('pool')
const showUploadDialog = ref(false)
const isRefreshing = ref(false)
const isUploading = ref(false)

const poolTokens = ref([])
const myUploads = ref([])
const poolStats = ref({
  available: 0,
  total: 0
})

const uploadForm = ref({
  accessToken: ''
})

// 计算属性
const myUploadsCount = computed(() => myUploads.value.length)

// 方法
const refreshPool = async () => {
  isRefreshing.value = true
  try {
    // 获取池子数据
    const poolResponse = await tokenPoolService.getPoolTokens({ status: 'available' })
    poolTokens.value = poolResponse.data.tokens || []
    poolStats.value = poolResponse.data.stats || { available: 0, total: 0 }

    // 获取我的上传
    const uploadsResponse = await tokenPoolService.getMyUploads()
    myUploads.value = uploadsResponse.data.tokens || []

    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('刷新失败:', error)
    ElMessage.error(error.message || '刷新失败')
  } finally {
    isRefreshing.value = false
  }
}

const uploadToken = async () => {
  if (!uploadForm.value.accessToken.trim()) {
    ElMessage.warning('请输入访问令牌')
    return
  }

  isUploading.value = true
  try {
    await tokenPoolService.uploadToken(uploadForm.value.accessToken.trim())
    ElMessage.success('令牌上传成功')
    showUploadDialog.value = false
    uploadForm.value.accessToken = ''
    await refreshPool()
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error(error.message || '上传失败')
  } finally {
    isUploading.value = false
  }
}

const claimToken = async (token) => {
  token._claiming = true
  try {
    await tokenPoolService.claimToken(token._id)
    ElMessage.success('令牌领取成功')
    await refreshPool()
  } catch (error) {
    console.error('领取失败:', error)
    ElMessage.error(error.message || '领取失败')
  } finally {
    token._claiming = false
  }
}

const returnToken = async (token) => {
  token._returning = true
  try {
    await tokenPoolService.returnToken(token._id)
    ElMessage.success('令牌已归还到池子')
    await refreshPool()
  } catch (error) {
    console.error('归还失败:', error)
    ElMessage.error(error.message || '归还失败')
  } finally {
    token._returning = false
  }
}

const deleteToken = async (token) => {
  try {
    await ElMessageBox.confirm('确定要删除这个令牌吗？', '确认删除', {
      type: 'warning'
    })

    token._deleting = true
    await tokenPoolService.deleteToken(token._id)
    ElMessage.success('令牌已删除')
    await refreshPool()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    token._deleting = false
  }
}

// 辅助方法
const formatDate = (date) => {
  if (!date) return '未知'
  return new Date(date).toLocaleString('zh-CN')
}

const getStatusType = (token) => {
  switch (token.status) {
    case 'available': return 'success'
    case 'claimed': return 'warning'
    case 'expired': return 'danger'
    case 'invalid': return 'info'
    default: return 'info'
  }
}

const getStatusText = (token) => {
  switch (token.status) {
    case 'available': return '可用'
    case 'claimed': return '已领取'
    case 'expired': return '已过期'
    case 'invalid': return '无效'
    default: return '未知'
  }
}

const getCreditsType = (token) => {
  const credits = parseInt(token.creditsBalance)
  if (isNaN(credits)) return 'info'
  if (credits <= 0) return 'danger'
  if (credits <= 10) return 'warning'
  return 'success'
}

const getExpiryClass = (token) => {
  if (!token.expiryDate) return 'expiry-unknown'

  const expiryDate = new Date(token.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expiry-expired'
  if (diffDays < 1) return 'expiry-danger'
  if (diffDays < 3) return 'expiry-warning'
  return 'expiry-normal'
}

const maskEmail = (email) => {
  if (!email) return '未知'
  const [localPart, domain] = email.split('@')
  if (!domain) return '未知'

  let maskedLocal = localPart
  if (localPart.length > 3) {
    const start = localPart.substring(0, 2)
    const end = localPart.substring(localPart.length - 1)
    const middle = '*'.repeat(Math.max(1, localPart.length - 3))
    maskedLocal = start + middle + end
  } else if (localPart.length > 1) {
    maskedLocal = localPart[0] + '*'.repeat(localPart.length - 1)
  }

  return `${maskedLocal}@${domain}`
}

// 生命周期
onMounted(() => {
  refreshPool()
})
</script>

<style scoped>
.token-pool-manager {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

/* 全局背景渐变 */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
}

.page-header {
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 32px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.title-section {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 700;
  color: white;
}

.title-icon {
  font-size: 2rem;
  color: #fbbf24;
}

.page-description {
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 32px;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-content {
  text-align: center;
  padding: 20px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  color: #000000;
  font-weight: 500;
}

/* 标签页 */
.pool-tabs {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 卡片样式 */
.pool-card,
.uploads-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.card-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #000000;
}

.card-icon {
  font-size: 1.5rem;
  color: #3b82f6;
}

.card-subtitle {
  color: #000000;
  font-size: 0.9rem;
}

/* 表格样式 */
.pool-table-container,
.uploads-table-container {
  border-radius: 12px;
  overflow: hidden;
}

.uploader-info {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.uploader-icon {
  color: #3b82f6;
  font-size: 16px;
}

.upload-time,
.expiry-time {
  font-size: 12px;
  color: #000000;
}

/* 过期时间样式 */
.expiry-normal {
  color: #059669;
}

.expiry-warning {
  color: #f97316;
}

.expiry-danger {
  color: #dc2626;
}

.expiry-expired {
  color: #dc2626;
  font-weight: 600;
  text-decoration: line-through;
}

.expiry-unknown {
  color: #000000;
}

.not-claimed {
  color: #6b7280;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .token-pool-manager {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .stat-number {
    font-size: 2rem;
  }
}
</style>
