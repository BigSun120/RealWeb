<template>
  <el-dialog
    v-model="visible"
    title="导入令牌"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-content">
      <!-- 导入方式选择 -->
      <el-radio-group v-model="importType" class="import-type-selector">
        <el-radio-button label="file">从文件导入</el-radio-button>
        <el-radio-button label="text">从文本导入</el-radio-button>
      </el-radio-group>

      <!-- 文件导入 -->
      <div v-if="importType === 'file'" class="import-section">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="true"
          :limit="1"
          accept=".json"
          @change="handleFileChange"
          @remove="handleFileRemove"
        >
          <template #trigger>
            <el-button type="primary" :icon="Upload">
              选择JSON文件
            </el-button>
          </template>
          <template #tip>
            <div class="upload-tip">
              支持从桌面版导出的JSON文件或符合格式的令牌文件<br>
              兼容多种数据格式：{tokens: []}, {data: []}, {accounts: []} 或单个对象
            </div>
          </template>
        </el-upload>
      </div>

      <!-- 文本导入 -->
      <div v-if="importType === 'text'" class="import-section">
        <el-input
          v-model="importText"
          type="textarea"
          :rows="8"
          placeholder="请粘贴JSON格式的令牌数据..."
        />
        <div class="import-tip">
          支持多种格式：数组格式、单个对象、桌面版导出格式等<br>
          示例：[{...}] 或 {tokens: [...]} 或 {data: [...]}
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="previewData.length > 0" class="preview-section">
        <h4>预览数据 ({{ previewData.length }} 个令牌)</h4>
        <div class="preview-list">
          <div 
            v-for="(token, index) in previewData" 
            :key="index"
            class="preview-item"
            :class="{ 'invalid': !token.valid }"
          >
            <div class="preview-info">
              <div class="preview-title">
                {{ token.data.email_note || '未命名令牌' }}
              </div>
              <div class="preview-url">
                {{ token.data.tenant_url }}
              </div>
              <div v-if="!token.valid" class="preview-error">
                {{ token.error }}
              </div>
            </div>
            <div class="preview-status">
              <el-tag :type="token.valid ? 'success' : 'danger'" size="small">
                {{ token.valid ? '有效' : '无效' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 导入选项 -->
      <div v-if="previewData.length > 0" class="import-options">
        <el-checkbox v-model="skipInvalid">
          跳过无效的令牌
        </el-checkbox>
        <el-checkbox v-model="overwriteExisting">
          覆盖已存在的令牌
        </el-checkbox>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="parseData" :disabled="!hasData">
          解析数据
        </el-button>
        <el-button 
          type="primary" 
          @click="handleImport"
          :loading="isImporting"
          :disabled="validTokenCount === 0"
        >
          导入 ({{ validTokenCount }} 个)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const importType = ref('file')
const importText = ref('')
const previewData = ref([])
const isImporting = ref(false)
const skipInvalid = ref(true)
const overwriteExisting = ref(false)

const uploadRef = ref()

// 使用组合式函数
const { importTokens, validateUrl } = useAugmentAuth()

// 计算属性
const hasData = computed(() => {
  return (importType.value === 'file' && uploadRef.value?.uploadFiles?.length > 0) ||
         (importType.value === 'text' && importText.value.trim().length > 0)
})

const validTokenCount = computed(() => {
  return previewData.value.filter(item => item.valid).length
})

// 方法
const handleClose = () => {
  visible.value = false
  resetData()
}

const resetData = () => {
  importText.value = ''
  previewData.value = []
  uploadRef.value?.clearFiles()
}

const handleFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    importText.value = e.target.result
    parseData()
  }
  reader.readAsText(file.raw)
}

const handleFileRemove = () => {
  importText.value = ''
  previewData.value = []
}

const parseData = () => {
  if (!importText.value.trim()) {
    ElMessage.warning('请输入或选择要导入的数据')
    return
  }

  try {
    let data = JSON.parse(importText.value)
    
    // 处理不同的数据格式
    if (!Array.isArray(data)) {
      // 检查是否是桌面版的格式 {tokens: [...]}
      if (data.tokens && Array.isArray(data.tokens)) {
        data = data.tokens
      } else if (data.data && Array.isArray(data.data)) {
        // 另一种可能的格式 {data: [...]}
        data = data.data
      } else if (data.accounts && Array.isArray(data.accounts)) {
        // 账号格式 {accounts: [...]}
        data = data.accounts
      } else {
        // 单个令牌对象
        data = [data]
      }
    }

    // 验证和转换数据
    previewData.value = data.map((item, index) => {
      const validation = validateTokenData(item)
      return {
        index,
        data: normalizeTokenData(item),
        valid: validation.valid,
        error: validation.error
      }
    })

    ElMessage.success(`解析完成，找到 ${previewData.value.length} 个令牌`)
  } catch (error) {
    ElMessage.error('数据格式错误，请检查JSON格式是否正确')
    previewData.value = []
  }
}

const validateTokenData = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '数据格式错误' }
  }

  // 检查必要字段 - 支持多种字段名
  const tenantUrl = data.tenant_url || data.tenantUrl || data.url
  const accessToken = data.access_token || data.accessToken || data.token

  if (!tenantUrl) {
    return { valid: false, error: '缺少租户URL' }
  }

  if (!accessToken) {
    return { valid: false, error: '缺少访问令牌' }
  }

  // 验证URL格式
  if (!validateUrl(tenantUrl)) {
    return { valid: false, error: '租户URL格式无效' }
  }

  const portalUrl = data.portal_url || data.portalUrl || data.portal
  if (portalUrl && !validateUrl(portalUrl)) {
    return { valid: false, error: 'Portal URL格式无效' }
  }

  return { valid: true }
}

const normalizeTokenData = (data) => {
  // 处理桌面版的数据格式
  if (data.tenant_url && data.access_token) {
    // 标准格式
    return {
      tenant_url: data.tenant_url,
      access_token: data.access_token,
      portal_url: data.portal_url || null,
      email_note: data.email_note || null
    }
  } else if (data.tenantUrl && data.accessToken) {
    // 驼峰格式
    return {
      tenant_url: data.tenantUrl,
      access_token: data.accessToken,
      portal_url: data.portalUrl || null,
      email_note: data.emailNote || null
    }
  } else {
    // 桌面版可能的其他格式
    return {
      tenant_url: data.tenant_url || data.tenantUrl || data.url,
      access_token: data.access_token || data.accessToken || data.token,
      portal_url: data.portal_url || data.portalUrl || data.portal || null,
      email_note: data.email_note || data.emailNote || data.note || data.email || null
    }
  }
}

const handleImport = async () => {
  if (validTokenCount.value === 0) {
    ElMessage.warning('没有有效的令牌可以导入')
    return
  }

  isImporting.value = true
  try {
    // 准备导入数据
    let tokensToImport = previewData.value
      .filter(item => item.valid || !skipInvalid.value)
      .map(item => item.data)

    if (skipInvalid.value) {
      tokensToImport = tokensToImport.filter((_, index) => 
        previewData.value[index].valid
      )
    }

    const result = await importTokens(tokensToImport)
    
    if (result.imported > 0) {
      ElMessage.success(`成功导入 ${result.imported} 个令牌`)
      emit('success')
      handleClose()
    } else {
      ElMessage.error('没有令牌被成功导入')
    }
  } catch (error) {
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}

// 监听器
watch(visible, (newValue) => {
  if (!newValue) {
    resetData()
  }
})
</script>

<style scoped>
.import-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.import-type-selector {
  display: flex;
  justify-content: center;
}

.import-section {
  min-height: 120px;
}

.upload-tip,
.import-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 8px;
  line-height: 1.4;
}

.preview-section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 12px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.preview-item.invalid {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.preview-info {
  flex: 1;
  min-width: 0;
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.preview-url {
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.preview-error {
  font-size: 11px;
  color: var(--el-color-danger);
  margin-top: 4px;
}

.preview-status {
  flex-shrink: 0;
  margin-left: 12px;
}

.import-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
  
  .preview-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .preview-status {
    margin-left: 0;
    align-self: flex-start;
  }
}
</style>
