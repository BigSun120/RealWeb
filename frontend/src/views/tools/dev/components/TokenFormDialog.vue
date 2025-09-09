<template>
  <el-dialog
    v-model="visible"
    :title="isEditing ? '编辑令牌' : '添加令牌'"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="租户URL" prop="tenantUrl" required>
        <el-input
          v-model="form.tenantUrl"
          placeholder="https://your-tenant.augmentcode.com/"
          :disabled="isEditing"
        />
        <div class="form-tip">
          Augment 租户的完整URL地址
        </div>
      </el-form-item>

      <el-form-item label="访问令牌" prop="accessToken" required>
        <el-input
          v-model="form.accessToken"
          type="textarea"
          :rows="3"
          placeholder="请输入访问令牌"
          show-password
        />
        <div class="form-tip">
          从 OAuth 流程获取的访问令牌
        </div>
      </el-form-item>

      <el-form-item label="Portal URL" prop="portalUrl">
        <el-input
          v-model="form.portalUrl"
          placeholder="https://portal.withorb.com/..."
        />
        <div class="form-tip">
          可选：Portal 页面的完整URL（用于快速访问）
        </div>
      </el-form-item>

      <el-form-item label="邮箱备注" prop="emailNote">
        <el-input
          v-model="form.emailNote"
          placeholder="例如：工作邮箱、个人邮箱等"
          maxlength="100"
          show-word-limit
        />
        <div class="form-tip">
          可选：用于区分不同账号的备注信息
        </div>
      </el-form-item>

      <el-form-item v-if="isEditing" label="状态">
        <el-switch
          v-model="form.isActive"
          active-text="启用"
          inactive-text="禁用"
        />
        <div class="form-tip">
          禁用后该令牌将不会在列表中显示
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="isSubmitting"
        >
          {{ isEditing ? '更新' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAugmentAuth } from '@/composables/useAugmentAuth'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  token: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref()
const isSubmitting = ref(false)

const form = ref({
  tenantUrl: '',
  accessToken: '',
  portalUrl: '',
  emailNote: '',
  isActive: true
})

// 使用组合式函数
const { saveToken, updateToken, validateUrl } = useAugmentAuth()

// 计算属性
const isEditing = computed(() => !!props.token)

// 表单验证规则
const rules = {
  tenantUrl: [
    { required: true, message: '请输入租户URL', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && !validateUrl(value)) {
          callback(new Error('请输入有效的URL格式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  accessToken: [
    { required: true, message: '请输入访问令牌', trigger: 'blur' },
    { min: 10, message: '访问令牌长度不能少于10个字符', trigger: 'blur' }
  ],
  portalUrl: [
    {
      validator: (rule, value, callback) => {
        if (value && !validateUrl(value)) {
          callback(new Error('请输入有效的URL格式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  emailNote: [
    { max: 100, message: '备注长度不能超过100个字符', trigger: 'blur' }
  ]
}

// 方法
const handleClose = () => {
  visible.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    tenantUrl: '',
    accessToken: '',
    portalUrl: '',
    emailNote: '',
    isActive: true
  }
  
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const loadTokenData = () => {
  if (props.token) {
    form.value = {
      tenantUrl: props.token.tenant_url || '',
      accessToken: '', // 不显示现有令牌，需要重新输入
      portalUrl: props.token.portal_url || '',
      emailNote: props.token.email_note || '',
      isActive: props.token.is_active !== false
    }
  } else {
    resetForm()
  }
}

const handleSubmit = async () => {
  try {
    // 表单验证
    const valid = await formRef.value.validate()
    if (!valid) return

    isSubmitting.value = true

    if (isEditing.value) {
      // 更新令牌
      const updateData = {
        tenant_url: form.value.tenantUrl,
        portal_url: form.value.portalUrl || null,
        email_note: form.value.emailNote || null,
        is_active: form.value.isActive
      }

      // 只有输入了新令牌才更新
      if (form.value.accessToken.trim()) {
        updateData.access_token = form.value.accessToken
      }

      await updateToken(props.token.id, updateData)
      ElMessage.success('令牌更新成功')
    } else {
      // 保存新令牌
      await saveToken({
        tenant_url: form.value.tenantUrl,
        access_token: form.value.accessToken,
        portal_url: form.value.portalUrl || null,
        email_note: form.value.emailNote || null
      })
      ElMessage.success('令牌保存成功')
    }

    emit('success')
    handleClose()
  } catch (error) {
    // 错误已在组合式函数中处理
  } finally {
    isSubmitting.value = false
  }
}

// 监听器
watch(visible, (newValue) => {
  if (newValue) {
    loadTokenData()
  }
})

watch(() => props.token, () => {
  if (visible.value) {
    loadTokenData()
  }
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 表单样式调整 */
:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
  
  :deep(.el-form-item__label) {
    width: 100px !important;
  }
}
</style>
