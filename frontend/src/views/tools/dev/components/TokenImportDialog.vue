<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入令牌"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-dialog">
      <!-- 导入方式选择 -->
      <div class="import-mode-selector">
        <el-radio-group v-model="importMode" @change="handleModeChange">
          <el-radio-button label="manual">手动输入</el-radio-button>
          <el-radio-button label="json">JSON导入</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 手动输入模式 -->
      <div v-if="importMode === 'manual'" class="manual-import">
        <div class="section-header">
          <h3>手动输入令牌信息</h3>
          <p>请逐个输入令牌信息，每个令牌占一行</p>
        </div>

        <div class="token-inputs">
          <div
            v-for="(token, index) in manualTokens"
            :key="index"
            class="token-input-row"
          >
            <div class="row-header">
              <span class="row-number">{{ index + 1 }}</span>
              <el-button
                v-if="manualTokens.length > 1"
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click="removeTokenRow(index)"
              />
            </div>
            
            <div class="token-fields">
              <el-form-item label="访问令牌" required>
                <el-input
                  v-model="token.access_token"
                  placeholder="请输入访问令牌"
                  type="textarea"
                  :rows="2"
                />
              </el-form-item>
              
              <el-form-item label="租户URL" required>
                <el-input
                  v-model="token.tenant_url"
                  placeholder="https://example.api.augmentcode.com/"
                />
              </el-form-item>
              
              <el-form-item label="Portal URL">
                <el-input
                  v-model="token.portal_url"
                  placeholder="Portal地址（可选）"
                />
              </el-form-item>
              
              <el-form-item label="邮箱备注">
                <el-input
                  v-model="token.email_note"
                  placeholder="邮箱备注（可选）"
                />
              </el-form-item>
            </div>
          </div>
        </div>

        <div class="manual-actions">
          <el-button @click="addTokenRow" :icon="Plus">
            添加更多令牌
          </el-button>
        </div>
      </div>

      <!-- JSON导入模式 -->
      <div v-if="importMode === 'json'" class="json-import">
        <div class="section-header">
          <h3>JSON格式导入</h3>
          <p>请粘贴JSON格式的令牌数据</p>
        </div>

        <div class="json-input">
          <el-input
            v-model="jsonInput"
            type="textarea"
            :rows="12"
            placeholder="请粘贴JSON格式的令牌数据..."
          />
        </div>

        <div class="json-actions">
          <el-button @click="validateJson" :icon="Check">
            验证JSON格式
          </el-button>
          <el-button @click="loadSampleJson" :icon="Document">
            加载示例格式
          </el-button>
        </div>

        <!-- JSON验证结果 -->
        <div v-if="jsonValidation.checked" class="json-validation">
          <el-alert
            :type="jsonValidation.valid ? 'success' : 'error'"
            :title="jsonValidation.message"
            :closable="false"
            show-icon
          >
            <div v-if="jsonValidation.valid && jsonValidation.tokens">
              <p>检测到 {{ jsonValidation.tokens.length }} 个令牌</p>
              <ul class="token-preview">
                <li v-for="(token, index) in jsonValidation.tokens.slice(0, 3)" :key="index">
                  {{ token.email_note || '未命名' }} - {{ formatUrl(token.tenant_url) }}
                </li>
                <li v-if="jsonValidation.tokens.length > 3">
                  ... 还有 {{ jsonValidation.tokens.length - 3 }} 个令牌
                </li>
              </ul>
            </div>
          </el-alert>
        </div>
      </div>

      <!-- 导入预览 -->
      <div v-if="previewTokens.length > 0" class="import-preview">
        <div class="section-header">
          <h3>导入预览</h3>
          <p>即将导入以下 {{ previewTokens.length }} 个令牌</p>
        </div>

        <el-table :data="previewTokens" style="width: 100%" max-height="300">
          <el-table-column prop="email_note" label="邮箱备注" width="120">
            <template #default="{ row }">
              {{ row.email_note || '未设置' }}
            </template>
          </el-table-column>
          <el-table-column prop="tenant_url" label="租户URL" min-width="200">
            <template #default="{ row }">
              {{ formatUrl(row.tenant_url) }}
            </template>
          </el-table-column>
          <el-table-column prop="portal_url" label="Portal URL" width="120">
            <template #default="{ row }">
              {{ row.portal_url ? '已设置' : '未设置' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="validateTokenData(row) ? 'success' : 'danger'" size="small">
                {{ validateTokenData(row) ? '有效' : '无效' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="generatePreview" :loading="isGeneratingPreview">
          生成预览
        </el-button>
        <el-button
          type="primary"
          @click="handleImport"
          :loading="isImporting"
          :disabled="previewTokens.length === 0"
        >
          确认导入 ({{ previewTokens.length }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Check, Document } from '@element-plus/icons-vue'
import { useAugmentAuth } from '@/composables/useAugmentAuth'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'import-success'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const importMode = ref('manual')
const manualTokens = ref([createEmptyToken()])
const jsonInput = ref('')
const previewTokens = ref([])
const isGeneratingPreview = ref(false)
const isImporting = ref(false)

const jsonValidation = ref({
  checked: false,
  valid: false,
  message: '',
  tokens: null
})

// 使用组合式函数
const { importTokens } = useAugmentAuth()

// 创建空令牌对象
function createEmptyToken() {
  return {
    access_token: '',
    tenant_url: '',
    portal_url: '',
    email_note: ''
  }
}

// 添加令牌行
const addTokenRow = () => {
  manualTokens.value.push(createEmptyToken())
}

// 删除令牌行
const removeTokenRow = (index) => {
  if (manualTokens.value.length > 1) {
    manualTokens.value.splice(index, 1)
  }
}

// 处理模式切换
const handleModeChange = () => {
  previewTokens.value = []
  jsonValidation.value.checked = false
}

// 验证JSON格式
const validateJson = () => {
  jsonValidation.value.checked = true
  
  if (!jsonInput.value.trim()) {
    jsonValidation.value.valid = false
    jsonValidation.value.message = '请输入JSON数据'
    return
  }

  try {
    const parsed = JSON.parse(jsonInput.value)
    
    if (!Array.isArray(parsed)) {
      jsonValidation.value.valid = false
      jsonValidation.value.message = 'JSON数据必须是数组格式'
      return
    }

    if (parsed.length === 0) {
      jsonValidation.value.valid = false
      jsonValidation.value.message = '数组不能为空'
      return
    }

    // 验证每个令牌对象
    const validTokens = parsed.filter(token => validateTokenData(token))
    
    if (validTokens.length === 0) {
      jsonValidation.value.valid = false
      jsonValidation.value.message = '没有找到有效的令牌数据'
      return
    }

    jsonValidation.value.valid = true
    jsonValidation.value.message = `JSON格式正确，找到 ${validTokens.length} 个有效令牌`
    jsonValidation.value.tokens = validTokens

  } catch (error) {
    jsonValidation.value.valid = false
    jsonValidation.value.message = `JSON格式错误: ${error.message}`
  }
}

// 加载示例JSON
const loadSampleJson = () => {
  const sampleData = [
    {
      "access_token": "c7eeb3c311c6ca462599a96478927e546950f9cae4ef16902b8e20c81e9d41e0",
      "tenant_url": "https://d10.api.augmentcode.com/",
      "portal_url": "https://portal.withorb.com/view?token=Im5Ca25DQzlGeGJ5MmpFOHoi.RtDY8bGv4lrDZCQNmgqlkeDu_hE",
      "email_note": "9dg46a4cq8@godaug.fun 01"
    },
    {
      "access_token": "another_token_example_here",
      "tenant_url": "https://d11.api.augmentcode.com/",
      "portal_url": "",
      "email_note": "example@email.com"
    }
  ]
  
  jsonInput.value = JSON.stringify(sampleData, null, 2)
  validateJson()
}

// 验证令牌数据
const validateTokenData = (token) => {
  return token && 
         typeof token.access_token === 'string' && 
         token.access_token.trim().length > 0 &&
         typeof token.tenant_url === 'string' && 
         token.tenant_url.trim().length > 0 &&
         token.tenant_url.includes('api.augmentcode.com')
}

// 生成预览
const generatePreview = () => {
  isGeneratingPreview.value = true
  
  try {
    let tokensToPreview = []

    if (importMode.value === 'manual') {
      tokensToPreview = manualTokens.value.filter(token => validateTokenData(token))
    } else if (importMode.value === 'json') {
      if (!jsonValidation.value.valid) {
        validateJson()
      }
      if (jsonValidation.value.valid && jsonValidation.value.tokens) {
        tokensToPreview = jsonValidation.value.tokens
      }
    }

    if (tokensToPreview.length === 0) {
      ElMessage.warning('没有找到有效的令牌数据')
      return
    }

    previewTokens.value = tokensToPreview
    ElMessage.success(`生成预览成功，共 ${tokensToPreview.length} 个令牌`)

  } catch (error) {
    ElMessage.error(`生成预览失败: ${error.message}`)
  } finally {
    isGeneratingPreview.value = false
  }
}

// 处理导入
const handleImport = async () => {
  if (previewTokens.value.length === 0) {
    ElMessage.warning('请先生成预览')
    return
  }

  isImporting.value = true
  
  try {
    const result = await importTokens(previewTokens.value)
    emit('import-success', result)
  } catch (error) {
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}

// 格式化URL显示
const formatUrl = (url) => {
  if (!url) return '-'
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

// 处理对话框关闭
const handleClose = () => {
  // 重置状态
  importMode.value = 'manual'
  manualTokens.value = [createEmptyToken()]
  jsonInput.value = ''
  previewTokens.value = []
  jsonValidation.value = {
    checked: false,
    valid: false,
    message: '',
    tokens: null
  }
  
  emit('update:modelValue', false)
}
</script>

<style scoped>
.import-dialog {
  padding: 0;
}

.import-mode-selector {
  margin-bottom: 24px;
  text-align: center;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-header p {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

/* 手动输入样式 */
.manual-import {
  margin-bottom: 24px;
}

.token-input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-bg-color-page);
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.token-fields {
  flex: 1;
}

.manual-actions {
  text-align: center;
  margin-top: 16px;
}

/* JSON导入样式 */
.json-import {
  margin-bottom: 24px;
}

.json-input {
  margin-bottom: 16px;
}

.json-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.json-validation {
  margin-top: 16px;
}

.token-preview {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.token-preview li {
  margin-bottom: 4px;
  font-size: 13px;
}

/* 导入预览样式 */
.import-preview {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-light);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .token-input-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .row-header {
    flex-direction: row;
    justify-content: space-between;
    min-width: auto;
  }
  
  .json-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
