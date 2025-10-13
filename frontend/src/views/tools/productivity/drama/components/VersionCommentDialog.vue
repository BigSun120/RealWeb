<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加版本备注"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <!-- 版本备注 -->
      <el-form-item label="版本备注">
        <el-input
          v-model="form.comment"
          type="textarea"
          :rows="3"
          placeholder="简要说明本次修改的内容（可选）"
          maxlength="200"
          show-word-limit
          clearable
        />
        <div class="quick-comments">
          <span class="quick-label">快速选择：</span>
          <el-button
            v-for="quick in quickComments"
            :key="quick"
            size="small"
            text
            @click="form.comment = quick"
          >
            {{ quick }}
          </el-button>
        </div>
      </el-form-item>

      <!-- 版本标签 -->
      <el-form-item label="版本标签">
        <el-checkbox-group v-model="form.tags">
          <el-checkbox
            v-for="tag in availableTags"
            :key="tag.value"
            :label="tag.value"
          >
            {{ tag.icon }} {{ tag.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <!-- 重要版本 -->
      <el-form-item label="重要版本">
        <el-switch
          v-model="form.isImportant"
          active-text="标记为重要版本（永久保留）"
          inactive-text="普通版本"
        />
        <div class="important-tip">
          <el-icon><InfoFilled /></el-icon>
          重要版本不会被自动清理，适合用于里程碑节点
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消保存</el-button>
        <el-button @click="handleSkip">跳过备注</el-button>
        <el-button type="primary" @click="handleConfirm">
          保存并添加备注
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  moduleType: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'skip', 'cancel']);

// 对话框显示状态
const dialogVisible = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val;
  if (val) {
    // 打开时重置表单
    resetForm();
  }
});

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

// 表单数据
const form = reactive({
  comment: '',
  tags: [],
  isImportant: false
});

// 可用标签
const availableTags = [
  { label: '重要', value: '重要', icon: '🎯' },
  { label: '里程碑', value: '里程碑', icon: '📌' },
  { label: '修复', value: '修复', icon: '🐛' },
  { label: '新功能', value: '新功能', icon: '✨' },
  { label: '重构', value: '重构', icon: '🔄' },
  { label: '初稿', value: '初稿', icon: '📝' }
];

// 快速备注模板
const quickComments = [
  '完善细节描述',
  '修复逻辑错误',
  '优化内容结构',
  '增加人物深度',
  '调整故事节奏',
  '补充背景信息'
];

// 重置表单
const resetForm = () => {
  form.comment = '';
  form.tags = [];
  form.isImportant = false;
};

// 确认
const handleConfirm = () => {
  emit('confirm', {
    comment: form.comment.trim() || null,
    tags: form.tags,
    isImportant: form.isImportant
  });
  dialogVisible.value = false;
};

// 跳过备注
const handleSkip = () => {
  emit('skip', {
    comment: null,
    tags: [],
    isImportant: false
  });
  dialogVisible.value = false;
};

// 取消
const handleCancel = () => {
  emit('cancel');
  dialogVisible.value = false;
};

// 关闭
const handleClose = () => {
  emit('cancel');
};
</script>

<style scoped>
.quick-comments {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.quick-label {
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.important-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>
