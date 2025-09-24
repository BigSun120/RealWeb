<template>
  <ElDialog
    :model-value="visible"
    :title="mode === 'create' ? '新增邮箱' : '编辑邮箱'"
    width="520px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="96px"
      status-icon
    >
      <ElFormItem label="邮箱" prop="email">
        <ElInput v-model="form.email" placeholder="例如 personal@example.com" />
      </ElFormItem>

      <ElFormItem label="别名" prop="alias">
        <ElInput v-model="form.alias" maxlength="50" show-word-limit placeholder="可选：显示名称" />
      </ElFormItem>

      <ElFormItem label="用途" prop="usage">
        <ElSelect v-model="form.usage" placeholder="可选：工作、订阅等" allow-create filterable clearable>
          <ElOption v-for="item in usageOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="标签" prop="tags">
        <ElSelect v-model="form.tags" multiple allow-create filterable default-first-option placeholder="输入后回车添加标签">
          <ElOption v-for="item in tagOptions" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="备注" prop="notes">
        <ElInput
          v-model="form.notes"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>

      <div class="form-row">
        <ElFormItem label="优先级" prop="priority">
          <ElInputNumber v-model="form.priority" :min="-10" :max="10" />
        </ElFormItem>
        <ElFormItem label="收藏" prop="isFavorite">
          <ElSwitch v-model="form.isFavorite" />
        </ElFormItem>
      </div>

      <ElFormItem label="最近使用" prop="lastUsedAt">
        <ElDatePicker
          v-model="form.lastUsedAt"
          type="datetime"
          placeholder="可选"
         
          clearable
        />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleClose">取消</ElButton>
        <ElButton type="primary" :loading="loading" @click="handleSubmit">
          {{ mode === 'create' ? '新增' : '保存' }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  tagOptions: {
    type: Array,
    default: () => []
  },
  usageOptions: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'create'
  }
});

const emit = defineEmits(['update:visible', 'submit']);

const formRef = ref();
const form = reactive({
  email: '',
  alias: '',
  usage: '',
  tags: [],
  notes: '',
  priority: 0,
  isFavorite: false,
  lastUsedAt: ''
});

const rules = computed(() => ({
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] }
  ],
  priority: [
    {
      validator: (_, value, callback) => {
        if (Number.isInteger(value) && value >= -10 && value <= 10) {
          callback();
        } else {
          callback(new Error('优先级范围为 -10 至 10'));
        }
      },
      trigger: 'change'
    }
  ]
}));

const resetForm = () => {
  form.email = '';
  form.alias = '';
  form.usage = '';
  form.tags = [];
  form.notes = '';
  form.priority = 0;
  form.isFavorite = false;
  form.lastUsedAt = '';
};

watch(
  () => props.visible,
  visible => {
    if (visible) {
      const data = props.modelValue || {};
      form.email = data.email || '';
      form.alias = data.alias || '';
      form.usage = data.usage || '';
      form.tags = Array.isArray(data.tags) ? [...data.tags] : [];
      form.notes = data.notes || '';
      form.priority = Number.isInteger(data.priority) ? data.priority : 0;
      form.isFavorite = Boolean(data.isFavorite);
      form.lastUsedAt = data.lastUsedAt ? new Date(data.lastUsedAt) : '';
    } else {
      resetForm();
      formRef.value?.clearValidate();
    }
  }
);

const payload = computed(() => ({
  email: form.email.trim(),
  alias: form.alias.trim(),
  usage: form.usage.trim(),
  tags: form.tags,
  notes: form.notes.trim(),
  priority: form.priority,
  isFavorite: form.isFavorite,
  lastUsedAt: form.lastUsedAt ? new Date(form.lastUsedAt).toISOString() : null
}));

const handleSubmit = async () => {
  await formRef.value?.validate();
  emit('submit', payload.value);
};

const handleClose = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
