<template>
  <div class="proxy-install-guide">
    <!-- 引导卡片 -->
    <el-card class="guide-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><Download /></el-icon>
          <h3>安装本地代理程序</h3>
        </div>
      </template>

      <div class="guide-content">
        <!-- 功能介绍 -->
        <div class="feature-intro">
          <h4>🚀 本地代理能为您提供：</h4>
          <ul class="feature-list">
            <li>
              <el-icon><Check /></el-icon>
              <span>快速账号切换 - 一键在不同 Augment 账号间切换</span>
            </li>
            <li>
              <el-icon><Check /></el-icon>
              <span>数据同步 - Web端与桌面版数据实时同步</span>
            </li>
            <li>
              <el-icon><Check /></el-icon>
              <span>状态监控 - 实时监控账号状态和令牌有效性</span>
            </li>
            <li>
              <el-icon><Check /></el-icon>
              <span>协议支持 - 支持从其他应用直接调用</span>
            </li>
          </ul>
        </div>

        <!-- 下载选项 -->
        <div class="download-section">
          <h4>📥 选择您的操作系统：</h4>
          <div class="download-options">
            <div 
              v-for="option in downloadOptions" 
              :key="option.platform"
              class="download-option"
              @click="handleDownload(option)"
            >
              <div class="option-icon">
                <el-icon>
                  <component :is="option.icon" />
                </el-icon>
              </div>
              <div class="option-info">
                <div class="option-title">{{ option.title }}</div>
                <div class="option-description">{{ option.description }}</div>
                <div class="option-size">{{ option.size }}</div>
              </div>
              <div class="option-action">
                <el-button type="primary" size="small">
                  下载
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 安装步骤 -->
        <div class="install-steps">
          <h4>📋 安装步骤：</h4>
          <el-steps :active="currentStep" direction="vertical" finish-status="success">
            <el-step title="下载程序">
              <template #description>
                <div class="step-content">
                  <p>选择适合您操作系统的版本并下载</p>
                  <el-button 
                    v-if="currentStep === 0"
                    type="primary" 
                    size="small"
                    @click="currentStep = 1"
                  >
                    已下载
                  </el-button>
                </div>
              </template>
            </el-step>
            
            <el-step title="运行安装">
              <template #description>
                <div class="step-content">
                  <p>运行下载的安装程序，按提示完成安装</p>
                  <ul class="step-tips">
                    <li>Windows: 双击 .exe 文件</li>
                    <li>macOS: 打开 .dmg 文件并拖拽到应用程序</li>
                    <li>Linux: 运行 .AppImage 或安装 .deb/.rpm 包</li>
                  </ul>
                  <el-button 
                    v-if="currentStep === 1"
                    type="primary" 
                    size="small"
                    @click="currentStep = 2"
                  >
                    已安装
                  </el-button>
                </div>
              </template>
            </el-step>
            
            <el-step title="启动程序">
              <template #description>
                <div class="step-content">
                  <p>启动 Augment Token Manager 代理程序</p>
                  <ul class="step-tips">
                    <li>程序通常会自动启动并在系统托盘显示图标</li>
                    <li>如未自动启动，请手动运行程序</li>
                    <li>确保程序正在运行（检查系统托盘）</li>
                  </ul>
                  <el-button 
                    v-if="currentStep === 2"
                    type="primary" 
                    size="small"
                    @click="checkConnection"
                  >
                    检测连接
                  </el-button>
                </div>
              </template>
            </el-step>
            
            <el-step title="连接成功">
              <template #description>
                <div class="step-content">
                  <p>🎉 恭喜！本地代理已成功连接</p>
                  <p>现在您可以享受所有高级功能了</p>
                </div>
              </template>
            </el-step>
          </el-steps>
        </div>

        <!-- 故障排除 -->
        <div class="troubleshooting">
          <h4>🔧 常见问题解决：</h4>
          <el-collapse>
            <el-collapse-item title="检测不到代理程序" name="1">
              <div class="trouble-content">
                <p><strong>可能原因：</strong></p>
                <ul>
                  <li>程序未启动或已退出</li>
                  <li>防火墙阻止了程序运行</li>
                  <li>端口被其他程序占用</li>
                </ul>
                <p><strong>解决方法：</strong></p>
                <ol>
                  <li>检查系统托盘，确保程序正在运行</li>
                  <li>临时关闭防火墙或添加程序到白名单</li>
                  <li>重启程序或重启计算机</li>
                  <li>检查端口 8899-8903 是否被占用</li>
                </ol>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="下载速度慢或失败" name="2">
              <div class="trouble-content">
                <p><strong>解决方法：</strong></p>
                <ul>
                  <li>尝试使用代理或VPN</li>
                  <li>使用迅雷等下载工具</li>
                  <li>联系技术支持获取备用下载链接</li>
                </ul>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="安装失败" name="3">
              <div class="trouble-content">
                <p><strong>解决方法：</strong></p>
                <ul>
                  <li>以管理员身份运行安装程序</li>
                  <li>关闭杀毒软件后重试</li>
                  <li>清理系统临时文件后重试</li>
                  <li>检查系统是否满足最低要求</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 不想安装的选项 -->
        <div class="skip-option">
          <el-alert
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              不想安装代理程序？
            </template>
            <template #default>
              <p>没关系！Web版本已经提供了完整的基础功能：</p>
              <ul>
                <li>✅ OAuth 认证和令牌生成</li>
                <li>✅ 令牌存储和管理</li>
                <li>✅ 数据导入导出</li>
                <li>✅ 令牌状态检查</li>
              </ul>
              <div class="skip-actions">
                <el-button @click="$emit('skip-install')">
                  继续使用基础功能
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Download, 
  Check,
  Monitor,
  Iphone,
  Platform
} from '@element-plus/icons-vue'
import { useLocalProxy } from '@/composables/useLocalProxy'

// Emits
const emit = defineEmits(['skip-install', 'connection-success'])

// 响应式数据
const currentStep = ref(0)

// 使用组合式函数
const { discoverService, proxyStatus } = useLocalProxy()

// 下载选项
const downloadOptions = [
  {
    platform: 'windows',
    title: 'Windows',
    description: 'Windows 10/11 (64位)',
    size: '~25MB',
    icon: Monitor,
    url: '/api/tools/augment/download/windows',
    filename: 'Augment-Token-Manager-Windows.exe'
  },
  {
    platform: 'macos',
    title: 'macOS',
    description: 'macOS 10.15+ (Intel/Apple Silicon)',
    size: '~30MB',
    icon: Monitor,
    url: '/api/tools/augment/download/macos',
    filename: 'Augment-Token-Manager-macOS.dmg'
  },
  {
    platform: 'linux',
    title: 'Linux',
    description: 'Ubuntu/Debian/CentOS (64位)',
    size: '~28MB',
    icon: Platform,
    url: '/api/tools/augment/download/linux',
    filename: 'Augment-Token-Manager-Linux.AppImage'
  },
  {
    platform: 'source',
    title: '源代码',
    description: '适用于开发者和高级用户',
    size: '~5MB',
    icon: Platform,
    url: '/api/tools/augment/download/source',
    filename: 'Augment-Token-Manager-Source.zip'
  }
]

// 方法
const handleDownload = (option) => {
  // 创建下载链接
  const link = document.createElement('a')
  link.href = option.url
  link.download = option.filename || `${option.title}.exe`
  link.target = '_blank'

  // 触发下载
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success(`正在下载 ${option.filename || option.title}...`)

  // 自动进入下一步
  if (currentStep.value === 0) {
    setTimeout(() => {
      currentStep.value = 1
    }, 2000)
  }
}

const checkConnection = async () => {
  try {
    ElMessage.info('正在检测本地代理连接...')
    
    const result = await discoverService()
    
    if (result) {
      currentStep.value = 3
      ElMessage.success('🎉 本地代理连接成功！')
      emit('connection-success')
    } else {
      ElMessage.warning('未检测到本地代理，请确保程序正在运行')
    }
  } catch (error) {
    ElMessage.error(`连接检测失败: ${error.message}`)
  }
}
</script>

<style scoped>
.proxy-install-guide {
  max-width: 800px;
  margin: 0 auto;
}

.guide-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 24px;
  color: var(--el-color-primary);
}

.card-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-intro h4,
.download-section h4,
.install-steps h4,
.troubleshooting h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.feature-list .el-icon {
  color: var(--el-color-success);
  font-size: 16px;
}

.download-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.download-option {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.download-option:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.option-icon {
  font-size: 32px;
  color: var(--el-color-primary);
}

.option-info {
  flex: 1;
}

.option-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.option-description {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 2px;
}

.option-size {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.step-content {
  padding: 8px 0;
}

.step-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.step-tips {
  margin: 8px 0;
  padding-left: 16px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.step-tips li {
  margin-bottom: 4px;
}

.trouble-content {
  font-size: 14px;
  line-height: 1.6;
}

.trouble-content p {
  margin: 8px 0;
}

.trouble-content ul,
.trouble-content ol {
  margin: 8px 0;
  padding-left: 20px;
}

.trouble-content li {
  margin-bottom: 4px;
}

.skip-option {
  margin-top: 20px;
}

.skip-option ul {
  margin: 8px 0;
  padding-left: 20px;
}

.skip-option li {
  margin-bottom: 4px;
  font-size: 14px;
}

.skip-actions {
  margin-top: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .download-options {
    grid-template-columns: 1fr;
  }
  
  .download-option {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .option-info {
    text-align: center;
  }
}
</style>
