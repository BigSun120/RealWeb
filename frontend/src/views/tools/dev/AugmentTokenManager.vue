<template>
  <div class="augment-token-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1>Augment 令牌管理器</h1>
          <p>管理您的 Augment Code 访问令牌</p>
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            @click="showTokenList = true"
            :icon="List"
          >
            已保存令牌
          </el-button>
          <el-button
            @click="showDownloadGuide = true"
            :icon="Download"
          >
            下载配套程序
          </el-button>
        </div>
      </div>
    </div>

    <!-- 功能说明 -->
    <el-card class="feature-intro">
      <template #header>
        <h2>功能介绍</h2>
      </template>
      <div class="intro-content">
        <p>Augment 令牌管理器提供以下功能：</p>
        <ul>
          <li>🔐 <strong>OAuth认证</strong> - 安全获取访问令牌</li>
          <li>💾 <strong>令牌存储</strong> - 加密保存您的令牌</li>
          <li>📊 <strong>状态监控</strong> - 检查令牌有效性</li>
          <li>📁 <strong>数据管理</strong> - 导入导出令牌数据</li>
          <li>🔄 <strong>快速切换</strong> - 配合桌面程序实现无感切换</li>
        </ul>
        <el-alert
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            增强功能
          </template>
          <template #default>
            下载配套的桌面程序可以实现快速账号切换功能，无需手动复制粘贴令牌。
          </template>
        </el-alert>
      </div>
    </el-card>

    <!-- 主要内容 -->
    <div class="main-content">
      <el-card class="generator-card">
        <template #header>
          <div class="card-header">
            <h2>生成新的访问令牌</h2>
            <span>按照以下步骤获取您的 Augment 访问令牌</span>
          </div>
        </template>

        <!-- 步骤 1: 生成授权URL -->
        <div class="step-section">
          <div class="step-header">
            <el-icon class="step-icon"><Key /></el-icon>
            <h3>步骤 1: 生成授权URL</h3>
          </div>
          
          <el-button
            type="primary"
            @click="generateAuthUrl"
            :loading="isGenerating"
            size="large"
          >
            生成授权URL
          </el-button>

          <div v-if="authUrl" class="url-section">
            <el-form-item label="授权URL:">
              <el-input
                v-model="authUrl"
                readonly
                placeholder="点击上方按钮生成授权URL"
              >
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
            <el-icon class="step-icon"><Document /></el-icon>
            <h3>步骤 2: 输入授权码</h3>
          </div>
          
          <el-form-item label="授权码:">
            <el-input
              v-model="authCode"
              type="textarea"
              :rows="4"
              placeholder="在此粘贴授权码JSON..."
            />
          </el-form-item>
          
          <el-button
            type="primary"
            @click="getAccessToken"
            :loading="isGettingToken"
            :disabled="!canGetToken"
            size="large"
          >
            获取访问令牌
          </el-button>
        </div>

        <!-- 步骤 3: 访问令牌结果 -->
        <div v-if="tokenResult" class="step-section">
          <div class="step-header">
            <el-icon class="step-icon"><Check /></el-icon>
            <h3>步骤 3: 保存访问令牌</h3>
          </div>

          <el-form :model="tokenForm" label-width="120px">
            <el-form-item label="访问令牌:">
              <el-input
                v-model="tokenResult.access_token"
                readonly
              >
                <template #append>
                  <el-button @click="copyAccessToken" :icon="CopyDocument">
                    复制
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="租户URL:">
              <el-input
                v-model="tokenResult.tenant_url"
                readonly
              >
                <template #append>
                  <el-button @click="copyTenantUrl" :icon="CopyDocument">
                    复制
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="Portal URL:">
              <el-input
                v-model="tokenForm.portalUrl"
                placeholder="请输入 Portal 地址（可选）"
              />
            </el-form-item>

            <el-form-item label="邮箱备注:">
              <el-input
                v-model="tokenForm.emailNote"
                placeholder="请输入邮箱相关备注（可选）"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                @click="saveToken"
                :loading="isSaving"
                size="large"
              >
                保存令牌
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>

    <!-- 令牌列表对话框 -->
    <TokenListDialog
      v-model="showTokenList"
      @refresh="loadTokens"
    />

    <!-- 下载引导对话框 -->
    <el-dialog
      v-model="showDownloadGuide"
      title="下载配套程序"
      width="90%"
      :close-on-click-modal="false"
    >
      <ProxyInstallGuide
        @skip-install="showDownloadGuide = false"
        @connection-success="showDownloadGuide = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Key,
  Document,
  Check,
  List,
  Link,
  CopyDocument,
  Download
} from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'
import TokenListDialog from './components/TokenListDialog.vue'
import ProxyInstallGuide from './components/ProxyInstallGuide.vue'

// 响应式数据
const authUrl = ref('')
const authCode = ref('')
const tokenResult = ref(null)
const showTokenList = ref(false)
const showDownloadGuide = ref(false)

const tokenForm = ref({
  portalUrl: '',
  emailNote: ''
})

// 加载状态
const isGenerating = ref(false)
const isGettingToken = ref(false)
const isSaving = ref(false)

// 使用组合式函数
const {
  generateAuthUrl: generateUrl,
  getAccessToken: getToken,
  saveToken: saveTokenApi,
  loadTokens
} = useAugmentAuth()

// 移除本地代理相关功能，专注于Web端基础功能

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

// 生命周期
onMounted(() => {
  loadTokens()
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

.feature-intro {
  margin-bottom: 24px;
}

.intro-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.intro-content ul {
  margin: 12px 0;
  padding-left: 20px;
}

.intro-content li {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
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
