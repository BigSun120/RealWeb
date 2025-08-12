<template>
  <div class="tools-settings">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Setting /></el-icon>
          工具箱设置
        </h1>
        <p class="page-description">配置工具箱的全局设置和参数</p>
      </div>
      <div class="header-actions">
        <el-upload
          :show-file-list="false"
          :before-upload="importSettings"
          accept=".json"
          style="display: inline-block; margin-right: 10px;"
        >
          <el-button>
            <el-icon><Upload /></el-icon>
            导入设置
          </el-button>
        </el-upload>
        <el-button @click="exportSettings" style="margin-right: 10px;">
          <el-icon><Download /></el-icon>
          导出设置
        </el-button>
        <el-button @click="resetToDefaults">
          <el-icon><RefreshLeft /></el-icon>
          恢复默认
        </el-button>
        <el-button type="primary" @click="saveSettings" :loading="saving">
          <el-icon><Check /></el-icon>
          保存设置
        </el-button>
      </div>
    </div>

    <!-- 设置表单 -->
    <div class="settings-content">
      <el-row :gutter="20">
        <!-- 基本设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Tools /></el-icon>
                <span>基本设置</span>
              </div>
            </template>

            <el-form :model="settings.general" label-width="120px">
              <el-form-item label="启用工具箱">
                <el-switch
                  v-model="settings.general.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">关闭后用户将无法访问工具箱功能</div>
              </el-form-item>

              <el-form-item label="需要登录">
                <el-switch
                  v-model="settings.general.requireAuth"
                  active-text="需要"
                  inactive-text="不需要"
                />
                <div class="form-tip">开启后只有登录用户才能使用工具</div>
              </el-form-item>

              <el-form-item label="每日使用限制">
                <el-input-number
                  v-model="settings.general.maxUsagePerDay"
                  :min="0"
                  :max="100000"
                  style="width: 200px"
                />
                <div class="form-tip">全站每日最大使用次数，0表示无限制</div>
              </el-form-item>

              <el-form-item label="用户使用限制">
                <el-input-number
                  v-model="settings.general.maxUsagePerUser"
                  :min="0"
                  :max="10000"
                  style="width: 200px"
                />
                <div class="form-tip">单用户每日最大使用次数，0表示无限制</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <!-- 统计设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><DataAnalysis /></el-icon>
                <span>统计设置</span>
              </div>
            </template>

            <el-form :model="settings.analytics" label-width="120px">
              <el-form-item label="启用统计">
                <el-switch
                  v-model="settings.analytics.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">关闭后将不记录使用统计数据</div>
              </el-form-item>

              <el-form-item label="数据保留天数">
                <el-input-number
                  v-model="settings.analytics.retentionDays"
                  :min="1"
                  :max="365"
                  style="width: 200px"
                />
                <div class="form-tip">统计数据保留时间，超过将自动清理</div>
              </el-form-item>

              <el-form-item label="跟踪匿名用户">
                <el-switch
                  v-model="settings.analytics.trackAnonymous"
                  active-text="跟踪"
                  inactive-text="不跟踪"
                />
                <div class="form-tip">是否记录未登录用户的使用数据</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 缓存设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Cpu /></el-icon>
                <span>缓存设置</span>
              </div>
            </template>

            <el-form :model="settings.cache" label-width="120px">
              <el-form-item label="启用缓存">
                <el-switch
                  v-model="settings.cache.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">启用缓存可以提高响应速度</div>
              </el-form-item>

              <el-form-item label="缓存时间(秒)">
                <el-input-number
                  v-model="settings.cache.ttl"
                  :min="60"
                  :max="86400"
                  style="width: 200px"
                />
                <div class="form-tip">缓存数据的有效时间</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <!-- 安全设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Lock /></el-icon>
                <span>安全设置</span>
              </div>
            </template>

            <el-form :model="settings.security" label-width="120px">
              <el-form-item label="频率限制">
                <el-switch
                  v-model="settings.security.rateLimitEnabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">防止恶意频繁请求</div>
              </el-form-item>

              <el-form-item label="限制窗口(秒)">
                <el-input-number
                  v-model="settings.security.rateLimitWindow"
                  :min="60"
                  :max="3600"
                  style="width: 200px"
                />
                <div class="form-tip">频率限制的时间窗口</div>
              </el-form-item>

              <el-form-item label="最大请求数">
                <el-input-number
                  v-model="settings.security.rateLimitMax"
                  :min="10"
                  :max="1000"
                  style="width: 200px"
                />
                <div class="form-tip">时间窗口内的最大请求次数</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 文件上传设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Upload /></el-icon>
                <span>文件上传设置</span>
              </div>
            </template>

            <el-form :model="settings.upload" label-width="120px">
              <el-form-item label="最大文件大小">
                <el-input-number
                  v-model="settings.upload.maxFileSize"
                  :min="1"
                  :max="100"
                  style="width: 200px"
                />
                <span style="margin-left: 8px">MB</span>
                <div class="form-tip">单个文件的最大上传大小</div>
              </el-form-item>

              <el-form-item label="允许的文件类型">
                <el-select
                  v-model="settings.upload.allowedTypes"
                  multiple
                  placeholder="选择允许的文件类型"
                  style="width: 100%"
                >
                  <el-option label="图片 (JPEG)" value="image/jpeg" />
                  <el-option label="图片 (PNG)" value="image/png" />
                  <el-option label="图片 (GIF)" value="image/gif" />
                  <el-option label="文本文件" value="text/plain" />
                  <el-option label="JSON文件" value="application/json" />
                  <el-option label="PDF文件" value="application/pdf" />
                </el-select>
                <div class="form-tip">用户可以上传的文件类型</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <!-- 通知设置 -->
        <el-col :span="12">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Bell /></el-icon>
                <span>通知设置</span>
              </div>
            </template>

            <el-form :model="settings.notifications" label-width="120px">
              <el-form-item label="启用通知">
                <el-switch
                  v-model="settings.notifications.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">系统通知功能开关</div>
              </el-form-item>

              <el-form-item label="邮件通知">
                <el-switch
                  v-model="settings.notifications.emailEnabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">是否发送邮件通知</div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import {
  Setting, RefreshLeft, Check, Tools, DataAnalysis, Cpu, Lock, Upload, Bell, Download
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToolsSettings, saveToolsSettings, resetConfig, exportConfigs, importConfigs } from '@/api/admin/configs'

export default {
  name: 'ToolsSettings',
  components: {
    Setting, RefreshLeft, Check, Tools, DataAnalysis, Cpu, Lock, Upload, Bell, Download
  },
  setup() {
    const saving = ref(false)

    // 设置数据
    const settings = reactive({
      general: {
        enabled: true,
        requireAuth: false,
        maxUsagePerDay: 1000,
        maxUsagePerUser: 100
      },
      analytics: {
        enabled: true,
        retentionDays: 90,
        trackAnonymous: true
      },
      cache: {
        enabled: true,
        ttl: 3600
      },
      security: {
        rateLimitEnabled: true,
        rateLimitWindow: 900,
        rateLimitMax: 100
      },
      upload: {
        maxFileSize: 10,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json']
      },
      notifications: {
        enabled: true,
        emailEnabled: false
      }
    })

    // 加载设置
    const loadSettings = async () => {
      try {
        const response = await getToolsSettings()

        // 更新设置数据
        Object.assign(settings.general, response.data.general || {})
        Object.assign(settings.analytics, response.data.analytics || {})
        Object.assign(settings.cache, response.data.cache || {})
        Object.assign(settings.security, response.data.security || {})
        Object.assign(settings.upload, response.data.upload || {})
        Object.assign(settings.notifications, response.data.notifications || {})

        ElMessage.success('设置加载完成')
      } catch (error) {
        console.error('加载设置失败:', error)
        ElMessage.error('加载设置失败: ' + (error.response?.data?.message || error.message))
      }
    }

    // 保存设置
    const saveSettings = async () => {
      try {
        saving.value = true

        // 调用API保存设置
        await saveToolsSettings(settings)

        ElMessage.success('设置保存成功')
      } catch (error) {
        console.error('保存设置失败:', error)
        ElMessage.error('保存设置失败: ' + (error.response?.data?.message || error.message))
      } finally {
        saving.value = false
      }
    }

    // 恢复默认设置
    const resetToDefaults = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要恢复所有设置为默认值吗？此操作不可恢复。',
          '确认恢复默认',
          {
            confirmButtonText: '恢复',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        // 重置各个配置项
        const configKeys = [
          'tools.enabled',
          'tools.requireAuth',
          'tools.maxUsagePerDay',
          'tools.maxUsagePerUser',
          'analytics.enabled',
          'analytics.retentionDays',
          'analytics.trackAnonymous',
          'cache.enabled',
          'cache.ttl',
          'security.rateLimitEnabled',
          'security.rateLimitWindow',
          'security.rateLimitMax'
        ]

        // 批量重置配置
        for (const key of configKeys) {
          try {
            await resetConfig(key)
          } catch (error) {
            console.warn(`重置配置 ${key} 失败:`, error)
          }
        }

        // 重新加载设置
        await loadSettings()

        ElMessage.success('已恢复默认设置')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('恢复默认设置失败:', error)
          ElMessage.error('恢复默认设置失败: ' + (error.response?.data?.message || error.message))
        }
      }
    }

    // 导出设置
    const exportSettings = async () => {
      try {
        const response = await exportConfigs({ includeSystem: false, includeSensitive: false })
        const data = JSON.stringify(response.data, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `tools-settings-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        ElMessage.success('设置导出成功')
      } catch (error) {
        console.error('导出设置失败:', error)
        ElMessage.error('导出设置失败: ' + (error.response?.data?.message || error.message))
      }
    }

    // 导入设置
    const importSettings = async (file) => {
      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.configs || !Array.isArray(data.configs)) {
          throw new Error('无效的配置文件格式')
        }

        await ElMessageBox.confirm(
          `确定要导入 ${data.configs.length} 个配置项吗？这将覆盖现有设置。`,
          '确认导入',
          {
            confirmButtonText: '导入',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await importConfigs({ configs: data.configs, overwrite: true })
        await loadSettings()

        ElMessage.success('设置导入成功')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('导入设置失败:', error)
          ElMessage.error('导入设置失败: ' + (error.response?.data?.message || error.message))
        }
      }
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      saving,
      settings,
      saveSettings,
      resetToDefaults,
      exportSettings,
      importSettings
    }
  }
}
</script>

<style scoped>
.tools-settings {
  padding: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 设置内容 */
.settings-content {
  margin-bottom: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

/* 表单提示 */
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .settings-content .el-col {
    margin-bottom: 16px;
  }
}
</style>
