<template>
  <el-dialog v-model="dialogVisible" title="编辑令牌" width="600px" :before-close="handleClose">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px" label-position="left">
      <el-form-item label="令牌ID" prop="id">
        <el-input v-model="formData.id" disabled />
      </el-form-item>

      <el-form-item label="访问令牌" prop="access_token">
        <el-input v-model="formData.access_token" type="textarea" :rows="3" placeholder="请输入访问令牌" show-word-limit
          maxlength="500" />
      </el-form-item>

      <el-form-item label="租户URL" prop="tenant_url">
        <el-input v-model="formData.tenant_url" placeholder="请输入租户URL" clearable />
      </el-form-item>

      <el-form-item label="Portal URL" prop="portal_url">
        <el-input v-model="formData.portal_url" placeholder="请输入Portal URL" clearable />
      </el-form-item>

      <el-form-item label="邮箱备注" prop="email_note">
        <el-input v-model="formData.email_note" placeholder="请输入邮箱备注" clearable />
      </el-form-item>

      <el-form-item label="创建时间">
        <el-input v-model="formattedCreatedAt" disabled />
      </el-form-item>

      <el-form-item label="更新时间">
        <el-input v-model="formattedUpdatedAt" disabled />
      </el-form-item>

      <el-form-item label="Portal信息">
        <el-input v-model="formData.portal_info" type="textarea" :rows="6" placeholder="Portal信息（JSON格式）" readonly />
        <div class="form-item-tip">
          Portal信息为只读，请使用刷新按钮获取最新信息
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  token: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'save'])

// 响应式数据
const formRef = ref()
const saving = ref(false)
const formData = ref({
  id: '',
  access_token: '',
  tenant_url: '',
  portal_url: '',
  email_note: '',
  portal_info: '',
  created_at: '',
  updated_at: ''
})

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formattedCreatedAt = computed(() => {
  if (!formData.value.created_at) return ''
  return new Date(formData.value.created_at).toLocaleString('zh-CN')
})

const formattedUpdatedAt = computed(() => {
  if (!formData.value.updated_at) return ''
  return new Date(formData.value.updated_at).toLocaleString('zh-CN')
})

// 表单验证规则
const rules = {
  access_token: [
    { required: true, message: '请输入访问令牌', trigger: 'blur' },
    { min: 10, message: '访问令牌长度不能少于10个字符', trigger: 'blur' }
  ],
  tenant_url: [
    { required: true, message: '请输入租户URL', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的URL格式',
      trigger: 'blur'
    }
  ],
  email_note: [
    { max: 100, message: '邮箱备注长度不能超过100个字符', trigger: 'blur' }
  ]
}

// 监听token变化，更新表单数据
watch(() => props.token, (newToken) => {
  if (newToken && Object.keys(newToken).length > 0) {
    formData.value = {
      id: newToken.id || '',
      access_token: newToken.access_token || '',
      tenant_url: newToken.tenant_url || '',
      portal_url: newToken.portal_url || '',
      email_note: newToken.email_note || '',
      portal_info: newToken.portal_info || '',
      created_at: newToken.created_at || '',
      updated_at: newToken.updated_at || ''
    }
  }
}, { immediate: true, deep: true })

// 方法
const handleClose = () => {
  dialogVisible.value = false
  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    // 表单验证
    await formRef.value.validate()

    saving.value = true

    // 准备保存数据
    const saveData = {
      ...formData.value,
      updated_at: new Date().toISOString()
    }

    // 发送保存事件
    emit('save', saveData)

  } catch (error) {
    ElMessage.error('请检查表单输入')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}

.form-item-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
