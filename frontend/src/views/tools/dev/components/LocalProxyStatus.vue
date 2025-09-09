<template>
  <div class="local-proxy-status">
    <!-- 连接状态指示器 -->
    <div class="status-indicator" :class="statusClass">
      <div class="status-content">
        <div class="status-icon">
          <el-icon v-if="connectionStatus === 'checking'" class="rotating">
            <Loading />
          </el-icon>
          <el-icon v-else-if="connectionStatus === 'connected'" class="success">
            <Check />
          </el-icon>
          <el-icon v-else class="error">
            <Close />
          </el-icon>
        </div>
        
        <div class="status-info">
          <div class="status-title">{{ statusTitle }}</div>
          <div class="status-description">{{ statusText }}</div>
        </div>
        
        <div class="status-actions">
          <el-button
            v-if="connectionStatus === 'disconnected'"
            size="small"
            @click="handleRetry"
            :loading="proxyStatus.isChecking"
          >
            重新检测
          </el-button>
          
          <el-button
            v-if="connectionStatus === 'connected'"
            size="small"
            @click="showDetails = !showDetails"
          >
            {{ showDetails ? '隐藏' : '详情' }}
          </el-button>
        </div>
      </div>
      
      <!-- 详细信息 -->
      <div v-if="showDetails && connectionStatus === 'connected'" class="status-details">
        <div class="detail-item">
          <span class="label">服务地址:</span>
          <span class="value">{{ proxyStatus.serviceUrl }}</span>
        </div>
        
        <div v-if="proxyStatus.version" class="detail-item">
          <span class="label">版本:</span>
          <span class="value">{{ proxyStatus.version }}</span>
        </div>
        
        <div v-if="proxyStatus.features.length > 0" class="detail-item">
          <span class="label">功能:</span>
          <div class="features">
            <el-tag
              v-for="feature in proxyStatus.features"
              :key="feature"
              size="small"
              type="info"
            >
              {{ formatFeature(feature) }}
            </el-tag>
          </div>
        </div>
        
        <div v-if="proxyStatus.lastChecked" class="detail-item">
          <span class="label">最后检查:</span>
          <span class="value">{{ formatTime(proxyStatus.lastChecked) }}</span>
        </div>
      </div>
    </div>

    <!-- 功能提示 -->
    <div v-if="connectionStatus === 'connected'" class="feature-tips">
      <el-alert
        type="success"
        :closable="false"
        show-icon
      >
        <template #title>
          本地代理已连接
        </template>
        <template #default>
          <div class="tips-content">
            <p>✨ 已启用高级功能：</p>
            <ul>
              <li v-if="hasAdvancedFeatures">🔄 快速账号切换</li>
              <li>📊 实时状态同步</li>
              <li>🔗 与桌面应用联动</li>
            </ul>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 安装引导 -->
    <div v-else-if="connectionStatus === 'disconnected'" class="install-guide">
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          本地代理未连接
        </template>
        <template #default>
          <div class="guide-content">
            <p>💡 安装本地代理以启用高级功能：</p>
            <div class="guide-actions">
              <el-button type="primary" size="small" @click="showInstallGuide = true">
                安装代理程序
              </el-button>
              <el-button size="small" @click="showInstallHelp = true">
                安装说明
              </el-button>
            </div>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 安装引导对话框 -->
    <el-dialog
      v-model="showInstallGuide"
      title="安装本地代理程序"
      width="90%"
      :close-on-click-modal="false"
    >
      <ProxyInstallGuide
        @skip-install="showInstallGuide = false"
        @connection-success="handleConnectionSuccess"
      />
    </el-dialog>

    <!-- 安装帮助对话框 -->
    <el-dialog
      v-model="showInstallHelp"
      title="本地代理安装说明"
      width="600px"
    >
      <div class="install-help">
        <h4>什么是本地代理？</h4>
        <p>本地代理是一个轻量级的桌面程序，它可以：</p>
        <ul>
          <li>提供快速账号切换功能</li>
          <li>与现有的 Augment Token Manager 桌面版集成</li>
          <li>实现 Web 端和桌面端的数据同步</li>
        </ul>

        <h4>安装步骤：</h4>
        <ol>
          <li>下载适合您操作系统的代理程序</li>
          <li>运行安装程序并按提示完成安装</li>
          <li>启动代理程序（通常会自动启动）</li>
          <li>返回此页面，代理状态应显示为"已连接"</li>
        </ol>

        <h4>常见问题：</h4>
        <ul>
          <li><strong>检测不到代理？</strong> 请确保代理程序正在运行，并检查防火墙设置</li>
          <li><strong>端口冲突？</strong> 代理会自动尝试多个端口，通常不会有冲突</li>
          <li><strong>不想安装？</strong> 没关系，Web 版本提供完整的基础功能</li>
        </ul>
      </div>

      <template #footer>
        <el-button @click="showInstallHelp = false">关闭</el-button>
        <el-button type="primary" @click="downloadProxy">
          下载代理程序
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Check, Close } from '@element-plus/icons-vue'
import { useLocalProxy } from '@/composables/useLocalProxy'
import ProxyInstallGuide from './ProxyInstallGuide.vue'

// 响应式数据
const showDetails = ref(false)
const showInstallHelp = ref(false)
const showInstallGuide = ref(false)

// 使用组合式函数
const {
  proxyStatus,
  connectionStatus,
  statusText,
  hasAdvancedFeatures,
  discoverService
} = useLocalProxy()

// 计算属性
const statusClass = computed(() => {
  return `status-${connectionStatus.value}`
})

const statusTitle = computed(() => {
  switch (connectionStatus.value) {
    case 'checking':
      return '检测中'
    case 'connected':
      return '已连接'
    case 'disconnected':
      return '未连接'
    default:
      return '未知状态'
  }
})

// 方法
const handleRetry = async () => {
  try {
    await discoverService()
    if (proxyStatus.isAvailable) {
      ElMessage.success('本地代理连接成功')
    } else {
      ElMessage.warning('未检测到本地代理服务')
    }
  } catch (error) {
    ElMessage.error(`检测失败: ${error.message}`)
  }
}

const handleConnectionSuccess = () => {
  showInstallGuide.value = false
  ElMessage.success('🎉 本地代理连接成功！现在可以使用高级功能了')
}

const formatFeature = (feature) => {
  const featureMap = {
    'account-switching': '账号切换',
    'data-sync': '数据同步',
    'status-monitoring': '状态监控',
    'protocol-handler': '协议处理'
  }
  return featureMap[feature] || feature
}

const formatTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.local-proxy-status {
  margin-bottom: 20px;
}

.status-indicator {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
}

.status-indicator.status-checking {
  border-color: var(--el-color-warning);
  background-color: var(--el-color-warning-light-9);
}

.status-indicator.status-connected {
  border-color: var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.status-indicator.status-disconnected {
  border-color: var(--el-color-info);
  background-color: var(--el-color-info-light-9);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  flex-shrink: 0;
}

.status-icon .rotating {
  animation: rotate 1s linear infinite;
}

.status-icon .success {
  color: var(--el-color-success);
}

.status-icon .error {
  color: var(--el-color-info);
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.status-description {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.status-actions {
  flex-shrink: 0;
}

.status-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.detail-item .label {
  color: var(--el-text-color-regular);
  min-width: 60px;
}

.detail-item .value {
  color: var(--el-text-color-primary);
  font-family: 'Courier New', monospace;
}

.features {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.feature-tips,
.install-guide {
  margin-top: 16px;
}

.tips-content p,
.guide-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.tips-content ul {
  margin: 0;
  padding-left: 20px;
}

.tips-content li {
  font-size: 13px;
  margin-bottom: 4px;
}

.guide-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.install-help h4 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.install-help h4:first-child {
  margin-top: 0;
}

.install-help p {
  margin: 8px 0;
  line-height: 1.6;
}

.install-help ul,
.install-help ol {
  margin: 8px 0;
  padding-left: 20px;
}

.install-help li {
  margin-bottom: 4px;
  line-height: 1.5;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-content {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .status-info {
    text-align: center;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .detail-item .label {
    min-width: auto;
  }
  
  .guide-actions {
    flex-direction: column;
  }
}
</style>
