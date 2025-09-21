<template>
  <div class="augment-token-manager">
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
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.available || 0 }}</div>
              <div class="stat-label">可用令牌</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.total || 0 }}</div>
              <div class="stat-label">总令牌数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card compact-stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ poolStatsComputed.myUploads || 0 }}</div>
              <div class="stat-label">我的上传</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="pool-tabs">
      <!-- 令牌池 -->
      <el-tab-pane label="令牌池" name="pool">
        <el-card class="pool-card compact-card" shadow="hover">
          <template #header>
            <div class="card-header-compact">
              <div class="card-title-compact">
                <el-icon class="card-icon">
                  <Coin />
                </el-icon>
                <h2>可用令牌池</h2>
                <span class="card-subtitle-inline">从池子中领取令牌到您的账户</span>
              </div>
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

              <el-table-column label="邮箱备注" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="email-note">
                    <el-icon class="email-icon">
                      <Message />
                    </el-icon>
                    <span>{{ row.email_note || row.emailNote || '未设置' }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ formatDate(row.uploadedAt) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ formatDate(row.expiryDate) || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ row.creditsBalance || '未知' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getStatusType(row)" size="default" effect="light" round>
                      {{ getStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="上传者" min-width="100" align="center">
                <template #default="{ row }">
                  <div class="uploader-info">
                    <el-text size="small" style="color: #666;">
                      {{ row.originalUploader || row.uploaderUsername || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="操作" :min-width="isAdmin ? 200 : 140" align="center">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <el-button type="primary" size="small" @click="claimToken(row)" :loading="row._claiming"
                      :disabled="row.status !== 'available'" round>
                      领取
                    </el-button>
                    <el-button :icon="Refresh" size="small" @click="refreshTokenPortalInfo(row)"
                      :loading="row._refreshing" title="刷新Portal信息" round plain>
                    </el-button>
                    <!-- 管理员删除按钮 -->
                    <el-button v-if="isAdmin" type="danger" size="small" @click="adminDeleteToken(row)"
                      :loading="row._deleting" title="管理员删除" :icon="Delete" round plain>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 我的上传 -->
      <el-tab-pane label="我的上传" name="uploads">
        <el-card class="uploads-card compact-card" shadow="hover">
          <template #header>
            <div class="card-header-compact">
              <div class="card-title-compact">
                <el-icon class="card-icon">
                  <Upload />
                </el-icon>
                <h2>我的上传</h2>
                <span class="card-subtitle-inline">查看您上传到池子的令牌历史记录</span>
              </div>
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

              <el-table-column label="邮箱备注" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="email-note">
                    <el-icon class="email-icon">
                      <Message />
                    </el-icon>
                    <span>{{ getTokenEmailNote(row, false) }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ formatDate(row.uploadedAt) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ formatDate(row.expiryDate) || '未知' }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ row.creditsBalance || '未知' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getStatusType(row)" size="default" effect="light" round>
                      {{ getStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="当前状态" min-width="120" align="center">
                <template #default="{ row }">
                  <div v-if="row.claimedBy" class="claimed-info">
                    <el-tag type="success" size="small" round>
                      已被领取
                    </el-tag>
                    <div style="margin-top: 4px;">
                      <small style="color: #999;">领取者：{{ row.claimedBy.username || '未知用户' }}</small>
                    </div>
                  </div>
                  <el-tag v-else type="info" size="small" round>
                    等待领取
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 已保存的令牌 -->
      <el-tab-pane label="已保存的令牌" name="saved">

        <!-- 已保存的令牌列表 -->
        <el-card class="tokens-card" shadow="hover">
          <template #header>
            <div class="card-header-with-actions">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Document />
                </el-icon>
                <h2>已保存的令牌</h2>
              </div>
              <div class="card-actions">
                <el-button @click="showImportDialog = true" :icon="Upload" type="info" plain round size="small">
                  导入令牌
                </el-button>
                <el-dropdown @command="handleExportCommand" :disabled="tokens.length === 0">
                  <el-button :icon="Download" type="success" plain round size="small">
                    批量导出
                    <el-icon class="el-icon--right">
                      <ArrowDown />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="all">
                        <el-icon>
                          <Download />
                        </el-icon>
                        导出全部 ({{ tokens.length }})
                      </el-dropdown-item>
                      <el-dropdown-item command="selected" :disabled="selectedTokens.length === 0">
                        <el-icon>
                          <Check />
                        </el-icon>
                        导出选中 ({{ selectedTokens.length }})
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button type="primary" @click="refreshTokens" :icon="Refresh" :loading="isRefreshing" round
                  size="small">
                  刷新令牌
                </el-button>
              </div>
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
            <el-table :data="tokens" style="width: 100%" :row-key="row => row.id" table-layout="auto"
              @selection-change="handleSelectionChange" ref="tokenTable" :header-cell-style="{
                background: '#f8fafc',
                color: '#000000',
                fontWeight: '600',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                borderBottom: '2px solid #e5e7eb'
              }" :cell-style="{ textAlign: 'center', padding: '12px 8px' }" stripe border>
              <el-table-column type="selection" width="50" align="center" />
              <el-table-column prop="email_note" label="邮箱备注" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="email-note">
                    <el-icon class="email-icon">
                      <Message />
                    </el-icon>
                    <span>{{ row.email_note || row.emailNote || '未设置' }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="创建时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="time-info">
                    <el-text size="small" style="color: #000000;">
                      {{ getCreatedAt(row) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="过期时间" min-width="140" align="center">
                <template #default="{ row }">
                  <div class="expiry-info">
                    <el-text :class="getExpiryClass(row)" size="small">
                      {{ getExpiryDate(row) }}
                    </el-text>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="剩余次数" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="credits-info">
                    <el-tag :type="getCreditsType(row)" size="default" effect="light" round>
                      {{ getCreditsBalance(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="账号状态" min-width="110" align="center">
                <template #default="{ row }">
                  <div class="status-info">
                    <el-tag :type="getPortalStatusType(row)" size="default" effect="light" round>
                      {{ getPortalStatusText(row) }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="编辑器" min-width="120" align="center">
                <template #default="{ row }">
                  <el-dropdown @command="(command) => handleEditorSwitch(row, command)" trigger="click">
                    <el-button size="default" type="primary" plain :icon="Monitor" round>
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

              <el-table-column label="操作" min-width="240" fixed="right" align="center">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <el-button type="primary" size="small" @click="refreshPortalInfo(row)" :loading="row._refreshing"
                      :icon="Refresh" round plain>
                      刷新
                    </el-button>
                    <el-button type="info" size="small" @click="uploadTokenToPool(row)" :loading="row._uploading"
                      :icon="Upload" round plain>
                      上传到池
                    </el-button>
                    <el-button type="warning" size="small" @click="editToken(row)" :icon="Edit" round plain>
                      编辑
                    </el-button>
                    <el-button type="success" size="small" @click="exportToken(row)" :icon="Download" round plain>
                      导出
                    </el-button>
                    <el-button type="danger" size="small" @click="deleteToken(row)" :icon="Delete" round plain>
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- 生成新令牌 -->
        <el-card class="generator-card" ref="generatorCard" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <el-icon class="card-icon">
                  <Key />
                </el-icon>
                <h2>生成新的访问令牌</h2>
              </div>
              <span class="card-subtitle">按照以下步骤获取您的 Augment 访问令牌</span>
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

            <el-button type="primary" @click="generateAuthUrl" :loading="isGenerating" size="large" round>
              <el-icon>
                <Link />
              </el-icon>
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
              size="large" round>
              <el-icon>
                <Key />
              </el-icon>
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
                <el-button type="success" @click="saveToken" :loading="isSaving" size="large" round>
                  <el-icon>
                    <Check />
                  </el-icon>
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
      </el-tab-pane>
    </el-tabs>

    <!-- 上传令牌到池子对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传令牌到池子" width="800px" :close-on-click-modal="false">
      <div class="upload-dialog">
        <!-- 导入方式选择 -->
        <div class="import-mode-selector">
          <el-radio-group v-model="uploadMode" @change="handleUploadModeChange">
            <el-radio-button label="manual">手动输入</el-radio-button>
            <el-radio-button label="json">JSON导入</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 手动输入模式 -->
        <div v-if="uploadMode === 'manual'" class="manual-upload">
          <div class="section-header">
            <h3>手动输入令牌信息</h3>
            <p>请逐个输入令牌信息，每个令牌占一行</p>
          </div>

          <div class="token-inputs">
            <div v-for="(token, index) in uploadTokens" :key="index" class="token-input-row">
              <div class="row-header">
                <span class="row-number">{{ index + 1 }}</span>
                <el-button v-if="uploadTokens.length > 1" type="danger" size="small" :icon="Delete" circle
                  @click="removeUploadTokenRow(index)" />
              </div>

              <div class="token-fields">
                <el-form-item label="访问令牌" required>
                  <el-input v-model="token.access_token" placeholder="请输入访问令牌" type="textarea" :rows="2"
                    :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="租户URL">
                  <el-input v-model="token.tenant_url" placeholder="请输入租户URL（可选）" :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="Portal URL">
                  <el-input v-model="token.portal_url" placeholder="请输入Portal URL（可选）" :disabled="isUploading" />
                </el-form-item>

                <el-form-item label="邮箱备注">
                  <el-input v-model="token.email_note" placeholder="请输入邮箱备注（可选）" :disabled="isUploading" />
                </el-form-item>
              </div>
            </div>
          </div>

          <div class="add-token-row">
            <el-button @click="addUploadTokenRow" :icon="Plus" type="primary" plain>
              添加令牌
            </el-button>
          </div>
        </div>

        <!-- JSON导入模式 -->
        <div v-else class="json-upload">
          <div class="section-header">
            <h3>JSON格式导入</h3>
            <p>请粘贴JSON格式的令牌数据</p>
          </div>

          <el-input v-model="uploadJsonText" type="textarea" :rows="12" placeholder="请粘贴JSON格式的令牌数据..."
            :disabled="isUploading" />

          <div class="json-example">
            <el-collapse>
              <el-collapse-item title="查看JSON格式示例" name="example">
                <pre class="json-example-code">{{ jsonExample }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showUploadDialog = false" :disabled="isUploading">
          取消
        </el-button>
        <el-button type="primary" @click="uploadTokensToPool" :loading="isUploading">
          上传到池子
        </el-button>
      </template>
    </el-dialog>
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
  Download,
  Coin,
  User,
  Plus
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import { useUserStore } from '@/stores/user'
import { useProtocolSwitcher } from '@/composables/useProtocolSwitcher'
import TokenImportDialog from './components/TokenImportDialog.vue'
import TokenEditDialog from './components/TokenEditDialog.vue'
import { tokenPoolService } from '@/services/tokenPoolService'

// 响应式数据
const authUrl = ref('')
const authCode = ref('')
const tokenResult = ref(null)
const tokens = ref([])
const generatorCard = ref(null)
const showImportDialog = ref(false)
const showEditDialog = ref(false)
const editingToken = ref(null)
const selectedTokens = ref([])
const tokenTable = ref(null)

// 用户store
const userStore = useUserStore()

// 令牌池相关数据
const activeTab = ref('saved')
const showUploadDialog = ref(false)
const isUploading = ref(false)
const poolTokens = ref([])
const myUploads = ref([])


// 计算统计信息
const poolStatsComputed = computed(() => {
  const available = poolTokens.value.filter(token => token.status === 'available').length
  const total = poolTokens.value.length
  const myUploadsCount = myUploads.value.length

  return {
    available,
    total,
    myUploads: myUploadsCount,
    capacity: 1000
  }
})

// 判断是否为管理员
const isAdmin = computed(() => {
  return userStore.user && userStore.user.isAdmin
})



// 上传对话框相关数据
const uploadMode = ref('manual')
const uploadTokens = ref([{
  access_token: '',
  tenant_url: '',
  portal_url: '',
  email_note: ''
}])
const uploadJsonText = ref('')

// JSON示例
const jsonExample = ref(`[
  {
    "access_token": "your_access_token_here",
    "tenant_url": "https://your-tenant.augmentcode.com",
    "portal_url": "https://portal.augmentcode.com",
    "email_note": "example@domain.com"
  }
]`)



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

      if (diffDays < 0) return 'expiry-expired'  // 已过期：红色
      if (diffDays < 1) return 'expiry-danger'   // 低于1天：红色
      if (diffDays < 3) return 'expiry-warning'  // 低于3天：橙色
      return 'expiry-normal'                     // 其他时间：绿色
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
  if (credits <= 50) return 'primary'
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

// 令牌池相关方法
const refreshPool = async () => {
  isRefreshing.value = true
  try {
    // 获取池子数据
    const poolResponse = await tokenPoolService.getPoolTokens({ status: 'available' })
    poolTokens.value = poolResponse.data?.tokens || poolResponse.tokens || []

    // 获取我的上传
    const uploadsResponse = await tokenPoolService.getMyUploads()
    myUploads.value = uploadsResponse.data?.tokens || uploadsResponse.tokens || []

    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('刷新失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    ElMessage.error(error.message || '刷新失败')
  } finally {
    isRefreshing.value = false
  }
}



const claimToken = async (token) => {
  token._claiming = true
  try {
    // 详细确认操作
    await ElMessageBox.confirm(
      `确定要领取此令牌吗？

ℹ️ 领取说明：
• 领取后令牌将从池中移除
• 您将成为该令牌的唯一所有者
• 令牌将添加到您的个人列表中

令牌信息：${token.email_note || token.emailNote || '未命名'}
原始上传者：${token.originalUploader || '未知'}`,
      '确认领取令牌',
      {
        type: 'info',
        confirmButtonText: '确定领取',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: true
      }
    )

    // 调用领取API（转移模式）
    const response = await tokenPoolService.claimTokenTransfer(token._id || token.id)

    if (response.success) {
      ElMessage.success('令牌已领取，已添加到您的个人列表中')

      // 立即更新本地数据
      const tokenIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
      if (tokenIndex !== -1) {
        poolTokens.value.splice(tokenIndex, 1)
      }

      // 刷新完整数据：令牌池、我的上传、已保存的令牌
      await Promise.all([
        refreshPool(),
        refreshTokens() // 刷新已保存的令牌列表
      ])

      // 切换到已保存令牌标签页
      activeTab.value = 'saved'
    } else {
      throw new Error(response.message || '领取失败')
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('领取失败:', error)
      ElMessage.error(error.message || '领取失败')
    }
  } finally {
    token._claiming = false
  }
}

const returnToken = async (token) => {
  token._returning = true
  try {
    await tokenPoolService.returnToken(token._id || token.id)
    ElMessage.success('令牌已归还到池子')

    // 立即更新本地数据
    const tokenIndex = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
    if (tokenIndex !== -1) {
      myUploads.value[tokenIndex].status = 'available'
    }

    // 刷新完整数据：令牌池、我的上传、已保存的令牌
    await Promise.all([
      refreshPool(),
      refreshTokens() // 刷新已保存的令牌列表
    ])
  } catch (error) {
    console.error('归还失败:', error)
    ElMessage.error(error.message || '归还失败')
  } finally {
    token._returning = false
  }
}

const deletePoolToken = async (token) => {
  try {
    await ElMessageBox.confirm('确定要删除这个令牌吗？', '确认删除', {
      type: 'warning'
    })

    token._deleting = true
    await tokenPoolService.deleteToken(token._id || token.id)
    ElMessage.success('令牌已删除')

    // 立即更新本地数据 - 从所有相关数组中移除
    const tokenId = token._id || token.id

    // 从池子令牌中移除
    const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === tokenId)
    if (poolIndex !== -1) {
      poolTokens.value.splice(poolIndex, 1)
    }

    // 从我的上传中移除
    const uploadIndex = myUploads.value.findIndex(t => (t._id || t.id) === tokenId)
    if (uploadIndex !== -1) {
      myUploads.value.splice(uploadIndex, 1)
    }

    // 刷新完整数据以确保同步：令牌池、我的上传、已保存的令牌
    await Promise.all([
      refreshPool(),
      refreshTokens() // 刷新已保存的令牌列表
    ])
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    token._deleting = false
  }
}

// 管理员删除令牌池中的令牌
const adminDeleteToken = async (token) => {
  try {
    // 管理员删除确认对话框
    const { value: reason } = await ElMessageBox.prompt(
      `确定要删除此令牌吗？

⚠️ 管理员操作提醒：
• 此操作将永久删除令牌池中的令牌
• 原始上传者：${token.originalUploader || '未知'}
• 上传时间：${formatDate(token.uploadedAt)}
• 当前状态：${token.status === 'available' ? '可领取' : '已被领取'}

请输入删除原因（可选）：`,
      '管理员删除令牌',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入删除原因...',
        inputType: 'textarea',
        type: 'warning'
      }
    )

    token._deleting = true
    const response = await tokenPoolService.adminDeleteToken(token._id || token.id, reason || '管理员删除')

    if (response.success) {
      ElMessage.success('令牌删除成功')

      // 立即更新本地数据 - 从令牌池中移除
      const tokenId = token._id || token.id
      const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === tokenId)
      if (poolIndex !== -1) {
        poolTokens.value.splice(poolIndex, 1)
      }

      // 刷新完整数据以确保同步
      await refreshPool()
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('管理员删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    token._deleting = false
  }
}

// 辅助方法 - 使用已有的formatDate函数

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

const maskEmail = (email) => {
  if (!email) return '未知'
  const [localPart, domain] = email.split('@')
  if (!domain) return '未知'

  let maskedLocal = localPart
  let maskedDomain = domain

  // @前4位改为星号
  if (localPart.length > 4) {
    maskedLocal = localPart.substring(0, localPart.length - 4) + '****'
  } else {
    maskedLocal = '****'
  }

  // @后4位改为星号
  if (domain.length > 4) {
    maskedDomain = '****' + domain.substring(4)
  } else {
    maskedDomain = '****'
  }

  return `${maskedLocal}@${maskedDomain}`
}

// 获取令牌邮箱备注的显示文本（简化版，显示完整内容）
const getTokenEmailNote = (token, isMyUpload = false) => {
  // 如果是我的上传，显示默认文本
  if (isMyUpload) {
    return '我的上传'
  }

  // 直接返回完整的邮箱备注，不做任何脱敏处理
  return token.email_note || token.emailNote || '未设置'
}

// 这个函数已不再需要，因为我们简化了显示逻辑

// 上传对话框相关方法
const handleUploadModeChange = () => {
  // 切换模式时清空数据
  if (uploadMode.value === 'manual') {
    uploadTokens.value = [{
      access_token: '',
      tenant_url: '',
      portal_url: '',
      email_note: ''
    }]
  } else {
    uploadJsonText.value = ''
  }
}

const addUploadTokenRow = () => {
  uploadTokens.value.push({
    access_token: '',
    tenant_url: '',
    portal_url: '',
    email_note: ''
  })
}

const removeUploadTokenRow = (index) => {
  if (uploadTokens.value.length > 1) {
    uploadTokens.value.splice(index, 1)
  }
}

const uploadTokensToPool = async () => {
  try {
    let tokensToUpload = []

    if (uploadMode.value === 'manual') {
      // 手动输入模式
      tokensToUpload = uploadTokens.value.filter(token => token.access_token.trim())
      if (tokensToUpload.length === 0) {
        ElMessage.warning('请至少输入一个访问令牌')
        return
      }
    } else {
      // JSON导入模式
      if (!uploadJsonText.value.trim()) {
        ElMessage.warning('请输入JSON数据')
        return
      }

      try {
        const jsonData = JSON.parse(uploadJsonText.value)
        tokensToUpload = Array.isArray(jsonData) ? jsonData : [jsonData]
      } catch (error) {
        ElMessage.error('JSON格式错误，请检查格式')
        return
      }
    }

    isUploading.value = true

    // 批量上传令牌到池子
    const result = await tokenPoolService.uploadTokens(tokensToUpload)

    const { uploaded, failed, errors } = result.data

    // 显示结果
    if (uploaded > 0) {
      ElMessage.success(`成功上传 ${uploaded} 个令牌${failed > 0 ? `，失败 ${failed} 个` : ''}`)
      showUploadDialog.value = false

      // 重置表单
      uploadMode.value = 'manual'
      uploadTokens.value = [{
        access_token: '',
        tenant_url: '',
        portal_url: '',
        email_note: ''
      }]
      uploadJsonText.value = ''

      // 刷新池子数据和统计信息
      await refreshPool()
    } else {
      ElMessage.error(`所有令牌上传失败${errors.length > 0 ? `：${errors[0]}` : ''}`)
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    ElMessage.error(error.response?.data?.message || error.message || '上传失败')
  } finally {
    isUploading.value = false
  }
}

// 上传单个令牌到令牌池（转移所有权）
const uploadTokenToPool = async (token) => {
  try {
    // 设置loading状态
    token._uploading = true

    // 详细确认操作
    await ElMessageBox.confirm(
      `确定要将令牌转移到公共池吗？

⚠️ 重要提醒：
• 转移后您将失去该令牌的所有权
• 其他用户可以立即领取此令牌
• 此操作无法撤销
• 令牌将从您的个人列表中移除

令牌信息：${token.email_note || token.emailNote || '未命名'}`,
      '确认转移令牌',
      {
        type: 'warning',
        confirmButtonText: '确定转移',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: true
      }
    )

    // 准备上传数据
    const uploadData = {
      access_token: token.access_token || token.accessToken,
      tenant_url: token.tenant_url || token.tenantUrl,
      portal_url: token.portal_url || token.portalUrl || '',
      email_note: token.email_note || token.emailNote || '',
      transfer_mode: true // 标记为转移模式
    }

    // 调用转移API
    const response = await tokenPoolService.transferTokenToPool(token.id, uploadData)

    if (response.success) {
      ElMessage.success('令牌已转移到池子，已从您的个人列表中移除')
      // 刷新个人令牌列表和令牌池数据
      await loadTokensOnly()
      await refreshPool()
    } else {
      throw new Error(response.message || '转移失败')
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('转移令牌到池子失败:', error)
      ElMessage.error(`转移失败: ${error.message}`)
    }
  } finally {
    token._uploading = false
  }
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

// 导出单个令牌
const exportToken = (token) => {
  try {
    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = [{
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }]

    downloadTokensAsJson(exportData, `augment-token-${token.email_note || token.id}.json`)
    ElMessage.success('令牌导出成功')
  } catch (error) {
    ElMessage.error('导出令牌失败')
  }
}

// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedTokens.value = selection
}

// 处理导出命令
const handleExportCommand = (command) => {
  if (command === 'all') {
    exportAllTokens()
  } else if (command === 'selected') {
    exportSelectedTokens()
  }
}

// 批量导出所有令牌
const exportAllTokens = () => {
  try {
    if (tokens.value.length === 0) {
      ElMessage.warning('没有可导出的令牌')
      return
    }

    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = tokens.value.map(token => ({
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }))

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    downloadTokensAsJson(exportData, `augment-tokens-batch-${timestamp}.json`)
    ElMessage.success(`成功导出 ${tokens.value.length} 个令牌`)
  } catch (error) {
    ElMessage.error('批量导出失败')
  }
}

// 导出选中的令牌
const exportSelectedTokens = () => {
  try {
    if (selectedTokens.value.length === 0) {
      ElMessage.warning('请先选择要导出的令牌')
      return
    }

    // 创建导出数据（数组格式，与导入格式一致）
    const exportData = selectedTokens.value.map(token => ({
      access_token: token.access_token,
      tenant_url: token.tenant_url,
      portal_url: token.portal_url,
      email_note: token.email_note
    }))

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    downloadTokensAsJson(exportData, `augment-tokens-selected-${timestamp}.json`)
    ElMessage.success(`成功导出 ${selectedTokens.value.length} 个选中令牌`)

    // 清空选择
    if (tokenTable.value) {
      tokenTable.value.clearSelection()
    }
  } catch (error) {
    ElMessage.error('导出选中令牌失败')
  }
}

// 通用下载函数
const downloadTokensAsJson = (data, filename) => {
  const dataStr = JSON.stringify(data, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)

  // 创建下载链接并触发下载
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
  // 构建结果消息
  const messages = []
  if (result.imported > 0) {
    messages.push(`成功导入 ${result.imported} 个`)
  }
  if (result.duplicated > 0) {
    messages.push(`跳过重复 ${result.duplicated} 个`)
  }
  if (result.failed > 0) {
    messages.push(`失败 ${result.failed} 个`)
  }

  if (messages.length > 0) {
    ElMessage.success(`导入完成：${messages.join('，')}`)
  }

  // 刷新令牌列表
  if (result.imported > 0) {
    await refreshTokens()
  }

  // 关闭对话框
  showImportDialog.value = false
}

// 刷新令牌池中单个令牌的Portal信息
const refreshTokenPortalInfo = async (token) => {
  token._refreshing = true
  try {
    // 调用后端API刷新Portal信息
    const response = await tokenPoolService.refreshTokenInfo(token._id || token.id)

    // 更新本地数据 - 与已保存令牌的刷新逻辑一致
    const updatedToken = response.data || response
    if (updatedToken) {

      // 更新令牌状态、剩余次数、过期时间等数据
      const newTokenData = {
        ...token,
        status: updatedToken.status,
        creditsBalance: updatedToken.creditsBalance,
        expiryDate: updatedToken.expiryDate,
        portalInfo: updatedToken.portalInfo,
        lastRefreshed: updatedToken.lastRefreshed || new Date(),
        _refreshing: false
      }

      // 如果令牌状态变为无效，从可用列表中移除
      if (updatedToken.status === 'invalid' || updatedToken.status === 'expired') {
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1)
        }
        const uploadIndex = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (uploadIndex !== -1) {
          myUploads.value.splice(uploadIndex, 1, newTokenData)
        }
      } else {
        // 强制更新Vue的响应式系统
        const poolIndex = poolTokens.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (poolIndex !== -1) {
          poolTokens.value.splice(poolIndex, 1, newTokenData)
        }

        const uploadIndex = myUploads.value.findIndex(t => (t._id || t.id) === (token._id || token.id))
        if (uploadIndex !== -1) {
          myUploads.value.splice(uploadIndex, 1, newTokenData)
        }
      }
    }

    ElMessage.success('Portal信息刷新成功')
  } catch (error) {
    console.error('刷新Portal信息失败:', error)
    ElMessage.error(error.message || '刷新Portal信息失败')
  } finally {
    token._refreshing = false
  }
}

// 生命周期 - 页面加载时仅获取数据库中的令牌数据，不主动刷新Portal信息
onMounted(() => {
  console.log('页面加载，检查用户认证状态...')
  const token = localStorage.getItem('token')
  console.log('用户token:', token ? '已存在' : '不存在')

  // 仅加载数据库中存储的令牌数据（包括已保存的Portal信息）
  loadTokensOnly()
  // 加载令牌池数据
  refreshPool()
})
</script>

<style scoped>
.augment-token-manager {
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
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 页面头部样式 */
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
  margin: 0 0 6px 0;
  font-size: 1.6rem;
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
  margin-bottom: 16px;
}

.compact-stat-card {
  height: 70px;
}

.compact-stat-card .el-card__body {
  padding: 10px 14px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-stat-card .stat-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
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
  padding: 4px;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0;
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: #000000;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
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
.tokens-card,
.generator-card,
.pool-card,
.uploads-card {
  margin-bottom: 32px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  min-height: 40px;
}

.card-title-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.card-subtitle-inline {
  color: #6b7280;
  font-size: 14px;
  font-weight: normal;
  margin-left: auto;
  white-space: nowrap;
}

.card-title-compact h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.uploader-info,
.upload-time,
.expiry-time {
  font-size: 13px;
  line-height: 1.4;
}

.uploader-icon {
  font-size: 14px;
  margin-right: 4px;
}

.action-buttons .el-button {
  margin: 0 2px;
  padding: 4px 8px;
  font-size: 12px;
}

.action-buttons .el-button+.el-button {
  margin-left: 4px;
}

.compact-header {
  padding: 12px 0;
}

.compact-card .el-card__header {
  padding: 12px 20px;
}

.compact-card .el-card__body {
  padding: 12px 20px;
}



.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-header-with-actions .card-title {
  flex: 1;
}

.card-header-with-actions .card-actions {
  margin-top: 0;
  flex-shrink: 0;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 表格样式 */
.tokens-table-container {
  overflow-x: auto;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table__header-wrapper) .el-checkbox {
  transform: scale(1.1);
}

:deep(.el-table__body-wrapper) .el-checkbox {
  transform: scale(1.1);
}

:deep(.el-table .el-table__cell) {
  border-bottom: 1px solid #f1f5f9;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: rgba(248, 250, 252, 0.5);
}

:deep(.el-table__body tr:hover > td) {
  background-color: rgba(224, 242, 254, 0.6) !important;
}

/* 表格内容样式 */
.email-note {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.email-icon {
  color: #3b82f6;
  font-size: 16px;
}

.time-info,
.expiry-info,
.credits-info,
.status-info {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 过期时间样式 */
.expiry-normal {
  color: #059669;
  /* 绿色：其他时间 */
}

.expiry-warning {
  color: #f97316;
  /* 橙色：低于3天 */
}

.expiry-danger {
  color: #dc2626;
  /* 红色：低于1天 */
}

.expiry-expired {
  color: #dc2626;
  /* 红色：已过期 */
  font-weight: 600;
  text-decoration: line-through;
}

.expiry-unknown {
  color: #000000;
  /* 黑色：未知状态 */
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

/* 编辑器下拉菜单样式 */
.editor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

/* 下拉菜单样式 */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item .el-icon) {
  font-size: 14px;
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: #f0f9ff;
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
  color: #000000;
}

.credits {
  color: var(--el-color-success);
}

.expiry {
  color: #000000;
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
  color: #000000;
}

.expiry-info {
  font-size: 12px;
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
  color: #000000;
}

.title-section p {
  margin: 0;
  color: #000000;
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
  color: #000000;
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
  color: #000000;
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

/* 步骤区域样式 */
.step-section {
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.step-icon {
  font-size: 1.5rem;
  color: #3b82f6;
  background: #dbeafe;
  padding: 8px;
  border-radius: 50%;
}

.step-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #000000;
}

/* URL区域样式 */
.url-section {
  margin-top: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #000000;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 按钮样式优化 */
:deep(.el-button) {
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 标签样式优化 */
:deep(.el-tag) {
  font-weight: 500;
  border: none;
  font-size: 12px;
}

/* 令牌池表格样式 */
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

.email-note {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.email-icon {
  color: #3b82f6;
  font-size: 16px;
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.expiry-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.credits-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.claimed-info {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.claimed-icon {
  color: #10b981;
  font-size: 16px;
}

.upload-time,
.expiry-time {
  font-size: 12px;
  color: #000000;
}

.not-claimed {
  color: #6b7280;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.credits-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.expiry-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 上传对话框样式 */
.upload-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.import-mode-selector {
  margin-bottom: 24px;
  text-align: center;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0 0 8px 0;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 600;
}

.section-header p {
  margin: 0;
  color: #000000;
  font-size: 0.9rem;
}

.token-inputs {
  margin-bottom: 20px;
}

.token-input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.row-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 60px;
}

.row-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
}

.token-fields {
  flex: 1;
}

.add-token-row {
  text-align: center;
  margin-top: 16px;
}

.json-example {
  margin-top: 16px;
}

.json-example-code {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  margin: 0;
  white-space: pre-wrap;
}

/* 修复对话框背景问题 */
:deep(.el-dialog__wrapper) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2000 !important;
}
</style>